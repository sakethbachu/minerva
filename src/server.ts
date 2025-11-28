import "dotenv/config";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generateQuestions } from "./services/questionGenerator.js";
import { Question } from "./types/question.types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Configuration: number of questions (n) and answers per question (m)
const NUM_QUESTIONS = parseInt(process.env.NUM_QUESTIONS || "3");
const NUM_ANSWERS = parseInt(process.env.NUM_ANSWERS || "4");

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Add CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from public directory
app.use(express.static(join(__dirname, "../public")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Q&A Agent Server is running" });
});

// REST API endpoint to generate questions
app.post("/api/questions", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Invalid query. Expected a string." });
    }

    const sessionId = generateSessionId();
    console.log(`New session: ${sessionId} - Query: "${query}"`);

    // Generate questions
    const questions = await generateQuestions(query, NUM_QUESTIONS, NUM_ANSWERS);

    // Create session with questions
    userSessions.set(sessionId, {
      currentQuestionIndex: 0,
      answers: {},
      originalQuery: query,
      questions: questions,
    });

    console.log(`Session ${sessionId} created with ${questions.length} questions for "${query}"`);

    res.json({
      success: true,
      sessionId: sessionId,
      questions: questions,
    });
  } catch (error: unknown) {
    console.error("Error generating questions:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate questions";
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// REST API endpoint to get widget HTML for a session
app.get("/api/widget/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId || !userSessions.has(sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }

  const session = userSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const widgetHtml = generateQAWidget(sessionId);

  res.setHeader("Content-Type", "text/html");
  res.send(widgetHtml);
});

// REST API endpoint to process answers and generate recommendations
app.post("/api/answers", (req, res) => {
  try {
    const { sessionId, answers } = req.body;

    if (!sessionId || !userSessions.has(sessionId)) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "Invalid answers format" });
    }

    const session = userSessions.get(sessionId)!;

    // Store answers in session
    Object.entries(answers).forEach(([question, answer]) => {
      const questionId = session.questions.find((q) => q.text === question)?.id;
      if (questionId) {
        session.answers[questionId] = answer as string;
      }
    });

    console.log(`Session ${sessionId} - Answers processed`);

    // Generate recommendation summary
    const summary = Object.entries(answers)
      .map(([q, a]) => `- **${q}**: ${a}`)
      .join("\n");

    const recommendation = {
      sessionId: sessionId,
      originalQuery: session.originalQuery,
      answers: answers,
      summary: summary,
      message: `Based on your preferences for "${session.originalQuery}", here are your selections:\n\n${summary}`,
    };

    res.json({
      success: true,
      ...recommendation,
    });
  } catch (error) {
    console.error("Error processing answers:", error);
    res.status(500).json({ error: "Failed to process answers" });
  }
});

app.post("/submit-answers", async (req, res) => {
  try {
    const { sessionId, answers } = req.body;

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "Invalid answers format" });
    }

    if (!sessionId || !userSessions.has(sessionId)) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = userSessions.get(sessionId)!;

    // Store answers in session (answers now come with question IDs as keys)
    Object.entries(answers).forEach(([questionId, answer]) => {
      // Validate that questionId exists in session.questions
      const questionExists = session.questions.find((q) => q.id === questionId);
      if (questionExists) {
        session.answers[questionId] = answer as string;
      } else {
        console.warn(`Question ID ${questionId} not found in session questions`);
      }
    });

    console.log(`Session ${sessionId} - Answers received:`, session.answers);

    // Call Python search service with questions array
    try {
      const searchResponse = await fetch("http://localhost:8000/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: session.originalQuery,
          answers: session.answers, // {"q1": "Casual", "q2": "$50"}
          questions: session.questions, // Full question objects
          user_id: null, // TODO: Add user authentication
        }),
      });

      const searchResult = (await searchResponse.json()) as {
        success: boolean;
        results?: Array<{ title: string; description?: string; url?: string; relevance?: number }>;
        error?: string;
      };

      if (!searchResponse.ok || !searchResult.success) {
        console.error("Search service error:", searchResult.error);
        return res.status(500).json({
          success: false,
          error: searchResult.error || "Search service failed",
          message: "Failed to generate recommendations",
        });
      }

      console.log(
        `Session ${sessionId} - Search completed, results:`,
        searchResult.results?.length || 0
      );

      res.json({
        success: true,
        message: "Answers received and search completed!",
        sessionId: sessionId,
        searchResults: searchResult.results || [],
      });
    } catch (searchError) {
      console.error("Error calling search service:", searchError);
      return res.status(500).json({
        success: false,
        error: "Failed to call search service",
        message: "Search service unavailable",
      });
    }
  } catch (error) {
    console.error("Error processing answers:", error);
    res.status(500).json({ error: "Failed to process answers" });
  }
});

