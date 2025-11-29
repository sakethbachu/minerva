"""
Search service for ecommerce product recommendations.
Uses Tavily for search and Gemini to synthesize and rank results.
"""

import asyncio
import json
import logging
import os
import re
from typing import Optional

import google.generativeai as genai
from tavily import TavilyClient

from models.search import LLMSearchResults
from search_utils.search_helpers import (
    SEARCH_SYSTEM_PROMPT,
    SEARCH_USER_PROMPT_TEMPLATE,
    build_search_prompt,
    clean_snippet_text,
    construct_search_query,
    create_fallback_results,
    enhance_search_query,
    enrich_results_with_candidates,
    extract_gemini_text,
    transform_candidates,
    validate_and_setup_apis,
)
from services.tavily_mcp_server import (
    get_ecommerce_domains,
    get_exclude_domains,
    is_product_page,
    match_images_to_results,
)

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


async def _execute_tavily_search(
    client: TavilyClient,
    search_query: str,
    max_candidates: int,
    loop: asyncio.AbstractEventLoop,
) -> list[dict]:
    """
    Execute Tavily search with query enhancement.

    Args:
        client: TavilyClient instance
        search_query: Search query string
        max_candidates: Maximum number of candidates to return
        loop: Async event loop for executor

    Returns:
        List of Tavily result dictionaries
    """

    def _run_tavily():
        enhanced_query = enhance_search_query(search_query)
        return _tavily_search_sync(
            client,
            enhanced_query,
            max_results=max_candidates,
            ecommerce_only=True,
            product_pages_only=True,
        )

    tavily_response = await loop.run_in_executor(None, _run_tavily)
    return tavily_response.get("results") or []


