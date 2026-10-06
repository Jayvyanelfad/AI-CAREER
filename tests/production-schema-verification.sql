-- Production schema verification for the audited Supabase project.
-- Run this in the Supabase SQL editor or equivalent admin console after the
-- authorized migration step.

SELECT
  'courses.status' AS check_name,
  COUNT(*) AS present
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'courses'
  AND column_name = 'status';

SELECT
  conname AS check_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.courses'::regclass
  AND conname = 'courses_status_check';

SELECT
  'users.avatar_path' AS check_name,
  COUNT(*) AS present
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'avatar_path';

SELECT
  'users.bio' AS check_name,
  COUNT(*) AS present
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'bio';

SELECT
  'users.preferred_language' AS check_name,
  COUNT(*) AS present
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'preferred_language';

SELECT
  'users.theme_preference' AS check_name,
  COUNT(*) AS present
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'theme_preference';

SELECT
  'users.updated_at' AS check_name,
  COUNT(*) AS present
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'updated_at';

SELECT
  id,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'profile-avatars';

SELECT
  'users RLS enabled' AS check_name,
  COALESCE((
    SELECT c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'users'
  ), FALSE) AS enabled;

-- Review the policy definitions for auth.uid() ownership scopes. The
-- compatibility migration preserves the audited existing policy names.
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname IN ('profile_avatars_owner_insert', 'profile_avatars_owner_delete')
ORDER BY policyname;

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'enrollments'
  AND indexname = 'enrollments_user_course_unique_idx';

SELECT
  user_id,
  course_id,
  COUNT(*) AS duplicate_count
FROM public.enrollments
GROUP BY user_id, course_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
