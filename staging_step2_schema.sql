-- staging_step2_schema.sql — CareerPath AI STAGING ONLY (careerpath-ai-staging).
-- Run AFTER staging_step1.sql (7 base tables exist, pgcrypto installed).
-- Run as owner/service-role in the Supabase SQL editor, top to bottom, ONE section at a time.
-- Do NOT run against production. Do NOT run SUPABASE_MIGRATION_FIXED.sql,
-- migrate_database_foundation.sql, or migrate_database_foundation_CORRECTED.sql
-- (superseded / destructive variants — see Section 0).
--
-- WHAT THIS FILE IS:
--   Remaining schema setup consolidated from audited sources:
--   S1 migrate_database_foundation_FINAL.sql (canonical foundation, 10 tables)
--   S2 create_questions_tables.sql (questions, question_options)
--   S3 add-assessment-columns.sql (career_test_attempts extensions)
--   S4 20260925_secure_exam_foundation.sql — SCHEMA PART ONLY
--      (ALTERs, exam_crosswords* tables, RLS FORCE, DROP user-write policies,
--       4 RPC functions + service_role-only grants). Seed INSERTs excluded here;
--      they live in staging_step3_postseed.sql (require seeded parent exam row).
--   S5 20260926_certificate_unique_user_course.sql (idempotency index)
--   S6 migrations/20261011_enrollment_uniqueness.sql (fail-closed unique index)
--   S7 migrations/20260930_admin_users.sql (service_role-only membership table)
--   S8 migrations/20260930_course_availability_status.sql (courses.status)
--   S9 migrations/20261001_profile_identity_compat.sql + 20261011_profile_partial_locale_preferences.sql
--      (profile columns; COMPAT variant — preserves existing users policies)
--   S10 migrations/20261011_notifications.sql (wrapped in a transaction)
--
-- WHAT IS DELIBERATELY EXCLUDED (do not add back without review):
--   X1 SUPABASE_MIGRATION.sql — superseded by staging_step1.sql (camelCase schema mismatch).
--   X2 SUPABASE_MIGRATION_FIXED.sql header lines 6-50 — 7x DROP TABLE CASCADE, destroys data.
--   X3 migrate_database_foundation.sql / _CORRECTED.sql — superseded by _FINAL.sql
--      (duplicate exam_answers SELECT policy in CORRECTED).
--   X4 migrations/20261001_profile_identity.sql (FULL variant) — creates
--      users_profile_* policies that DUPLICATE the "Users can ..." policies from
--      staging_step1.sql. COMPAT variant (S9) is used instead. Never apply both.
--   X5 Seed INSERTs from 20260925 (exam questions 4-10, options, crossword+clues) —
--      moved to staging_step3_postseed.sql; they FK-require exams row
--      'intro_to_ai_exam_1' which only exists after seed-courses.js + seed-exam.js.
--   X6 Content UPDATE files — require seeded parent rows; abort or no-op on empty staging:
--      20260927_assessment_question_accessibility.sql (REQUIRES exactly 109 rows with
--        production UUIDs; staging seed generates random UUIDs — will abort; needs review),
--      20260928_course_learning_consistency.sql (RAISES unless 2 courses with audited
--        descriptions exist; staging seed writes different descriptions — will abort),
--      20260928_course_library_checkpoint_a/b/c/d.sql (guarded no-ops on empty lessons),
--      migrations/20261001_course_learning_outcomes.sql (post-seed content step; input
--        descriptions match seed-courses.js output — run AFTER seeds, not here).
--   X7 Seed scripts (*.js) — run via node AFTER this file (see execution steps below).
--
-- TRANSACTIONALITY (why there is NO single outer BEGIN/COMMIT):
--   S6, S7, S9 already contain their own BEGIN/COMMIT blocks; PostgreSQL does not
--   support nesting them inside an outer transaction (a failure would silently
--   commit nothing / warn). S10 documents a table lock on CREATE INDEX; on empty
--   staging it is instant, but the section keeps its own transaction so a failure
--   rolls back only that section. S1-S3, S5, S8 are IF-NOT-EXISTS / guarded DDL
--   and safe in autocommit; run section-by-section so a failure leaves prior
--   committed sections intact and the failed section can be re-run (all sections
--   are re-runnable — see per-section notes).
--   S4 (secure exam schema) keeps its source BEGIN/COMMIT as one atomic unit.
--
-- RLS / PROTECTION NOTES (nothing weakened here):
--   P1 Certificates keep the KNOWN WEAKNESS insert-own policy from step 1
--      (documented there). A follow-up revoke migration is still required before
--      any production use — this file does NOT silently fix or drop it.
--   P2 S4 REMOVES the 8 user direct-write/read policies on exam_attempts/answers
--      (audited: server enforces ownership via service-role + RPCs) and applies
--      FORCE RLS with NO browser policies on all 8 exam tables. This is the
--      audited exam protection — do not re-add browser exam policies.
--   P3 All 4 exam RPCs are REVOKEd from PUBLIC/anon/authenticated and GRANTed
--      EXECUTE to service_role only. server.js calls them via its service-role client.
--   P4 admin_users: REVOKE ALL from PUBLIC/anon/authenticated; service_role only.
--   P5 notifications: no client INSERT/DELETE policy; authenticated gets SELECT +
--      UPDATE(read_at) only. Server upserts via service-role with dedupe_key.

