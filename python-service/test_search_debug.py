#!/usr/bin/env python3
"""
Test script to debug search_service.py
This will execute the search function and stop at breakpoint()
"""

import asyncio
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from services.search_service import search_with_tavily  # noqa: E402


async def main():
    """Test the search function"""
    print("Starting search test...")

    # Test data
    user_query = "I want running shoes for men"
    user_answers = {"q1": "Casual", "q2": "$100-200", "q3": "Nike", "q4": "Size 10"}
    questions = [
        {
            "id": "q1",
            "text": "What is your preferred style?",
            "answers": ["Casual", "Formal", "Sporty"],
        },
        {
            "id": "q2",
            "text": "What is your budget range?",
            "answers": ["Under $50", "$50-100", "$100-200", "Over $200"],
        },
        {
            "id": "q3",
            "text": "Do you have a preferred brand?",
            "answers": ["Nike", "Adidas", "ASICS", "New Balance", "No preference"],
        },
        {
            "id": "q4",
            "text": "What size do you need?",
            "answers": ["Size 8", "Size 9", "Size 10", "Size 11", "Size 12"],
        },
    ]
    user_id = "test_user_123"
    max_candidates = 8

    print(f"Query: {user_query}")
    print(f"Answers: {user_answers}")
    print("\nCalling search_with_tavily()...")
    print("Execution will stop at breakpoint() in search_service.py\n")

    # This will hit the breakpoint() in search_service.py
    result = await search_with_tavily(
        user_query=user_query,
        user_answers=user_answers,
        questions=questions,
        user_id=user_id,
        max_candidates=max_candidates,
    )

    print("\nSearch completed!")
    print(f"Success: {result.get('success')}")
    print(f"Results count: {len(result.get('results', []))}")
    if result.get("error"):
        print(f"Error: {result.get('error')}")


if __name__ == "__main__":
    asyncio.run(main())
