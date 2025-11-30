// API base URL
const API_BASE = 'http://localhost:3001';

// Authentication state
let isAuthenticated = false;

// State
let currentSessionId = null;
let lastQuery = null;
let typewriterTimer = null;
let currentMessageIndex = 0;
let currentCharIndex = 0;

// Typewriter messages for landing page
const typewriterMessages = [
  "What type of product do you want?",
  "Which brand do you prefer?",
  "What's your budget range?",
  "What style are you looking for?",
  "Where do you want to shop?",
  "What features matter most?",
  "Which color do you prefer?",
  "What size do you need?",
];

// Initialize the app
function init() {
  // Check authentication first
  checkAuth();
  
  if (!isAuthenticated) {
    return; // Will redirect to login page
  }
  
  setupEventListeners();
  startTypewriter();
}

// Setup event listeners
function setupEventListeners() {
  // Menu button
  const menuButton = document.getElementById('menuButton');
  const menuDropdown = document.getElementById('menuDropdown');
  
  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.classList.toggle('show');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuButton.contains(e.target) && !menuDropdown.contains(e.target)) {
      menuDropdown.classList.remove('show');
    }
  });

  // Menu items
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menuDropdown.classList.remove('show');
      
      // Handle Home button
      if (item.dataset.category === 'all' || item.textContent.trim() === 'Home') {
        showLandingPage();
      }
      // Other menu items can be handled here in the future
    });
  });

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // Clear authentication
      localStorage.removeItem('authToken');
      localStorage.removeItem('rememberMe');
      // Redirect to login page
      window.location.href = '/login.html';
    });
  }

  // Get Started button (landing page)
  const getStartedBtn = document.getElementById('getStartedBtn');
  getStartedBtn.addEventListener('click', handleGetStarted);

  // Enter key on landing page input
  const queryInput = document.getElementById('queryInput');
  queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGetStarted();
    }
  });

  // Back button (chat interface)
  const backButton = document.getElementById('backButton');
  backButton.addEventListener('click', () => {
    showLandingPage();
  });

  // Send button (chat interface)
  const sendButton = document.getElementById('sendButton');
  sendButton.addEventListener('click', sendMessage);

  // Enter key on chat input
  const chatInput = document.getElementById('chatInput');
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Close results overlay
  const closeBtn = document.getElementById('closeBtn');
  closeBtn.addEventListener('click', () => {
    document.getElementById('resultsOverlay').classList.remove('show');
  });

  // Close overlay when clicking outside
  const overlay = document.getElementById('resultsOverlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('show');
    }
  });

  // Listen for answers submitted from widget iframe
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'answers-submitted') {
      const { sessionId, answers, result } = event.data;
      handleAnswersSubmitted(sessionId, answers, result);
    }
  });
}

// Typewriter effect
function startTypewriter() {
  const currentMessage = typewriterMessages[currentMessageIndex];
  const typewriterText = document.getElementById('typewriterText');

  if (!typewriterText) return; // Landing page not visible

  if (currentCharIndex < currentMessage.length) {
    typewriterText.textContent = currentMessage.substring(0, currentCharIndex + 1);
    currentCharIndex++;
    typewriterTimer = setTimeout(startTypewriter, 80); // 80ms per character
  } else {
    // Pause before next message
    typewriterTimer = setTimeout(() => {
      currentMessageIndex = (currentMessageIndex + 1) % typewriterMessages.length;
      currentCharIndex = 0;
      typewriterText.textContent = '';
      startTypewriter();
    }, 2000); // 2 second pause
  }
}

// Stop typewriter
function stopTypewriter() {
  if (typewriterTimer) {
    clearTimeout(typewriterTimer);
    typewriterTimer = null;
  }
}

