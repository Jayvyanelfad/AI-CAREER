-- These tables are accessed only by the Express API using the server-side
-- service_role client. Explicit deny-all RLS policies document that browser roles
-- must never access these relations directly. service_role bypasses RLS and keeps
-- the table grants required by the backend. This migration changes policies only.
BEGIN;

DO $$
DECLARE
  table_to_lock text;
BEGIN
  FOREACH table_to_lock IN ARRAY ARRAY[
    'admin_users',
    'courses',
    'exam_answers',
    'exam_attempts',
    'exam_crossword_answers',
    'exam_crossword_clues',
    'exam_crosswords',
    'exam_options',
    'exam_questions',
    'exams',
    'lessons',
    'modules',
    'oauth_accounts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_to_lock);
    EXECUTE format(
      'DROP POLICY IF EXISTS "No direct browser access" ON public.%I',
      table_to_lock
    );
    EXECUTE format(
      'CREATE POLICY "No direct browser access" ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      table_to_lock
    );
  END LOOP;
END;
$$;

COMMIT;
