-- Hardens the public API boundary for tables whose writes are performed by the
-- Express server using its service-role Supabase client. Apply only after the
-- full application schema exists and the backend API contract has been reviewed.
-- This migration is additive/re-runnable and does not modify table rows.
BEGIN;

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.users,
  public.career_test,
  public.career_test_attempts,
  public.enrollments,
  public.lesson_progress,
  public.certificates,
  public.chat_history,
  public.user_activity
FROM anon, authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.oauth_accounts FROM anon, authenticated;

DO $$
DECLARE grant_row RECORD;
BEGIN
  FOR grant_row IN
    SELECT table_schema, table_name, column_name, privilege_type, grantee
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
      AND (
        (table_name IN (
          'users', 'career_test', 'career_test_attempts', 'enrollments',
          'lesson_progress', 'certificates', 'chat_history', 'user_activity'
        ) AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'REFERENCES'))
        OR table_name = 'oauth_accounts'
      )
  LOOP
    EXECUTE format(
      'REVOKE %s (%I) ON TABLE %I.%I FROM %I',
      grant_row.privilege_type, grant_row.column_name,
      grant_row.table_schema, grant_row.table_name, grant_row.grantee
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own tests" ON public.career_test;
DROP POLICY IF EXISTS "Users can update own tests" ON public.career_test;
DROP POLICY IF EXISTS "Users can delete own career test attempts" ON public.career_test_attempts;
DROP POLICY IF EXISTS "Users can insert own career test attempts" ON public.career_test_attempts;
DROP POLICY IF EXISTS "Users can update own career test attempts" ON public.career_test_attempts;
DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can delete own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can insert own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can update own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can delete own chats" ON public.chat_history;
DROP POLICY IF EXISTS "Users can insert own chats" ON public.chat_history;
DROP POLICY IF EXISTS "Users can insert own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can view own OAuth accounts" ON public.oauth_accounts;
DROP POLICY IF EXISTS "Users can insert own OAuth accounts" ON public.oauth_accounts;
DROP POLICY IF EXISTS "Users can update own OAuth accounts" ON public.oauth_accounts;
DROP POLICY IF EXISTS "Users can delete own OAuth accounts" ON public.oauth_accounts;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
