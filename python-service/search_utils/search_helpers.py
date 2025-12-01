"""
Search helper functions for Tavily + Gemini search flow.

This module provides functions to construct search queries and prompts.
The raw prompt strings are defined in search_prompts.py.
"""

import json
import logging
import os
import re
from typing import Any, Optional, cast
from urllib.parse import urlparse

import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from tavily import TavilyClient

from models.search import LLMSearchResults
from question_utils.question_helpers import clean_schema_for_gemini, inline_schema_defs
from search_utils.search_prompts import (
    SEARCH_SYSTEM_PROMPT,
    SEARCH_USER_PROMPT_TEMPLATE,
)

logger = logging.getLogger(__name__)


def validate_and_setup_apis() -> tuple[str, str, TavilyClient]:
    """
    Validate API keys and create Tavily client.

    Returns:
        Tuple of (tavily_api_key, gemini_api_key, tavily_client)

    Raises:
        ValueError: If required API keys are not set
    """
    tavily_api_key = os.getenv("TAVILY_API_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")

    if not tavily_api_key:
        raise ValueError("TAVILY_API_KEY environment variable is not set")
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    tavily_client = TavilyClient(api_key=tavily_api_key)
    return tavily_api_key, gemini_api_key, tavily_client


def construct_search_query(
    user_query: str,
    user_answers: dict[str, str],
    questions: list[dict],
) -> str:
    """
    Build a query string that includes user answers for better search context.

    Args:
        user_query: Original user query (e.g., "I want running shoes")
        user_answers: Mapping of question_id -> answer (e.g., {"q1": "Casual"})
        questions: List of question objects with id, text, and answers

    Returns:
        Search query string combining user query and formatted answers
    """
    search_query_parts = [user_query]
    for q_id, answer in user_answers.items():
        question_text = next((q["text"] for q in questions if q["id"] == q_id), "")
        if question_text:
            search_query_parts.append(f"{question_text}: {answer}")
    return " ".join(search_query_parts)


def build_search_prompt(
    user_query: str,
    user_answers: dict[str, str],
    questions: list[dict],
    user_id: Optional[str] = None,
    user_profile: Optional[dict] = None,
) -> str:
    """
    Build a context-aware search prompt from user query and answers.

    Args:
        user_query: Original user query (e.g., "I want running shoes")
        user_answers: Dictionary of question_id -> answer (e.g., {"q1": "Casual", "q2": "$50"})
        questions: List of question objects with id, text, and answers
        user_id: Optional user ID for personalized queries
        user_profile: Optional user profile dict with age, gender, lives_in_us

    Returns:
        Formatted prompt string for search synthesis
    """
    # Create mapping: question_id -> question_text
    questions_map = {q["id"]: q["text"] for q in questions}

    # Format user answers with question text for readability
    answers_text = "\n".join(
        [f"- {questions_map.get(q_id, q_id)}: {answer}" for q_id, answer in user_answers.items()]
    )

    # Add demographics section if profile exists
    profile_section = ""
    if user_profile:
        location = "United States" if user_profile.get("lives_in_us") else "International"
        profile_section = f"""User Profile:
- Age: {user_profile.get("age")}
- Gender: {user_profile.get("gender")}
- Location: {location}

"""

    # Base prompt about user preferences
    base_prompt = f"""{profile_section}User wants: {user_query}

User Preferences:
{answers_text}

Please search for relevant products and provide recommendations based on these preferences."""

    # Add instructions for complex queries
    if "top" in user_query.lower() or "best" in user_query.lower():
        base_prompt += "\nReturn the top results ranked by relevance and quality."

    if (
        "haven't" in user_query.lower()
        or "didn't" in user_query.lower()
        or "not" in user_query.lower()
    ):
        base_prompt += "\nExclude items the user has already purchased or watched."
        if user_id:
            base_prompt += f"\nUser ID: {user_id} (check purchase/watch history if available)"

    # Add personalization instruction if profile exists
    if user_profile:
        base_prompt += "\nConsider the user's age, gender, and location when recommending products."

    base_prompt += (
        "\n\nProvide a clear, structured list of recommendations with titles, descriptions, "
        "and relevant details."
    )

    return base_prompt


