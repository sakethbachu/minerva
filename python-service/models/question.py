"""
Pydantic models for question types.
Equivalent to TypeScript Zod schemas in src/types/question.types.ts
"""

from pydantic import BaseModel, Field, field_validator


class Question(BaseModel):
    """A single question with its answer options"""
    id: str
    text: str = Field(..., min_length=5, description="Question text (minimum 5 characters)")
    answers: list[str] = Field(..., min_length=2, max_length=6, description="Answer options (2-6 items)")

    @field_validator('answers')
    @classmethod
    def validate_answers_count(cls, v: list[str]) -> list[str]:
        """Ensure answers array has 2-6 items"""
        if len(v) < 2:
            raise ValueError('answers must have at least 2 items')
        if len(v) > 6:
            raise ValueError('answers must have at most 6 items')
        return v

    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "id": "q1",
                "text": "What's your preferred style?",
                "answers": ["Casual", "Formal", "Sporty"]
            }
        }


class QuestionsResponse(BaseModel):
    """Response containing a list of questions"""
    questions: list[Question] = Field(..., min_length=1, max_length=10, description="List of questions (1-10 items)")

    @field_validator('questions')
    @classmethod
    def validate_questions_count(cls, v: list[Question]) -> list[Question]:
        """Ensure questions array has 1-10 items"""
        if len(v) < 1:
            raise ValueError('questions must have at least 1 item')
        if len(v) > 10:
            raise ValueError('questions must have at most 10 items')
        return v

    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "questions": [
                    {
                        "id": "q1",
                        "text": "What's your preferred style?",
                        "answers": ["Casual", "Formal", "Sporty"]
                    }
                ]
            }
        }