// Show landing page
function showLandingPage() {
  const mainContent = document.getElementById('mainContent');
  const chatInterface = document.getElementById('chatInterface');
  
  mainContent.style.display = 'flex';
  chatInterface.style.display = 'none';
  
  // Restart typewriter
  currentMessageIndex = 0;
  currentCharIndex = 0;
  startTypewriter();
  
  // Clear chat
  const chatContainer = document.getElementById('chatContainer');
  chatContainer.innerHTML = '';
  
  // Reset state
  currentSessionId = null;
  lastQuery = null;
  
  // Reset status
  updateStatus('Ready', 'default');
}

// Show chat interface
function showChatInterface() {
  const mainContent = document.getElementById('mainContent');
  const chatInterface = document.getElementById('chatInterface');
  const chatContainer = document.getElementById('chatContainer');
  
  mainContent.style.display = 'none';
  chatInterface.style.display = 'flex';
  
  // Stop typewriter
  stopTypewriter();
  
  // Add welcome message if chat is empty
  if (chatContainer.children.length === 0) {
    addWelcomeMessage();
  }
  
  // Focus chat input
  setTimeout(() => {
    document.getElementById('chatInput').focus();
  }, 100);
}

// Add welcome message to chat
function addWelcomeMessage() {
  const welcomeText = "👋 Hi! I'm your Q&A Recommendation Agent. Ask me to recommend something and I'll generate personalized questions for you!\n\nTry asking: \"I want shoes for work\" or \"Recommend me laptops for coding\"";
  addMessage(welcomeText, false);
}

// Update status badge
function updateStatus(text, type = 'default') {
  const statusBadge = document.getElementById('statusBadge');
  if (!statusBadge) return;
  
  // For loading state, show just hourglass icon
  if (type === 'loading') {
    statusBadge.innerHTML = '<span class="hourglass-icon">⏳</span>';
  } else {
    statusBadge.textContent = text;
  }
  statusBadge.className = `status-badge ${type}`;
}

// Handle Get Started button (from landing page)
async function handleGetStarted() {
  const queryInput = document.getElementById('queryInput');
  const query = queryInput.value.trim();
  
  if (!query) {
    // Show visual feedback for empty input
    queryInput.style.borderColor = '#ff3b30';
    queryInput.placeholder = 'Please enter a question or request...';
    setTimeout(() => {
      queryInput.style.borderColor = '';
      queryInput.placeholder = 'Ask for recommendations... (e.g., \'I want running shoes for marathon training\')';
    }, 2000);
    return;
  }
  
  // Show chat interface
  showChatInterface();
  
  // Add user message
  addMessage(query, true);
  
  // Clear input
  queryInput.value = '';
  
  // Process query
  await processQuery(query);
}