def normalize_url(url: Optional[str]) -> str:
    """
    Normalize URLs for matching across search outputs.

    Strips query parameters and fragments, lowercases, and removes trailing slashes.
    """
    if not url:
        return ""
    parsed = urlparse(url)
    normalized = parsed._replace(query="", fragment="").geturl().rstrip("/")
    return normalized.lower()


def clean_snippet_text(text: Optional[str], max_length: int = 400) -> Optional[str]:
    """
    Clean raw snippet text into a compact summary suitable for UI display.

    Removes markdown formatting, normalizes whitespace, and truncates to max_length.
    Tries to truncate at sentence boundaries for better readability.
    """
    if not text:
        return None

    # Remove markdown: links [text](url) -> text, headers # -> removed, bold/italic * -> space
    cleaned = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    cleaned = re.sub(r"#{1,6}\s*", "", cleaned)
    cleaned = cleaned.replace("*", " ").replace("\\n", " ")

    # Normalize whitespace and check if result is empty
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return None

    # Truncate at sentence boundary if possible (>120 chars), otherwise add ellipsis
    if len(cleaned) > max_length:
        truncated = cleaned[:max_length]
        last_period = truncated.rfind(".")
        if last_period > 120:
            cleaned = truncated[: last_period + 1]
        else:
            cleaned = truncated.strip() + "…"

    return cleaned


def enrich_results_with_candidates(results: list[dict], candidates: list[dict]) -> None:
    """Fill missing URLs/images/descriptions from Tavily candidate data."""
    if not results or not candidates:
        return

    candidate_by_url = {}
    candidate_by_title = {}
    for candidate in candidates:
        norm_url = normalize_url(candidate.get("url"))
        if norm_url:
            candidate_by_url[norm_url] = candidate
        title = (candidate.get("title") or "").lower()
        if title:
            candidate_by_title[title] = candidate

    for parsed in results:
        parsed_url_norm = normalize_url(parsed.get("url"))
        parsed_title = (parsed.get("title") or "").lower()
        candidate = candidate_by_url.get(parsed_url_norm)
        if not candidate and parsed_title:
            candidate = candidate_by_title.get(parsed_title)

        if not candidate:
            continue

        if not parsed.get("url") and candidate.get("url"):
            parsed["url"] = candidate["url"]
        if not parsed.get("image_url") and candidate.get("image_url"):
            parsed["image_url"] = candidate["image_url"]
        if not parsed.get("description") and candidate.get("content"):
            cleaned = clean_snippet_text(candidate.get("content"))
            if cleaned:
                parsed["description"] = cleaned


