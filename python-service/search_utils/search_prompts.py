"""
Search generation prompt strings.

This module contains the raw prompt strings used for search generation.
These are separated from the logic in search_service.py for easier editing.
"""

# System prompt for Gemini-powered search synthesis
SEARCH_SYSTEM_PROMPT = (
    "You are a senior shopping concierge. "
    "You are given candidate product data (JSON) sourced from Tavily. "
    "Only use these candidates; do not fabricate new sources or URLs. "
    "For each recommendation, cite the provided product URL."
)

# User prompt template for Gemini-powered search synthesis
# Variables: {prompt}, {candidate_json}
SEARCH_USER_PROMPT_TEMPLATE = """{prompt}

Candidate products from Tavily (JSON):
{candidate_json}

Select the best 3-6 products for the user. For each, include:
- Title
- Description (concise)
- URL (must be the exact buy link from candidates)
- Image URL (if available in candidates)
- Why It Matches
- Additional Information
Return the response as a numbered list."""
