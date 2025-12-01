# Todo #5: Set up Row Level Security (RLS) Policies

## 📋 What We're Doing

Setting up Row Level Security (RLS) policies to ensure users can only access their own data. This is critical for security!

**Current Status:** Your tables show "Unrestricted" - we need to enable RLS and create policies.

---

## 🔒 What is RLS?

Row Level Security (RLS) is a PostgreSQL feature that:
- Controls which rows users can see/modify
- Works at the database level (even if someone has your API key)
- Uses `auth.uid()` to get the current user's ID from the JWT token

**Without RLS:** Anyone with your API key can read/write all data  
**With RLS:** Users can only access their own data (based on policies)

---

## 🚀 RLS Policies We Need

For each table, we need:
1. **Enable RLS** on the table
2. **SELECT policy:** Users can view their own rows
3. **INSERT policy:** Users can insert their own rows
4. **UPDATE policy:** Users can update their own rows
5. **DELETE policy:** (Optional) Users can delete their own rows

---

## 📝 SQL for RLS Policies

### For user_profiles table:

```sql
-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### For user_sessions table:

```sql
-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
  ON public.user_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON public.user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON public.user_sessions
  FOR DELETE
  USING (auth.uid() = user_id);
```

### For user_search_history table:

```sql
-- Enable RLS
ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own search history
CREATE POLICY "Users can view own search history"
  ON public.user_search_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own search history
CREATE POLICY "Users can insert own search history"
  ON public.user_search_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## 🎯 How to Apply RLS Policies

### Option 1: All at Once (Recommended)

Copy all the SQL above and run it in one query in Supabase SQL Editor.

### Option 2: Table by Table

Run the SQL for each table separately if you prefer to verify each one.

---

## 📋 Step-by-Step Instructions

### For Development Project (minerva-dev):

1. **Open SQL Editor:**
   - Go to Supabase Dashboard
   - Select `minerva-dev` project
   - Click **"SQL Editor"** in left sidebar

2. **Create Policies:**
   - Click **"New query"**
   - Copy all the RLS SQL (from above)
   - Paste into the editor
   - Click **"Run"** button

3. **Verify:**
   - Go to **"Table Editor"**
   - Click on each table
   - You should see the "Unrestricted" tag change to show RLS is enabled
   - Or go to **"Authentication"** → **"Policies"** to see the policies

### For Production Project (minerva-prod):

Repeat the same steps:
1. Select `minerva-prod` project
2. Go to SQL Editor
3. Run the same RLS SQL
4. Verify policies were created

---

## ✅ Checklist

### Development Project:
- [ ] RLS enabled on `user_profiles`
- [ ] RLS enabled on `user_sessions`
- [ ] RLS enabled on `user_search_history`
- [ ] Policies created for all tables
- [ ] Verified in Table Editor (no longer "Unrestricted")

### Production Project:
- [ ] RLS enabled on `user_profiles`
- [ ] RLS enabled on `user_sessions`
- [ ] RLS enabled on `user_search_history`
- [ ] Policies created for all tables
- [ ] Verified in Table Editor

---

## 🔍 Understanding the Policies

### `auth.uid()`
- Returns the current user's ID from the JWT token
- Only works when a user is authenticated
- Returns `NULL` if no user is logged in

### Policy Types:
- **SELECT:** Controls what rows users can read
- **INSERT:** Controls what rows users can create
- **UPDATE:** Controls what rows users can modify
- **DELETE:** Controls what rows users can remove

### `USING` vs `WITH CHECK`:
- **USING:** Condition for existing rows (SELECT, UPDATE, DELETE)
- **WITH CHECK:** Condition for new/modified rows (INSERT, UPDATE)

---

## ⚠️ Important Notes

1. **Service Role Key Bypasses RLS:**
   - The `service_role` key can read/write all data
   - Only use it in backend/server code
   - Never expose it in frontend!

2. **Anon Key Respects RLS:**
   - The `anon` key respects RLS policies
   - Safe to use in frontend
   - Users can only access their own data

3. **Testing:**
   - After enabling RLS, test that users can only see their own data
   - If queries return empty, check that RLS policies are correct

---

## 🎯 Next Steps

After setting up RLS:
- We'll install dependencies (@supabase/supabase-js, supabase-py)
- Then start coding the frontend and backend!

---

**Ready?** Run the RLS SQL in both projects, then let me know when you're done!

