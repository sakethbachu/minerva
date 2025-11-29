"""
Search service for ecommerce product recommendations.
Uses Tavily for search and Gemini to synthesize and rank results.
"""

import asyncio
import json
import logging
import os
import re
from types import SimpleNamespace
from typing import Any, Optional

import google.generativeai as genai
from tavily import TavilyClient

from search_utils.search_helpers import (
    SEARCH_SYSTEM_PROMPT,
    SEARCH_USER_PROMPT_TEMPLATE,
    build_search_prompt,
    construct_search_query,
    normalize_url,
)
from services.tavily_mcp_server import (
    get_ecommerce_domains,
    get_exclude_domains,
    is_product_page,
    match_images_to_results,
)

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


def _enrich_results_with_candidates(results: list[dict], candidates: list[dict]) -> None:
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
    if product_pages_only:
        product_results = [res for res in results if is_product_page(res.get("url", ""))]
        response["results"] = product_results[:max_results]
    else:
        response["results"] = results[:max_results]

    if response.get("results") and response.get("images"):
        matched = match_images_to_results(response["results"], response["images"])
        for idx, result in enumerate(response["results"]):
            if idx in matched:
                result["image_url"] = matched[idx]

    return response


def parse_response(llm_response) -> list[dict]:
    """
    Parse LLM response and extract structured search results.

    The LLM returns recommendations in a structured format like:
    1. Product: [Name]
       Description: [Text]
       URL: [Link]
       Why It Matches: [Text]

    Args:
        llm_response: LLM ChatCompletion-like response object with
            choices[0].message.content containing the text to parse

    Returns:
        List of result dictionaries with structure:
        [
            {
                "title": str,
                "description": str,
                "url": str,
                "relevance": float,
                "why_matches": str (optional)
            }
        ]
    """
    results: list[dict[str, Any]] = []

    try:
        message = llm_response.choices[0].message
        content = message.content

        if not content:
            logger.warning('{"event": "llm_no_content"}')
            return results

        # Debug: Log first 500 chars of content
        logger.debug(
            '{"event": "llm_response_preview", "snippet": "%s"}',
            content[:500].replace('"', '\\"'),
        )

        # Try to parse JSON first if present
        try:
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                parsed = json.loads(json_str)
                if isinstance(parsed, list):
                    return parsed
                elif isinstance(parsed, dict) and "results" in parsed:
                    return parsed["results"]  # type: ignore[no-any-return]
        except json.JSONDecodeError:
            pass

        # Parse structured text format
        # Pattern: "1. Product: [Name]" or "**Product Name**" or "Product: [Name]"
        lines = content.split("\n")
        current_result: dict[str, Any] = {}
        current_section = None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Detect product number (1., 2., 3., etc.)
            if line and line[0].isdigit() and ("." in line[:3] or ":" in line[:3]):
                # Save previous result
                if current_result and current_result.get("title"):
                    results.append(current_result)

                # Start new result
                current_result = {}
                current_section = None

                # Extract title from "1. Product: Name" or "1. **Name**"
                title_match = line.split(":", 1)
                if len(title_match) > 1:
                    title = title_match[1].strip()
                    # Remove markdown formatting
                    title = title.strip("*").strip()
                    current_result["title"] = title
                elif "**" in line:
                    # Extract from "1. **Product Name**"
                    title = line.split("**")
                    if len(title) > 1:
                        current_result["title"] = title[1].strip()

            # Detect "Product:" or "**Product Name**"
            elif line.startswith("**") and line.endswith("**") and len(line) > 4:
                if current_result and current_result.get("title"):
                    results.append(current_result)
                current_result = {"title": line.strip("*").strip()}
                current_section = None

            # Detect "Product:" label
            elif ":" in line and any(
                keyword in line.lower() for keyword in ["product", "name", "title"]
            ):
                parts = line.split(":", 1)
                if len(parts) > 1:
                    value = parts[1].strip().strip("*").strip()
                    if value:
                        current_result["title"] = value
                        current_section = "title"

            # Detect URL patterns
            elif line.startswith("http://") or line.startswith("https://"):
                # Check if it's an image URL
                if any(
                    ext in line.lower()
                    for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", "image", "img"]
                ):
                    current_result["image_url"] = line
                else:
                    current_result["url"] = line
                current_section = "url"

            # Detect "URL:" label
            elif line.lower().startswith("url:"):
                url = line.split(":", 1)[1].strip()
                if url.startswith("http"):
                    current_result["url"] = url
                elif url.startswith("[") and "](" in url:
                    # Markdown link: [text](url)
                    match = re.search(r"\]\((https?://[^\)]+)\)", url)
                    if match:
                        current_result["url"] = match.group(1)
                current_section = "url"

            # Detect "Image URL:" label
            elif line.lower().startswith("image url:") or line.lower().startswith("image:"):
                image_url = line.split(":", 1)[1].strip()
                if image_url.startswith("http"):
                    current_result["image_url"] = image_url
                current_section = "image_url"

            # Detect "Description:" label
            elif line.lower().startswith("description:"):
                desc = line.split(":", 1)[1].strip()
                current_result["description"] = desc
                current_section = "description"

            # Detect "Why It Matches:" or "Why It Matches" label
            elif "why" in line.lower() and "match" in line.lower():
                why = line.split(":", 1)[1].strip() if ":" in line else ""
                if why:
                    current_result["why_matches"] = why
                current_section = "why_matches"

            # Detect "Additional Information:" label
            elif "additional" in line.lower() or "information" in line.lower():
                info = line.split(":", 1)[1].strip() if ":" in line else ""
                if info:
                    if "additional_info" not in current_result:
                        current_result["additional_info"] = info
                    else:
                        current_result["additional_info"] += " " + info
                current_section = "additional_info"

            # Continue current section
            else:
                if current_result:
                    if current_section == "description" or (
                        not current_section and "description" not in current_result
                    ):
                        if "description" not in current_result:
                            current_result["description"] = line
                        else:
                            current_result["description"] += " " + line
                    elif current_section == "why_matches":
                        if "why_matches" not in current_result:
                            current_result["why_matches"] = line
                        else:
                            current_result["why_matches"] += " " + line
                    elif current_section == "additional_info":
                        if "additional_info" not in current_result:
                            current_result["additional_info"] = line
                        else:
                            current_result["additional_info"] += " " + line

        # Add last result
        if current_result and current_result.get("title"):
            results.append(current_result)

        # Debug: Print parsing results
        if results:
            print(f"✅ Successfully parsed {len(results)} structured results")
        else:
            print("⚠️  No structured results found, attempting fallback parsing...")

        # Extract all URLs from content as fallback
        url_pattern = r"https?://[^\s\)]+"
        all_urls = re.findall(url_pattern, content)

        # If no structured results found, try smarter fallback parsing
        if not results and content:
            # Try to split by numbered items (1., 2., 3., etc.)
            numbered_sections = re.split(r"\n\s*(\d+)\.\s+", content)

            if len(numbered_sections) > 1:
                # We have numbered sections
                for i in range(1, len(numbered_sections), 2):
                    if i + 1 < len(numbered_sections):
                        section_text = numbered_sections[i + 1]
                        fallback_result = {}

                        # Extract URL
                        url_pattern = r"https?://[^\s\)]+"
                        urls = re.findall(url_pattern, section_text)
                        if urls:
                            fallback_result["url"] = urls[0]

                        # Extract title (first line or bold text)
                        lines = section_text.split("\n")
                        first_line = lines[0].strip() if lines else ""

                        # Try to find title in first line
                        if ":" in first_line:
                            title_part = first_line.split(":", 1)[0].strip()
                            # Remove common prefixes
                            title_part = re.sub(
                                r"^(Product|Name|Title):?\s*", "", title_part, flags=re.IGNORECASE
                            )
                            fallback_result["title"] = (
                                title_part if title_part else "Product Recommendation"
                            )
                        else:
                            # Look for bold text
                            bold_match = re.search(r"\*\*([^*]+)\*\*", first_line)
                            if bold_match:
                                fallback_result["title"] = bold_match.group(1).strip()
                            else:
                                fallback_result["title"] = (
                                    first_line[:100] if first_line else "Product Recommendation"
                                )

                        # Rest of text as description
                        description_lines = lines[1:] if len(lines) > 1 else []
                        description = "\n".join(
                            [line.strip() for line in description_lines if line.strip()]
                        )
                        if description:
                            fallback_result["description"] = description[:500]

                        if fallback_result.get("title"):
                            results.append(fallback_result)
            else:
                # No numbered sections, try to extract at least one product name and URL
                # Look for product names (text before URLs or in bold)
                product_match = re.search(r"\*\*([^*]+)\*\*", content)
                product_name = product_match.group(1) if product_match else "Product Recommendation"

                results = [
                    {
                        "title": product_name,
                        "description": content[:500] + "..." if len(content) > 500 else content,
                        "url": all_urls[0] if all_urls else "",
                        "relevance": 1.0,
                    }
                ]

        # Final pass: ensure all results have URLs if we found any in content
        if results and all_urls:
            url_index = 0
            for result in results:
                if not result.get("url") and url_index < len(all_urls):
                    result["url"] = all_urls[url_index]
                    url_index += 1

    except Exception as e:
        print(f"Error parsing response: {e}")
        import traceback

        traceback.print_exc()
        results = []

    return results


