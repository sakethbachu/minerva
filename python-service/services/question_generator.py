"""
Question generator service with retry logic.
Handles Gemini API calls, Pydantic validation, and retry with exponential backoff.
"""

import json
import os
import re
import time

import google.generativeai as genai
from pydantic import ValidationError

from models.question import Question, QuestionsResponse
from question_utils.question_helpers import (
    get_question_system_prompt,
    get_question_user_prompt,
)

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

    try:
        # Configure Gemini
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel(
            gemini_model_name,
            system_instruction=system_prompt,
        )

        # Generate content with JSON mode instruction
        response = model.generate_content(
            user_prompt,
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 1000,  # Increased to prevent truncation
            },
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

        # Parse JSON - Gemini may return markdown code blocks, so try to extract JSON
        content = content.strip()

        # Log the raw content for debugging (first 500 chars)
        print(f"Raw Gemini response (first 500 chars): {content[:500]}")

        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]  # Remove ```json
        elif content.startswith("```"):
            content = content[3:]  # Remove ```
        if content.endswith("```"):
            content = content[:-3]  # Remove closing ```
        content = content.strip()

        # Try to extract JSON using regex if direct parsing fails
        # Look for JSON object pattern: { ... }
        json_match = re.search(r"\{[\s\S]*\}", content)
        if json_match:
            content = json_match.group(0)

        # Try to parse JSON
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as json_error:
            # Log the problematic content for debugging
            print(f"JSON parsing failed. Content length: {len(content)}")
            print(
                f"Content around error position: {content[max(0, json_error.pos - 50) : json_error.pos + 50]}"
            )
            raise

        if not parsed.get("questions") or not isinstance(parsed["questions"], list):
            raise ValueError("Invalid response structure: missing or invalid 'questions' array")

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
            return questions

        except ValueError as e:
            # Validation error - don't retry, raise immediately
            print(f"Validation error (attempt {attempt}/{MAX_RETRIES}): {e}")
            raise ValueError(f"Question generation failed: {e}") from e

        except Exception as e:
            last_error = e
            print(f"Attempt {attempt}/{MAX_RETRIES} failed: {e}")

            if attempt < MAX_RETRIES:
                # Exponential backoff: 1s, 2s, 4s
                wait_time = 2 ** (attempt - 1)
                print(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)

    # All retries failed - raise exception
    error_message = (
        f"Question generation failed after {MAX_RETRIES} attempts. Last error: {last_error}"
    )
    print(error_message)
    raise Exception(error_message)
