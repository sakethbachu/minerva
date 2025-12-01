# Supabase Authentication Implementation Plan

This document outlines the step-by-step plan for implementing Supabase authentication in the Minerva app.

---

## 📋 Todo List Overview

### Phase 1: Supabase Setup & Configuration
1. **Set up Supabase project**
   - Create Supabase account
   - Create new project
   - Get API keys (URL, anon key, service_role key)
   - Note: We'll need to share these keys (securely)

2. **Configure Supabase**
   - Disable email confirmation (Settings → Auth)
   - Enable Google OAuth provider
   - Set up Google Cloud Console OAuth credentials
   - Configure redirect URLs
   - Set up CORS for your frontend domain

### Phase 2: Database Schema
3. **Create database schema**
   - `user_profiles` table:
     - `id` (UUID, references auth.users)
     - `name` (TEXT)
     - `age` (INTEGER)
     - `gender` (TEXT)
     - `country` (TEXT)
     - `created_at`, `updated_at` (TIMESTAMP)
   
   - `user_sessions` table:
     - `id` (UUID, primary key)
     - `user_id` (UUID, references auth.users)
     - `session_id` (TEXT, unique) - your current session format
     - `original_query` (TEXT)
     - `questions` (JSONB)
     - `answers` (JSONB)
     - `current_question_index` (INTEGER)
     - `created_at`, `updated_at`, `expires_at` (TIMESTAMP)
     - **Note:** `expires_at` set to 24 hours from creation
   
   - `user_search_history` table:
     - `id` (UUID, primary key)
     - `user_id` (UUID, references auth.users)
     - `query` (TEXT)
     - `answers` (JSONB)
     - `questions` (JSONB)
     - `search_results` (JSONB, optional)
     - `created_at` (TIMESTAMP)
     - **Note:** Only store last 10 searches per user (cleanup logic needed)

4. **Set up Row Level Security (RLS)**
   - Enable RLS on all three tables
   - Create policies:
     - Users can SELECT their own data
     - Users can INSERT their own data
     - Users can UPDATE their own data
     - Users can DELETE their own data (if needed)

### Phase 3: Dependencies & Configuration
5. **Install dependencies**
   - TypeScript: `@supabase/supabase-js`
   - Python: `supabase-py`
   - Update `package.json` and `requirements.txt`

6. **Set up environment variables**
   - Express `.env`:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Python `.env`:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY` (for direct DB access)

### Phase 4: Frontend Changes
7. **Update frontend authentication**
   - Replace hardcoded login in `login.js`
   - Initialize Supabase client
   - Implement Google OAuth sign-in
   - Handle auth state changes
   - Store JWT token securely
   - Update `app.js` to check Supabase auth instead of localStorage

8. **Create user profile form**
   - New page/modal for profile setup (required, blocks app access)
   - Collect: Name, Age, Gender, Country
   - Save to `user_profiles` table
   - Show immediately after Google login (before accessing main app)
   - Validate all fields are filled

### Phase 5: Backend (Express) Changes
9. **Create Express auth middleware**
   - Function to validate JWT tokens
   - Extract `user_id` from token
   - Create middleware for protected routes
   - Handle token refresh if needed

10. **Migrate sessions to Supabase**
    - Remove in-memory `userSessions` Map
    - Create functions to:
      - Create session in DB
      - Get session from DB
      - Update session in DB
      - Delete session from DB
    - Update all session-related endpoints

11. **Add search history saving**
    - After Python service returns results
    - Save to `user_search_history` table
    - Include: query, answers, questions, results
    - **Implement cleanup:** Keep only last 10 searches per user
    - Delete oldest searches when limit exceeded

12. **Pass user_id to Python**
    - Extract `user_id` from JWT in Express
    - Pass `user_id` to Python service (replace `null`)
    - Update `/submit-answers` endpoint

### Phase 6: Python Service Changes
13. **Set up Python Supabase client**
    - Initialize Supabase client
    - Add to service initialization
    - Test connection

14. **Add Python user data queries**
    - Function to get `user_profile` by user_id
    - Function to get `user_search_history` by user_id
    - Handle errors gracefully

15. **Integrate user data in search**
    - Use user profile (age, country, gender) in search prompts
    - Use search history for personalization
    - Update `search_helpers.py` to incorporate user data

### Phase 7: Testing & Cleanup
16. **Test authentication flow**
    - Google OAuth login
    - JWT token validation
    - User profile creation
    - Session management
    - Protected route access

17. **Test full integration**
    - End-to-end: Login → Search → History → Personalization
    - Verify Python can query Supabase
    - Verify search history is saved
    - Verify personalization works

18. **Remove old authentication code**
    - Delete hardcoded credentials
    - Remove old auth logic
    - Update documentation
    - Clean up unused code

---

## 🤔 Discussion Points

### 1. Google OAuth Setup
**Decision:** ✅ We will create a Google Cloud Console project
- Need to create OAuth 2.0 credentials
- Configure authorized redirect URI: `https://yourproject.supabase.co/auth/v1/callback`
- Get Client ID and Client Secret
- Steps will be included in implementation

