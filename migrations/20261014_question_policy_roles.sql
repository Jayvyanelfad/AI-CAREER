-- Make the exam-question read policies role-specific instead of calling
-- auth.role() per candidate row. This is equivalent to the original rule:
-- authenticated users may read question records; anonymous callers may not.
BEGIN;

DROP POLICY IF EXISTS "Questions are viewable by authenticated users" ON public.questions;
CREATE POLICY "Questions are viewable by authenticated users"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Question options are viewable by authenticated users" ON public.question_options;
CREATE POLICY "Question options are viewable by authenticated users"
  ON public.question_options
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
