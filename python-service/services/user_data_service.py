"""
User data service for querying user profiles and search history from Supabase.
Provides functions to fetch user profile and search history with graceful error handling.
"""

import logging
from typing import Optional

from services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


def get_user_profile(user_id: str) -> Optional[dict]:
    """
    Fetch user profile from Supabase.

    Args:
        user_id: User UUID from Supabase auth

    Returns:
        Dictionary with user profile data (name, age, gender, lives_in_us), or None if error
    """
    client = get_supabase_client()
    if not client:
        logger.warning(f"Cannot fetch user profile for {user_id}: Supabase client not available")
        return None

    try:
        result = (
            client.table("user_profiles")
            .select("id, name, age, gender, lives_in_us, created_at, updated_at")
            .eq("id", user_id)
            .single()
            .execute()
        )

        if result.data:
            logger.info(f"✅ User profile fetched for user {user_id}")
            return result.data  # type: ignore[no-any-return]
        else:
            logger.warning(f"User profile not found for user {user_id}")
            return None

    except Exception as e:
        # Handle "not found" errors gracefully (user might not have profile yet)
        error_str = str(e).lower()
        if "no rows" in error_str or "not found" in error_str or "pgrst116" in error_str:
            logger.info(f"User profile not found for user {user_id} (this is okay)")
            return None

        logger.error(f"Error fetching user profile for {user_id}: {str(e)}", exc_info=True)
        return None


def get_user_search_history(user_id: str, limit: int = 10) -> Optional[list[dict]]:
    """
    Fetch user's search history from Supabase (last N searches).

    Args:
        user_id: User UUID from Supabase auth
        limit: Maximum number of searches to return (default: 10)

    Returns:
        List of search history entries, or None if error
        Each entry contains: query, answers, questions, search_results, created_at
    """
    client = get_supabase_client()
    if not client:
        logger.warning(f"Cannot fetch search history for {user_id}: Supabase client not available")
        return None

    try:
        result = (
            client.table("user_search_history")
            .select("id, query, answers, questions, search_results, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        if result.data:
            logger.info(f"✅ Fetched {len(result.data)} search history entries for user {user_id}")
            return result.data  # type: ignore[no-any-return]
        else:
            logger.info(f"No search history found for user {user_id}")
            return []

    except Exception as e:
        logger.error(f"Error fetching search history for {user_id}: {str(e)}", exc_info=True)
        return None


def get_user_data(user_id: str) -> Optional[dict]:
    """
    Fetch both user profile and search history in one call.

    Args:
        user_id: User UUID from Supabase auth

    Returns:
        Dictionary with 'profile' and 'search_history' keys, or None if error
        Returns None only if Supabase is unavailable; returns dict with None values if data not found
    """
    client = get_supabase_client()
    if not client:
        logger.warning(f"Cannot fetch user data for {user_id}: Supabase client not available")
        return None

    profile = get_user_profile(user_id)
    search_history = get_user_search_history(user_id)

    # Return None only if Supabase is unavailable
    # If data is just not found, return dict with None/empty values
    return {
        "profile": profile,
        "search_history": search_history if search_history is not None else [],
    }
