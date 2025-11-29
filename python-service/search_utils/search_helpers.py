"""
Search helper functions for Tavily + Gemini search flow.

This module provides functions to construct search queries and prompts.
The raw prompt strings are defined in search_prompts.py.
"""

from typing import Optional
from urllib.parse import urlparse

from search_utils.search_prompts import (
    SEARCH_SYSTEM_PROMPT,
    SEARCH_USER_PROMPT_TEMPLATE,
)


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
) -> str:
    """
    Build a context-aware search prompt from user query and answers.

    Args:
        user_query: Original user query (e.g., "I want running shoes")
        user_answers: Dictionary of question_id -> answer (e.g., {"q1": "Casual", "q2": "$50"})
        questions: List of question objects with id, text, and answers
        user_id: Optional user ID for personalized queries

    Returns:
        Formatted prompt string for search synthesis
    """
    # Create mapping: question_id -> question_text
    questions_map = {q["id"]: q["text"] for q in questions}

    # Format user answers with question text for readability
    answers_text = "\n".join(
        [f"- {questions_map.get(q_id, q_id)}: {answer}" for q_id, answer in user_answers.items()]
    )

    # Base prompt about user preferences
    base_prompt = f"""User wants: {user_query}

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


__all__ = [
    "SEARCH_SYSTEM_PROMPT",
    "SEARCH_USER_PROMPT_TEMPLATE",
    "construct_search_query",
    "build_search_prompt",
    "normalize_url",
]
