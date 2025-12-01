# Minerva Web App

A standalone web application that provides personalized recommendations through interactive question-and-answer sessions. Users can ask for recommendations, answer dynamically generated questions, and receive personalized suggestions.

## Overview

This web app helps users get personalized recommendations by asking them a series of questions. For example, when a user asks "Recommend me chinos for work", the app will:

1. Generate personalized questions based on the query (e.g., "What's your preferred fit?")
2. Present an interactive Q&A widget with clickable answer options
3. Collect the user's selections
4. Process answers and provide personalized recommendations

## Features

- 🔐 **Google OAuth Authentication**: Secure login with Google OAuth via Supabase
- 👤 **User Profiles**: Personalized experience with user profiles (age, gender, location)
- 🎯 **Dynamic Question Generation**: Uses Gemini/OpenAI to generate context-aware questions based on user queries
- ⚙️ **Configurable**: Easily adjust the number of questions (n) and answers (m) per question
- 📝 **Session Management**: Persistent session storage in Supabase with 24-hour expiration
- 🔍 **Personalized Search**: Search results personalized based on user demographics
- 📊 **Search History**: Tracks last 10 searches per user for personalization
- 🎨 **Modern UI**: Beautiful chat interface with gradient design and smooth animations
- 🔄 **RESTful API**: Clean REST API endpoints for easy integration
- 🐍 **Python Microservice**: Separate Python service for advanced search and question generation

## Configuration

The app uses environment variables for configuration:

### Express Server (.env)
- `NUM_QUESTIONS`: Number of questions to ask (default: 3)
- `NUM_ANSWERS`: Number of answer options per question (default: 4)
- `PORT`: Server port (default: 3001)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key (for frontend)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for backend)

### Python Service (.env)
- `GEMINI_API_KEY`: Google Gemini API key (for question generation and search)
- `TAVILY_API_KEY`: Tavily API key (for web search)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for database queries)

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd chatgpt-qa-agent
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   # Express Server
   PORT=3001
   NUM_QUESTIONS=3
   NUM_ANSWERS=3
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Python Service
   GEMINI_API_KEY=your_gemini_api_key
   TAVILY_API_KEY=your_tavily_api_key
   ```
   
   See `.env.example` for a complete template.

4. **Set up Supabase:**
   - Create a Supabase project (free tier is sufficient)
   - Run the SQL scripts in `docs/schema.sql` to create tables
   - Run the SQL scripts in `docs/rls_policies.sql` to set up security
   - Configure Google OAuth in Supabase dashboard
   - See `docs/SUPABASE_SETUP_GUIDE.md` for detailed instructions

5. **Set up Google OAuth:**
   - Create OAuth credentials in Google Cloud Console
   - Configure redirect URI in Supabase
   - See `docs/GOOGLE_OAUTH_SETUP_GUIDE.md` for detailed instructions

6. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

7. **Start the servers:**
   
   **Terminal 1 - Express server:**
   ```bash
   npm start
   ```
   
   **Terminal 2 - Python service:**
   ```bash
   cd python-service
   uvicorn main:app --reload --port 8000
   ```
   
   Or use the start script:
   ```bash
   ./start.sh
   ```

## Usage

### 1. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3001` (or your configured PORT).

### 2. Open the Web App

Open your browser and navigate to:
```
http://localhost:3001
```

### 3. Use the App

1. **Log in with Google**: Click "Sign in with Google" on the login page
2. **Complete your profile**: Enter your name, age, gender, and location (required)
3. **Ask for recommendations**: Type a recommendation request (e.g., "I want shoes for work")
4. **Answer questions**: Click on your preferred answers for each question
5. **Submit answers**: Click "Submit Answers" when all questions are answered
6. **View results**: Get personalized recommendations based on your profile and preferences

## Project Structure

```
chatgpt-qa-agent/
├── src/
│   ├── server.ts              # Main server with REST API endpoints
│   ├── services/
│   │   └── questionGenerator.ts  # Dynamic question generation logic
│   └── types/
│       └── question.types.ts     # TypeScript type definitions
├── public/
│   └── index.html             # Frontend web interface
├── docs/
│   └── e2b/                   # E2B integration docs (for future use)
├── dist/                      # Compiled JavaScript (generated)
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── .env                       # Environment variables (create this)
└── README.md                  # This file
```

