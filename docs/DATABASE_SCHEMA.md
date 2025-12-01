# Todo #4: Create Database Schema

## 📋 What We're Doing

Creating three tables in both Supabase projects (dev + prod):
1. `user_profiles` - Store user profile data (name, age, gender, lives_in_us)
2. `user_sessions` - Store user sessions (replaces in-memory Map)
3. `user_search_history` - Store search history (last 10 searches per user)

---

## 🗄️ Database Schema

### Table 1: `user_profiles`

Stores user profile information collected after Google login.

```sql
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  lives_in_us BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_user_profiles_id ON public.user_profiles(id);

-- Trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Table 2: `user_sessions`

Stores user sessions (replaces in-memory `userSessions` Map).

```sql
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  original_query TEXT NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB DEFAULT '{}',
  current_question_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for faster queries
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Trigger to update updated_at automatically
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Table 3: `user_search_history`

Stores search history (keeps only last 10 searches per user).

```sql
CREATE TABLE public.user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  answers JSONB NOT NULL,
  questions JSONB,
  search_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_user_search_history_user_id ON public.user_search_history(user_id);
CREATE INDEX idx_user_search_history_created_at ON public.user_search_history(created_at DESC);

-- Function to keep only last 10 searches per user
CREATE OR REPLACE FUNCTION cleanup_old_search_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete searches beyond the 10th most recent for this user
  DELETE FROM public.user_search_history
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM public.user_search_history
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup old searches after insert
CREATE TRIGGER cleanup_old_search_history_trigger
  AFTER INSERT ON public.user_search_history
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_search_history();
```

---

## 🚀 How to Create the Schema

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`minerva-dev` or `minerva-prod`)
3. Go to **"SQL Editor"** (left sidebar)
4. Click **"New query"**
5. Copy and paste the SQL from above (all three tables)
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. Verify tables were created by going to **"Table Editor"** → you should see the three tables

### Option 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed, you can run migrations.

---

## 📝 Step-by-Step Instructions

### For Development Project (minerva-dev)

1. **Open SQL Editor:**
   - Go to Supabase Dashboard
   - Select `minerva-dev` project
   - Click **"SQL Editor"** in left sidebar

2. **Create Tables:**
   - Click **"New query"**
   - Copy the SQL for all three tables (from above)
   - Paste into the editor
   - Click **"Run"** button

3. **Verify:**
   - Go to **"Table Editor"**
   - You should see: `user_profiles`, `user_sessions`, `user_search_history`

### For Production Project (minerva-prod)

Repeat the same steps:
1. Select `minerva-prod` project
2. Go to SQL Editor
3. Run the same SQL
4. Verify tables were created

---

## ✅ Checklist

### Development Project:
- [ ] `user_profiles` table created
- [ ] `user_sessions` table created
- [ ] `user_search_history` table created
- [ ] Indexes created
- [ ] Triggers created (updated_at, cleanup)

### Production Project:
- [ ] `user_profiles` table created
- [ ] `user_sessions` table created
- [ ] `user_search_history` table created
- [ ] Indexes created
- [ ] Triggers created

---

## 🔍 What Each Table Does

### `user_profiles`
- Links to `auth.users` (Supabase's user table)
- Stores: name, age, gender, lives_in_us
- One row per user

### `user_sessions`
- Stores session data (replaces in-memory Map)
- Links to `auth.users` via `user_id`
- Has `expires_at` (24 hours from creation)
- Used for question/answer flow

### `user_search_history`
- Stores past searches for personalization
- Automatically keeps only last 10 per user (via trigger)
- Links to `auth.users` via `user_id`

---

## ⚠️ Important Notes

1. **Foreign Keys:**
   - All tables reference `auth.users(id)`
   - `ON DELETE CASCADE` means if a user is deleted, their data is deleted too

2. **Automatic Cleanup:**
   - Search history trigger keeps only last 10 searches
   - Sessions expire after 24 hours (we'll check this in code)

3. **JSONB Fields:**
   - `questions`, `answers`, `search_results` are JSONB (flexible JSON storage)
   - Good for storing complex data structures

4. **Timestamps:**
   - `created_at` and `updated_at` are automatically managed
   - `expires_at` will be set to NOW() + 24 hours when creating sessions

---

## 🎯 Next Steps

After creating the tables:
- We'll set up Row Level Security (RLS) policies (Todo #5)
- Then install dependencies and start coding!

---

**Ready?** Go ahead and run the SQL in both projects, then let me know when you're done!


