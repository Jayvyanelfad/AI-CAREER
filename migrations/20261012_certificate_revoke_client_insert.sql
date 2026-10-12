-- Remove the direct browser issuance path for certificates. The staging schema
-- (staging_step1.sql, from SUPABASE_MIGRATION_FIXED.sql) grants every
-- authenticated user a self-insert policy on public.certificates, which lets a
-- client mint certificate rows via direct REST and bypass the server-side
-- eligibility checks (enrollment, lesson completion, final-exam pass) enforced
-- by POST /api/certificate/:courseId/issue. The application has no legitimate
-- client-side INSERT path: the frontend only calls the server APIs, and the
-- server writes with its service-role client, which bypasses RLS.
--
-- This migration is narrowly scoped and re-runnable:
--   * drops ONLY the insert-own policy; the view-own SELECT policy (used by
--     certificate.html, dashboard, profile, and public verification) is kept,
--   * revokes INSERT from anon/authenticated; other grants are untouched,
--   * re-asserts SELECT for authenticated so read flows keep working,
--   * touches no rows. Apply to staging only, after staging_step2_schema.sql.
BEGIN;

DROP POLICY IF EXISTS "Users can insert own certificates" ON public.certificates;

REVOKE INSERT ON TABLE public.certificates FROM anon, authenticated;

GRANT SELECT ON TABLE public.certificates TO authenticated;

COMMIT;