## How It Works

### 1. Authentication & Profile
- User logs in with Google OAuth via Supabase
- User profile is required (name, age, gender, location)
- JWT token is stored and used for authenticated requests

### 2. Question Generation
When a user submits a query:
- The frontend sends a `POST /api/questions` request with the query (requires authentication)
- The Express server calls the Python service to generate questions
- The Python service uses Gemini API to generate context-aware questions
- Questions are validated using Pydantic schemas
- A session is created in Supabase and questions are returned

### 3. Widget Display
- The frontend fetches the widget HTML via `GET /api/widget/:sessionId`
- The widget displays questions with clickable answer buttons
- Users can select answers with visual feedback

### 4. Answer Submission & Search
- When all questions are answered, users click "Submit Answers"
- Answers are sent to `POST /submit-answers` endpoint (requires authentication)
- User profile is fetched and passed to Python service for personalization
- Answers are stored in the Supabase session
- Python service performs search with Tavily and synthesizes results with Gemini
- Search results are personalized based on user demographics (age, gender, location)

### 5. Search History
- Search queries and results are saved to `user_search_history` table
- Only the last 10 searches per user are kept (automatic cleanup)
- Search history can be used for future personalization

## API Endpoints

### POST `/api/questions`
Generates questions based on a user query. **Requires authentication.**

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "query": "I want shoes for work"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_1234567890_abc123",
  "questions": [
    {
      "id": "q1",
      "text": "What color of shoes do you prefer for work?",
      "answers": ["Black", "Brown", "Navy"]
    }
  ]
}
```

### GET `/api/widget/:sessionId`
Returns the widget HTML for a given session.

**Response:** HTML content (text/html)

### POST `/submit-answers`
Submits answers and triggers personalized search. **Requires authentication.**

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "answers": {
    "q1": "Black",
    "q2": "Oxfords"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Answers received and search completed!",
  "sessionId": "session_1234567890_abc123",
  "searchResults": [
    {
      "title": "Product Name",
      "description": "Product description",
      "url": "https://example.com/product",
      "relevance": 0.95
    }
  ]
}
```

### GET `/health`
Health check endpoint. Returns server status.

## Customization

### Adjusting Configuration

Set environment variables before starting:

```bash
NUM_QUESTIONS=5 NUM_ANSWERS=3 PORT=4000 npm start
```

### Styling the UI

Modify the CSS in the `generateQAWidget()` function in `src/server.ts` or update the styles in `public/index.html`.

### Question Generation

The question generation logic is in `src/services/questionGenerator.ts`. You can customize:
- The OpenAI model used
- The prompt structure
- Retry logic and fallback questions

## Development

### Build
```bash
npm run build
```

### Run in Development Mode
```bash
npm run dev
```

### Check Health
```bash
curl http://localhost:3001/health
```

## Troubleshooting

### Server won't start
- Check if port 3001 is already in use
- Try a different port: `PORT=3002 npm start`
- Verify your `.env` file exists and contains `OPENAI_API_KEY`

### Questions not generating
- Verify your `GEMINI_API_KEY` is set correctly in `.env`
- Check that Python service is running on port 8000
- Check server logs for API errors
- Ensure you have sufficient API credits

### Authentication issues
- Verify Supabase credentials are set in `.env`
- Check that Google OAuth is configured in Supabase dashboard
- Verify redirect URLs are set correctly
- Check browser console for auth errors

### Widget not displaying
- Check browser console for errors
- Verify the session ID is valid
- Ensure the server is running and accessible

## Future Enhancements

### E2B Integration
E2B integration documentation is available in `docs/e2b/` for future implementation. This will enable:
- Advanced code execution capabilities
- Web search integration (Exa, Perplexity)
- Enhanced recommendation generation

### Planned Features
1. **Database Integration**: Connect to a real product/service database
2. **Persistent Storage**: Use Redis or a database for session management
3. **Advanced Recommendations**: Implement ML-based recommendation algorithms
4. **User Authentication**: Add user accounts and preferences
5. **Analytics**: Track user interactions and improve recommendations
6. **Testing**: Add comprehensive unit and integration tests

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!
