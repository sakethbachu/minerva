"""
Question generation prompt functions for OpenAI API.

This module provides functions that format and return prompts for question generation.
The actual prompt strings are defined in question_prompts.py.
"""

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
