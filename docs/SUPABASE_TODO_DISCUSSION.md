# Supabase Implementation - Todo Discussion

## ✅ Decisions Made

1. **Google OAuth:** We'll create a new Google Cloud Console project
2. **Profile Collection:** Required immediately after Google login (blocks app access)
3. **Session Expiration:** 24 hours
4. **Search History:** Keep only last 10 searches per user
5. **Projects:** Two separate Supabase projects (dev + prod, both free tier)
6. **Error Handling:** Graceful degradation (allow search without personalization if Supabase fails)

---

## 📋 Updated Todo List (19 tasks)

### Phase 1: Supabase Setup & Configuration (3 tasks)

**1. Set up Supabase projects**
- Create TWO Supabase projects:
  - `minerva-dev` (for development)
  - `minerva-prod` (for production)
- Both on free tier
- Get API keys for both:
  - Project URL
  - `anon` key (public, safe for frontend)
  - `service_role` key (secret, backend only)

**2. Create Google Cloud Console project**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create new project (or use existing)
- Enable Google+ API
- Create OAuth 2.0 Client ID
- Configure authorized redirect URI:
  - Dev: `https://[dev-project-id].supabase.co/auth/v1/callback`
  - Prod: `https://[prod-project-id].supabase.co/auth/v1/callback`
- Get Client ID and Client Secret

**3. Configure Supabase (both projects)**
- Disable email confirmation (Settings → Auth → Email Auth)
- Enable Google OAuth provider
- Add Google Client ID and Secret
- Configure CORS:
  - Dev: Allow `http://localhost:3001`
  - Prod: Allow your production domain
- Set redirect URLs

---

### Phase 2: Database Schema (2 tasks)

**4. Create database schema (both projects)**
- Run SQL migrations in both dev and prod

**Tables to create:**

