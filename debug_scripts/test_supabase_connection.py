#!/usr/bin/env python3
"""
Test script to verify Supabase client initialization and connection.
Run this to test if Supabase is properly configured.
"""

import sys
from pathlib import Path

# Add parent directory to path to load .env
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from services.supabase_client import (
    get_supabase_client,
    is_supabase_available,
    test_connection,
    get_initialization_error,
)

print("🧪 Testing Supabase Client Setup")
print("=" * 50)

# Test 1: Check if client can be initialized
print("\n1. Testing client initialization...")
client = get_supabase_client()

if client:
    print("   ✅ Supabase client initialized successfully")
else:
    print("   ❌ Supabase client initialization failed")
    error = get_initialization_error()
    if error:
        print(f"   Error: {error}")
    print("\n   Check:")
    print("   - SUPABASE_URL is set in .env")
    print("   - SUPABASE_SERVICE_ROLE_KEY is set in .env")
    sys.exit(1)

# Test 2: Check availability
print("\n2. Testing client availability...")
if is_supabase_available():
    print("   ✅ Supabase client is available")
else:
    print("   ❌ Supabase client is not available")
    sys.exit(1)

# Test 3: Test connection
print("\n3. Testing database connection...")
if test_connection():
    print("   ✅ Database connection successful")
else:
    print("   ❌ Database connection failed")
    print("\n   Check:")
    print("   - Supabase URL is correct")
    print("   - Service role key is valid")
    print("   - Network connectivity to Supabase")
    sys.exit(1)

# Test 4: Try a simple query
print("\n4. Testing query execution...")
try:
    result = client.table("user_profiles").select("id").limit(1).execute()
    print(f"   ✅ Query executed successfully")
    print(f"   Found {len(result.data)} rows (limit 1)")
except Exception as e:
    print(f"   ❌ Query failed: {str(e)}")
    sys.exit(1)

print("\n" + "=" * 50)
print("✅ All tests passed! Supabase client is ready to use.")
print("=" * 50)


