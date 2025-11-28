"""
FastAPI microservice for question generation.
This service handles OpenAI API calls, validation, and retry logic.
Runs on port 8000, separate from Express.js server on port 3001.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file in project root (one level up)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from typing import Optional  # noqa: E402

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from models.search import SearchRequest, SearchResponse  # noqa: E402
from services.question_generator import generate_questions_with_retry  # noqa: E402
from services.search_service import search_with_e2b_exa, search_with_tavily  # noqa: E402

app = FastAPI(
    title="Q&A Question Generator Service",
    description="Microservice for generating dynamic questions using OpenAI API",
    version="1.0.0",
)

# Add CORS middleware to allow Express.js to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify Express.js origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Question Generator Service is running",
        "service": "python-fastapi",
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Q&A Question Generator Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "generate_questions": "/api/generate-questions (POST)",
            "search": "/api/search (POST)",
        },
    }


class GenerateQuestionsRequest(BaseModel):
    """Request model for question generation"""

    userQuery: str = Field(..., min_length=1, description="User's recommendation request")
    numQuestions: Optional[int] = Field(
        default=3, ge=1, le=10, description="Number of questions to generate (1-10)"
    )
    numAnswers: Optional[int] = Field(
        default=3, ge=2, le=6, description="Number of answer options per question (2-6)"
    )


class GenerateQuestionsResponse(BaseModel):
    """Response model for question generation"""

    success: bool
    questions: Optional[list[dict]] = None
    error: Optional[str] = None


@app.post("/api/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions_endpoint(request: GenerateQuestionsRequest):
    """
    Generate dynamic questions based on user query.

    This endpoint calls the retry-enabled question generator which:
    - Calls OpenAI API to generate questions
    - Validates response with Pydantic
    - Retries on API errors (4 attempts with exponential backoff)
    - Returns an error if all retries fail (no fallback)
    """
    try:
        questions = generate_questions_with_retry(
            user_query=request.userQuery,
            num_questions=request.numQuestions or 3,
            num_answers=request.numAnswers or 3,
        )

        # Convert Pydantic models to dicts for JSON serialization
        questions_dict = [q.model_dump() for q in questions]

        return GenerateQuestionsResponse(success=True, questions=questions_dict)

    except Exception as e:
        # Handle unexpected errors
        print(f"Unexpected error in generate_questions_endpoint: {e}")
        return GenerateQuestionsResponse(success=False, error=str(e))


@app.post("/api/search", response_model=SearchResponse)
async def search_endpoint(request: SearchRequest):
    """
    Search for products using E2B sandbox with Exa AI integration.

    This endpoint:
    - Creates an E2B sandbox with Exa MCP pre-configured
    - Uses OpenAI with MCP tools to search via Exa
    - Handles complex queries (top 10, filtering, etc.)
    - Returns formatted search results

    Args:
        request: SearchRequest with query, answers, and optional user_id

    Returns:
        SearchResponse with success status, results, and optional error
    """
    try:
        search_provider = os.getenv("SEARCH_PROVIDER", "exa").lower()
        if search_provider == "tavily":
            result = await search_with_tavily(
                user_query=request.query,
                user_answers=request.answers,
                questions=request.questions,
                user_id=request.user_id,
            )
        else:
            result = await search_with_e2b_exa(
                user_query=request.query,
                user_answers=request.answers,
                questions=request.questions,
                user_id=request.user_id,
            )

        # Return formatted response
        return SearchResponse(
            success=result["success"], results=result.get("results"), error=result.get("error")
        )

    except Exception as e:
        # Handle unexpected errors
        print(f"Unexpected error in search_endpoint: {e}")
        return SearchResponse(success=False, results=None, error=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
