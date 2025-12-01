// Profile form handling
let supabaseClient = null;

// Initialize Supabase client
async function initSupabase() {
  if (!window.SUPABASE_CONFIG) {
    console.error('Supabase config not found');
    return null;
  }

  // Load Supabase from CDN if not already loaded
  if (!window.supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    await new Promise((resolve) => {
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  if (window.supabase) {
    supabaseClient = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey
    );
    checkAuth();
  }
}

// Check if user is authenticated
async function checkAuth() {
  if (!supabaseClient) return;

  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error || !session) {
      // Not authenticated, redirect to login
      window.location.href = '/login.html';
      return;
    }

    // Check if user already has a profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 means no rows found (expected for new users)
      console.error('Error checking profile:', profileError);
      return;
    }

    if (profile) {
      // User already has profile, redirect to main app
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Error in checkAuth:', error);
    window.location.href = '/login.html';
  }
}

// Show inline error for a field
function showFieldError(fieldId, message) {
  const errorElement = document.getElementById(fieldId + 'Error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
  
  // Add error class to input
  const input = document.getElementById(fieldId);
  if (input) {
    input.style.borderColor = 'var(--claude-emphasis)';
  }
}

// Clear field error
function clearFieldError(fieldId) {
  const errorElement = document.getElementById(fieldId + 'Error');
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }
  
  // Remove error class from input
  const input = document.getElementById(fieldId);
  if (input) {
    input.style.borderColor = '';
  }
}

// Validate form
function validateForm() {
  let isValid = true;
  
  // Clear all errors
  ['name', 'age', 'gender', 'livesInUs'].forEach(fieldId => {
    clearFieldError(fieldId);
  });

  // Validate name
  const name = document.getElementById('name').value.trim();
  if (!name) {
    showFieldError('name', 'Name is required');
    isValid = false;
  } else if (name.length < 2) {
    showFieldError('name', 'Name must be at least 2 characters');
    isValid = false;
  }

  // Validate age
  const age = parseInt(document.getElementById('age').value);
  if (!age) {
    showFieldError('age', 'Age is required');
    isValid = false;
  } else if (age < 1 || age > 150) {
    showFieldError('age', 'Age must be between 1 and 150');
    isValid = false;
  }

  // Validate gender
  const gender = document.querySelector('input[name="gender"]:checked');
  if (!gender) {
    showFieldError('gender', 'Please select a gender');
    isValid = false;
  }

  // Validate lives in US
  const livesInUs = document.getElementById('livesInUs').checked;
  if (!livesInUs) {
    showFieldError('livesInUs', 'Please confirm if you live in the United States');
    isValid = false;
  }

  return isValid;
}

// Handle form submission
async function handleSubmit(event) {
  event.preventDefault();
  
  if (!supabaseClient) {
    await initSupabase();
    if (!supabaseClient) {
      showError('Failed to initialize. Please refresh the page.');
      return;
    }
  }

  // Validate form
  if (!validateForm()) {
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const profileError = document.getElementById('profileError');
  
  // Clear previous errors
  if (profileError) {
    profileError.style.display = 'none';
  }
  
  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Not authenticated. Please sign in again.');
    }

    // Get form values
    const name = document.getElementById('name').value.trim();
    const age = parseInt(document.getElementById('age').value);
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const livesInUs = document.getElementById('livesInUs').checked;

    // Insert profile into database
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .insert({
        id: session.user.id,
        name: name,
        age: age,
        gender: gender,
        lives_in_us: livesInUs
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate key error (user already has profile)
      if (error.code === '23505') {
        // Profile already exists, update it instead
        const { data: updateData, error: updateError } = await supabaseClient
          .from('user_profiles')
          .update({
            name: name,
            age: age,
            gender: gender,
            lives_in_us: livesInUs
          })
          .eq('id', session.user.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }
      } else {
        throw error;
      }
    }

    // Success! Redirect to main app
    window.location.href = '/';
  } catch (error) {
    console.error('Error saving profile:', error);
    showError(error.message || 'Failed to save profile. Please try again.');
    
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Continue';
  }
}

// Show error message
function showError(message) {
  const profileError = document.getElementById('profileError');
  if (profileError) {
    profileError.textContent = message;
    profileError.style.display = 'block';
  } else {
    alert(message);
  }
}

// Setup form listeners
function setupForm() {
  const form = document.getElementById('profileForm');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  // Clear errors on input
  ['name', 'age'].forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.addEventListener('input', () => clearFieldError(fieldId));
    }
  });

  // Clear errors on radio/checkbox change
  document.querySelectorAll('input[name="gender"]').forEach(radio => {
    radio.addEventListener('change', () => clearFieldError('gender'));
  });

  document.getElementById('livesInUs').addEventListener('change', () => {
    clearFieldError('livesInUs');
  });
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    setupForm();
  });
} else {
  initSupabase();
  setupForm();
}


