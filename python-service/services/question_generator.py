"""
Question generator service with retry logic.
Handles Gemini API calls, Pydantic validation, and retry with exponential backoff.
"""

import json
import logging
import os
import time

import google.generativeai as genai
from pydantic import ValidationError

from models.question import Question, QuestionsResponse
from question_utils.question_helpers import (
    get_question_system_prompt,
    get_question_user_prompt,
)

logger = logging.getLogger(__name__)

MAX_RETRIES = 4


def call_gemini_with_validation(
    user_query: str, num_questions: int, num_answers: int
) -> list[Question]:
    """
    Call Gemini API and validate response with Pydantic.

    Args:
        user_query: User's recommendation request
        num_questions: Number of questions to generate
        num_answers: Number of answer options per question

    Returns:
        List of validated Question objects

    Raises:
        ValueError: For validation errors (don't retry)
        Exception: For API/network errors (retry)
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # Get prompts from question_utils module
    system_prompt = get_question_system_prompt()
    user_prompt = get_question_user_prompt(user_query, num_questions, num_answers)

    # Generate JSON schema from Pydantic model for structured output
    # Remove $defs and example fields as Gemini doesn't support them
    json_schema = QuestionsResponse.model_json_schema()

    # Remove $defs and inline nested types
    if "$defs" in json_schema:
        # Inline the Question definition from $defs into the items schema
        question_def = json_schema["$defs"]["Question"]
        if "properties" in json_schema and "questions" in json_schema["properties"]:
            json_schema["properties"]["questions"]["items"] = question_def
        # Remove $defs
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

    try:
        # Configure Gemini
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel(
            gemini_model_name,
            system_instruction=system_prompt,
        )

        # Generate content with structured output to ensure valid JSON
        from google.generativeai.types import GenerationConfig

        generation_config = GenerationConfig(
            temperature=0.7,
            max_output_tokens=1000,
            response_mime_type="application/json",
            response_schema=json_schema,  # Correct field name is response_schema
        )

        response = model.generate_content(
            user_prompt,
            generation_config=generation_config,
        )

        # Extract text from Gemini response
        content = None
        if hasattr(response, "text") and response.text:
            content = response.text
        elif hasattr(response, "candidates") and response.candidates:
            # Fallback: try to extract from candidates
            for candidate in response.candidates:
                if hasattr(candidate, "content") and hasattr(candidate.content, "parts"):
                    for part in candidate.content.parts:
                        if hasattr(part, "text") and part.text:
                            content = part.text
                            break
                    if content:
                        break

        if not content:
            raise ValueError("Empty response from Gemini")

        # With structured output, we should get pure JSON
        try:
            parsed = json.loads(content)
            logger.debug('{"event": "structured_output_success", "direct_json_parse": true}')
        except json.JSONDecodeError as json_error:
            # Log the problematic content for debugging
            logger.error(
                '{"event": "gemini_json_parse_failed", "content_length": %d, "error": "%s"}',
                len(content),
                str(json_error).replace('"', '\\"'),
            )
            logger.debug(
                '{"event": "gemini_json_parse_context", "context": "%s"}',
                content[max(0, json_error.pos - 50) : json_error.pos + 50].replace('"', '\\"'),
            )
            # Raise immediately - structured output should always return valid JSON
            raise ValueError(
                f"Structured output failed to return valid JSON: {json_error}"
            ) from json_error

        # Validate with Pydantic
        validated = QuestionsResponse(**parsed)
        return validated.questions

    except ValidationError as e:
        # Validation errors - don't retry, raise immediately
        raise ValueError(f"Validation error: {e}") from e
    except json.JSONDecodeError as e:
        # JSON parsing errors - don't retry
        raise ValueError(f"Invalid JSON response: {e}") from e
    except Exception as e:
        # API/network errors - will be retried
        raise Exception(f"Gemini API error: {e}") from e


def generate_questions_with_retry(
    user_query: str, num_questions: int = 3, num_answers: int = 3
) -> list[Question]:
    """
    Generate questions with retry logic and validation.

    Retries on API/network errors, but not on validation errors.
    Raises an exception if all retries fail.

    Args:
        user_query: User's recommendation request
        num_questions: Number of questions to generate (default: 3)
        num_answers: Number of answer options per question (default: 3)

    Returns:
        List of Question objects

    Raises:
        ValueError: For validation errors (immediate failure, no retry)
        Exception: For API/network errors after all retries exhausted
    """
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            questions = call_gemini_with_validation(user_query, num_questions, num_answers)
            logger.info(
                '{"event": "questions_generated", "num_questions": %d, "num_answers": %d}',
                len(questions),
                num_answers,
            )
            return questions

        except ValueError as e:
            # Validation error - don't retry, raise immediately
            logger.warning(
                '{"event": "question_validation_error", "attempt": %d, "max_retries": %d, "error": "%s"}',
                attempt,
                MAX_RETRIES,
                str(e).replace('"', '\\"'),
            )
            raise ValueError(f"Question generation failed: {e}") from e

        except Exception as e:
            last_error = e
            logger.error(
                '{"event": "question_generation_attempt_failed", "attempt": %d, "max_retries": %d, "error": "%s"}',
                attempt,
                MAX_RETRIES,
                str(e).replace('"', '\\"'),
            )

            if attempt < MAX_RETRIES:
                # Exponential backoff: 1s, 2s, 4s
                wait_time = 2 ** (attempt - 1)
                logger.info(
                    '{"event": "question_generation_retrying", "attempt": %d, "wait_seconds": %d}',
                    attempt,
                    wait_time,
                )
                time.sleep(wait_time)

    # All retries failed - raise exception
    error_message = (
        f"Question generation failed after {MAX_RETRIES} attempts. Last error: {last_error}"
    )
    logger.error(
        '{"event": "question_generation_failed_all_retries", "max_retries": %d, "error": "%s"}',
        MAX_RETRIES,
        str(last_error).replace('"', '\\"'),
    )
    raise Exception(error_message)
