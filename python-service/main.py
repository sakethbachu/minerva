"""
FastAPI microservice for question generation and search.
Uses Gemini for question generation and Tavily for search.
Runs on port 8000, separate from Express.js server on port 3001.
"""

import logging
import os
from pathlib import Path
from typing import Optional  # noqa: E402

from dotenv import load_dotenv
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from models.search import SearchRequest, SearchResponse  # noqa: E402
from services.question_generator import generate_questions_with_retry  # noqa: E402
from services.search_service import search_with_tavily  # noqa: E402

# Load environment variables from .env file in project root (one level up)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Configure application-level logger (integrates with Uvicorn's logging)
logger = logging.getLogger(__name__)

log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
try:
    logging.getLogger().setLevel(log_level_str)
except ValueError:
    # Fallback to INFO if invalid log level is provided
    logging.getLogger().setLevel("INFO")
    logger.warning("Invalid LOG_LEVEL '%s', defaulting to INFO", log_level_str)

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
        logger.error(
            '{"event": "generate_questions_unexpected_error", "error": "%s"}',
            str(e).replace('"', '\\"'),
        )
        return GenerateQuestionsResponse(success=False, error=str(e))


@app.post("/api/search", response_model=SearchResponse)
async def search_endpoint(request: SearchRequest):
    """
    Search for products using Tavily-powered search.

    This endpoint:
    - Uses Tavily + Gemini to search for ecommerce products
    - Handles complex queries and returns formatted search results

    Args:
        request: SearchRequest with query, answers, and optional user_id

    Returns:
        SearchResponse with success status, results, and optional error
    """
    try:
        result = await search_with_tavily(
            user_query=request.query,
            user_answers=request.answers,
            questions=request.questions,
            user_id=request.user_id,
        )

        # Return formatted response
        logger.info(
            '{"event": "search_request_completed", "provider": "tavily", "success": %s}',
            str(result.get("success", False)).lower(),
        )
        return SearchResponse(
            success=result["success"], results=result.get("results"), error=result.get("error")
        )

    except Exception as e:
        # Handle unexpected errors
        logger.error(
            '{"event": "search_unexpected_error", "error": "%s"}',
            str(e).replace('"', '\\"'),
        )
        return SearchResponse(success=False, results=None, error=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