async def _call_gemini_with_retry(
    gemini_api_key: str,
    system_prompt: str,
    base_user_prompt: str,
    max_retries: int,
    loop: asyncio.AbstractEventLoop,
) -> list[dict]:
    """
    Call Gemini API with retry logic and validation using structured output.

    Args:
        gemini_api_key: Gemini API key
        system_prompt: System prompt for Gemini
        base_user_prompt: Base user prompt (will be enhanced on retry)
        max_retries: Maximum number of retry attempts
        loop: Async event loop for executor

    Returns:
        List of parsed result dictionaries

    Raises:
        ValueError: If all retries fail with validation errors
        Exception: If non-validation error occurs
    """
    gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # Generate JSON schema from Pydantic model for structured output
    # Remove $defs and example fields as Gemini doesn't support them
    json_schema = LLMSearchResults.model_json_schema()

    # Remove $defs and inline nested types
    if "$defs" in json_schema:
        # Inline any nested definitions from $defs
        defs = json_schema["$defs"]

        # Find and replace $ref references with actual definitions
        def inline_refs(obj):
            if isinstance(obj, dict):
                if "$ref" in obj:
                    ref_path = obj["$ref"].split("/")[-1]
                    if ref_path in defs:
                        return inline_refs(defs[ref_path])
                return {k: inline_refs(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [inline_refs(item) for item in obj]
            return obj

        json_schema = inline_refs(json_schema)
        # Remove $defs if still present
        if "$defs" in json_schema:
            del json_schema["$defs"]

    # Remove fields that Gemini doesn't accept
    # Gemini only accepts: type, properties, required, items
    # It doesn't accept: example, title, description, minItems, maxItems, minLength, etc.
    def clean_schema_for_gemini(obj):
        """Recursively remove fields that Gemini doesn't support"""
        if isinstance(obj, dict):
            cleaned = {}
            for k, v in obj.items():
                # Keep all property names (they're part of the schema structure)
                # But only keep essential JSON Schema metadata fields
                if k == "properties":
                    # Keep all property definitions, but clean their values
                    cleaned[k] = {
                        prop_name: clean_schema_for_gemini(prop_schema)
                        for prop_name, prop_schema in v.items()
                    }
                elif k in ["type", "required", "items"]:
                    cleaned[k] = clean_schema_for_gemini(v)
                # Skip all other metadata fields (example, title, description, minItems, maxItems, etc.)
            return cleaned
        elif isinstance(obj, list):
            return [clean_schema_for_gemini(item) for item in obj]
        return obj

    json_schema = clean_schema_for_gemini(json_schema)

    for attempt in range(max_retries):
        try:
            user_prompt = base_user_prompt
            # No retry enhancement needed - instruction is already in base prompt

            def _run_gemini(prompt=user_prompt):
                # Capture user_prompt as default argument to avoid closure issue
                genai.configure(api_key=gemini_api_key)
                model = genai.GenerativeModel(
                    gemini_model_name,
                    system_instruction=system_prompt,
                )
                from google.generativeai.types import GenerationConfig

                generation_config = GenerationConfig(
                    temperature=0.4,
                    max_output_tokens=4096,
                    response_mime_type="application/json",
                    response_schema=json_schema,  # Correct field name is response_schema
                )

                return model.generate_content(
                    prompt,
                    generation_config=generation_config,
                )

            gemini_raw = await loop.run_in_executor(None, _run_gemini)

            if getattr(gemini_raw, "prompt_feedback", None):
                logger.debug(
                    '{"event": "tavily_gemini_prompt_feedback", "feedback": "%s"}',
                    str(gemini_raw.prompt_feedback).replace('"', '\\"'),
                )

            gemini_text = extract_gemini_text(gemini_raw)

            # With structured output, we should get pure JSON
            try:
                json_data = json.loads(gemini_text)
                logger.debug('{"event": "structured_output_success", "direct_json_parse": true}')
            except json.JSONDecodeError as e:
                logger.warning(
                    '{"event": "structured_output_json_parse_failed", "attempt": %d, "error": "%s"}',
                    attempt + 1,
                    str(e).replace('"', '\\"'),
                )
                # Raise immediately to trigger retry - structured output should always return valid JSON
                raise ValueError(f"Structured output failed to return valid JSON: {e}") from e

            # Validate with Pydantic
            validated = LLMSearchResults.model_validate(json_data)

            # Convert to list of dicts
            results = [result.model_dump(exclude_none=True) for result in validated.results]

            logger.info('{"event": "parse_success", "result_count": %d}', len(results))
            return results  # Success, return results

        except ValueError as e:
            logger.warning(
                '{"event": "validation_failed_retry", "attempt": %d, "max_retries": %d, "error": "%s"}',
                attempt + 1,
                max_retries,
                str(e).replace('"', '\\"'),
            )
            if attempt < max_retries - 1:
                # Will retry
                continue
            else:
                # Final attempt failed
                logger.error(
                    '{"event": "validation_failed_final", "error": "%s"}',
                    str(e).replace('"', '\\"'),
                )
                raise
        except Exception as e:
            logger.error(
                '{"event": "gemini_call_error", "attempt": %d, "error": "%s"}',
                attempt + 1,
                str(e).replace('"', '\\"'),
            )
            # For non-validation errors, don't retry
            raise

    # This should never be reached, but satisfies mypy's type checker
    # The loop above always returns or raises
    raise RuntimeError("Unexpected: loop completed without return or raise")


def _tavily_search_sync(
    client: TavilyClient,
    query: str,
    max_results: int = 10,
    ecommerce_only: bool = True,
    product_pages_only: bool = True,
):
    """Blocking Tavily search call reused in async flow."""
    ecommerce_domains = get_ecommerce_domains() if ecommerce_only else None
    exclude_domains = get_exclude_domains() if ecommerce_only else None
    initial_max = max_results * 3 if (ecommerce_only and product_pages_only) else max_results

    response = client.search(
        query=query,
        max_results=initial_max,
        search_depth="advanced",
        include_domains=ecommerce_domains,
        exclude_domains=exclude_domains,
        include_answer=False,
        include_raw_content=False,
        include_images=True,
    )

    results = response.get("results") or []

    # Debug: Log raw results count before filtering
    logger.debug(
        '{"event": "tavily_raw_results", "count": %d, "query": "%s"}',
        len(results),
        query[:100].replace('"', '\\"'),
    )

    if product_pages_only:
        product_results = [res for res in results if is_product_page(res.get("url", ""))]
        logger.debug(
            '{"event": "product_page_filter", "before": %d, "after": %d}',
            len(results),
            len(product_results),
        )
        # Log URLs that were filtered out for debugging
        if len(results) > 0 and len(product_results) == 0:
            logger.warning(
                '{"event": "all_results_filtered_out", "sample_urls": "%s"}',
                ", ".join([r.get("url", "")[:50] for r in results[:3]]).replace('"', '\\"'),
            )
        response["results"] = product_results[:max_results]
    else:
        response["results"] = results[:max_results]

    # Try to match images from top-level images array
    if response.get("results") and response.get("images"):
        matched = match_images_to_results(response["results"], response["images"])
        for idx, result in enumerate(response["results"]):
            if idx in matched:
                result["image_url"] = matched[idx]
                logger.debug(
                    '{"event": "image_matched", "url": "%s", "image": "%s"}',
                    result.get("url", "")[:100],
                    matched[idx][:100].replace('"', '\\"'),
                )

    # Check if results have images embedded in them (some Tavily responses include this)
    for result in response.get("results", []):
        if not result.get("image_url") and result.get("images"):
            # Some results have an "images" array directly
            images = result.get("images") or []
            if images:
                # Prefer product images
                for img_url in images:
                    img_lower = str(img_url).lower()
                    if any(skip in img_lower for skip in ["icon", "logo", "favicon", "sprite"]):
                        continue
                    if any(ext in img_lower for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                        result["image_url"] = img_url
                        logger.debug(
                            '{"event": "image_from_result", "url": "%s"}',
                            result.get("url", "")[:100],
                        )
                        break

    # Image extraction fallback removed for performance
    # Images will only come from Tavily's search results or embedded in results
    # This saves 3-4 seconds per result that would need extraction

    # Log summary of image coverage
    results_with_images = sum(1 for r in response.get("results", []) if r.get("image_url"))
    total_results = len(response.get("results", []))
    if total_results > 0:
        logger.info(
            '{"event": "image_coverage", "with_images": %d, "total": %d, "percentage": %.1f}',
            results_with_images,
            total_results,
            (results_with_images / total_results) * 100,
        )

    return response


def extract_highlights(text: str, max_items: int = 4) -> Optional[list[str]]:
    """Extract bullet-like highlights from raw Exa snippets."""
    if not text:
        return None
    highlights = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith(("-", "*")) or re.match(r"^\d+[\.\)]\s", stripped):
            clean_line = clean_snippet_text(stripped.lstrip("-*0123456789. )"))
            if clean_line:
                highlights.append(clean_line)
        if len(highlights) >= max_items:
            break
    return highlights or None


async def search_with_tavily(
    user_query: str,
    user_answers: dict[str, str],
    questions: list[dict],
    user_id: Optional[str] = None,
    max_candidates: int = 8,
) -> dict:
    """
    Search using Tavily (ecommerce-only) and let Gemini synthesize results.

    Orchestrates the complete search workflow:
    1. Validates API keys and sets up clients
    2. Builds search queries and prompts
    3. Executes Tavily search
    4. Transforms candidates
    5. Synthesizes with Gemini (with retry)
    6. Handles fallback if needed
    7. Enriches and returns results
    """
    # 1. Setup: Validate APIs and create clients
    tavily_api_key, gemini_api_key, tavily_client = validate_and_setup_apis()
    loop = asyncio.get_running_loop()

    # 2. Build search context
    prompt = build_search_prompt(user_query, user_answers, questions, user_id)
    search_query = construct_search_query(user_query, user_answers, questions)

    # 3. Execute Tavily search
    candidate_results = await _execute_tavily_search(
        tavily_client, search_query, max_candidates, loop
    )
    # breakpoint()

    if not candidate_results:
        return {
            "success": False,
            "results": [],
            "error": "No Tavily product results found. Try adjusting the query.",
        }

    # 4. Transform candidates
    candidate_payload, candidate_json = transform_candidates(candidate_results)

    # 5. Synthesize with Gemini (with retry)
    system_prompt = SEARCH_SYSTEM_PROMPT
    base_user_prompt = SEARCH_USER_PROMPT_TEMPLATE.format(
        prompt=prompt,
        candidate_json=candidate_json,
    )

    try:
        parsed_results = await _call_gemini_with_retry(
            gemini_api_key,
            system_prompt,
            base_user_prompt,
            MAX_RETRIES,
            loop,
        )
    except ValueError as e:
        # Validation failed after all retries - use fallback
        logger.warning(
            '{"event": "gemini_parsing_failed_fallback", "falling_back_to_tavily_results": true, "count": %d}',
            len(candidate_payload),
        )
        fallback_results = create_fallback_results(candidate_payload, max_candidates)
        if fallback_results:
            return {
                "success": True,
                "results": fallback_results,
                "error": None,
            }
        return {
            "success": False,
            "results": [],
            "error": f"Failed to get valid response after {MAX_RETRIES} attempts: {str(e)}",
        }
    except Exception as e:
        # Unexpected error - return error response
        return {
            "success": False,
            "results": [],
            "error": f"Unexpected error: {str(e)}",
        }

    # 6. Enrich results with candidate data
    enrich_results_with_candidates(parsed_results, candidate_payload)

    # 7. Return success response
    return {
        "success": True,
        "results": parsed_results,
        "error": None,
    }
