// Q&A Flow: question flashcards, answer submission, and result flashcards
// Depends on globals from app.js: API_BASE, currentSessionId, lastQuery,
// updateStatus, addError, escapeHtml, addSearchResults, showResultsOverlay, etc.

// Display questions as flashcards (one at a time)
function displayQuestionFlashcards(questions, sessionId) {
  // Validate and store sessionId
  if (!sessionId) {
    sessionId = currentSessionId || window.currentSessionId;
    if (!sessionId) {
      console.error('displayQuestionFlashcards: No sessionId provided');
      addError('Failed to display questions: Session ID is missing');
      return;
    }
  }

  // Store sessionId in multiple places for reliability
  const flashcardSessionId = sessionId;
  currentSessionId = sessionId;
  window.currentSessionId = sessionId;

  console.log('displayQuestionFlashcards called with sessionId:', flashcardSessionId);

  const chatContainer = document.getElementById('chatContainer');

  // Create flashcard container
  const flashcardContainer = document.createElement('div');
  flashcardContainer.className = 'message assistant';
  flashcardContainer.innerHTML = `
    <div class="avatar assistant">AI</div>
    <div class="message-content">
      <div class="flashcard-container" id="flashcardContainer-${flashcardSessionId}"></div>
    </div>
  `;
  chatContainer.appendChild(flashcardContainer);

  const container = flashcardContainer.querySelector(`#flashcardContainer-${flashcardSessionId}`);
  let currentQuestionIndex = 0;
  const selectedAnswers = {};

  // Function to show current question (or answer summary when done)
  function showQuestion(index) {
    if (index >= questions.length) {
      // All questions answered – show a summary flashcard of selections
      const finalSessionId = flashcardSessionId || currentSessionId || window.currentSessionId;
      console.log('All questions answered for session:', finalSessionId, 'selectedAnswers:', selectedAnswers);

      if (!finalSessionId) {
        console.error('No sessionId available when submitting answers');
        addError('Failed to submit answers: Session ID is missing');
        return;
      }

      // Build summary list of questions and chosen answers
      const summaryItems = questions
        .map((q, i) => {
          const chosen = selectedAnswers[q.id];
          const safeQuestion = escapeHtml(q.text || `Question ${i + 1}`);
          const safeAnswer = chosen ? escapeHtml(chosen) : '<span style="opacity:0.7;">No answer selected</span>';
          return `
            <div class="qa-summary-item">
              <div class="qa-summary-question">${safeQuestion}</div>
              <div class="qa-summary-answer">${safeAnswer}</div>
            </div>
          `;
        })
        .join('');

      container.innerHTML = `
        <div class="question-flashcard active qa-summary-flashcard">
          <div class="flashcard-progress">Review your answers</div>
          <div class="flashcard-question">
            <h3>Your selections</h3>
          </div>
          <div class="qa-summary-list">
            ${summaryItems}
          </div>
        </div>
      `;

      // Submit answers in the background after showing the summary
      submitFlashcardAnswers(finalSessionId, selectedAnswers);
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
          ${question.answers
            .map(
              (answer, ansIndex) => `
            <button class="flashcard-answer-btn" 
                    data-session-id="${flashcardSessionId}"
                    data-question-index="${index}"
                    data-question-id="${question.id}"
                    data-answer-index="${ansIndex}"
                    data-answer="${escapeHtml(answer)}">
              ${escapeHtml(answer)}
            </button>
          `
            )
            .join('')}
        </div>
      </div>
    `;

    // Add event listeners to buttons
    const buttons = container.querySelectorAll('.flashcard-answer-btn');
    buttons.forEach((button) => {
      button.addEventListener('click', function () {
        // Get sessionId from button data or use closure value
        const btnSessionId =
          this.dataset.sessionId || flashcardSessionId || currentSessionId || window.currentSessionId;
        const questionIndex = parseInt(this.dataset.questionIndex, 10);
        const questionId = this.dataset.questionId;
        const answer = this.dataset.answer;
        console.log('Answer button clicked:', { btnSessionId, questionIndex, questionId, answer });
        selectFlashcardAnswer(btnSessionId, questionIndex, questionId, answer, this);
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
    allButtons.forEach((btn) => {
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
  }

  // Start showing questions
  showQuestion(0);

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Submit flashcard answers
async function submitFlashcardAnswers(sessionId, answers) {
  console.log('submitFlashcardAnswers called with:', {
    sessionId,
    answers,
    currentSessionId,
    windowSessionId: window.currentSessionId,
  });

  // Validate sessionId
  if (!sessionId) {
    console.error('sessionId is undefined! Trying fallbacks...', {
      sessionId,
      currentSessionId,
      windowSessionId: window.currentSessionId,
    });
    // Try to get from global state
    sessionId = currentSessionId || window.currentSessionId;
    if (!sessionId) {
      console.error('All sessionId fallbacks failed!');
      addError('Failed to submit answers: Session ID is missing');
      updateStatus('Error', 'error');
      return;
    }
    console.log('Using fallback sessionId:', sessionId);
  }

  console.log('Submitting with final sessionId:', sessionId);
  updateStatus('Submitting answers...', 'loading');

  try {
    const response = await fetch(`${API_BASE}/submit-answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        answers,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

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

// Handle answers submitted and trigger search/results flow
function handleAnswersSubmitted(sessionId, answers, result) {
  console.log('Answers submitted:', { sessionId, answers, result });

  updateStatus('Searching...', 'loading');

  // Check if search was successful
  if (result && result.success) {
    const searchResults = result.searchResults || [];
    const error = result.error;

    if (error) {
      addSearchResults(null, error, sessionId);
      updateStatus('Search failed', 'error');
    } else {
      addSearchResults(searchResults, null, sessionId);
      updateStatus('Search completed', 'success');
      // Flashcards are displayed directly in chat via addSearchResults -> displayResultFlashcards
    }
  } else {
    const errorMessage = result?.error || result?.message || 'Search failed';
    addSearchResults(null, errorMessage, sessionId);
    updateStatus('Search failed', 'error');
  }

  setTimeout(() => {
    updateStatus('Ready', 'default');
  }, 2000);
}

// Retry last query from error message button
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
function displayResultFlashcards(searchResults, error = null, sessionId = null) {
  // Get sessionId from parameter or fallback to global state
  if (!sessionId) {
    sessionId = currentSessionId || window.currentSessionId;
  }

  if (!sessionId) {
    console.error('displayResultFlashcards: No sessionId available');
    sessionId = 'unknown'; // Fallback to prevent template errors
  }

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
  const resultStatusMap = new Map(); // Track which results were liked/disliked

  // Function to show current result
  function showResult(index) {
    if (index >= searchResults.length) {
      // All results shown, show summary in the same container
      showResultsSummary(searchResults, likedResults, dislikedResults, resultStatusMap, container);
      return;
    }

    const result = searchResults[index];
    const progress = `${index + 1} / ${searchResults.length}`;
    const imageUrl = result.image_url || '';
    const title = result.title || 'Product Recommendation';
    const description = result.description || 'No description available';
    const url = result.url || '';
    const whyMatches = result.why_matches || '';

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
          ${
            imageUrl
              ? `<img src="${escapeHtml(
                  imageUrl
                )}" alt="${escapeHtml(title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
              : ''
          }
          <div class="result-image-placeholder" style="${imageUrl ? 'display: none;' : ''}">
            🛍️
          </div>
        </div>
        <div class="result-flashcard-content">
          <h3 class="result-flashcard-title">${escapeHtml(title)}</h3>
          ${hostname ? `<div class="result-flashcard-domain">${escapeHtml(hostname)}</div>` : ''}
          <p class="result-flashcard-description">${escapeHtml(description)}</p>
          ${
            result.highlights && result.highlights.length
              ? `
            <ul class="result-flashcard-highlights">
              ${result.highlights
                .slice(0, 3)
                .map((h) => `<li>${escapeHtml(h)}</li>`)
                .join('')}
            </ul>
          `
              : ''
          }
          ${
            whyMatches
              ? `
            <div class="result-flashcard-why-matches">
              <div class="result-flashcard-why-matches-title">Why it matches</div>
              <div class="result-flashcard-why-matches-content">${escapeHtml(whyMatches)}</div>
            </div>
          `
              : ''
          }
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

    dislikeBtn.addEventListener('click', function () {
      const btnSessionId = this.dataset.sessionId;
      const resultIndex = parseInt(this.dataset.resultIndex, 10);
      handleResultAction(btnSessionId, resultIndex, 'dislike', this);
    });

    likeBtn.addEventListener('click', function () {
      const btnSessionId = this.dataset.sessionId;
      const resultIndex = parseInt(this.dataset.resultIndex, 10);
      handleResultAction(btnSessionId, resultIndex, 'like', this);
    });

    // Scroll into view
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Function to handle result action
  function handleResultAction(sessionId, resultIndex, action, button) {
    const result = searchResults[resultIndex];

    if (action === 'like') {
      likedResults.push(result);
      resultStatusMap.set(resultIndex, 'liked');
      button.classList.add('liked');
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span>Liked!</span>
      `;
    } else {
      dislikedResults.push(result);
      resultStatusMap.set(resultIndex, 'disliked');
      button.classList.add('disliked');
    }

    // Move to next result after short delay
    setTimeout(() => {
      showResult(resultIndex + 1);
    }, 800);
  }

  // Start showing results
  showResult(0);

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Show results summary
function showResultsSummary(allResults, likedResults, dislikedResults, resultStatusMap, container) {
  let summaryContent = '<div class="results-summary">';
  summaryContent += '<h3>✨ All Recommendations</h3>';

  // Show all results with their status
  if (allResults && allResults.length > 0) {
    summaryContent += `<div class="all-results-section">`;
    
    allResults.forEach((result, index) => {
      const status = resultStatusMap.get(index) || 'neutral';
      const statusClass = status === 'liked' ? 'liked' : status === 'disliked' ? 'disliked' : 'neutral';
      const statusIcon = status === 'liked' ? '❤️' : status === 'disliked' ? '👎' : '📋';
      const statusText = status === 'liked' ? 'Liked' : status === 'disliked' ? 'Disliked' : 'Not rated';
      const imageUrl = result.image_url || '';
      const whyMatches = result.why_matches || '';
      const hasDetails = whyMatches.length > 0;
      
      summaryContent += `
        <div class="summary-result-item ${statusClass}">
          <div class="summary-result-number">${index + 1}</div>
          <div class="summary-result-status">${statusIcon}</div>
          ${
            imageUrl
              ? `<div class="summary-result-image">
                  <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(result.title || 'Product')}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                  <div class="summary-image-placeholder" style="display: none;">🛍️</div>
                </div>`
              : `<div class="summary-result-image">
                  <div class="summary-image-placeholder">🛍️</div>
                </div>`
          }
          <div class="summary-result-content">
            <div class="summary-result-header">
              <div class="summary-result-title-wrapper">
                <div class="summary-result-title">${escapeHtml(result.title || 'Product')}</div>
                <div class="summary-result-status-text">${statusText}</div>
              </div>
              ${
                hasDetails
                  ? `<button class="summary-expand-btn" data-index="${index}" aria-label="Toggle details">
                      <svg class="expand-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 7.5L10 12.5L15 7.5"/>
                      </svg>
                    </button>`
                  : ''
              }
            </div>
            ${
              result.url
                ? `<a href="${escapeHtml(result.url)}" target="_blank" class="summary-result-link">View Product →</a>`
                : ''
            }
            ${
              hasDetails
                ? `<div class="summary-result-details" id="summary-details-${index}" style="display: none;">
                    <div class="summary-details-title">Why it matches</div>
                    <div class="summary-details-content">${escapeHtml(whyMatches)}</div>
                  </div>`
                : ''
            }
          </div>
        </div>
      `;
    });
    summaryContent += '</div>';

    // Show summary stats
    const likedCount = likedResults.length;
    const dislikedCount = dislikedResults.length;
    const neutralCount = allResults.length - likedCount - dislikedCount;
    
    if (likedCount > 0 || dislikedCount > 0 || neutralCount > 0) {
      summaryContent += '<div class="summary-stats">';
      if (likedCount > 0) {
        summaryContent += `<span class="stat-item stat-liked">❤️ ${likedCount} Liked</span>`;
      }
      if (dislikedCount > 0) {
        summaryContent += `<span class="stat-item stat-disliked">👎 ${dislikedCount} Disliked</span>`;
      }
      if (neutralCount > 0) {
        summaryContent += `<span class="stat-item stat-neutral">📋 ${neutralCount} Not rated</span>`;
      }
      summaryContent += '</div>';
    }
  }

  summaryContent += '</div>';

  // Replace content in the same container (like question flow)
  container.innerHTML = summaryContent;
  
  // Add event listeners for expandable sections
  const expandButtons = container.querySelectorAll('.summary-expand-btn');
  expandButtons.forEach((button) => {
    button.addEventListener('click', function () {
      const index = this.dataset.index;
      const detailsDiv = document.getElementById(`summary-details-${index}`);
      const icon = this.querySelector('.expand-icon');
      
      if (detailsDiv) {
        const isExpanded = detailsDiv.style.display !== 'none';
        detailsDiv.style.display = isExpanded ? 'none' : 'block';
        icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        this.setAttribute('aria-expanded', !isExpanded);
      }
    });
  });
  
  // Scroll to show the summary
  const chatContainer = document.getElementById('chatContainer');
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

// Add search results to chat (legacy - keeping for compatibility)
function addSearchResults(searchResults, error = null, sessionId = null) {
  // Get sessionId from parameter or fallback to global state
  if (!sessionId) {
    sessionId = currentSessionId || window.currentSessionId;
  }

  displayResultFlashcards(searchResults, error, sessionId);
}

// Show results overlay
function showResultsOverlay(searchResults, sessionId = null) {
  // Get sessionId from parameter or fallback to global state
  if (!sessionId) {
    sessionId = currentSessionId || window.currentSessionId;
  }
  const overlay = document.getElementById('resultsOverlay');
  const resultDisplay = document.getElementById('resultDisplay');

  if (!searchResults || searchResults.length === 0) {
    resultDisplay.innerHTML = `
      <div class="no-results">
        🔍 No results found. Try refining your query or answers.
      </div>
    `;
  } else {
    const resultsList = searchResults
      .map((result, index) => {
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
            ${
              safeImageUrl
                ? `<img src="${safeImageUrl}" alt="${safeTitle}" class="search-result-image" onerror="this.parentElement.innerHTML='<div class=\\'search-result-image-placeholder\\'>🛍️</div>'">`
                : `<div class="search-result-image-placeholder">🛍️</div>`
            }
          </div>
          <div class="search-result-content">
            <div class="search-result-title">${safeTitle}</div>
            ${safeDomain ? `<div class="search-result-domain">${safeDomain}</div>` : ''}
            ${safeDescription ? `<div class="search-result-description">${safeDescription}</div>` : ''}
            ${
              highlights && highlights.length
                ? `
              <ul class="search-result-highlights">
                ${highlights.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
              </ul>
            `
                : ''
            }
            ${
              safeWhy
                ? `
              <div class="search-result-section">
                <div class="search-result-section-title">Why it matches</div>
                <div class="search-result-section-body">${safeWhy}</div>
              </div>
            `
                : ''
            }
            ${
              safeAdditional
                ? `
              <div class="search-result-section">
                <div class="search-result-section-title">Additional info</div>
                <div class="search-result-section-body">${safeAdditional}</div>
              </div>
            `
                : ''
            }
            ${
              url
                ? `
              <a href="${url}" target="_blank" rel="noopener noreferrer" class="search-result-buy-button">
                🛒 ${safeBuyLabel}
              </a>
            `
                : `
              <div style="margin-top: 8px; padding: 8px; background: #f5f5f7; border-radius: 4px; font-size: 12px; color: #666;">
                ⚠️ Product link not available.
              </div>
            `
            }
          </div>
        </div>
      `;
      })
      .join('');

    resultDisplay.innerHTML = `
      <div class="search-results-list">
        ${resultsList}
      </div>
    `;
  }

  overlay.classList.add('show');
}


