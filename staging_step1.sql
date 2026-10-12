-- staging_step1.sql — CareerPath AI STAGING ONLY (fresh careerpath-ai-staging, empty public schema).
-- Extracted verbatim from SUPABASE_MIGRATION_FIXED.sql lines 52-186
-- (table creation + RLS + policies + indexes). The destructive header
-- (DROP POLICY / DROP TABLE, lines 6-50) is intentionally excluded:
-- those statements fail or destroy data and are meaningless on an empty schema.
-- Prerequisites verified: pgcrypto installed; auth.users + public schema exist.
-- Run once as owner/service-role. Bare CREATE POLICY / CREATE INDEX statements
-- are NOT re-runnable — do not re-run this file after success.
-- KNOWN TEMPORARY WEAKNESS (kept for later fix-verification, do NOT copy to prod):
--   CREATE POLICY "Users can insert own certificates" (below) lets any
--   authenticated user mint certificate rows via direct REST, bypassing the
--   server-side eligibility checks in server.js. A follow-up revoke/drop
--   migration is required before any production use.
-- Do NOT run against production. Do NOT run SUPABASE_MIGRATION_FIXED.sql itself.

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
-- KNOWN WEAKNESS, see header: direct client INSERT bypasses issuance eligibility.
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
