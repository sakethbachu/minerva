-- ============================================
-- Minerva Database Schema
-- ============================================
-- Run this SQL in Supabase SQL Editor for both dev and prod projects
-- ============================================

-- ============================================
-- Table 1: user_profiles
-- ============================================
-- Stores user profile information (name, age, gender, lives_in_us)
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

-- ============================================
-- Table 2: user_sessions
-- ============================================
-- Stores user sessions (replaces in-memory Map)
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

-- ============================================
-- Table 3: user_search_history
-- ============================================
-- Stores search history (keeps only last 10 searches per user)
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

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_sessions updated_at
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- ============================================
-- Done! Tables created successfully.
-- ============================================
-- Next: Set up Row Level Security (RLS) policies
-- ============================================