// Process query (generate questions)
async function processQuery(query) {
  lastQuery = query;
  updateStatus('Generating questions...', 'loading');
  
  const sendButton = document.getElementById('sendButton');
  const chatInput = document.getElementById('chatInput');
  
  sendButton.disabled = true;
  chatInput.disabled = true;
  
  // Add loading message
  const loadingMessage = addLoadingMessage('Generating personalized questions for you...');
  
  try {
    const response = await fetch(`${API_BASE}/api/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success && data.sessionId) {
      currentSessionId = data.sessionId;
      
      // Store questions globally for flashcard display
      if (data.questions) {
        window.currentQuestions = data.questions;
        window.currentSessionId = data.sessionId;
      }
      
      // Remove loading message
      if (loadingMessage) {
        loadingMessage.remove();
      }
      
      // Display questions as flashcards
      if (data.questions && data.questions.length > 0) {
        displayQuestionFlashcards(data.questions, data.sessionId);
        updateStatus('Ready', 'default');
      } else {
        // Fallback to widget if questions not in response
        await fetchAndDisplayWidget(data.sessionId);
        updateStatus('Ready', 'default');
      }
    } else {
      // Remove loading message
      if (loadingMessage) {
        loadingMessage.remove();
      }
      throw new Error(data.error || 'Failed to generate questions');
    }
  } catch (error) {
    console.error('Error:', error);
    // Remove loading message
    if (loadingMessage) {
      loadingMessage.remove();
    }
    addError(`Question generation failed: ${error.message}`, true);
    updateStatus('Error', 'error');
  } finally {
    sendButton.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
}

// Send message (from chat interface)
async function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  const query = chatInput.value.trim();
  
  if (!query) return;
  
  // Add user message
  addMessage(query, true);
  
  // Clear input
  chatInput.value = '';
  
  // Process query
  await processQuery(query);
}

// Fetch and display questions as flashcards
async function fetchAndDisplayWidget(sessionId) {
  try {
    updateStatus('Loading questions...', 'loading');
    
    // Fetch widget HTML to extract questions (we'll parse it or use a better endpoint)
    // For now, let's create a new endpoint or parse the widget
    // Actually, let's store questions in a global variable when we get them
    if (window.currentQuestions && window.currentSessionId === sessionId) {
      displayQuestionFlashcards(window.currentQuestions, sessionId);
      updateStatus('Ready', 'default');
      return;
    }
    
    // Fallback: fetch widget and extract questions from it
    const response = await fetch(`${API_BASE}/api/widget/${sessionId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const widgetHtml = await response.text();
    
    // Parse questions from widget HTML (temporary solution)
    // Better would be to have a /api/questions/:sessionId endpoint
    // For now, we'll need to store questions when we first get them
    addError('Please refresh and try again. Questions should be available.');
    updateStatus('Error', 'error');
  } catch (error) {
    console.error('Error fetching questions:', error);
    addError(`Failed to load questions: ${error.message}`);
    updateStatus('Error', 'error');
  }
}

// Add message to chat
function addMessage(text, isUser = false) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
  messageDiv.innerHTML = `
    <div class="avatar ${isUser ? 'user' : 'assistant'}">${isUser ? 'U' : 'AI'}</div>
    <div class="message-content">
      <div class="message-text">${escapeHtml(text)}</div>
    </div>
  `;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return messageDiv;
}

// Add loading message
function addLoadingMessage(text) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';
  messageDiv.innerHTML = `
    <div class="avatar assistant">AI</div>
    <div class="message-content">
      <div class="message-text loading-message">
        <span class="loading"></span>
        <span style="margin-left: 8px;">${escapeHtml(text)}</span>
      </div>
    </div>
  `;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return messageDiv;
}

// Add widget to chat
function addWidget(html, sessionId) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';
  messageDiv.innerHTML = `
    <div class="avatar assistant">AI</div>
    <div class="message-content">
      <div class="widget-container" id="widget-${sessionId}"></div>
    </div>
  `;
  chatContainer.appendChild(messageDiv);
  
  // Create blob URL and display in iframe
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const widgetDiv = messageDiv.querySelector(`#widget-${sessionId}`);
  widgetDiv.innerHTML = `<iframe src="${url}" style="width: 100%; border: none; min-height: 400px;"></iframe>`;
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return messageDiv;
}

// Add error message
function addError(message, showRetry = false) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';
  
  let errorContent = `
    <div class="error">❌ ${escapeHtml(message)}</div>
  `;
  
  if (showRetry && lastQuery) {
    errorContent += `
      <button class="retry-button" onclick="retryLastQuery()">🔄 Retry</button>
    `;
  }
  
  messageDiv.innerHTML = `
    <div class="avatar assistant">AI</div>
    <div class="message-content">
      ${errorContent}
    </div>
  `;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Retry last query (used by error retry button)
function retryLastQuery() {
  if (lastQuery) {
    // Remove the error message before retrying
    const errorMessages = document.querySelectorAll('.error');
    if (errorMessages.length > 0) {
      errorMessages[errorMessages.length - 1].closest('.message').remove();
    }
    processQuery(lastQuery);
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopTypewriter();
});

// Check if user is already logged in (from localStorage)
function checkAuth() {
  const authToken = localStorage.getItem('authToken');
  
  // Simply check if auth token exists
  if (!authToken) {
    // User is not logged in, redirect to login page
    window.location.href = '/login.html';
    return;
  }
  
  isAuthenticated = true;
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

