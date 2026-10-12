-- Give final exams an explicit discriminator instead of relying only on the
-- exam-title heuristic in POST /api/certificate/:courseId/issue. The
-- application code prefers is_final = TRUE and falls back to the title match
-- when the column is absent or no exam is flagged, so this migration is safe
-- to apply before or after the application update, and reruns are harmless.
-- Staging only. Do not invent additional final-exam rows here: only the
-- seeded final exam (stable id intro_to_ai_exam_1) is backfilled. Any further
-- finals must be flagged in a reviewed data change, not by title guessing.
BEGIN;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS is_final BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.exams
  SET is_final = TRUE
  WHERE id = 'intro_to_ai_exam_1' AND is_final IS DISTINCT FROM TRUE;

COMMIT;
