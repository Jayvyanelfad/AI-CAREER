-- Keep certificate issuance idempotent for a learner/course pair.
-- Read-only audit on 2026-09-26 found zero existing certificate rows.
CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_course_unique_idx
  ON public.certificates (user_id, course_id);