-- ============================================================================
-- SECTION 0 — PREREQUISITES (read-only; run first, expect 7 rows / 7 tables)
-- ============================================================================
-- SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN
--   ('users','career_test','enrollments','certificates','chat_history','user_activity','oauth_accounts');
--   --> expect 7.
-- SELECT * FROM pg_extension WHERE extname='pgcrypto'; --> expect 1 row.
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN
--   ('courses','modules','lessons','lesson_progress','exams','exam_questions','exam_options',
--    'exam_attempts','exam_answers','career_test_attempts','questions','question_options',
--    'exam_crosswords','exam_crossword_clues','exam_crossword_answers','notifications','admin_users');
--   --> expect 0 rows (proves S1/S2/S4/S7/S10 not yet applied — do not skip this check).

-- ============================================================================
-- SECTION 1 — FOUNDATION (source: migrate_database_foundation_FINAL.sql)
-- Re-runnable: CREATE TABLE IF NOT EXISTS + guarded policies (converted from bare
-- CREATE POLICY so re-runs do not error). No indexes in source. No data change.
-- ============================================================================
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

CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  module_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, module_order)
);

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

CREATE TABLE IF NOT EXISTS public.exams (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER NOT NULL DEFAULT 70,
  max_attempts INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, question_order)
);

CREATE TABLE IF NOT EXISTS public.exam_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false
);

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

CREATE TABLE IF NOT EXISTS public.exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES exam_options(id),
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.career_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  top_careers JSONB,
  score_data JSONB,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_test_attempts ENABLE ROW LEVEL SECURITY;

-- Guarded user-ownership policies (same 16 as FINAL; DO-guards make re-runs safe).
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lesson_progress' AND policyname='Users can view own lesson progress') THEN CREATE POLICY "Users can view own lesson progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lesson_progress' AND policyname='Users can insert own lesson progress') THEN CREATE POLICY "Users can insert own lesson progress" ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lesson_progress' AND policyname='Users can update own lesson progress') THEN CREATE POLICY "Users can update own lesson progress" ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lesson_progress' AND policyname='Users can delete own lesson progress') THEN CREATE POLICY "Users can delete own lesson progress" ON public.lesson_progress FOR DELETE USING (auth.uid() = user_id); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exam_attempts' AND policyname='Users can view own exam attempts') THEN CREATE POLICY "Users can view own exam attempts" ON public.exam_attempts FOR SELECT USING (auth.uid() = user_id); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exam_attempts' AND policyname='Users can insert own exam attempts') THEN CREATE POLICY "Users can insert own exam attempts" ON public.exam_attempts FOR INSERT WITH CHECK (auth.uid() = user_id); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exam_attempts' AND policyname='Users can update own exam attempts') THEN CREATE POLICY "Users can update own exam attempts" ON public.exam_attempts FOR UPDATE USING (auth.uid() = user_id); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exam_attempts' AND policyname='Users can delete own exam attempts') THEN CREATE POLICY "Users can delete own exam attempts" ON public.exam_attempts FOR DELETE USING (auth.uid() = user_id); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exam_answers' AND policyname='Users can view own exam answers') THEN CREATE POLICY "Users can view own exam answers" ON public.exam_answers FOR SELECT USING (EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = exam_answers.attempt_id AND ea.user_id = auth.uid())); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exam_answers' AND policyname='Users can insert own exam answers') THEN CREATE POLICY "Users can insert own exam answers" ON public.exam_answers FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = exam_answers.attempt_id AND ea.user_id = auth.uid())); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exam_answers' AND policyname='Users can update own exam answers') THEN CREATE POLICY "Users can update own exam answers" ON public.exam_answers FOR UPDATE USING (EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = exam_answers.attempt_id AND ea.user_id = auth.uid())); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exam_answers' AND policyname='Users can delete own exam answers') THEN CREATE POLICY "Users can delete own exam answers" ON public.exam_answers FOR DELETE USING (EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = exam_answers.attempt_id AND ea.user_id = auth.uid())); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='career_test_attempts' AND policyname='Users can view own career test attempts') THEN CREATE POLICY "Users can view own career test attempts" ON public.career_test_attempts FOR SELECT USING (auth.uid() = user_id); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='career_test_attempts' AND policyname='Users can insert own career test attempts') THEN CREATE POLICY "Users can insert own career test attempts" ON public.career_test_attempts FOR INSERT WITH CHECK (auth.uid() = user_id); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='career_test_attempts' AND policyname='Users can update own career test attempts') THEN CREATE POLICY "Users can update own career test attempts" ON public.career_test_attempts FOR UPDATE USING (auth.uid() = user_id); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='career_test_attempts' AND policyname='Users can delete own career test attempts') THEN CREATE POLICY "Users can delete own career test attempts" ON public.career_test_attempts FOR DELETE USING (auth.uid() = user_id); END IF; END; $$;
-- NOTE: S4 below intentionally DROPs the 8 exam_attempts/exam_answers policies
-- created here (audited exam lockdown). That is expected — not an error.

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