def extract_image_from_url(client: TavilyClient, url: str) -> Optional[str]:
    """
    Extract product image from a URL using Tavily's extract endpoint as fallback.

    Args:
        client: TavilyClient instance
        url: Product page URL

    Returns:
        Image URL if found, None otherwise
    """
    try:
        extract_response = client.extract(
            urls=[url],
            include_images=True,
        )

        if extract_response and extract_response.get("results"):
            result = extract_response["results"][0]
            images = result.get("images") or []

            if images:
                # Prefer product images (filter out icons, logos, etc.)
                for img_url in images:
                    img_str = str(img_url)  # Convert to string for type safety
                    img_lower = img_str.lower()
                    # Skip small images, icons, logos
                    if any(skip in img_lower for skip in ["icon", "logo", "favicon", "sprite"]):
                        continue
                    # Prefer product-related images
                    if any(prod in img_lower for prod in ["product", "item", "image", "photo"]):
                        return img_str
                    # Accept images with common extensions
                    if any(ext in img_lower for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                        return img_str

                # Fallback: return first image if no product image found
                return str(images[0]) if images else None

    except Exception as e:
        logger.debug(
            '{"event": "image_extraction_failed", "url": "%s", "error": "%s"}',
            url,
            str(e).replace('"', '\\"'),
        )

    return None


def enhance_search_query(query: str) -> str:
    """
    Enhance search query with product terms if missing.

    Adds "buy" and "product" terms to improve ecommerce search results.

    Args:
        query: Original search query

    Returns:
        Enhanced query string with product terms if needed
    """
    enhanced_query = query
    product_terms = []
    if "buy" not in query.lower():
        product_terms.append("buy")
    if "product" not in query.lower() and "item" not in query.lower():
        product_terms.append("product")
    if product_terms:
        enhanced_query = f"{query} {' '.join(product_terms)}"
    return enhanced_query


def transform_candidates(tavily_results: list[dict]) -> tuple[list[dict], str]:
    """
    Transform Tavily results to candidate payload and JSON string.

    Args:
        tavily_results: List of Tavily search result dictionaries

    Returns:
        Tuple of (candidate_payload list, candidate_json string)
    """
    candidate_payload = []
    for res in tavily_results:
        candidate_payload.append(
            {
                "title": res.get("title"),
                "description": clean_snippet_text(res.get("content")),
                "url": res.get("url"),
                "image_url": res.get("image_url"),
                "score": res.get("score"),
            }
        )

    candidate_json = json.dumps(candidate_payload, ensure_ascii=False, indent=2)
    return candidate_payload, candidate_json


def extract_gemini_text(gemini_raw) -> str:
    """
    Extract text content from Gemini response object.

    Handles multiple candidates, parts, and fallback scenarios.

    Args:
        gemini_raw: Raw Gemini API response object

    Returns:
        Extracted text content as string

    Raises:
        ValueError: If no text content can be extracted
    """
    gemini_text = ""

    if getattr(gemini_raw, "candidates", None):
        fallback_text = ""
        debug_candidates = []
        for candidate in gemini_raw.candidates:
            parts_payload = []
            if candidate.content and getattr(candidate.content, "parts", None):
                parts_payload = [
                    getattr(part, "text", "") or "" for part in candidate.content.parts
                ]
            if candidate.content and getattr(candidate.content, "parts", None):
                candidate_text = "".join(
                    getattr(part, "text", "") or "" for part in candidate.content.parts
                )
                if candidate.finish_reason == "STOP":
                    gemini_text = candidate_text
                    break
                if not fallback_text:
                    fallback_text = candidate_text
            debug_candidates.append(
                {
                    "finish_reason": getattr(candidate, "finish_reason", None),
                    "parts_count": len(parts_payload),
                }
            )
        if not gemini_text:
            gemini_text = fallback_text
        logger.debug(
            '{"event": "tavily_gemini_candidates_diagnostics", "candidates": "%s"}',
            str(debug_candidates).replace('"', '\\"'),
        )

    if not gemini_text:
        try:
            gemini_text = gemini_raw.text
        except Exception:
            gemini_text = ""

    if not gemini_text:
        raise ValueError("Gemini did not return any content")

    return gemini_text


def create_fallback_results(candidate_payload: list[dict], max_candidates: int) -> list[dict]:
    """
    Create fallback results from Tavily candidates when Gemini parsing fails.

    Args:
        candidate_payload: List of candidate dictionaries from Tavily
        max_candidates: Maximum number of candidates to include

    Returns:
        List of fallback result dictionaries
    """
    fallback_results = []
    for candidate in candidate_payload[:max_candidates]:
        fallback_result = {
            "title": candidate.get("title") or "Product",
            "description": candidate.get("description"),
            "url": candidate.get("url"),
            "image_url": candidate.get("image_url"),
            "relevance": min(candidate.get("score", 0.8), 1.0) if candidate.get("score") else 0.8,
        }
        # Only add if we have at least a title or URL
        if fallback_result.get("title") or fallback_result.get("url"):
            fallback_results.append(fallback_result)

    return fallback_results


def prepare_search_schema() -> dict[str, Any]:
    """
    Prepare JSON schema for Gemini structured output from LLMSearchResults model.

    This function:
    1. Generates schema from Pydantic model
    2. Inlines $defs references (Gemini doesn't support $ref)
    3. Removes unsupported fields (example, title, description, etc.)

    Returns:
        Prepared schema ready for Gemini API

    Raises:
        ValueError: If schema transformation fails
    """
    # Generate JSON schema from Pydantic model for structured output
    json_schema = LLMSearchResults.model_json_schema()

    try:
        # Inline $defs references (Gemini doesn't support $ref)
        json_schema = inline_schema_defs(json_schema)

        # Remove fields that Gemini doesn't accept
        # Gemini only accepts: type, properties, required, items
        # It doesn't accept: example, title, description, minItems, maxItems, minLength, etc.
        # Type cast: clean_schema_for_gemini returns Any, but we know it returns dict[str, Any] when given a dict
        json_schema = cast(dict[str, Any], clean_schema_for_gemini(json_schema))
    except Exception as e:
        logger.error(
            '{"event": "schema_transformation_failed", "error": "%s"}',
            str(e).replace('"', '\\"'),
        )
        raise ValueError(f"Schema transformation failed: {e}") from e

    return json_schema


def call_gemini_search_api(
    user_prompt: str,
    system_prompt: str,
    json_schema: dict[str, Any],
    api_key: str,
    model_name: str,
) -> Any:
    """
    Make blocking Gemini API call with structured output for search results.

    This function is designed to run in an executor (blocking I/O).

    Args:
        user_prompt: User prompt to send to Gemini
        system_prompt: System instruction prompt
        json_schema: Prepared JSON schema for structured output
        api_key: Gemini API key
        model_name: Gemini model name

    Returns:
        Raw Gemini API response object

    Raises:
        Exception: For API/network errors
    """
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name,
        system_instruction=system_prompt,
    )

    generation_config = GenerationConfig(
        temperature=0.4,
        max_output_tokens=4096,
        response_mime_type="application/json",
        response_schema=json_schema,
    )

    return model.generate_content(
        user_prompt,
        generation_config=generation_config,
    )


