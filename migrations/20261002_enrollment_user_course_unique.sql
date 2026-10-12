-- Enforce the idempotent enrollment contract after checking legacy data.
-- This migration never deletes or merges duplicate rows: if duplicates exist,
-- it aborts before creating the index so they can be reviewed manually.
BEGIN;

LOCK TABLE public.enrollments IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'enrollments'
      AND column_name = 'user_id'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'enrollments'
      AND column_name = 'course_id'
  ) THEN
    RAISE EXCEPTION 'Expected public.enrollments(user_id, course_id) columns were not found; inspect the live schema before applying this migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'enrollments'
      AND column_name IN ('user_id', 'course_id')
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Enrollment key columns allow NULL; review and constrain the live schema before applying the unique index';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.enrollments
    GROUP BY user_id, course_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate user/course enrollments exist; resolve them manually before applying the unique enrollment index';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS enrollments_user_course_unique_idx
  ON public.enrollments (user_id, course_id);

COMMIT;
