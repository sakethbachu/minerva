// Helper functions for authentication in frontend
// Provides functions to get JWT token and add to API requests

/**
 * Get the current Supabase session token
 * @returns {Promise<string|null>} JWT token or null if not authenticated
 */
async function getAuthToken() {
  // Ensure Supabase is loaded
  if (!window.supabase && window.SUPABASE_CONFIG) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    await new Promise((resolve) => {
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  if (!window.supabase || !window.SUPABASE_CONFIG) {
    return null;
  }

  try {
    const supabase = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey
    );
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return null;
    }

    return session.access_token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Add Authorization header to fetch options
 * @param {RequestInit} options - Fetch options object
 * @returns {Promise<RequestInit>} Updated options with Authorization header
 */
async function addAuthHeader(options = {}) {
  const token = await getAuthToken();
  
  if (!options.headers) {
    options.headers = {};
  }
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return options;
}

/**
 * Make an authenticated fetch request
 * Automatically adds Authorization header if user is authenticated
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function authenticatedFetch(url, options = {}) {
  const updatedOptions = await addAuthHeader(options);
  return fetch(url, updatedOptions);
}


