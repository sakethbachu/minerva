# End-to-End Testing Guide

## 🧪 Quick Start

### Step 1: Ensure Servers Are Running
```bash
# Terminal 1: Express server
npm start

# Terminal 2: Python server  
cd python-service
uvicorn main:app --reload --port 8000
```

### Step 2: Open the App
1. Go to `http://localhost:3001`
2. Log in with Google OAuth
3. Complete your profile (if not already done)

### Step 3: Run Tests
Open browser console (Cmd + Option + J) and run:
```javascript
testIntegration()
```

---

## 📋 What Gets Tested

### ✅ Test 1: Authentication
- Verifies you're logged in
- Checks JWT token is valid
- Confirms user ID exists

### ✅ Test 2: User Profile
- Checks if profile exists in Supabase
- Validates profile data (age, gender, location)
- Verifies data types are correct

### ✅ Test 3: Session Creation
- Creates a new search session
- Verifies session is saved to Supabase
- Checks questions are generated

### ✅ Test 4: Search with Personalization
- Submits answers to questions
- Verifies profile is passed to Python
- Checks search results are returned
- Confirms personalization is working

### ✅ Test 5: Search History
- Verifies search is saved to history
- Checks only last 10 searches are kept
- Validates search data structure

### ✅ Test 6: Protected Routes
- Tests that unauthenticated requests are blocked (401)
- Confirms authenticated requests work

---

## 🔍 Manual Testing Checklist

### Authentication Flow
- [ ] Can log in with Google
- [ ] Redirected to profile if no profile exists
- [ ] Redirected to main app if profile exists
- [ ] Logout works correctly

### Profile Management
- [ ] Profile form validates all fields
- [ ] Profile saves to Supabase
- [ ] Can access app after profile creation

### Search Flow
- [ ] Can enter a query
- [ ] Questions are generated
- [ ] Can answer questions
- [ ] Search results are returned
- [ ] Results are personalized (check server logs)

### Database Verification
- [ ] Session appears in `user_sessions` table
- [ ] Search appears in `user_search_history` table
- [ ] Only last 10 searches are kept (test by making 11+ searches)
- [ ] Profile data is correct

### Personalization
- [ ] Check server logs for "User profile fetched"
- [ ] Check Python logs for profile validation
- [ ] Verify prompt includes demographics (check Python logs)

---

## 🐛 Troubleshooting

### Test Fails: "Not logged in"
- Make sure you're logged in at `http://localhost:3001`
- Check browser console for auth errors
- Verify Supabase config is correct

### Test Fails: "Profile not found"
- Complete your profile at `/profile.html`
- Check Supabase Dashboard → `user_profiles` table

### Test Fails: "Session Creation failed"
- Check Express server is running
- Check server logs for errors
- Verify Supabase connection

### Test Fails: "Submit Answers failed"
- Check Python server is running
- Check Python logs for errors
- Verify API keys are set (GEMINI_API_KEY, TAVILY_API_KEY)

### No Search Results
- Check Python service logs
- Verify Tavily API key is valid
- Check Gemini API key is valid
- Look for error messages in console

---

## 📊 Expected Results

### Successful Test Run
```
🧪 Starting Integration Tests...

Test 1: Authentication
✅ Authentication: User: your@email.com

Test 2: User Profile
✅ Profile Exists
✅ Profile Age: Age: 25
✅ Profile Gender: Gender: Male
✅ Profile Location: US: true

Test 3: Session Creation
✅ Session Creation: Session: session_1234567890_abc123
✅ Questions Generated: 3 questions

Test 4: Submit Answers with Personalization
✅ Submit Answers: Answers received and search completed!
✅ Search Results: 5 results

Test 5: Search History
✅ Search History Fetch: 1 entries
✅ Latest Search Query: test integration search
✅ Latest Search Answers: Answers saved

Test 6: Protected Routes
✅ Unauthenticated Request Blocked: Status: 401

==================================================
📊 Test Summary
==================================================
✅ Passed: 12
❌ Failed: 0
⏭️  Skipped: 0
```

---

## 🔬 Advanced Testing

### Test Search History Limit (10 searches)
```javascript
// Make 11 searches and verify only 10 are kept
for (let i = 0; i < 11; i++) {
  const response = await fetch('http://localhost:3001/api/questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ query: `test search ${i}` })
  });
  // ... submit answers
}

// Check history
const { data: history } = await supabase
  .from('user_search_history')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

console.log('Total searches:', history.length); // Should be 10
```

### Test Session Expiration
1. Create a session
2. Manually set `expires_at` to past date in Supabase
3. Try to access the session
4. Should return 404 and delete the session

### Test Graceful Degradation
1. Temporarily break Supabase connection (wrong URL)
2. Try to search
3. Should still work but without personalization
4. Check logs for graceful degradation messages

---

## ✅ Success Criteria

All tests should pass:
- ✅ Authentication works
- ✅ Profile is saved and retrieved
- ✅ Sessions are created in database
- ✅ Search works with personalization
- ✅ Search history is saved
- ✅ Only last 10 searches are kept
- ✅ Protected routes are secure
- ✅ Graceful degradation works

---

**Ready to test?** Open the app, log in, and run `testIntegration()` in the console!


