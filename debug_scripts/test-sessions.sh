#!/bin/bash

# Quick test script for session functionality
# Make sure server is running and you're logged in

echo "🧪 Testing Session Functionality"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "1. Checking if server is running..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running. Start it with: npm start${NC}"
    exit 1
fi

echo ""
echo "2. Testing session creation..."
echo "   (You'll need to provide a JWT token from browser console)"
echo ""
echo "To get your token, run this in browser console:"
echo ""
echo "  const supabase = window.supabase.createClient("
echo "    window.SUPABASE_CONFIG.url,"
echo "    window.SUPABASE_CONFIG.anonKey"
echo "  );"
echo "  const { data: { session } } = await supabase.auth.getSession();"
echo "  console.log('Token:', session?.access_token);"
echo ""
read -p "Paste your JWT token here (or press Enter to skip): " TOKEN

if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Skipping API tests. You can test manually using the guide.${NC}"
    exit 0
fi

echo ""
echo "3. Creating a test session..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "test session query"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Session created successfully${NC}"
    SESSION_ID=$(echo "$BODY" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
    echo "   Session ID: $SESSION_ID"
    echo ""
    echo "4. Check Supabase Dashboard → Table Editor → user_sessions"
    echo "   You should see a new session with:"
    echo "   - session_id: $SESSION_ID"
    echo "   - original_query: 'test session query'"
    echo "   - expires_at: 24 hours from now"
else
    echo -e "${RED}❌ Failed to create session${NC}"
    echo "   HTTP Code: $HTTP_CODE"
    echo "   Response: $BODY"
fi

echo ""
echo "5. Testing session retrieval..."

if [ -n "$SESSION_ID" ]; then
    WIDGET_RESPONSE=$(curl -s -w "\n%{http_code}" "http://localhost:3001/api/widget/$SESSION_ID")
    WIDGET_HTTP_CODE=$(echo "$WIDGET_RESPONSE" | tail -n1)
    
    if [ "$WIDGET_HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✅ Session retrieved successfully${NC}"
    else
        echo -e "${RED}❌ Failed to retrieve session${NC}"
        echo "   HTTP Code: $WIDGET_HTTP_CODE"
    fi
fi

echo ""
echo "================================"
echo "✅ Testing complete!"
echo ""
echo "Next steps:"
echo "1. Check Supabase Dashboard → user_sessions table"
echo "2. Verify session data is correct"
echo "3. Test expiration by manually setting expires_at to past date"