-- ============================================================================
-- SECTION 2 — QUESTIONS (source: create_questions_tables.sql)
-- Re-runnable after guard conversion (IF NOT EXISTS index + guarded policies).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  category TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  option_value TEXT NOT NULL
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='questions' AND policyname='Questions are viewable by authenticated users') THEN CREATE POLICY "Questions are viewable by authenticated users" ON public.questions FOR SELECT USING (auth.role() = 'authenticated'); END IF; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='question_options' AND policyname='Question options are viewable by authenticated users') THEN CREATE POLICY "Question options are viewable by authenticated users" ON public.question_options FOR SELECT USING (auth.role() = 'authenticated'); END IF; END; $$;

CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_active ON public.questions(active);
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON public.question_options(question_id);

-- ============================================================================
-- SECTION 3 — ASSESSMENT COLUMNS (source: add-assessment-columns.sql, verbatim)
-- Re-runnable: all ADD COLUMN IF NOT EXISTS. Requires S1 (career_test_attempts).
-- ============================================================================
ALTER TABLE public.career_test_attempts
ADD COLUMN IF NOT EXISTS assessment_version VARCHAR(50);

ALTER TABLE public.career_test_attempts
ADD COLUMN IF NOT EXISTS question_ids JSONB;

ALTER TABLE public.career_test_attempts
ADD COLUMN IF NOT EXISTS dimension_scores JSONB;

ALTER TABLE public.career_test_attempts
ADD COLUMN IF NOT EXISTS strengths TEXT[];

ALTER TABLE public.career_test_attempts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================================
-- SECTION 4 — SECURE EXAM SCHEMA (source: 20260925_secure_exam_foundation.sql,
-- SCHEMA PART ONLY — seed INSERTs moved to staging_step3_postseed.sql).
-- Atomic: keeps its source BEGIN/COMMIT. Re-runnable (IF NOT EXISTS + guards +
-- CREATE OR REPLACE functions). Requires S1. On empty exams table the
-- UPDATE ... SET duration_minutes=60 touches 0 rows (safe no-op).
-- ============================================================================
BEGIN;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

UPDATE public.exams
SET duration_minutes = 60
WHERE duration_minutes IS NULL;

ALTER TABLE public.exams
  ALTER COLUMN duration_minutes SET DEFAULT 60,
  ALTER COLUMN duration_minutes SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.exams'::regclass
      AND conname = 'exams_duration_minutes_positive_check'
  ) THEN
    ALTER TABLE public.exams
      ADD CONSTRAINT exams_duration_minutes_positive_check
      CHECK (duration_minutes > 0);
  END IF;
END;
$$;

ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS selected_question_ids JSONB,
  ADD COLUMN IF NOT EXISTS option_order JSONB,
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mcq_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crossword_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS result_data JSONB;

CREATE TABLE IF NOT EXISTS public.exam_crosswords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id TEXT NOT NULL UNIQUE REFERENCES public.exams(id),
  title TEXT NOT NULL,
  grid_rows INTEGER NOT NULL CHECK (grid_rows > 0),
  grid_columns INTEGER NOT NULL CHECK (grid_columns > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_crossword_clues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crossword_id UUID NOT NULL REFERENCES public.exam_crosswords(id),
  clue_number INTEGER NOT NULL,
  clue_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  row INTEGER NOT NULL CHECK (row >= 0),
  "column" INTEGER NOT NULL CHECK ("column" >= 0),
  direction TEXT NOT NULL CHECK (direction IN ('across', 'down')),
  points INTEGER NOT NULL DEFAULT 1 CHECK (points > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crossword_id, clue_number)
);

