-- Supabase Migration Script for Database Foundation Phase 1
-- This creates the necessary tables for the CareerPath AI application
-- RUN THIS IN SUPABASE SQL EDITOR

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  badge TEXT,
  difficulty TEXT,
  weeks INTEGER,
  level TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- MODULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  module_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, module_order)
);

-- ============================================
-- LESSONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  lesson_order INTEGER NOT NULL,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, lesson_order)
);

-- ============================================
-- LESSON_PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- ============================================
-- EXAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exams (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER NOT NULL DEFAULT 70,
  max_attempts INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EXAM_QUESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, question_order)
);

-- ============================================
-- EXAM_OPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false
);

-- ============================================
-- EXAM_ATTEMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  score INTEGER,
  passed BOOLEAN,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  UNIQUE(exam_id, user_id, attempt_number)
);

-- ============================================
-- EXAM_ANSWERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES exam_options(id),
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- ============================================
-- CAREER_TEST_ATTEMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.career_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  top_careers JSONB,
  score_data JSONB,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_test_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE POLICIES FOR USER-SPECIFIC TABLES
-- ============================================

-- Lesson progress policies
CREATE POLICY "Users can view own lesson progress" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress" ON public.lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lesson progress" ON public.lesson_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Exam attempts policies
CREATE POLICY "Users can view own exam attempts" ON public.exam_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exam attempts" ON public.exam_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exam attempts" ON public.exam_attempts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exam attempts" ON public.exam_attempts
  FOR DELETE USING (auth.uid() = user_id);

-- Exam answers policies
CREATE POLICY "Users can view own exam answers" ON public.exam_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.exam_attempts ea
      WHERE ea.id = exam_answers.attempt_id
        AND ea.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own exam answers" ON public.exam_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.exam_attempts ea
      WHERE ea.id = exam_answers.attempt_id
        AND ea.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own exam answers" ON public.exam_answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.exam_attempts ea
      WHERE ea.id = exam_answers.attempt_id
        AND ea.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own exam answers" ON public.exam_answers
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.exam_attempts ea
      WHERE ea.id = exam_answers.attempt_id
        AND ea.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can view own exam answers" ON public.exam_answers
-- Career test attempts policies
CREATE POLICY "Users can view own career test attempts" ON public.career_test_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career test attempts" ON public.career_test_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career test attempts" ON public.career_test_attempts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own career test attempts" ON public.career_test_attempts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- MIGRATE COURSE DATA FROM PUBLIC/COURSES.JS
-- ============================================
-- NOTE: This part needs to be run separately as it requires reading the JSON data
-- The course data migration should be done via a separate script that reads
-- public/courses.js and inserts/upserts the data into the courses table.
-- For now, we'll create the table structure and note that data migration
-- needs to be completed separately.

COMMENT ON TABLE public.courses IS 'Course catalog containing all available courses';
COMMENT ON TABLE public.modules IS 'Course modules organized by course and order';
COMMENT ON TABLE public.lessons IS 'Individual lessons within modules';
COMMENT ON TABLE public.lesson_progress IS 'User progress tracking for lessons';
COMMENT ON TABLE public.exams IS 'Exams associated with courses';
COMMENT ON TABLE public.exam_questions IS 'Questions belonging to exams';
COMMENT ON TABLE public.exam_options IS 'Answer options for exam questions (is_correct hidden from client)';
COMMENT ON TABLE public.exam_attempts IS 'User attempts at exams';
COMMENT ON TABLE public.exam_answers IS 'User answers to exam questions';
COMMENT ON TABLE public.career_test_attempts IS 'Historical record of career test attempts';