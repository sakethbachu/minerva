-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- Run this SQL in Supabase SQL Editor for both dev and prod projects
-- This ensures users can only access their own data
-- ============================================

-- ============================================
-- user_profiles RLS Policies
-- ============================================

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

-- ============================================
-- user_sessions RLS Policies
-- ============================================

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

-- ============================================
-- user_search_history RLS Policies
-- ============================================

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

-- ============================================
-- Done! RLS policies created successfully.
-- ============================================
-- Next: Install dependencies and start coding!
-- ============================================

