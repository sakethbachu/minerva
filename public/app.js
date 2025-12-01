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
async function init() {
  // Check authentication first
  await checkAuth();
  
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

  // Menu items (excluding logout button)
  const menuItems = document.querySelectorAll('.menu-item:not(#logoutBtn)');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menuDropdown.classList.remove('show');
      // Menu functionality can be added here in the future
    });
  });

  // Logout button (in hamburger menu)
  const logoutBtn = document.getElementById('logoutBtn');
  
  // Function to handle logout
  async function handleLogout() {
    // Close menu first
    menuDropdown.classList.remove('show');
      try {
        // Ensure Supabase is loaded
        if (!window.supabase && window.SUPABASE_CONFIG) {
          // Load Supabase from CDN if not already loaded
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
          await new Promise((resolve) => {
            script.onload = resolve;
            document.head.appendChild(script);
          });
        }

        // Sign out from Supabase
        if (window.supabase && window.SUPABASE_CONFIG) {
          const supabase = window.supabase.createClient(
            window.SUPABASE_CONFIG.url,
            window.SUPABASE_CONFIG.anonKey
          );
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('Error signing out:', error);
          }
        }
      } catch (error) {
        console.error('Error during logout:', error);
      }
      
      // Clear any local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to login
      window.location.href = '/login.html';
  }
  
  // Attach logout handler to menu button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
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
  try {
    console.log('handleGetStarted called');
    const queryInput = document.getElementById('queryInput');
    const query = queryInput.value.trim();
    
    console.log('Query:', query);
    
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
    console.log('Calling processQuery with:', query);
    await processQuery(query);
  } catch (error) {
    console.error('Error in handleGetStarted:', error);
    addError(`Failed to process request: ${error.message}`, true);
  }
}

// Process query (generate questions)
async function processQuery(query) {
  console.log('processQuery called with:', query);
  lastQuery = query;
  updateStatus('Generating questions...', 'loading');
  
  const sendButton = document.getElementById('sendButton');
  const chatInput = document.getElementById('chatInput');
  
  sendButton.disabled = true;
  chatInput.disabled = true;
  
  // Add loading message
  const loadingMessage = addLoadingMessage('Generating personalized questions for you...');
  
  try {
    // Get auth token and add to headers
    let headers = {
      'Content-Type': 'application/json',
    };
    
    // Add Authorization header if authenticated
    if (window.supabase && window.SUPABASE_CONFIG) {
      try {
        console.log('Getting auth token...');
        const supabase = window.supabase.createClient(
          window.SUPABASE_CONFIG.url,
          window.SUPABASE_CONFIG.anonKey
        );
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Error getting session:', sessionError);
        }
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          console.log('Auth token added to headers');
        } else {
          console.warn('No auth token available');
        }
      } catch (error) {
        console.error('Error getting auth token:', error);
      }
    } else {
      console.warn('Supabase not available');
    }
    
    console.log('Making API request to:', `${API_BASE}/api/questions`);
    console.log('Headers:', headers);
    console.log('Body:', { query });
    
    const response = await fetch(`${API_BASE}/api/questions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ query })
    });
    
    console.log('Response status:', response.status, response.statusText);

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

// Check if user is already logged in (using Supabase)
async function checkAuth() {
  // Load Supabase config and client
  if (!window.SUPABASE_CONFIG) {
    // If config not loaded, try to load it
    const script = document.createElement('script');
    script.src = '/supabase-config.js';
    await new Promise((resolve) => {
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  if (!window.supabase) {
    // Load Supabase from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    await new Promise((resolve) => {
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  const supabase = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      window.location.href = '/login.html';
      return;
    }

    if (!session) {
      // User is not logged in, redirect to login page
      window.location.href = '/login.html';
      return;
    }

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 means no rows found
      console.error('Error checking profile:', profileError);
      window.location.href = '/login.html';
      return;
    }

    if (!profile) {
      // User doesn't have profile, redirect to profile page
      window.location.href = '/profile.html';
      return;
    }

    // User is authenticated and has profile
    isAuthenticated = true;
  } catch (error) {
    console.error('Error in checkAuth:', error);
    window.location.href = '/login.html';
  }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