CREATE TABLE IF NOT EXISTS public.exam_crossword_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id),
  clue_id UUID NOT NULL REFERENCES public.exam_crossword_clues(id),
  submitted_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, clue_id)
);

CREATE INDEX IF NOT EXISTS exam_crossword_clues_crossword_id_idx
  ON public.exam_crossword_clues (crossword_id);
CREATE INDEX IF NOT EXISTS exam_crossword_answers_attempt_id_idx
  ON public.exam_crossword_answers (attempt_id);

-- DEFERRED TO staging_step3_postseed.sql (require parent exam row
-- 'intro_to_ai_exam_1' from seed-courses.js + seed-exam.js):
--   INSERT exam_questions (orders 4-10) + exam_options + exam_crosswords + clues.

CREATE UNIQUE INDEX IF NOT EXISTS exam_attempts_one_active_per_user_exam_idx
  ON public.exam_attempts (exam_id, user_id)
  WHERE submitted_at IS NULL;

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crosswords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crossword_clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crossword_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_options FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crosswords FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crossword_clues FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crossword_answers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can insert own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can update own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can delete own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can view own exam answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Users can insert own exam answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Users can update own exam answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Users can delete own exam answers" ON public.exam_answers;

CREATE OR REPLACE FUNCTION public.save_exam_answer(
  p_attempt_id UUID,
  p_user_id UUID,
  p_question_id UUID,
  p_selected_option_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.exam_attempts%ROWTYPE;
BEGIN
  SELECT * INTO v_attempt
  FROM public.exam_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND OR v_attempt.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_attempt.submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Attempt is already submitted' USING ERRCODE = '55000';
  END IF;
  IF v_attempt.mcq_submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Part A is already submitted' USING ERRCODE = '55000';
  END IF;
  IF v_attempt.deadline_at IS NULL OR v_attempt.deadline_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'Attempt deadline has passed' USING ERRCODE = '22023';
  END IF;
  IF v_attempt.selected_question_ids IS NULL
     OR NOT (v_attempt.selected_question_ids @> jsonb_build_array(p_question_id::TEXT)) THEN
    RAISE EXCEPTION 'Question is not part of this attempt' USING ERRCODE = '22023';
  END IF;
  IF v_attempt.option_order IS NULL
     OR NOT ((v_attempt.option_order -> p_question_id::TEXT) @> jsonb_build_array(p_selected_option_id::TEXT)) THEN
    RAISE EXCEPTION 'Option is not part of this attempt question' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.exam_options
    WHERE id = p_selected_option_id AND question_id = p_question_id
  ) THEN
    RAISE EXCEPTION 'Option does not belong to question' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.exam_answers (attempt_id, question_id, selected_option_id, is_correct)
  VALUES (p_attempt_id, p_question_id, p_selected_option_id, NULL)
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id,
                is_correct = NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_exam_attempt(
  p_attempt_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.exam_attempts%ROWTYPE;
  v_passing_score INTEGER;
  v_total_questions INTEGER;
  v_answered_questions INTEGER;
  v_total_points NUMERIC;
  v_earned_points NUMERIC;
  v_mcq_correct INTEGER;
  v_mcq_percentage NUMERIC;
  v_crossword_correct INTEGER;
  v_crossword_total INTEGER;
  v_crossword_percentage NUMERIC;
  v_score NUMERIC;
  v_passed BOOLEAN;
  v_has_crossword BOOLEAN;
  v_submitted_at TIMESTAMPTZ;
  v_status TEXT;
  v_result JSONB;
BEGIN
  SELECT * INTO v_attempt
  FROM public.exam_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND OR v_attempt.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_attempt.submitted_at IS NOT NULL THEN
    RETURN COALESCE(v_attempt.result_data, '{}'::JSONB) || jsonb_build_object('attempt_id', p_attempt_id);
  END IF;

  SELECT passing_score INTO v_passing_score
  FROM public.exams WHERE id = v_attempt.exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.exam_crosswords WHERE exam_id = v_attempt.exam_id)
  INTO v_has_crossword;

  v_total_questions := COALESCE(jsonb_array_length(v_attempt.selected_question_ids), 0);
  SELECT COALESCE(SUM(q.points), 0) INTO v_total_points
  FROM jsonb_array_elements_text(COALESCE(v_attempt.selected_question_ids, '[]'::JSONB)) picked(value)
  JOIN public.exam_questions q ON q.id = picked.value::UUID AND q.exam_id = v_attempt.exam_id;

  UPDATE public.exam_answers a
  SET is_correct = o.is_correct
  FROM public.exam_options o
  WHERE a.attempt_id = p_attempt_id
    AND o.id = a.selected_option_id
    AND o.question_id = a.question_id;

  SELECT count(*) INTO v_answered_questions
  FROM public.exam_answers
  WHERE attempt_id = p_attempt_id AND selected_option_id IS NOT NULL;

  SELECT count(*) FILTER (WHERE a.is_correct = TRUE)::INTEGER,
         COALESCE(SUM(q.points) FILTER (WHERE a.is_correct = TRUE), 0)
  INTO v_mcq_correct, v_earned_points
  FROM public.exam_answers a
  JOIN public.exam_questions q ON q.id = a.question_id
  WHERE a.attempt_id = p_attempt_id;

  IF v_total_points > 0 THEN
    v_mcq_percentage := round(v_earned_points * 100 / v_total_points, 2);
  ELSE
    v_mcq_percentage := 0;
  END IF;
  v_submitted_at := clock_timestamp();

  IF v_attempt.deadline_at IS NULL OR v_submitted_at >= v_attempt.deadline_at THEN
    SELECT count(*) FILTER (WHERE a.is_correct = TRUE)::INTEGER,
           count(*)::INTEGER
    INTO v_crossword_correct, v_crossword_total
    FROM public.exam_crossword_answers a
    JOIN public.exam_crossword_clues c ON c.id = a.clue_id
    JOIN public.exam_crosswords cw ON cw.id = c.crossword_id AND cw.exam_id = v_attempt.exam_id
    WHERE a.attempt_id = p_attempt_id;
    SELECT count(*)::INTEGER INTO v_crossword_total
    FROM public.exam_crossword_clues c
    JOIN public.exam_crosswords cw ON cw.id = c.crossword_id
    WHERE cw.exam_id = v_attempt.exam_id;
    v_crossword_correct := COALESCE(v_crossword_correct, 0);
    v_crossword_total := COALESCE(v_crossword_total, 0);
    v_crossword_percentage := CASE WHEN v_crossword_total > 0
      THEN round(v_crossword_correct * 100.0 / v_crossword_total, 2) ELSE 0 END;
    v_score := CASE WHEN v_has_crossword
      THEN round(v_mcq_percentage * 0.70 + v_crossword_percentage * 0.30, 0)
      ELSE round(v_mcq_percentage, 0) END;
    v_passed := v_score >= v_passing_score;
    v_status := 'expired';
    v_result := jsonb_build_object(
      'mcq', jsonb_build_object('correct', COALESCE(v_mcq_correct, 0), 'total', v_total_questions, 'answered', v_answered_questions, 'percentage', v_mcq_percentage),
      'crossword', CASE WHEN v_has_crossword THEN jsonb_build_object('correct', v_crossword_correct, 'total', v_crossword_total, 'percentage', v_crossword_percentage) ELSE 'null'::JSONB END,
      'final_score', v_score, 'passing_score', v_passing_score, 'passed', v_passed,
      'status', v_status, 'submitted_at', v_submitted_at
    );
    UPDATE public.exam_attempts
    SET mcq_submitted_at = COALESCE(mcq_submitted_at, v_submitted_at),
        crossword_submitted_at = CASE WHEN v_has_crossword THEN COALESCE(crossword_submitted_at, v_submitted_at) ELSE crossword_submitted_at END,
        score = v_score::INTEGER,
        passed = v_passed,
        submitted_at = v_submitted_at,
        result_data = v_result
    WHERE id = p_attempt_id;
  ELSE
    IF v_attempt.mcq_submitted_at IS NOT NULL THEN
      RETURN COALESCE(v_attempt.result_data, '{}'::JSONB) || jsonb_build_object('attempt_id', p_attempt_id, 'status', 'part_b');
    END IF;
    v_result := COALESCE(v_attempt.result_data, '{}'::JSONB) || jsonb_build_object(
      'mcq', jsonb_build_object('correct', COALESCE(v_mcq_correct, 0), 'total', v_total_questions, 'answered', v_answered_questions, 'percentage', v_mcq_percentage)
    );
    IF NOT v_has_crossword THEN
      v_score := round(v_mcq_percentage, 0);
      v_passed := v_score >= v_passing_score;
      v_result := v_result || jsonb_build_object(
        'final_score', v_score, 'passing_score', v_passing_score, 'passed', v_passed,
        'status', 'submitted', 'submitted_at', v_submitted_at
      );
      UPDATE public.exam_attempts
      SET mcq_submitted_at = v_submitted_at,
          submitted_at = v_submitted_at,
          score = v_score::INTEGER,
          passed = v_passed,
          result_data = v_result
      WHERE id = p_attempt_id;
      RETURN v_result || jsonb_build_object('attempt_id', p_attempt_id);
    END IF;
    UPDATE public.exam_attempts
    SET mcq_submitted_at = v_submitted_at,
        result_data = v_result
    WHERE id = p_attempt_id;
    RETURN v_result || jsonb_build_object('attempt_id', p_attempt_id, 'status', 'part_b');
  END IF;

  RETURN v_result || jsonb_build_object('attempt_id', p_attempt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_exam_crossword_answer(
  p_attempt_id UUID,
  p_user_id UUID,
  p_clue_id UUID,
  p_answer TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.exam_attempts%ROWTYPE;
  v_correct_answer TEXT;
  v_normalized TEXT;
  v_is_correct BOOLEAN;
BEGIN
  SELECT * INTO v_attempt FROM public.exam_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND OR v_attempt.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_attempt.mcq_submitted_at IS NULL THEN
    RAISE EXCEPTION 'Part A must be submitted first' USING ERRCODE = '55000';
  END IF;
  IF v_attempt.submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Exam attempt is finalized' USING ERRCODE = '55000';
  END IF;
  IF v_attempt.deadline_at IS NULL OR v_attempt.deadline_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'Attempt deadline has passed' USING ERRCODE = '22023';
  END IF;
  SELECT c.answer INTO v_correct_answer
  FROM public.exam_crossword_clues c
  JOIN public.exam_crosswords cw ON cw.id = c.crossword_id
  WHERE c.id = p_clue_id AND cw.exam_id = v_attempt.exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clue is not part of this exam' USING ERRCODE = '22023';
  END IF;
  v_normalized := upper(regexp_replace(btrim(COALESCE(p_answer, '')), '[^A-Za-z0-9]', '', 'g'));
  v_is_correct := v_normalized = upper(regexp_replace(btrim(v_correct_answer), '[^A-Za-z0-9]', '', 'g'));
  INSERT INTO public.exam_crossword_answers (attempt_id, clue_id, submitted_answer, is_correct, updated_at)
  VALUES (p_attempt_id, p_clue_id, COALESCE(p_answer, ''), v_is_correct, clock_timestamp())
  ON CONFLICT (attempt_id, clue_id)
  DO UPDATE SET submitted_answer = EXCLUDED.submitted_answer,
                is_correct = EXCLUDED.is_correct,
                updated_at = EXCLUDED.updated_at;
  RETURN jsonb_build_object('saved', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_exam_crossword(
  p_attempt_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.exam_attempts%ROWTYPE;
  v_passing_score INTEGER;
  v_mcq_percentage NUMERIC;
  v_crossword_correct INTEGER;
  v_crossword_total INTEGER;
  v_crossword_percentage NUMERIC;
  v_final_score NUMERIC;
  v_passed BOOLEAN;
  v_submitted_at TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  SELECT * INTO v_attempt FROM public.exam_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND OR v_attempt.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_attempt.submitted_at IS NOT NULL THEN
    RETURN COALESCE(v_attempt.result_data, '{}'::JSONB) || jsonb_build_object('attempt_id', p_attempt_id);
  END IF;
  IF v_attempt.mcq_submitted_at IS NULL THEN
    RAISE EXCEPTION 'Part A must be submitted first' USING ERRCODE = '55000';
  END IF;
  IF v_attempt.deadline_at IS NULL OR v_attempt.deadline_at <= clock_timestamp() THEN
    RETURN public.submit_exam_attempt(p_attempt_id, p_user_id);
  END IF;

  SELECT passing_score INTO v_passing_score FROM public.exams WHERE id = v_attempt.exam_id;
  v_mcq_percentage := COALESCE((v_attempt.result_data #>> '{mcq,percentage}')::NUMERIC, 0);
  SELECT count(*) FILTER (WHERE a.is_correct = TRUE)::INTEGER,
         count(*)::INTEGER
  INTO v_crossword_correct, v_crossword_total
  FROM public.exam_crossword_answers a
  JOIN public.exam_crossword_clues c ON c.id = a.clue_id
  JOIN public.exam_crosswords cw ON cw.id = c.crossword_id AND cw.exam_id = v_attempt.exam_id
  WHERE a.attempt_id = p_attempt_id;
  SELECT count(*)::INTEGER INTO v_crossword_total
  FROM public.exam_crossword_clues c
  JOIN public.exam_crosswords cw ON cw.id = c.crossword_id
  WHERE cw.exam_id = v_attempt.exam_id;
  v_crossword_correct := COALESCE(v_crossword_correct, 0);
  v_crossword_total := COALESCE(v_crossword_total, 0);
  v_crossword_percentage := CASE WHEN v_crossword_total > 0
    THEN round(v_crossword_correct * 100.0 / v_crossword_total, 2) ELSE 0 END;
  v_final_score := round(v_mcq_percentage * 0.70 + v_crossword_percentage * 0.30, 0);
  v_passed := v_final_score >= v_passing_score;
  v_submitted_at := clock_timestamp();
  v_result := COALESCE(v_attempt.result_data, '{}'::JSONB) || jsonb_build_object(
    'crossword', jsonb_build_object('correct', v_crossword_correct, 'total', v_crossword_total, 'percentage', v_crossword_percentage),
    'final_score', v_final_score, 'passing_score', v_passing_score, 'passed', v_passed,
    'status', 'submitted', 'submitted_at', v_submitted_at
  );
  UPDATE public.exam_attempts
  SET crossword_submitted_at = v_submitted_at,
      submitted_at = v_submitted_at,
      score = v_final_score::INTEGER,
      passed = v_passed,
      result_data = v_result
  WHERE id = p_attempt_id;
  RETURN v_result || jsonb_build_object('attempt_id', p_attempt_id);
END;
$$;

REVOKE ALL ON FUNCTION public.save_exam_answer(UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_exam_answer(UUID, UUID, UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.submit_exam_attempt(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam_attempt(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.save_exam_crossword_answer(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_exam_crossword_answer(UUID, UUID, UUID, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.submit_exam_crossword(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam_crossword(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- ============================================================================
-- SECTION 5 — CERTIFICATE IDEMPOTENCY (source: 20260926, verbatim)
-- Re-runnable (IF NOT EXISTS). Requires step-1 certificates table.
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_course_unique_idx
  ON public.certificates (user_id, course_id);

-- ============================================================================
-- SECTION 6 — ENROLLMENT UNIQUENESS (source: migrations/20261011_enrollment_uniqueness.sql, verbatim)
-- Own transaction, fail-closed: aborts with NO change if NULLs/duplicates exist.
-- Re-runnable. On empty staging: guards pass, index created instantly.
-- NOTE: CREATE INDEX takes a table lock; on empty staging this is instant.
-- For a large live table use a separate CONCURRENTLY procedure instead.
-- ============================================================================
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.enrollments
    WHERE user_id IS NULL OR course_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add enrollment uniqueness: user_id or course_id contains NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.enrollments
    GROUP BY user_id, course_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add enrollment uniqueness: duplicate (user_id, course_id) pairs exist';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS enrollments_user_course_unique_idx
  ON public.enrollments (user_id, course_id);

COMMIT;

-- ============================================================================
-- SECTION 7 — ADMIN MEMBERSHIP (source: migrations/20260930_admin_users.sql, verbatim)
-- Own transaction. Re-runnable. No browser policies (service_role only).
-- After this: insert the first admin user_id manually via service-role API.
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_users FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.admin_users TO service_role;

COMMIT;

-- ============================================================================
-- SECTION 8 — COURSE AVAILABILITY (source: migrations/20260930_course_availability_status.sql)
-- Guarded re-runnable variant (constraint guard added; same semantics).
-- Requires S1 (courses). No data rewrite; default 'available' preserves behavior.
-- ============================================================================
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.courses'::regclass
      AND conname = 'courses_status_check'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_status_check
      CHECK (status IN ('available','coming_soon'));
  END IF;
END;
$$;

-- ============================================================================
-- SECTION 9 — PROFILE COLUMNS + LOCALES (sources: 20261001_profile_identity_compat.sql
-- + 20261011_profile_partial_locale_preferences.sql, verbatim in order).
-- Uses COMPAT (no users-policy changes) to avoid duplicating the step-1 policies.
-- Do NOT also apply the FULL profile_identity.sql variant. Own transactions.
-- Requires: storage schema (Supabase-provided). If storage.buckets is absent,
-- S9b bucket step fails — create the bucket in Dashboard > Storage and re-run S9.
-- ============================================================================
-- S9a: profile columns, checks, trigger, avatar bucket+policies (compat).
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT,
  ADD COLUMN IF NOT EXISTS theme_preference TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_profile_language_check,
  ADD CONSTRAINT users_profile_language_check
    CHECK (preferred_language IS NULL OR preferred_language IN ('en', 'fr', 'hinglish', 'sw', 'ar')),
  DROP CONSTRAINT IF EXISTS users_profile_theme_check,
  ADD CONSTRAINT users_profile_theme_check
    CHECK (theme_preference IS NULL OR theme_preference IN ('system', 'light', 'dark')),
  DROP CONSTRAINT IF EXISTS users_profile_bio_length_check,
  ADD CONSTRAINT users_profile_bio_length_check
    CHECK (bio IS NULL OR char_length(bio) <= 240);

CREATE OR REPLACE FUNCTION public.set_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_profile_updated_at ON public.users;
CREATE TRIGGER users_profile_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_updated_at();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-avatars', 'profile-avatars', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'profile-avatars' AND public = TRUE
      AND file_size_limit = 5242880
      AND allowed_mime_types @> ARRAY['image/jpeg', 'image/png', 'image/webp']
  ) THEN
    RAISE EXCEPTION 'Existing profile-avatars bucket has incompatible access or upload limits; review it before migration';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profile_avatars_owner_insert') THEN
    CREATE POLICY profile_avatars_owner_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profile_avatars_owner_delete') THEN
    CREATE POLICY profile_avatars_owner_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
  END IF;
END;
$$;

COMMIT;

-- S9b: extend language check to partial community locales. Own transaction.
BEGIN;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_profile_language_check,
  ADD CONSTRAINT users_profile_language_check
    CHECK (preferred_language IS NULL OR preferred_language IN (
      'en', 'fr', 'hinglish', 'sw', 'ar', 'pcm', 'wo', 'ha'
    ));

COMMIT;

-- ============================================================================
-- SECTION 10 — NOTIFICATIONS (source: migrations/20261011_notifications.sql,
-- wrapped in a transaction; otherwise verbatim).
-- Re-runnable (IF NOT EXISTS + DROP/CREATE policies). No client insert/delete.
-- ============================================================================
BEGIN;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('course_completed', 'certificate_issued')),
  title text not null check (char_length(title) between 1 and 160),
  body text,
  href text,
  dedupe_key text not null check (char_length(dedupe_key) between 1 and 200),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
alter table public.notifications enable row level security;
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON TABLE public.notifications FROM anon, authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.notifications TO authenticated;

COMMIT;

-- ============================================================================
-- SECTION 11 — VERIFICATION (read-only; run after all sections, compare values)
-- ============================================================================
-- V1 tables: expect 24 (7 step-1 + 17 new).
-- SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN
--   ('users','career_test','enrollments','certificates','chat_history','user_activity',
--    'oauth_accounts','courses','modules','lessons','lesson_progress','exams','exam_questions',
--    'exam_options','exam_attempts','exam_answers','career_test_attempts','questions',
--    'question_options','exam_crosswords','exam_crossword_clues','exam_crossword_answers',
--    'notifications','admin_users');
-- V2 RLS enabled on all 24: SELECT tablename FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename
--   WHERE t.schemaname='public' AND c.relnamespace='public'::regnamespace AND NOT c.relrowsecurity
--   AND t.tablename NOT IN ('courses','modules','lessons','exams','exam_questions','exam_options',
--   'questions','question_options'); --> expect 0 rows (only the 8 intentionally
--   public-read catalog tables lack RLS; the 8 exam tables have RLS+FORCE).
-- V3 exam lockdown: SELECT policyname FROM pg_policies WHERE schemaname='public'
--   AND tablename IN ('exam_attempts','exam_answers'); --> expect 0 rows.
-- V4 RPC grants: SELECT p.proname, grantee::regrole::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   LEFT JOIN LATERAL aclexplode(p.proacl) a ON true WHERE n.nspname='public'
--   AND p.proname IN ('save_exam_answer','submit_exam_attempt','save_exam_crossword_answer','submit_exam_crossword');
--   --> only service_role EXECUTE; no PUBLIC/anon/authenticated entries.
-- V5 indexes: SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN
--   ('certificates_user_course_unique_idx','enrollments_user_course_unique_idx',
--    'exam_attempts_one_active_per_user_exam_idx'); --> expect 3 rows.
-- V6 columns: SELECT column_name FROM information_schema.columns WHERE table_schema='public'
--   AND table_name='career_test_attempts' AND column_name IN
--   ('assessment_version','question_ids','dimension_scores','strengths','updated_at'); --> 5 rows.
--   SELECT column_name FROM information_schema.columns WHERE table_schema='public'
--   AND table_name='users' AND column_name IN
--   ('avatar_path','bio','preferred_language','theme_preference','updated_at'); --> 5 rows.
--   SELECT column_name FROM information_schema.columns WHERE table_schema='public'
--   AND table_name='courses' AND column_name='status'; --> 1 row.
