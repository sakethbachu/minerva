// API base URL
const API_BASE = 'http://localhost:3001';

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
      // Menu functionality can be added here in the future
    });
  });

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
  
  statusBadge.textContent = text;
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

// Display questions as flashcards (one at a time)
function displayQuestionFlashcards(questions, sessionId) {
  const chatContainer = document.getElementById('chatContainer');
  
  // Create flashcard container
  const flashcardContainer = document.createElement('div');
  flashcardContainer.className = 'message assistant';
  flashcardContainer.innerHTML = `
    <div class="avatar assistant">AI</div>
    <div class="message-content">
      <div class="flashcard-container" id="flashcardContainer-${sessionId}"></div>
    </div>
  `;
  chatContainer.appendChild(flashcardContainer);
  
  const container = flashcardContainer.querySelector(`#flashcardContainer-${sessionId}`);
  let currentQuestionIndex = 0;
  const selectedAnswers = {};
  
  // Function to show current question
  function showQuestion(index) {
    if (index >= questions.length) {
      // All questions answered, submit
      submitFlashcardAnswers(sessionId, selectedAnswers);
      return;
    }
    
    const question = questions[index];
    const progress = `${index + 1} / ${questions.length}`;
    
    container.innerHTML = `
      <div class="question-flashcard active" data-question-index="${index}">
        <div class="flashcard-progress">${progress}</div>
        <div class="flashcard-question">
          <h3>${escapeHtml(question.text)}</h3>
        </div>
        <div class="flashcard-answers">
          ${question.answers.map((answer, ansIndex) => `
            <button class="flashcard-answer-btn" 
                    data-session-id="${sessionId}"
                    data-question-index="${index}"
                    data-question-id="${question.id}"
                    data-answer-index="${ansIndex}"
                    data-answer="${escapeHtml(answer)}">
              ${escapeHtml(answer)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    
    // Add event listeners to buttons
    const buttons = container.querySelectorAll('.flashcard-answer-btn');
    buttons.forEach(button => {
      button.addEventListener('click', function() {
        const sessionId = this.dataset.sessionId;
        const questionIndex = parseInt(this.dataset.questionIndex);
        const questionId = this.dataset.questionId;
        const answer = this.dataset.answer;
        selectFlashcardAnswer(sessionId, questionIndex, questionId, answer, this);
      });
    });
    
    // Scroll into view
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  // Function to handle answer selection
  function selectFlashcardAnswer(sessionId, questionIndex, questionId, answer, button) {
    // Visual feedback
    const flashcard = button.closest('.question-flashcard');
    const allButtons = flashcard.querySelectorAll('.flashcard-answer-btn');
    allButtons.forEach(btn => {
      btn.classList.remove('selected');
      btn.style.transform = '';
    });
    button.classList.add('selected');
    button.style.transform = 'scale(0.95)';
    
    // Store answer
    selectedAnswers[questionId] = answer;
    
    // Move to next question after short delay
    setTimeout(() => {
      showQuestion(questionIndex + 1);
    }, 500);
  };
  
  // Start showing questions
  showQuestion(0);
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Submit flashcard answers
async function submitFlashcardAnswers(sessionId, answers) {
  updateStatus('Submitting answers...', 'loading');
  
  try {
    const response = await fetch(`${API_BASE}/submit-answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
        answers: answers
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      updateStatus('Searching...', 'loading');
      handleAnswersSubmitted(sessionId, answers, result);
    } else {
      throw new Error(result.error || 'Failed to submit answers');
    }
  } catch (error) {
    console.error('Error submitting answers:', error);
    addError(`Failed to submit answers: ${error.message}`);
    updateStatus('Error', 'error');
  }
}

// Handle answers submitted from widget
function handleAnswersSubmitted(sessionId, answers, result) {
  console.log('Answers submitted:', { sessionId, answers, result });
  
  updateStatus('Searching...', 'loading');
  
  // Check if search was successful
  if (result && result.success) {
    const searchResults = result.searchResults || [];
    const error = result.error;
    
    if (error) {
      addSearchResults(null, error);
      updateStatus('Search failed', 'error');
    } else {
      addSearchResults(searchResults);
      updateStatus('Search completed', 'success');
      
      // Show results in overlay
      showResultsOverlay(searchResults);
    }
  } else {
    const errorMessage = result?.error || result?.message || 'Search failed';
    addSearchResults(null, errorMessage);
    updateStatus('Search failed', 'error');
  }
  
  setTimeout(() => {
    updateStatus('Ready', 'default');
  }, 2000);
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

// Retry last query
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

// Display results as flashcards (one at a time)
function displayResultFlashcards(searchResults, error = null) {
  const chatContainer = document.getElementById('chatContainer');
  
  if (error) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.innerHTML = `
      <div class="avatar assistant">AI</div>
      <div class="message-content">
        <div class="error">❌ Search failed: ${escapeHtml(error)}</div>
      </div>
    `;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return;
  }
  
  if (!searchResults || searchResults.length === 0) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.innerHTML = `
      <div class="avatar assistant">AI</div>
      <div class="message-content">
        <div class="no-results">
          🔍 No results found. Try refining your query or answers.
        </div>
      </div>
    `;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return;
  }
  
  // Create results container
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'message assistant';
  resultsContainer.innerHTML = `
    <div class="avatar assistant">AI</div>
    <div class="message-content">
      <div class="results-flashcard-container" id="resultsFlashcardContainer"></div>
    </div>
  `;
  chatContainer.appendChild(resultsContainer);
  
  const container = resultsContainer.querySelector('#resultsFlashcardContainer');
  let currentResultIndex = 0;
  const likedResults = [];
  const dislikedResults = [];
  
  // Function to show current result
  function showResult(index) {
    if (index >= searchResults.length) {
      // All results shown, show summary
      showResultsSummary(likedResults, dislikedResults);
      return;
    }
    
    const result = searchResults[index];
    const progress = `${index + 1} / ${searchResults.length}`;
    const imageUrl = result.image_url || '';
    const title = result.title || 'Product Recommendation';
    const description = result.description || 'No description available';
    const url = result.url || '';
    
    let hostname = '';
    try {
      if (url) {
        hostname = new URL(url).hostname.replace('www.', '');
      }
    } catch (e) {
      hostname = '';
    }
    
    container.innerHTML = `
      <div class="result-flashcard active" data-result-index="${index}">
        <div class="flashcard-progress">${progress}</div>
        <div class="result-flashcard-image">
          ${imageUrl ? 
            `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
            ''
          }
          <div class="result-image-placeholder" style="${imageUrl ? 'display: none;' : ''}">
            🛍️
          </div>
        </div>
        <div class="result-flashcard-content">
          <h3 class="result-flashcard-title">${escapeHtml(title)}</h3>
          ${hostname ? `<div class="result-flashcard-domain">${escapeHtml(hostname)}</div>` : ''}
          <p class="result-flashcard-description">${escapeHtml(description)}</p>
          ${result.highlights && result.highlights.length ? `
            <ul class="result-flashcard-highlights">
              ${result.highlights.slice(0, 3).map(h => `<li>${escapeHtml(h)}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
        <div class="result-flashcard-actions">
          <button class="dislike-btn" data-session-id="${sessionId}" data-result-index="${index}" data-action="dislike">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 13l3 3 7-7"/>
              <path d="M10.5 6.5L12 5l1.5 1.5"/>
              <path d="M12 5v6"/>
            </svg>
            <span>Dislike</span>
          </button>
          <button class="like-btn" data-session-id="${sessionId}" data-result-index="${index}" data-action="like">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>Like</span>
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners to action buttons
    const dislikeBtn = container.querySelector('.dislike-btn');
    const likeBtn = container.querySelector('.like-btn');
    
    dislikeBtn.addEventListener('click', function() {
      const sessionId = this.dataset.sessionId;
      const resultIndex = parseInt(this.dataset.resultIndex);
      handleResultAction(sessionId, resultIndex, 'dislike', this);
    });
    
    likeBtn.addEventListener('click', function() {
      const sessionId = this.dataset.sessionId;
      const resultIndex = parseInt(this.dataset.resultIndex);
      handleResultAction(sessionId, resultIndex, 'like', this);
    });
    
    // Scroll into view
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  // Function to handle result action
  function handleResultAction(sessionId, resultIndex, action, button) {
    const result = searchResults[resultIndex];
    
    if (action === 'like') {
      likedResults.push(result);
      button.classList.add('liked');
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span>Liked!</span>
      `;
    } else {
      dislikedResults.push(result);
      button.classList.add('disliked');
    }
    
    // Move to next result after short delay
    setTimeout(() => {
      showResult(resultIndex + 1);
    }, 800);
  };
  
  // Start showing results
  showResult(0);
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Show results summary
function showResultsSummary(likedResults, dislikedResults) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';
  
  let summaryContent = '<div class="results-summary">';
  summaryContent += '<h3>✨ Your Recommendations</h3>';
  
  if (likedResults.length > 0) {
    summaryContent += `<div class="liked-section"><h4>❤️ Liked (${likedResults.length})</h4>`;
    likedResults.forEach((result, index) => {
      summaryContent += `
        <div class="summary-result-item">
          <div class="summary-result-number">${index + 1}</div>
          <div class="summary-result-content">
            <div class="summary-result-title">${escapeHtml(result.title || 'Product')}</div>
            ${result.url ? `<a href="${escapeHtml(result.url)}" target="_blank" class="summary-result-link">View Product →</a>` : ''}
          </div>
        </div>
      `;
    });
    summaryContent += '</div>';
  }
  
  summaryContent += '</div>';
  
  messageDiv.innerHTML = `
    <div class="avatar assistant">AI</div>
    <div class="message-content">
      ${summaryContent}
    </div>
  `;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add search results to chat (legacy - keeping for compatibility)
function addSearchResults(searchResults, error = null) {
  // Use new flashcard display
  displayResultFlashcards(searchResults, error);
}

// Show results overlay
function showResultsOverlay(searchResults) {
  const overlay = document.getElementById('resultsOverlay');
  const resultDisplay = document.getElementById('resultDisplay');
  
  if (!searchResults || searchResults.length === 0) {
    resultDisplay.innerHTML = `
      <div class="no-results">
        🔍 No results found. Try refining your query or answers.
      </div>
    `;
  } else {
    const resultsList = searchResults.map((result, index) => {
      const title = result.title || 'Untitled';
      const description = result.description || 'No description available';
      const url = result.url || '';
      const whyMatches = result.why_matches || '';
      const additionalInfo = result.additional_info || '';
      const highlights = Array.isArray(result.highlights) ? result.highlights : null;
      const imageUrl = result.image_url || '';

      let hostname = '';
      try {
        if (url) {
          hostname = new URL(url).hostname.replace('www.', '');
        }
      } catch (e) {
        hostname = '';
      }

      const safeTitle = escapeHtml(title || hostname || 'Product recommendation');
      const safeDescription = escapeHtml(description);
      const safeWhy = escapeHtml(whyMatches);
      const safeAdditional = escapeHtml(additionalInfo);
      const safeDomain = hostname ? escapeHtml(hostname) : '';
      const safeImageUrl = escapeHtml(imageUrl);
      const buyButtonLabel = hostname ? `Buy on ${hostname}` : 'View product';
      const safeBuyLabel = escapeHtml(buyButtonLabel);

      return `
        <div class="search-result-item">
          <div class="search-result-image-container">
            ${safeImageUrl ? 
              `<img src="${safeImageUrl}" alt="${safeTitle}" class="search-result-image" onerror="this.parentElement.innerHTML='<div class=\\'search-result-image-placeholder\\'>🛍️</div>'">` :
              `<div class="search-result-image-placeholder">🛍️</div>`
            }
          </div>
          <div class="search-result-content">
            <div class="search-result-title">${safeTitle}</div>
            ${safeDomain ? `<div class="search-result-domain">${safeDomain}</div>` : ''}
            ${safeDescription ? `<div class="search-result-description">${safeDescription}</div>` : ''}
            ${highlights && highlights.length ? `
              <ul class="search-result-highlights">
                ${highlights.slice(0, 5).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
              </ul>
            ` : ''}
            ${safeWhy ? `
              <div class="search-result-section">
                <div class="search-result-section-title">Why it matches</div>
                <div class="search-result-section-body">${safeWhy}</div>
              </div>
            ` : ''}
            ${safeAdditional ? `
              <div class="search-result-section">
                <div class="search-result-section-title">Additional info</div>
                <div class="search-result-section-body">${safeAdditional}</div>
              </div>
            ` : ''}
            ${url ? `
              <a href="${url}" target="_blank" rel="noopener noreferrer" class="search-result-buy-button">
                🛒 ${safeBuyLabel}
              </a>
            ` : `
              <div style="margin-top: 8px; padding: 8px; background: #f5f5f7; border-radius: 4px; font-size: 12px; color: #666;">
                ⚠️ Product link not available.
              </div>
            `}
          </div>
        </div>
      `;
    }).join('');
    
    resultDisplay.innerHTML = `
      <div class="search-results-list">
        ${resultsList}
      </div>
    `;
  }
  
  overlay.classList.add('show');
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

