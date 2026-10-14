-- Add indexes for frequently joined foreign-key columns. Indexes do not
-- change data and help avoid table scans when related records are queried.
-- Apply only after all referenced application tables exist.
BEGIN;
CREATE INDEX IF NOT EXISTS admin_users_granted_by_idx ON public.admin_users (granted_by);
CREATE INDEX IF NOT EXISTS career_test_attempts_user_id_idx ON public.career_test_attempts (user_id);
CREATE INDEX IF NOT EXISTS exam_answers_question_id_idx ON public.exam_answers (question_id);
CREATE INDEX IF NOT EXISTS exam_answers_selected_option_id_idx ON public.exam_answers (selected_option_id);
CREATE INDEX IF NOT EXISTS exam_attempts_user_id_idx ON public.exam_attempts (user_id);
CREATE INDEX IF NOT EXISTS exam_crossword_answers_clue_id_idx ON public.exam_crossword_answers (clue_id);
CREATE INDEX IF NOT EXISTS exam_options_question_id_idx ON public.exam_options (question_id);
CREATE INDEX IF NOT EXISTS exams_course_id_idx ON public.exams (course_id);
CREATE INDEX IF NOT EXISTS lesson_progress_lesson_id_idx ON public.lesson_progress (lesson_id);
COMMIT;
