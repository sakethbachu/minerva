"""
Supabase client initialization and management for Python service.
Provides a singleton Supabase client with graceful error handling.
"""

import logging
import os
from typing import Optional

from supabase import Client, create_client

logger = logging.getLogger(__name__)

# Singleton Supabase client instance
_supabase_client: Optional[Client] = None
_client_initialized: bool = False
_initialization_error: Optional[str] = None


def get_supabase_client() -> Optional[Client]:
    """
    Get or initialize the Supabase client.
    Returns None if initialization fails (graceful degradation).

    Returns:
        Supabase Client instance, or None if initialization failed
    """
    global _supabase_client, _client_initialized, _initialization_error

    # Return cached client if already initialized successfully
    if _supabase_client is not None:
        return _supabase_client

    # Don't retry if we've already tried and failed
    if _client_initialized and _supabase_client is None:
        logger.warning("Supabase client initialization previously failed, returning None")
        return None

    # Try to initialize
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_service_key:
            _initialization_error = (
                "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables"
            )
            logger.warning(_initialization_error)
            _client_initialized = True
            return None

        # Create Supabase client
        _supabase_client = create_client(supabase_url, supabase_service_key)
        _client_initialized = True
        _initialization_error = None

        logger.info("✅ Supabase client initialized successfully")
        return _supabase_client

    except Exception as e:
        error_msg = f"Failed to initialize Supabase client: {str(e)}"
        logger.error(error_msg, exc_info=True)
        _initialization_error = error_msg
        _client_initialized = True
        _supabase_client = None
        return None


def is_supabase_available() -> bool:
    """
    Check if Supabase client is available and initialized.

    Returns:
        True if Supabase is available, False otherwise
    """
    client = get_supabase_client()
    return client is not None


def get_initialization_error() -> Optional[str]:
    """
    Get the error message from initialization attempt, if any.

    Returns:
        Error message string, or None if no error
    """
    return _initialization_error


def test_connection() -> bool:
    """
    Test the Supabase connection by making a simple query.

    Returns:
        True if connection test succeeds, False otherwise
    """
    client = get_supabase_client()
    if not client:
        logger.warning("Cannot test connection: Supabase client not available")
        return False

    try:
        # Try a simple query to test connection
        # Query the user_profiles table (should exist and be accessible with service role key)
        client.table("user_profiles").select("id").limit(1).execute()
        logger.info("✅ Supabase connection test successful")
        return True
    except Exception as e:
        logger.error(f"❌ Supabase connection test failed: {str(e)}")
        return False
