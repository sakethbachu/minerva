"""
Pydantic models for search request and response types.
Used for validating search API input/output.
"""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class Gender(str, Enum):
    """User gender enum matching database values"""

    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"


class UserProfile(BaseModel):
    """User profile model with validation"""

    age: int = Field(..., ge=1, le=150, description="User age (1-150)")
    gender: Gender = Field(..., description="User gender")
    lives_in_us: bool = Field(..., description="Whether user lives in US")

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int) -> int:
        if not (1 <= v <= 150):
            raise ValueError("Age must be between 1 and 150")
        return v


class SearchRequest(BaseModel):
    """Request model for search endpoint"""

    query: str = Field(
        ..., min_length=1, description="Original user query (e.g., 'I want running shoes')"
    )
    answers: dict[str, str] = Field(
        ...,
        description="User's answers to questions with question IDs as keys (e.g., {'q1': 'Casual', 'q2': '$50'})",
    )
    questions: list[dict[str, Any]] = Field(
        ...,
        description="Full question objects with id, text, and answers (e.g., [{'id': 'q1', 'text': 'What's your preferred style?', 'answers': [...]}])",
    )
    user_id: Optional[str] = Field(
        default=None, description="Optional user ID for personalized queries"
    )
    user_profile: Optional[UserProfile] = Field(
        default=None,
        description="User profile for personalization (age, gender, location)",
    )

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "query": "I want running shoes",
                "answers": {"q1": "Casual", "q2": "$50-100"},
                "questions": [
                    {
                        "id": "q1",
                        "text": "What's your preferred style?",
                        "answers": ["Casual", "Formal", "Sporty"],
                    },
                    {
                        "id": "q2",
                        "text": "What's your budget range?",
                        "answers": ["Under $50", "$50-100", "Over $100"],
                    },
                ],
                "user_id": "user_123",
                "user_profile": {
                    "age": 25,
                    "gender": "Male",
                    "lives_in_us": True,
                },
            }
        }


class SearchResult(BaseModel):
    """Model for a single search result"""

    title: str = Field(..., description="Title of the result")
    description: Optional[str] = Field(default=None, description="Description of the result")
    url: Optional[str] = Field(default=None, description="URL of the result")
    image_url: Optional[str] = Field(default=None, description="Image URL for the product")
    relevance: Optional[float] = Field(
        default=1.0, ge=0.0, le=1.0, description="Relevance score (0.0-1.0)"
    )
    why_matches: Optional[str] = Field(
        default=None, description="Explanation of why the product matches user preferences"
    )
    additional_info: Optional[str] = Field(default=None, description="Additional metadata or notes")
    highlights: Optional[list[str]] = Field(
        default=None, description="Bullet-point highlights for quick display"
    )

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "title": "Best Running Shoes 2024",
                "description": "Top-rated running shoes for all types of runners",
                "url": "https://example.com/running-shoes",
                "image_url": "https://example.com/running-shoes.jpg",
                "relevance": 0.95,
                "why_matches": "Matches user's preference for responsive cushioning.",
                "additional_info": "Available in multiple sizes.",
                "highlights": [
                    "Lightweight mesh upper",
                    "Responsive foam midsole",
                    "Comes in wide sizes",
                ],
            }
        }


class SearchResponse(BaseModel):
    """Response model for search endpoint"""

    success: bool = Field(..., description="Whether the search was successful")
    results: Optional[list[SearchResult]] = Field(
        default=None, description="List of search results"
    )
    error: Optional[str] = Field(default=None, description="Error message if search failed")

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "success": True,
                "results": [
                    {
                        "title": "Best Running Shoes 2024",
                        "description": "Top-rated running shoes",
                        "url": "https://example.com/running-shoes",
                        "relevance": 0.95,
                    }
                ],
                "error": None,
            }
        }


class LLMSearchResults(BaseModel):
    """LLM-facing search results schema used for validating Gemini JSON output."""

    results: list[SearchResult]
