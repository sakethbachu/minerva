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
- Title (required)
- Description (concise, optional)
- URL (must be the exact buy link from candidates, optional)
- Image URL (if available in candidates, optional)
- Why It Matches (optional)
- Additional Information (optional)

IMPORTANT: You MUST return your response as valid JSON only, in this exact format:
{{
  "results": [
    {{
      "title": "Product Name",
      "description": "Product description",
      "url": "https://example.com/product",
      "image_url": "https://example.com/image.jpg",
      "relevance": 0.95,
      "why_matches": "Explanation text",
      "additional_info": "Additional details"
    }}
  ]
}}

CRITICAL: Return ONLY valid JSON matching the schema. Do NOT include markdown code blocks, do NOT include explanations, do NOT include any text before or after the JSON. Start your response with '{{' and end with '}}'."""