```sql
-- User profiles (Name, Age, Gender, Lives in US)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  lives_in_us BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions (replaces in-memory Map)
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  original_query TEXT NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB DEFAULT '{}',
  current_question_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL -- Set to NOW() + 24 hours
);

-- Search history (last 10 searches only)
CREATE TABLE public.user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  answers JSONB NOT NULL,
  questions JSONB,
  search_results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**5. Set up Row Level Security (RLS)**
- Enable RLS on all three tables
- Create policies for each table:
  - Users can SELECT their own data
  - Users can INSERT their own data
  - Users can UPDATE their own data

---

### Phase 3: Dependencies & Configuration (2 tasks)

**6. Install dependencies**
- TypeScript: `npm install @supabase/supabase-js`
- Python: `pip install supabase`
- Update `package.json` and `requirements.txt`

**7. Set up environment variables**
- Express `.env`:
  ```
  SUPABASE_URL=https://[project-id].supabase.co
  SUPABASE_ANON_KEY=[anon-key]
  SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
  NODE_ENV=development  # or production
  ```
- Python `.env`:
  ```
  SUPABASE_URL=https://[project-id].supabase.co
  SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
  ```
- Create `.env.example` files (without actual keys)

---

### Phase 4: Frontend Changes (2 tasks)

**8. Update frontend authentication**
- Replace hardcoded login in `public/login.js`
- Initialize Supabase client:
  ```javascript
  import { createClient } from '@supabase/supabase-js'
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  ```
- Replace login logic with:
  ```javascript
  await supabase.auth.signInWithOAuth({ provider: 'google' })
  ```
- Handle auth state changes
- Store JWT in localStorage (or better: httpOnly cookies)
- Update `public/app.js` to check Supabase auth

**9. Create REQUIRED user profile form**
- New page: `public/profile.html`
- **Match current UI style** (use existing styles.css)
- Blocks access to main app until completed
- Form fields:
  - Name (text input)
  - Age (number input)
  - Gender (radio buttons: Male, Female, Other)
  - Lives in US (checkbox or radio: Yes/No)
- **Inline error messages** (show errors next to each field)
- Validation: All fields required
- Save to `user_profiles` table
- Redirect to main app after completion
- Show this page immediately after Google login

---

### Phase 5: Backend (Express) Changes (4 tasks)

**10. Create Express auth middleware**
- Function to validate JWT tokens
- Extract `user_id` from token
- Handle errors gracefully:
  - Invalid token → 401 Unauthorized
  - Supabase down → Log error, allow degraded mode
- Middleware for protected routes:
  ```typescript
  async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '')
    // Validate and extract user_id
    // Attach to req.user
  }
  ```

**11. Migrate sessions to Supabase**
- Remove `userSessions` Map from `server.ts`
- Create functions:
  - `createSession(userId, query, questions)` → saves to DB
  - `getSession(sessionId)` → reads from DB
  - `updateSession(sessionId, answers)` → updates DB
  - `deleteSession(sessionId)` → removes from DB
- Set `expires_at` to 24 hours from creation
- Add cleanup job for expired sessions (optional)

**12. Add search history saving**
- After Python service returns results
- Save to `user_search_history` table
- **Cleanup logic:** Before inserting, check count
  - If user has >= 10 searches, delete oldest
  - Then insert new search
- Include: query, answers, questions, results

**13. Pass user_id to Python**
- Extract `user_id` from JWT in Express
- Pass to Python service (replace `user_id: null`)
- Handle case where user_id might be missing (graceful degradation)

---

### Phase 6: Python Service Changes (3 tasks)

**14. Set up Python Supabase client**
- Initialize in `python-service/main.py`:
  ```python
  from supabase import create_client, Client
  import os
  
  supabase: Client = create_client(
      os.getenv("SUPABASE_URL"),
      os.getenv("SUPABASE_SERVICE_ROLE_KEY")
  )
  ```
- Add graceful error handling
- Test connection on startup

**15. Add Python user data queries**
- Function: `get_user_profile(user_id)` → returns profile or None
- Function: `get_user_search_history(user_id)` → returns last 10 searches or []
- Handle errors gracefully:
  - If Supabase fails → log error, return None/[]
  - Don't crash the search service

**16. Integrate user data in search**
- Update `search_helpers.py`:
  - Fetch user profile (age, country, gender)
  - Fetch search history (last 10)
  - Include in search prompts for personalization
- Example: "User is 25 years old, from USA, prefers casual style..."
- Handle missing data gracefully (search still works without it)

---

### Phase 7: Testing & Cleanup (3 tasks)

**17. Test authentication flow**
- Google OAuth login works
- JWT validation works
- Required profile creation blocks app access
- Session management with 24hr expiration
- Protected routes require auth

**18. Test full integration**
- End-to-end: Login → Profile → Search → History
- Verify Python can query Supabase
- Verify search history limited to 10
- Verify personalization works
- Test graceful degradation (Supabase down scenario)

**19. Remove old authentication code**
- Delete hardcoded credentials from `login.js`
- Remove `HARDCODED_EMAIL` and `HARDCODED_PASSWORD`
- Clean up old auth logic
- Update documentation
- Remove unused code

---

## 🔍 Key Implementation Details

### Profile Collection Flow
```
1. User clicks "Sign in with Google"
2. Google OAuth → Supabase creates user
3. Redirect to /profile.html (REQUIRED)
4. User fills form (Name, Age, Gender, Country)
5. Save to user_profiles table
6. Redirect to main app (/)
```

### Session Expiration
- When creating session: `expires_at = NOW() + INTERVAL '24 hours'`
- When retrieving session: Check if `expires_at > NOW()`
- If expired: Delete session, return 401
- **Approach:** Check expiration on access (simpler, no background job needed)

### Search History Cleanup
```sql
-- Before inserting new search:
-- 1. Count user's searches
-- 2. If count >= 10, delete oldest
-- 3. Insert new search

DELETE FROM user_search_history
WHERE user_id = $1
AND id IN (
  SELECT id FROM user_search_history
  WHERE user_id = $1
  ORDER BY created_at ASC
  LIMIT (SELECT COUNT(*) - 9 FROM user_search_history WHERE user_id = $1)
);
```

### Graceful Degradation Examples
- **Supabase down:** Log error, allow search without personalization
- **User profile missing:** Use default values or skip personalization
- **Python can't query Supabase:** Continue search without user data
- **JWT invalid:** Return 401, redirect to login

---

## ⚠️ Important Considerations

1. **Two Projects:** Remember to configure both dev and prod
2. **API Keys:** Never commit service_role keys to git
3. **RLS Policies:** Test thoroughly - easy to misconfigure
4. **Profile Required:** Users can't access app without profile
5. **History Limit:** Cleanup happens on insert, not on read
6. **Session Expiry:** Check expiration on every session access

---

## ✅ Questions Answered

1. **Profile Page Design:** ✅ Match current UI style as much as possible
2. **Country Field:** ✅ Simple US confirmation (yes/no checkbox or radio buttons)
3. **Gender Options:** ✅ Male, Female, Other
4. **Session Cleanup:** ✅ Check expiration on access (simpler approach, no background job needed)
5. **Error Messages:** ✅ Inline errors (show errors next to form fields)

---

## 🚀 Ready to Start?

Once you confirm:
- The todo list looks good
- You understand the implementation approach
- Any questions are answered

We can begin with Phase 1: Supabase Setup!

---

*Last updated: Based on your decisions*

