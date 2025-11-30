"""
Question generation prompt functions and utilities.

This module provides functions that format and return prompts for question generation.
The actual prompt strings are defined in question_prompts.py.
Also includes reusable utilities for schema preparation and Gemini configuration.
"""

import os
from typing import Any, cast

from question_utils.question_prompts import (
    QUESTION_SYSTEM_PROMPT,
    QUESTION_USER_PROMPT_TEMPLATE,
)


def get_question_system_prompt() -> str:
    """
    Get the system prompt for question generation.

    Returns:
        System prompt string
    """
    return QUESTION_SYSTEM_PROMPT


def get_question_user_prompt(
    user_query: str,
    num_questions: int,
    num_answers: int,
) -> str:
    """
    Get the user prompt for question generation.

    Args:
        user_query: User's recommendation request
        num_questions: Number of questions to generate
        num_answers: Number of answer options per question

    Returns:
        Formatted user prompt string
    """
    return QUESTION_USER_PROMPT_TEMPLATE.format(
        user_query=user_query,
        num_questions=num_questions,
        num_answers=num_answers,
    )


def remove_markdown_code_blocks(content: str) -> str:
    """
    Remove markdown code blocks from content.

    Handles cases where content is wrapped in ```json or ``` code blocks.

    Args:
        content: Raw content that may contain markdown code blocks

    Returns:
        Content with markdown code blocks removed
    """
    content = content.strip()
    # Remove markdown code blocks if present
    if content.startswith("```json"):
        content = content[7:]  # Remove ```json
    elif content.startswith("```"):
        content = content[3:]  # Remove ```
    if content.endswith("```"):
        content = content[:-3]  # Remove closing ```
    return content.strip()


def inline_schema_defs(json_schema: dict[str, Any]) -> dict[str, Any]:
    """
    Inline schema definitions from $defs into the main schema.

    Gemini API doesn't support $defs or $ref references, so nested types
    need to be inlined directly into the schema structure.

    Args:
        json_schema: JSON schema dictionary that may contain $defs

    Returns:
        Modified schema with $defs inlined and removed
    """
    if "$defs" not in json_schema:
        return json_schema

    # Create a copy to avoid mutating the original
    schema = json_schema.copy()

    # Inline the Question definition from $defs into the items schema
    question_def = schema["$defs"]["Question"]
    if "properties" in schema and "questions" in schema["properties"]:
        schema["properties"]["questions"]["items"] = question_def

    # Remove $defs
    del schema["$defs"]

    return schema


def clean_schema_for_gemini(obj: Any) -> Any:
    """
    Recursively remove fields that Gemini doesn't support from JSON schema.

    Gemini only accepts: type, properties, required, items
    It doesn't accept: example, title, description, minItems, maxItems, minLength, etc.

    Args:
        obj: JSON schema object (dict, list, or primitive)

    Returns:
        Cleaned schema object with only Gemini-supported fields
    """
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


def prepare_schema_for_gemini(json_schema: dict[str, Any]) -> dict[str, Any]:
    """
    Prepare a Pydantic-generated JSON schema for use with Gemini API.

    This function:
    1. Inlines $defs references (Gemini doesn't support $ref)
    2. Removes unsupported fields (example, title, description, etc.)

    Args:
        json_schema: JSON schema dictionary from Pydantic model_json_schema()

    Returns:
        Cleaned schema ready for Gemini API
    """
    # Inline $defs first
    schema = inline_schema_defs(json_schema)
    # Then clean unsupported fields
    # Type cast: clean_schema_for_gemini returns Any, but we know it returns dict[str, Any] when given a dict
    return cast(dict[str, Any], clean_schema_for_gemini(schema))


def get_gemini_config() -> tuple[str, str]:
    """
    Get Gemini API configuration from environment variables.

    Returns:
        Tuple of (api_key, model_name)

    Raises:
        ValueError: If GEMINI_API_KEY is not set
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    return gemini_api_key, gemini_model_name
