# Testing Authentication & Integration

## 🧪 Test Plan

### Test 1: Authentication Flow
- [ ] Google OAuth login works
- [ ] JWT token is generated and stored
- [ ] User is redirected to profile page if no profile exists
- [ ] User is redirected to main app if profile exists
- [ ] Logout works correctly

### Test 2: Profile Creation
- [ ] Profile form validates all fields
- [ ] Profile saves to Supabase
- [ ] User can access app after profile creation
- [ ] Inline errors display correctly

### Test 3: Session Management
- [ ] Sessions are created in Supabase database
- [ ] Sessions expire after 24 hours
- [ ] Expired sessions are deleted automatically
- [ ] Sessions are linked to user_id

### Test 4: Protected Routes
- [ ] `/api/questions` requires authentication
- [ ] `/submit-answers` requires authentication
- [ ] Unauthenticated requests return 401
- [ ] Authenticated requests work correctly

### Test 5: Search with Personalization
- [ ] User profile is fetched in Express
- [ ] Profile is passed to Python service
- [ ] Python validates profile data
- [ ] Search prompt includes demographics
- [ ] Search works with and without profile

### Test 6: Search History
- [ ] Search history is saved to database
- [ ] Only last 10 searches are kept per user
- [ ] Failed searches are marked correctly
- [ ] Search history cleanup works

### Test 7: Graceful Degradation
- [ ] App works if Supabase is unavailable
- [ ] Search works without profile (no personalization)
- [ ] Errors are logged but don't break flow

---

## 🚀 Quick Test Scripts

Run these in browser console after logging in:

### Test Authentication
```javascript
// Check if logged in
const supabase = window.supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey
);
const { data: { session } } = await supabase.auth.getSession();
console.log('Logged in:', !!session);
console.log('User ID:', session?.user?.id);
```

### Test Profile
```javascript
// Check if profile exists
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', session.user.id)
  .single();
console.log('Profile:', profile);
```

### Test Search with Personalization
```javascript
// Make a search request
const response = await fetch('http://localhost:3001/api/questions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({ query: 'test running shoes' })
});
const data = await response.json();
console.log('Search response:', data);
```

---

## ✅ Success Criteria

- [ ] All authentication flows work
- [ ] Profile creation works
- [ ] Sessions persist in database
- [ ] Protected routes are secure
- [ ] Personalization works
- [ ] Search history is saved
- [ ] Graceful degradation works


