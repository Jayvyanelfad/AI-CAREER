-- Prevent duplicate course enrollments for one learner. Do not apply without
-- reviewing current data and the deployment locking window.
--
-- The validation is intentionally fail-closed: it neither deletes nor merges
-- existing rows. A duplicate/null finding aborts before schema alteration.
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

-- Operational note: CREATE INDEX inside this transaction acquires a table
-- lock. For a large live table, schedule a maintenance window or use a
-- separately reviewed CREATE UNIQUE INDEX CONCURRENTLY procedure after running
-- the same validation. If this migration aborts, no schema/data change occurs.
-- Forward recovery: resolve the reported invalid rows manually, preserving an
-- audit trail, then rerun. Rollback after a successful deployment is
-- DROP INDEX CONCURRENTLY IF EXISTS public.enrollments_user_course_unique_idx
-- in a separately approved change window.
