"""
Question generation prompt strings.

This module contains the raw prompt strings used for question generation.
These are separated from the logic in question_generation.py for easier editing.
"""

# System prompt for question generation
QUESTION_SYSTEM_PROMPT = "You generate survey questions. Always return valid JSON."

# User prompt template for question generation
# Variables: {user_query}, {num_questions}, {num_answers}
QUESTION_USER_PROMPT_TEMPLATE = """Given this user request: "{user_query}"

Generate {num_questions} multiple choice questions to understand their preferences.
Each question should have exactly {num_answers} answer options.

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "id": "q1",
      "text": "Question text?",
      "answers": ["Option 1", "Option 2", "Option 3"]
    }}
  ]
}}

Requirements:
- Clear, specific questions
- Exactly {num_answers} answers per question
- Concise answer options (2-4 words)
- Relevant to the user's request
- Use IDs: q1, q2, q3, etc."""