def clean_snippet_text(text: Optional[str], max_length: int = 400) -> Optional[str]:
    """Clean raw snippet text into a compact summary suitable for UI display."""
    if not text:
        return None
    cleaned = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    cleaned = re.sub(r"#{1,6}\s*", "", cleaned)
    cleaned = cleaned.replace("*", " ")
    cleaned = cleaned.replace("\\n", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return None
    if len(cleaned) > max_length:
        truncated = cleaned[:max_length]
        last_period = truncated.rfind(".")
        if last_period > 120:
            cleaned = truncated[: last_period + 1]
        else:
            cleaned = truncated.strip() + "…"
    return cleaned


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
    """
    tavily_api_key = os.getenv("TAVILY_API_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")

    if not tavily_api_key:
        raise ValueError("TAVILY_API_KEY environment variable is not set")
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    prompt = build_search_prompt(user_query, user_answers, questions, user_id)
    search_query = construct_search_query(user_query, user_answers, questions)

    tavily_client = TavilyClient(api_key=tavily_api_key)
    loop = asyncio.get_running_loop()

    def _run_tavily():
        enhanced_query = search_query
        product_terms = []
        if "buy" not in search_query.lower():
            product_terms.append("buy")
        if "product" not in search_query.lower() and "item" not in search_query.lower():
            product_terms.append("product")
        if product_terms:
            enhanced_query = f"{search_query} {' '.join(product_terms)}"
        return _tavily_search_sync(
            tavily_client,
            enhanced_query,
            max_results=max_candidates,
            ecommerce_only=True,
            product_pages_only=True,
        )

    tavily_response = await loop.run_in_executor(None, _run_tavily)
    candidate_results = tavily_response.get("results") or []

    if not candidate_results:
        return {
            "success": False,
            "results": [],
            "error": "No Tavily product results found. Try adjusting the query.",
        }

    candidate_payload = []
    for res in candidate_results:
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

    gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    system_prompt = SEARCH_SYSTEM_PROMPT
    user_prompt = SEARCH_USER_PROMPT_TEMPLATE.format(
        prompt=prompt,
        candidate_json=candidate_json,
    )

    def _run_gemini():
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel(
            gemini_model_name,
            system_instruction=system_prompt,
        )
        return model.generate_content(
            user_prompt,
            generation_config={
                "temperature": 0.4,
                "max_output_tokens": 4096,
            },
        )

    gemini_raw = await loop.run_in_executor(None, _run_gemini)

    if getattr(gemini_raw, "prompt_feedback", None):
        logger.debug(
            '{"event": "tavily_gemini_prompt_feedback", "feedback": "%s"}',
            str(gemini_raw.prompt_feedback).replace('"', '\\"'),
        )
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

    response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=gemini_text))]
    )

    parsed_results = parse_response(response)
    _enrich_results_with_candidates(parsed_results, candidate_payload)

    return {
        "success": True,
        "results": parsed_results,
        "error": None,
    }
