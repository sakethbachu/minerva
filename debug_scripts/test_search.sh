#!/bin/bash

# Test script for search_service.py endpoint
# Usage: ./test_search.sh

BASE_URL="http://localhost:8000"

echo "=== Testing Search Service ==="
echo ""

# # Test 1: Basic search with questions and answers
# echo "Test 1: Basic search for running shoes"
# curl -X POST "${BASE_URL}/api/search" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "query": "I want running shoes for men",
#     "answers": {
#       "q1": "Casual",
#       "q2": "$100-200",
#       "q3": "Nike",
#       "q4": "Size 10"
#     },
#     "questions": [
#       {
#         "id": "q1",
#         "text": "What is your preferred style?",
#         "answers": ["Casual", "Formal", "Sporty"]
#       },
#       {
#         "id": "q2",
#         "text": "What is your budget range?",
#         "answers": ["Under $50", "$50-100", "$100-200", "Over $200"]
#       },
#       {
#         "id": "q3",
#         "text": "Do you have a preferred brand?",
#         "answers": ["Nike", "Adidas", "ASICS", "New Balance", "No preference"]
#       },
#       {
#         "id": "q4",
#         "text": "What size do you need?",
#         "answers": ["Size 8", "Size 9", "Size 10", "Size 11", "Size 12"]
#       }
#     ],
#     "user_id": "test_user_123"
#   }' | python3 -m json.tool

# echo ""
echo "---"
echo ""

# Test 2: Search without user_id (optional field)
echo "Test 2: Search without user_id"
curl -X POST "${BASE_URL}/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "laptop for programming",
    "answers": {
      "q1": "MacBook",
      "q2": "16GB RAM"
    },
    "questions": [
      {
        "id": "q1",
        "text": "What brand do you prefer?",
        "answers": ["MacBook", "Dell", "Lenovo"]
      },
      {
        "id": "q2",
        "text": "How much RAM?",
        "answers": ["8GB", "16GB RAM", "32GB"]
      }
    ]
  }' | python3 -m json.tool

echo ""
echo "---"
echo ""

# Test 3: Health check
echo "Test 3: Health check"
curl -s "${BASE_URL}/health" | python3 -m json.tool

echo ""
echo "=== Tests Complete ==="


