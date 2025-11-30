"""
Question generation prompt functions and utilities.

This module provides functions that format and return prompts for question generation.
The actual prompt strings are defined in question_prompts.py.
Also includes reusable utilities for schema preparation and Gemini configuration.
"""

import logging
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


def inline_schema_defs(json_schema: dict[str, Any]) -> dict[str, Any]:
    """
    Inline schema definitions from $defs into the main schema.

    Gemini API doesn't support $defs or $ref references, so nested types
    need to be inlined directly into the schema structure.

    This function recursively finds all $ref references and replaces them
    with the actual definitions from $defs. Works with any schema structure.

    Args:
        json_schema: JSON schema dictionary that may contain $defs

    Returns:
        Modified schema with $defs inlined and removed

    Raises:
        KeyError: If a $ref references a definition that doesn't exist in $defs
    """
    if "$defs" not in json_schema:
        return json_schema

    # Create a copy to avoid mutating the original
    schema = json_schema.copy()
    defs = schema["$defs"]

    def inline_refs(obj: Any) -> Any:
        """
        Recursively find and replace $ref references with actual definitions.

        Args:
            obj: Schema object (dict, list, or primitive)

        Returns:
            Object with $ref references replaced by actual definitions
        """
        if isinstance(obj, dict):
            # Check if this dict is a $ref reference
            if "$ref" in obj:
                # Extract definition name from $ref (handles both "#/$defs/Name" and "Name")
                # Always take the last part after splitting by "/"
                ref_name = obj["$ref"].split("/")[-1]

                if ref_name in defs:
                    # Replace $ref with the actual definition, then recurse to handle nested refs
                    return inline_refs(defs[ref_name])
                else:
                    # Reference not found - log warning but keep the $ref
                    # This shouldn't happen with Pydantic schemas, but handle gracefully
                    logger = logging.getLogger(__name__)
                    logger.warning(
                        f"$ref reference '{ref_name}' not found in $defs. Available: {list(defs.keys())}"
                    )
                    return obj

            # Recursively process all values in the dict
            return {k: inline_refs(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            # Recursively process all items in the list
            return [inline_refs(item) for item in obj]
        else:
            # Primitive type - return as-is
            return obj

    # Inline all $ref references
    # Type cast: inline_refs returns Any, but we know it returns dict[str, Any] when given a dict
    schema = cast(dict[str, Any], inline_refs(schema))

    # Remove $defs after inlining (no longer needed)
    if "$defs" in schema:
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
