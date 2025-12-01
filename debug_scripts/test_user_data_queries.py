#!/usr/bin/env python3
"""
Test script to verify user data query functions.
Run this to test fetching user profiles and search history.
"""

import sys
from pathlib import Path

# Add parent directory to path to load .env
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from services.user_data_service import (
    get_user_profile,
    get_user_search_history,
    get_user_data,
)

# Use the test user_id from earlier
TEST_USER_ID = "ce99e637-2f13-413d-949e-d0e39046a071"

print("🧪 Testing User Data Queries")
print("=" * 50)
print(f"Test User ID: {TEST_USER_ID}\n")

# Test 1: Get user profile
print("1. Testing get_user_profile()...")
profile = get_user_profile(TEST_USER_ID)
if profile:
    print("   ✅ User profile fetched successfully")
    print(f"   Name: {profile.get('name')}")
    print(f"   Age: {profile.get('age')}")
    print(f"   Gender: {profile.get('gender')}")
    print(f"   Lives in US: {profile.get('lives_in_us')}")
else:
    print("   ⚠️  User profile not found (this is okay if user hasn't created profile)")

# Test 2: Get search history
print("\n2. Testing get_user_search_history()...")
history = get_user_search_history(TEST_USER_ID, limit=10)
if history is not None:
    print(f"   ✅ Search history fetched successfully")
    print(f"   Found {len(history)} search entries")
    if history:
        print(f"   Most recent search: {history[0].get('query', 'N/A')}")
        print(f"   Created at: {history[0].get('created_at', 'N/A')}")
    else:
        print("   No search history yet (this is okay)")
else:
    print("   ❌ Error fetching search history")

# Test 3: Get both (combined function)
print("\n3. Testing get_user_data()...")
user_data = get_user_data(TEST_USER_ID)
if user_data:
    print("   ✅ User data fetched successfully")
    print(f"   Profile: {'Found' if user_data.get('profile') else 'Not found'}")
    print(f"   Search history: {len(user_data.get('search_history', []))} entries")
else:
    print("   ❌ Error fetching user data (Supabase unavailable)")

# Test 4: Test with invalid user_id
print("\n4. Testing with invalid user_id...")
invalid_profile = get_user_profile("00000000-0000-0000-0000-000000000000")
if invalid_profile is None:
    print("   ✅ Correctly returned None for non-existent user")
else:
    print("   ⚠️  Unexpected: returned data for invalid user_id")

print("\n" + "=" * 50)
print("✅ All tests completed!")
print("=" * 50)