interface SessionData {
  currentQuestionIndex: number;
  answers: Record<string, string>;
  originalQuery: string;
  questions: Question[];
}

const userSessions = new Map<string, SessionData>();

function generateQAWidget(sessionId: string): string {
  const session = userSessions.get(sessionId)!;
  const questions = session.questions;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Q&A Recommendation Agent</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 20px;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }
    h1 {
      color: #333;
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 24px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .question-block {
      margin-bottom: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .question-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 15px;
      font-size: 16px;
    }
    .question-number {
      display: inline-block;
      background: #667eea;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      margin-right: 10px;
      font-size: 12px;
    }
    .answers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }
    .answer-button {
      padding: 12px 20px;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      text-align: center;
    }
    .answer-button:hover {
      border-color: #667eea;
      background: #f0f4ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }
    .answer-button:active {
      transform: translateY(0);
    }
    .selected {
      background: #667eea !important;
      color: white !important;
      border-color: #667eea !important;
    }
    .info-box {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #1976d2;
    }
    .submit-button {
      display: none;
      width: 100%;
      padding: 16px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 30px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    .submit-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    .submit-button:active {
      transform: translateY(0);
    }
    .submit-button.show {
      display: block;
    }
    .submit-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Recommendation Assistant</h1>
    <p class="subtitle">Answer these questions to get personalized recommendations</p>
    
    <div class="info-box">
      👋 Click on your preferred answer for each question. After answering all questions, click the "Submit Answers" button to send your preferences and get recommendations!
    </div>
    
    ${questions
      .map((question, index) => {
        const answers = question.answers.slice(0, NUM_ANSWERS);
        return `
        <div class="question-block">
          <div class="question-title">
            <span class="question-number">${index + 1}</span>
            ${question.text}
          </div>
          <div class="answers-grid">
            ${answers.map((answer: string) => `
              <button 
                class="answer-button" 
                onclick="selectAnswer('${question.id}', '${answer}', this)"
              >
                ${answer}
              </button>
            `).join("")}
          </div>
        </div>
      `;
      })
      .join("")}
    
    <button id="submitButton" class="submit-button" onclick="submitAnswers()">
      🚀 Submit Answers & Get Recommendations
    </button>
  </div>

  <script>
    const sessionId = '${sessionId}';
    const selectedAnswers = {};
    const questionData = ${JSON.stringify(questions)};
    let allQuestionsAnswered = false;

    function selectAnswer(questionId, answer, button) {
      // Visual feedback
      const questionBlock = button.closest('.question-block');
      const allButtons = questionBlock.querySelectorAll('.answer-button');
      allButtons.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
      
      // Store selection
      selectedAnswers[questionId] = answer;
      
      console.log('Answer selected:', { sessionId, questionId, answer });
      console.log('All answers so far:', selectedAnswers);
      
      // Show visual confirmation
      const originalText = button.textContent;
      button.textContent = '✓ ' + answer;
      
      setTimeout(() => {
        button.textContent = originalText;
      }, 800);
      
      // Check if all questions are answered
      const totalQuestions = document.querySelectorAll('.question-block').length;
      const submitButton = document.getElementById('submitButton');
      
      if (Object.keys(selectedAnswers).length === totalQuestions) {
        allQuestionsAnswered = true;
        submitButton.classList.add('show');
        submitButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    async function submitAnswers() {
      const submitButton = document.getElementById('submitButton');
      submitButton.disabled = true;
      submitButton.textContent = '⏳ Submitting...';
      
      console.log('Submitting answers to server:', selectedAnswers);
      
      try {
        // Send answers with question IDs (not text) for consistency
        console.log('Submitting answers to server:', selectedAnswers);
        
        // Detect server URL - try parent window first (if in iframe), then fallback to localhost
        let serverUrl = 'http://localhost:3001';
        try {
          if (window.parent && window.parent !== window) {
            // We're in an iframe, try to get parent's origin
            const parentOrigin = window.parent.location.origin;
            if (parentOrigin && parentOrigin.includes('localhost')) {
              serverUrl = parentOrigin.replace(/:[0-9]+$/, ':3001'); // Replace port with 3001
            }
          }
        } catch (e) {
          // Cross-origin error, use default
          console.log('Cannot access parent origin, using default:', serverUrl);
        }
        
        console.log('Submitting to:', serverUrl + '/submit-answers');
        
        // Direct HTTP POST to server with question IDs
        const response = await fetch(serverUrl + '/submit-answers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionId,
            answers: selectedAnswers  // Send question IDs directly
          })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          submitButton.textContent = '✅ Submitted Successfully!';
          submitButton.style.background = '#4caf50';
          
          // Notify parent window if in iframe
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'answers-submitted',
              sessionId: sessionId,
              answers: selectedAnswers,  // Send question IDs
              result: result
            }, '*');
          }
          
          console.log('Answers submitted successfully:', result);
        } else {
          throw new Error(result.error || 'HTTP request failed');
        }
      } catch (error) {
        console.error('Error submitting answers:', error);
        submitButton.textContent = '❌ Error: ' + (error.message || 'Failed to submit');
        submitButton.style.background = '#f44336';
        submitButton.disabled = false;
        setTimeout(() => showSummary(), 1000);
      }
    }

    function showSummary() {
      const container = document.querySelector('.container');
      
      // Generate text format for copying
      const answersText = Object.entries(selectedAnswers).map(([qId, ans]) => {
        const questionData = ${JSON.stringify(questions)}.find(q => q.id === qId);
        return \`\${questionData.text}: \${ans}\`;
      }).join('\\n');
      
      const summaryHtml = \`
        <div style="margin-top: 30px; padding: 20px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
          <h3 style="margin-top: 0; color: #2e7d32;">✓ All Questions Answered!</h3>
          <div style="margin-top: 15px; margin-bottom: 15px;">
            \${Object.entries(selectedAnswers).map(([qId, ans]) => {
              const questionData = ${JSON.stringify(questions)}.find(q => q.id === qId);
              return \`<div style="margin: 10px 0;">
                <strong>\${questionData.text}</strong><br>
                <span style="color: #667eea; font-weight: 600;">\${ans}</span>
              </div>\`;
            }).join('')}
          </div>
          <div style="background: #fff3e0; padding: 15px; border-radius: 6px; margin-top: 15px; border: 1px solid #ffb74d;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #e65100;">📋 Copy your answers:</p>
            <textarea readonly style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical; min-height: 80px;" onclick="this.select()">\${answersText}</textarea>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
              💡 Click the text box to select all, then paste it back in chat for personalized recommendations!
            </p>
          </div>
          <p style="margin-top: 15px; margin-bottom: 0; font-size: 13px; color: #555;">
            Session ID: <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 11px;">\${sessionId}</code>
          </p>
        </div>
      \`;
      container.insertAdjacentHTML('beforeend', summaryHtml);
      
      // Scroll to summary
      container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Keep the widget alive by preventing any auto-close behavior
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Q&A Widget loaded and ready');
      console.log('Session ID:', sessionId);
    });

    // Prevent the widget from closing
    window.addEventListener('beforeunload', (e) => {
      if (Object.keys(selectedAnswers).length > 0 && !allQuestionsAnswered) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  </script>
</body>
</html>`;
}

// Generate a unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const PORT = parseInt(process.env.PORT || "3001");
app.listen(PORT, () => {
  console.log(`Q&A Recommendation Agent Server is running on http://localhost:${PORT}`);
  console.log(`Web app: http://localhost:${PORT}`);
  console.log(`Configuration: ${NUM_QUESTIONS} questions, ${NUM_ANSWERS} answers per question`);
  console.log("=".repeat(80));
});