### 2. User Profile Collection
**Decision:** ✅ Option A - Right after Google login (before accessing app)
- Collect Name, Age, Gender, Country immediately after login
- User must complete profile before accessing main app
- Better for personalization from the start

### 3. Session Expiration
**Decision:** ✅ 24 hours expiration
- Sessions expire after 24 hours
- Auto-cleanup old sessions
- Users need to log in again after expiration

### 4. Search History Storage
**Decision:** ✅ Last 10 searches only
- Store only the most recent 10 searches per user
- Delete older searches when limit exceeded
- More efficient storage

### 5. Error Handling
**Decision:** ✅ Graceful degradation
- If Supabase is down: Log error, allow search without personalization
- If JWT validation fails: Return 401, redirect to login
- If user profile doesn't exist: Create default profile or prompt user
- If Python can't query Supabase: Log error, continue with search (no personalization)

### 6. Migration Strategy
**Decision:** ✅ Let existing sessions expire naturally
- Current in-memory sessions will be lost on server restart
- Users will create new sessions on next login
- No migration needed

### 7. Development vs Production
**Decision:** ✅ Two separate Supabase projects
- One project for development (localhost)
- One project for production
- Both can use free tier
- Different API keys for each environment

---

## 📝 Implementation Order

**Suggested order:**
1. Supabase setup (1-2)
2. Database schema (3-4)
3. Dependencies (5-6)
4. Frontend auth (7-8)
5. Express auth middleware (9)
6. Express sessions migration (10)
7. Python Supabase setup (13)
8. Python user queries (14)
9. Python integration (15)
10. Express search history (11)
11. Express user_id passing (12)
12. Testing (16-17)
13. Cleanup (18)

**Why this order?**
- Set up infrastructure first (Supabase, DB)
- Then frontend (users can log in)
- Then backend (protect routes)
- Then Python (add personalization)
- Finally integration and testing

---

## ⚠️ Potential Challenges

1. **Google OAuth Setup**
   - Need to configure Google Cloud Console
   - Redirect URI must match exactly
   - May need to verify domain

2. **RLS Policies**
   - Easy to misconfigure
   - Need to test thoroughly
   - Service role key bypasses RLS (use carefully)

3. **Session Migration**
   - Need to ensure no data loss
   - Handle concurrent requests
   - Add proper error handling

4. **Python Supabase Integration**
   - Need to handle connection errors
   - Async/await patterns
   - Error handling for missing data

5. **CORS Configuration**
   - Supabase needs to allow your frontend domain
   - May need to configure for localhost (dev) and production

---

## ✅ Success Criteria

- [ ] Users can log in with Google OAuth
- [ ] JWT tokens are validated correctly
- [ ] User profiles are created and stored
- [ ] Sessions persist in database
- [ ] Search history is saved
- [ ] Python can query user data
- [ ] Personalization works in search
- [ ] RLS policies protect user data
- [ ] Old auth code is removed
- [ ] All tests pass

---

## 📚 Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Python Client](https://github.com/supabase/supabase-py)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)

---

*Ready to discuss and refine before implementation!*

