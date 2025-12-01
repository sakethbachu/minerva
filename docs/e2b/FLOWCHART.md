# 🔄 End-to-End Process Flowchart

## Complete System Flow

```mermaid
flowchart TD
    Start([User opens website]) --> Input[User types query:<br/>'I want running shoes for marathon training']
    
    Input --> SendQuery[Frontend: POST /api/questions<br/>with user query]
    
    SendQuery --> ExpressServer[Express.js Server<br/>Port 3001]
    
    ExpressServer --> PythonQGen[Python Service: POST /api/generate-questions<br/>Port 8000]
    
    PythonQGen --> OpenAI1[OpenAI API Call<br/>Generate 3 questions based on query]
    
    OpenAI1 --> Questions[Questions Generated:<br/>- Brand preference?<br/>- Cushioning type?<br/>- Heel-to-toe drop?]
    
    Questions --> Widget[Express.js generates<br/>Interactive Widget HTML]
    
    Widget --> DisplayWidget[Frontend displays<br/>Question Widget in iframe]
    
    DisplayWidget --> UserAnswers[User clicks answers:<br/>Brooks, Plush, Medium]
    
    UserAnswers --> Submit[User clicks<br/>'Submit Answers' button]
    
    Submit --> SubmitAPI[Frontend: POST /submit-answers<br/>with answers: q1:Brooks, q2:Plush, q3:Medium]
    
    SubmitAPI --> ExpressAnswers[Express.js: /submit-answers endpoint]
    
    ExpressAnswers --> StoreSession[Store answers in session:<br/>session.answers = q1:Brooks, q2:Plush, q3:Medium<br/>session.questions = full question objects]
    
    StoreSession --> PythonSearch[Express.js: POST /api/search<br/>to Python Service]
    
    PythonSearch --> SearchEndpoint[Python Service: /api/search endpoint]
    
    SearchEndpoint --> E2BSandbox[Create E2B AsyncSandbox<br/>with Exa MCP configured]
    
    E2BSandbox --> MCPConfig[E2B Sandbox automatically:<br/>- Sets up Exa MCP server<br/>- Configures with EXA_API_KEY<br/>- Exposes MCP URL & Token]
    
    MCPConfig --> GetMCP[Get MCP URL & Token<br/>sandbox.get_mcp_url<br/>sandbox.get_mcp_token]
    
    GetMCP --> BuildQuery[Build search query from:<br/>- User query: 'running shoes for marathon training'<br/>- Answers: 'Brand: Brooks, Cushioning: Plush, Drop: Medium']
    
    BuildQuery --> CallMCP[Call MCP Server HTTP API:<br/>POST /tools/call<br/>with exa_search tool]
    
    CallMCP --> ExaSearch[Exa AI Search API<br/>Searches web for:<br/>'Brooks plush cushioning medium drop<br/>marathon training running shoes']
    
    ExaSearch --> ExaResults[Exa returns search results:<br/>- Product titles<br/>- Descriptions<br/>- URLs<br/>- Relevance scores]
    
    ExaResults --> FormatResults[Format Exa results for LLM:<br/>Create structured text with<br/>titles, URLs, descriptions]
    
    FormatResults --> CheckProvider{Check LLM_PROVIDER<br/>env variable}
    
    CheckProvider -->|openai| UseOpenAI[Use OpenAI API<br/>model: gpt-4]
    CheckProvider -->|groq| UseGroq[Use Groq API<br/>model: llama-3.1-70b-versatile]
    CheckProvider -->|anthropic| UseAnthropic[Use Anthropic API<br/>model: claude-3]
    
    UseOpenAI --> LLMSynthesis[LLM synthesizes recommendations:<br/>- Combines user preferences<br/>- Exa search results<br/>- Formats as structured list]
    UseGroq --> LLMSynthesis
    UseAnthropic --> LLMSynthesis
    
    LLMSynthesis --> ParseResponse[Parse LLM response:<br/>Extract product recommendations<br/>with titles, descriptions, URLs]
    
    ParseResponse --> KillSandbox[Kill E2B Sandbox<br/>sandbox.kill]
    
    KillSandbox --> ReturnResults[Return SearchResponse:<br/>success: true<br/>results: [recommendations]]
    
    ReturnResults --> ExpressReturn[Express.js receives results]
    
    ExpressReturn --> PostMessage[Widget posts message to parent:<br/>type: 'answers-submitted'<br/>result: {searchResults: [...]}]
    
    PostMessage --> FrontendDisplay[Frontend displays search results:<br/>- Search Results header<br/>- Product cards with:<br/>  * Title<br/>  * Description<br/>  * URL (clickable)<br/>  * Relevance score]
    
    FrontendDisplay --> End([User sees recommendations])
    
    style Start fill:#e1f5ff
    style End fill:#c8e6c9
    style E2BSandbox fill:#fff3e0
    style ExaSearch fill:#f3e5f5
    style LLMSynthesis fill:#e8f5e9
    style FrontendDisplay fill:#e3f2fd
```

## 🔑 Key Components

