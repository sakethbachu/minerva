# Session Migration Testing Guide

## 🧪 Testing Session Functionality

This guide helps you test that sessions are properly stored in Supabase instead of memory.

---

## ✅ Pre-Testing Checklist

- [ ] Server is running (`npm start`)
- [ ] Supabase project is accessible
- [ ] You're logged in (have a valid JWT token)
- [ ] Database tables exist (`user_sessions`)

---

## 🧪 Test 1: Create Session

### Steps:
1. **Open browser console** (F12)
2. **Get your auth token:**
   ```javascript
   // In browser console
   const supabase = window.supabase.createClient(
     window.SUPABASE_CONFIG.url,
     window.SUPABASE_CONFIG.anonKey
   );
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Token:', session?.access_token);
   ```

3. **Make API call to create session:**
   ```javascript
   const token = session.access_token; // from above
   
   const response = await fetch('http://localhost:3001/api/questions', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify({
       query: 'I want running shoes'
     })
   });
   
   const data = await response.json();
   console.log('Session created:', data);
   ```

4. **Verify in Supabase:**
   - Go to Supabase Dashboard → Table Editor → `user_sessions`
   - You should see a new row with:
     - `session_id` matching the one returned
     - `user_id` matching your user ID
     - `original_query` = "I want running shoes"
     - `questions` = JSON array of questions
     - `expires_at` = 24 hours from now

### Expected Result:
- ✅ API returns `{ success: true, sessionId: "...", questions: [...] }`
- ✅ Session appears in Supabase `user_sessions` table
- ✅ `expires_at` is set to ~24 hours from now

---

## 🧪 Test 2: Get Session

### Steps:
1. **Use the sessionId from Test 1**
2. **Get session via API:**
   ```javascript
   const sessionId = 'session_...'; // from Test 1
   
   const response = await fetch(`http://localhost:3001/api/widget/${sessionId}`);
   const html = await response.text();
   console.log('Widget HTML received:', html.length, 'characters');
   ```

### Expected Result:
- ✅ Returns HTML widget (not 404)
- ✅ HTML contains the questions from the session

---

## 🧪 Test 3: Update Session (Submit Answers)

### Steps:
1. **Submit answers:**
   ```javascript
   const sessionId = 'session_...'; // from Test 1
   const token = session.access_token;
   
   // Get questions first to get question IDs
   const questionsResponse = await fetch('http://localhost:3001/api/questions', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify({ query: 'I want running shoes' })
   });
   const { questions } = await questionsResponse.json();
   
   // Submit answers
   const answers = {};
   questions.forEach((q, i) => {
     answers[q.id] = q.answers[0]; // Select first answer for each
   });
   
   const response = await fetch('http://localhost:3001/submit-answers', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify({
       sessionId: sessionId,
       answers: answers
     })
   });
   
   const data = await response.json();
   console.log('Answers submitted:', data);
   ```

2. **Verify in Supabase:**
   - Go to `user_sessions` table
   - Find your session
   - Check `answers` column - should contain your submitted answers
   - Check `updated_at` - should be recent

### Expected Result:
- ✅ API returns success
- ✅ `answers` field in database is updated
- ✅ `updated_at` timestamp is recent

---

## 🧪 Test 4: Session Expiration

### Steps:
1. **Manually expire a session in Supabase:**
   - Go to Supabase Dashboard → Table Editor → `user_sessions`
   - Find a test session
   - Edit `expires_at` to a past date (e.g., yesterday)
   - Save

2. **Try to access the expired session:**
   ```javascript
   const expiredSessionId = 'session_...'; // expired session
   
   const response = await fetch(`http://localhost:3001/api/widget/${expiredSessionId}`);
   const data = await response.json();
   console.log('Response:', data);
   ```

### Expected Result:
- ✅ Returns 404 "Session not found or expired"
- ✅ Expired session is deleted from database (check Supabase)

---

## 🧪 Test 5: End-to-End Flow

### Steps:
1. **Use the app normally:**
   - Go to `http://localhost:3001`
   - Enter a query (e.g., "I want running shoes")
   - Answer the questions
   - Submit

2. **Check Supabase:**
   - `user_sessions` table should have your session
   - Session should have `user_id`, `questions`, `answers`
   - `expires_at` should be 24 hours from creation

### Expected Result:
- ✅ App works normally
- ✅ Session is created in database
- ✅ Answers are saved to database
- ✅ No errors in console

---

## 🔍 What to Check in Supabase Dashboard

### Table: `user_sessions`

After testing, you should see:
- **id**: UUID (auto-generated)
- **user_id**: Your user UUID (from auth.users)
- **session_id**: String like "session_1234567890_abc123"
- **original_query**: Your search query
- **questions**: JSON array of question objects
- **answers**: JSON object with question IDs as keys
- **current_question_index**: Number (0, 1, 2, etc.)
- **created_at**: Timestamp
- **updated_at**: Timestamp (updates when answers change)
- **expires_at**: Timestamp (24 hours from created_at)

---

## 🐛 Common Issues

### Issue: "Session not found"
**Check:**
- Session exists in Supabase table
- `expires_at` is in the future
- `session_id` matches exactly

### Issue: "Failed to create session"
**Check:**
- Supabase credentials in `.env` are correct
- RLS policies allow INSERT
- `user_id` is valid

### Issue: "Session expired immediately"
**Check:**
- `expires_at` calculation is correct
- Timezone issues (Supabase uses UTC)

---

## ✅ Success Criteria

- [ ] Sessions are created in Supabase database
- [ ] Sessions can be retrieved
- [ ] Sessions can be updated (answers saved)
- [ ] Expired sessions are deleted
- [ ] Sessions are linked to user_id
- [ ] Expiration is set to 24 hours
- [ ] App works end-to-end

---

**Ready to test?** Follow the steps above and verify everything works!


