// Import Supabase client (using CDN for now since we're using ES modules)
// We'll load it dynamically to avoid module issues

let supabaseClient = null;

// Initialize Supabase client
async function initSupabase() {
  if (!window.SUPABASE_CONFIG) {
    console.error('Supabase config not found');
    return null;
  }

  // Dynamically import Supabase from CDN
  if (!window.supabase) {
    // Load Supabase from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = () => {
      if (window.supabase) {
        supabaseClient = window.supabase.createClient(
          window.SUPABASE_CONFIG.url,
          window.SUPABASE_CONFIG.anonKey
        );
        setupAuth();
      }
    };
    document.head.appendChild(script);
  } else {
    supabaseClient = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey
    );
    setupAuth();
  }
}

// Check if user is already logged in
async function checkAuth() {
  if (!supabaseClient) {
    await initSupabase();
    if (!supabaseClient) return;
  }

  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return;
    }

    if (session) {
      // User is logged in, check if they have a profile
      const { data: profile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is expected for new users
        console.error('Error checking profile:', profileError);
        return;
      }

      if (profile) {
        // User has profile, redirect to main app
        window.location.href = '/';
      } else {
        // User doesn't have profile, redirect to profile page
        window.location.href = '/profile.html';
      }
    }
  } catch (error) {
    console.error('Error in checkAuth:', error);
  }
}

// Handle Google OAuth sign-in
async function handleGoogleLogin() {
  if (!supabaseClient) {
    await initSupabase();
    if (!supabaseClient) {
      showError('Failed to initialize authentication. Please refresh the page.');
      return;
    }
  }

  const loginBtn = document.getElementById('googleLoginBtn');
  const loginLoading = document.getElementById('loginLoading');
  const loginError = document.getElementById('loginError');

  // Clear previous errors
  if (loginError) {
    loginError.style.display = 'none';
  }
  
  // Show loading state
  loginBtn.disabled = true;
  loginBtn.style.opacity = '0.6';
  if (loginLoading) {
    loginLoading.style.display = 'block';
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth-callback.html`
      }
    });

    if (error) {
      throw error;
    }

    // The redirect will happen automatically
    // If we get here, something went wrong
    if (loginLoading) {
      loginLoading.textContent = 'Redirecting...';
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    showError('Failed to sign in with Google. Please try again.');
    
    // Reset button state
    loginBtn.disabled = false;
    loginBtn.style.opacity = '1';
    if (loginLoading) {
      loginLoading.style.display = 'none';
    }
  }
}

// Show error message
function showError(message) {
  const loginError = document.getElementById('loginError');
  if (loginError) {
    loginError.textContent = message;
    loginError.style.display = 'block';
  } else {
    alert(message);
  }
}

// Setup auth listeners and handlers
function setupAuth() {
  const loginBtn = document.getElementById('googleLoginBtn');
  
  if (loginBtn) {
    loginBtn.addEventListener('click', handleGoogleLogin);
  }

  // Listen for auth state changes
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    
    if (event === 'SIGNED_IN' && session) {
      // User signed in, check for profile
      checkAuth();
    } else if (event === 'SIGNED_OUT') {
      // User signed out - handled by redirect in checkAuth()
    }
  });
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
  });
} else {
  initSupabase();
}
