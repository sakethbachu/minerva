#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Q&A Recommendation Service${NC}\n"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found!${NC}"
    echo "Please create a .env file with required API keys:"
    echo "  - OPENAI_API_KEY"
    echo "  - E2B_API_KEY"
    echo "  - EXA_API_KEY"
    echo "  - GROQ_API_KEY"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install
fi

# Check if dist exists
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}🔨 Building TypeScript code...${NC}"
    npm run build
fi

# Check if Python dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
    cd python-service
    pip3 install -r requirements.txt
    cd ..
fi

echo -e "${GREEN}✅ Dependencies ready!${NC}\n"

# Start Python service in background
echo -e "${BLUE}🐍 Starting Python service on port 8000...${NC}"
cd python-service
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
PYTHON_PID=$!
cd ..

# Wait a bit for Python service to start
sleep 3

# Check if Python service started successfully
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  Python service may not have started correctly${NC}"
else
    echo -e "${GREEN}✅ Python service is running${NC}\n"
fi

# Start Express server
echo -e "${BLUE}🚀 Starting Express server on port 3001...${NC}"
echo -e "${GREEN}📱 Open http://localhost:3001 in your browser${NC}\n"

# Trap to kill Python process on exit
trap "kill $PYTHON_PID 2>/dev/null" EXIT

# Start Express server (foreground)
npm start