def parse_and_validate_search_response(gemini_text: str) -> list[dict]:
    """
    Parse JSON from Gemini response and validate with Pydantic model.

    Args:
        gemini_text: Text content extracted from Gemini response

    Returns:
        List of validated result dictionaries

    Raises:
        ValueError: If JSON parsing or validation fails
    """
    # With structured output, we should get pure JSON
    try:
        json_data = json.loads(gemini_text)
        logger.debug('{"event": "structured_output_success", "direct_json_parse": true}')
    except json.JSONDecodeError as e:
        logger.warning(
            '{"event": "structured_output_json_parse_failed", "error": "%s"}',
            str(e).replace('"', '\\"'),
        )
        # Raise immediately - structured output should always return valid JSON
        raise ValueError(f"Structured output failed to return valid JSON: {e}") from e

    # Validate with Pydantic
    validated = LLMSearchResults.model_validate(json_data)

    # Convert to list of dicts
    results = [result.model_dump(exclude_none=True) for result in validated.results]

    logger.info('{"event": "parse_success", "result_count": %d}', len(results))
    return results


__all__ = [
    "SEARCH_SYSTEM_PROMPT",
    "SEARCH_USER_PROMPT_TEMPLATE",
    "validate_and_setup_apis",
    "construct_search_query",
    "build_search_prompt",
    "normalize_url",
    "clean_snippet_text",
    "enrich_results_with_candidates",
    "extract_image_from_url",
    "enhance_search_query",
    "transform_candidates",
    "extract_gemini_text",
    "create_fallback_results",
    "prepare_search_schema",
    "call_gemini_search_api",
    "parse_and_validate_search_response",
]