### 1. **Frontend (Browser)**
- **File**: `public/index.html`
- **Responsibilities**:
  - User input interface
  - Question widget display
  - Answer collection
  - Search results display

### 2. **Express.js Server (Node.js)**
- **File**: `src/server.ts`
- **Port**: 3001
- **Endpoints**:
  - `POST /api/questions` - Generate questions
  - `GET /api/widget/:sessionId` - Get question widget
  - `POST /submit-answers` - Process answers & trigger search
- **Responsibilities**:
  - Session management
  - Widget generation
  - Orchestration between frontend and Python service

### 3. **Python Service (FastAPI)**
- **File**: `python-service/main.py`
- **Port**: 8000
- **Endpoints**:
  - `POST /api/generate-questions` - Generate questions via OpenAI
  - `POST /api/search` - Search with E2B + Exa
- **Responsibilities**:
  - Question generation
  - E2B sandbox management
  - MCP server integration
  - LLM provider abstraction

### 4. **E2B Sandbox**
- **Service**: E2B Cloud
- **Configuration**:
  - Exa MCP server pre-configured
  - Isolated microVM environment
  - Secure execution
- **Responsibilities**:
  - Host Exa MCP server
  - Provide MCP HTTP endpoint
  - Manage sandbox lifecycle

### 5. **Exa AI Search**
- **Service**: Exa AI API
- **Integration**: Via E2B MCP server
- **Responsibilities**:
  - Web search for products
  - Result ranking
  - URL extraction

### 6. **LLM Provider (OpenAI/Groq/Anthropic)**
- **Default**: OpenAI (GPT-4)
- **Configurable**: Via `LLM_PROVIDER` env var
- **Responsibilities**:
  - Synthesize search results
  - Format recommendations
  - Match user preferences

## 📊 Data Flow

### Question Generation Flow
```
User Query → Express.js → Python Service → OpenAI API
                                    ↓
                            Questions Generated
                                    ↓
                            Express.js → Widget HTML
                                    ↓
                            Frontend Display
```

### Search Flow
```
User Answers → Express.js → Python Service
                              ↓
                        E2B Sandbox Creation
                              ↓
                        MCP Server Setup
                              ↓
                        HTTP Call to MCP
                              ↓
                        Exa AI Search
                              ↓
                        Search Results
                              ↓
                        LLM Synthesis (OpenAI)
                              ↓
                        Formatted Recommendations
                              ↓
                        Express.js → Frontend
                              ↓
                        Display Results
```

## 🔄 Request/Response Formats

### 1. Question Generation Request
```json
POST /api/questions
{
  "query": "I want running shoes for marathon training"
}
```

### 2. Question Generation Response
```json
{
  "success": true,
  "sessionId": "session_123_abc",
  "questions": [
    {
      "id": "q1",
      "text": "What is your preferred brand?",
      "answers": ["Nike", "Adidas", "Brooks"]
    },
    ...
  ]
}
```

### 3. Search Request
```json
POST /api/search
{
  "query": "I want running shoes for marathon training",
  "answers": {
    "q1": "Brooks",
    "q2": "Plush",
    "q3": "Medium"
  },
  "questions": [
    {
      "id": "q1",
      "text": "What is your preferred brand?",
      "answers": ["Nike", "Adidas", "Brooks"]
    },
    ...
  ]
}
```

### 4. Search Response
```json
{
  "success": true,
  "results": [
    {
      "title": "Brooks Men's Glycerin 18 Running Shoe",
      "description": "High energizing cushioning...",
      "url": "https://www.brooksrunning.com/...",
      "relevance": 0.95
    },
    ...
  ]
}
```

## ⚙️ Environment Variables

```bash
# Required
E2B_API_KEY=your_e2b_key
EXA_API_KEY=your_exa_key
OPENAI_API_KEY=your_openai_key

# Optional (for provider selection)
LLM_PROVIDER=openai  # or 'groq' or 'anthropic'
GROQ_API_KEY=your_groq_key  # if using Groq
```

## 🎯 Key Design Decisions

1. **Provider-Agnostic Architecture**
   - MCP server called directly via HTTP
   - LLM provider selected at runtime
   - Easy to switch providers

2. **Separation of Concerns**
   - Frontend: UI/UX only
   - Express.js: Orchestration & session management
   - Python Service: AI/ML operations

3. **E2B Sandbox Benefits**
   - Secure execution environment
   - Pre-configured MCP servers
   - No manual server setup needed

4. **Question IDs for Consistency**
   - Answers stored with question IDs
   - Questions array passed for context
   - Easy to map answers to questions

## 🚀 Performance Characteristics

- **Question Generation**: ~2-5 seconds
- **E2B Sandbox Creation**: ~3-5 seconds
- **Exa Search**: ~2-4 seconds
- **LLM Synthesis**: ~3-6 seconds
- **Total Search Time**: ~10-20 seconds

## 🔒 Security Features

- API keys stored in `.env` (not in code)
- E2B sandbox isolation
- MCP token authentication
- CORS protection
- Session-based data management



