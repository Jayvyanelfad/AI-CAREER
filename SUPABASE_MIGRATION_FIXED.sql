-- Supabase Migration Script for AI Career Guidance Platform
-- RUN THIS TO FIX DATABASE SCHEMA MISMATCH
-- This creates tables with snake_case columns to match server.js expectations
-- WARNING: This will DELETE ALL EXISTING DATA in these tables

-- ============================================
-- DROP EXISTING POLICIES FIRST
-- ============================================

-- Users policies
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- Career test policies
DROP POLICY IF EXISTS "Users can view their own career test results" ON public.career_test;
DROP POLICY IF EXISTS "Users can insert their own career test results" ON public.career_test;
DROP POLICY IF EXISTS "Users can update their own career test results" ON public.career_test;

-- Enrollments policies
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can insert their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update their own enrollments" ON public.enrollments;

-- Certificates policies
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can insert their own certificates" ON public.certificates;

-- Chat history policies
DROP POLICY IF EXISTS "Users can view their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can insert their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can delete their own chat history" ON public.chat_history;

-- OAuth accounts policies
DROP POLICY IF EXISTS "Users can view their own OAuth accounts" ON public.oauth_accounts;
DROP POLICY IF EXISTS "Users can insert their own OAuth accounts" ON public.oauth_accounts;
DROP POLICY IF EXISTS "Users can update their own OAuth accounts" ON public.oauth_accounts;
DROP POLICY IF EXISTS "Users can delete their own OAuth accounts" ON public.oauth_accounts;

-- ============================================
-- DROP TABLES (if they exist)
-- ============================================

DROP TABLE IF EXISTS public.user_activity CASCADE;
DROP TABLE IF EXISTS public.chat_history CASCADE;
DROP TABLE IF EXISTS public.certificates CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.career_test CASCADE;
DROP TABLE IF EXISTS public.oauth_accounts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- CREATE TABLES WITH SNAKE_CASE
-- ============================================

-- Users profile (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  career_goal TEXT DEFAULT 'undecided',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Career test results
CREATE TABLE IF NOT EXISTS public.career_test (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  answers JSONB NOT NULL,
  top_careers JSONB NOT NULL,
  strengths TEXT[] NOT NULL,
  completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  course_id TEXT NOT NULL,
  course_name TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  completed_hours INTEGER DEFAULT 0,
  total_hours INTEGER DEFAULT 0,
  next_lesson_title TEXT,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  course_id TEXT NOT NULL,
  course_name TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity (for dashboard)
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth accounts (optional)
CREATE TABLE IF NOT EXISTS public.oauth_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_accounts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE POLICIES (SNAKE_CASE)
-- ============================================
-- Users policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Career test policies
CREATE POLICY "Users can view own tests" ON public.career_test FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tests" ON public.career_test FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tests" ON public.career_test FOR UPDATE USING (auth.uid() = user_id);

-- Enrollments policies
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own enrollments" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enrollments" ON public.enrollments FOR UPDATE USING (auth.uid() = user_id);

-- Certificates policies
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own certificates" ON public.certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat history policies
CREATE POLICY "Users can view own chats" ON public.chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON public.chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON public.chat_history FOR DELETE USING (auth.uid() = user_id);

-- User activity policies
CREATE POLICY "Users can view own activity" ON public.user_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON public.user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

-- OAuth accounts policies
CREATE POLICY "Users can view own OAuth accounts" ON public.oauth_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own OAuth accounts" ON public.oauth_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own OAuth accounts" ON public.oauth_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own OAuth accounts" ON public.oauth_accounts FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_career_test_user_id ON public.career_test(user_id);
CREATE INDEX idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON public.user_activity(created_at DESC);