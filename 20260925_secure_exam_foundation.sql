-- Additive MCQ exam foundation. Apply only to the audited production schema.
-- The temporary 60-minute duration is intentionally explicit and can be
-- changed per exam after product timing requirements are decided.

BEGIN;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

UPDATE public.exams
SET duration_minutes = 60
WHERE duration_minutes IS NULL;

ALTER TABLE public.exams
  ALTER COLUMN duration_minutes SET DEFAULT 60,
  ALTER COLUMN duration_minutes SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.exams'::regclass
      AND conname = 'exams_duration_minutes_positive_check'
  ) THEN
    ALTER TABLE public.exams
      ADD CONSTRAINT exams_duration_minutes_positive_check
      CHECK (duration_minutes > 0);
  END IF;
END;
$$;

ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS selected_question_ids JSONB,
  ADD COLUMN IF NOT EXISTS option_order JSONB,
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mcq_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crossword_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS result_data JSONB;

CREATE TABLE IF NOT EXISTS public.exam_crosswords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id TEXT NOT NULL UNIQUE REFERENCES public.exams(id),
  title TEXT NOT NULL,
  grid_rows INTEGER NOT NULL CHECK (grid_rows > 0),
  grid_columns INTEGER NOT NULL CHECK (grid_columns > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_crossword_clues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crossword_id UUID NOT NULL REFERENCES public.exam_crosswords(id),
  clue_number INTEGER NOT NULL,
  clue_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  row INTEGER NOT NULL CHECK (row >= 0),
  column INTEGER NOT NULL CHECK (column >= 0),
  direction TEXT NOT NULL CHECK (direction IN ('across', 'down')),
  points INTEGER NOT NULL DEFAULT 1 CHECK (points > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crossword_id, clue_number)
);

CREATE TABLE IF NOT EXISTS public.exam_crossword_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id),
  clue_id UUID NOT NULL REFERENCES public.exam_crossword_clues(id),
  submitted_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, clue_id)
);

CREATE INDEX IF NOT EXISTS exam_crossword_clues_crossword_id_idx
  ON public.exam_crossword_clues (crossword_id);
CREATE INDEX IF NOT EXISTS exam_crossword_answers_attempt_id_idx
  ON public.exam_crossword_answers (attempt_id);

-- The populated course final is explicitly identified by its title. Preserve
-- the separate section quiz and empty test exam as distinct records.
INSERT INTO public.exam_questions (id, exam_id, question_text, question_order, points)
VALUES
  ('48f4e2e9-720d-4af0-a532-87be371f87fd', 'intro_to_ai_exam_1', 'How does supervised learning use training data?', 4, 1),
  ('0aec7031-cf7e-4b23-aec6-616e5bc53337', 'intro_to_ai_exam_1', 'Which task is best suited to regression?', 5, 1),
  ('0e61791d-e5ea-46de-931e-7caf5fe88842', 'intro_to_ai_exam_1', 'What is the main goal of clustering?', 6, 1),
  ('a82c79da-485c-450f-9065-951d48f8ee07', 'intro_to_ai_exam_1', 'Why evaluate a model on held-out data?', 7, 1),
  ('71a96d8a-6315-4622-9b84-90f103874127', 'intro_to_ai_exam_1', 'What is a common sign of overfitting?', 8, 1),
  ('9dfe4bb0-0f72-4bc7-98ac-20db1b1929bb', 'intro_to_ai_exam_1', 'What does a perceptron do before applying its activation function?', 9, 1),
  ('a9c83412-a2e5-45ce-a841-e077f63af3f5', 'intro_to_ai_exam_1', 'Why do neural networks use nonlinear activation functions?', 10, 1)
ON CONFLICT (exam_id, question_order) DO NOTHING;

INSERT INTO public.exam_options (id, question_id, option_text, option_order, is_correct)
VALUES
  ('3eb90c25-90c0-4661-9ea8-8785f3456391', '48f4e2e9-720d-4af0-a532-87be371f87fd', 'It pairs examples with known target labels so a model can learn their relationship.', 1, TRUE),
  ('446ee3bc-9bdb-45a5-ad4e-2fa565fb3c57', '48f4e2e9-720d-4af0-a532-87be371f87fd', 'It removes every target value before training.', 2, FALSE),
  ('9d182fcb-3bc4-43a2-b3b4-e0bc06536f16', '48f4e2e9-720d-4af0-a532-87be371f87fd', 'It changes model weights using only random values.', 3, FALSE),
  ('a4cc0844-6960-42af-924a-74785f6e2a5b', '48f4e2e9-720d-4af0-a532-87be371f87fd', 'It groups examples without using input features.', 4, FALSE),
  ('72df22ad-4d4a-44d7-8617-5df292cae89e', '0aec7031-cf7e-4b23-aec6-616e5bc53337', 'Predicting the selling price of a home from its features.', 1, TRUE),
  ('3a9e945f-8cb4-4fbc-a21e-cc69ff79f047', '0aec7031-cf7e-4b23-aec6-616e5bc53337', 'Assigning an email to spam or not spam.', 2, FALSE),
  ('a01baf64-c5cd-4a98-8e61-0984196540e8', '0aec7031-cf7e-4b23-aec6-616e5bc53337', 'Grouping customers without predefined categories.', 3, FALSE),
  ('a781427a-85e7-4c51-b8d8-1c442f8dc286', '0aec7031-cf7e-4b23-aec6-616e5bc53337', 'Choosing an action through trial and reward.', 4, FALSE),
  ('4a2bf17f-c93f-4bad-a85a-c62ff14e76b8', '0e61791d-e5ea-46de-931e-7caf5fe88842', 'Discovering groups of similar examples without supplied labels.', 1, TRUE),
  ('8e7be3d0-4b5f-44d1-9d69-c7250b581bd0', '0e61791d-e5ea-46de-931e-7caf5fe88842', 'Predicting a numeric target from labeled examples only.', 2, FALSE),
  ('0b791cb0-f79f-41bd-967a-b6c812c60466', '0e61791d-e5ea-46de-931e-7caf5fe88842', 'Computing a gradient for every possible class.', 3, FALSE),
  ('fa4fbd91-944e-44c3-acd3-51d164fbe05e', '0e61791d-e5ea-46de-931e-7caf5fe88842', 'Removing input features with low importance.', 4, FALSE),
  ('6ba47907-2248-4a58-a71d-c92246cf703f', 'a82c79da-485c-450f-9065-951d48f8ee07', 'To estimate how well the trained model generalizes to unseen examples.', 1, TRUE),
  ('76f146c6-852f-4328-bfd7-6eb9ba8301c8', 'a82c79da-485c-450f-9065-951d48f8ee07', 'To make the training set larger after the model is fitted.', 2, FALSE),
  ('8aa99d71-7b1d-4cec-83e2-3783e28571de', 'a82c79da-485c-450f-9065-951d48f8ee07', 'To ensure every prediction is correct.', 3, FALSE),
  ('5af08fd8-6e73-4a7a-87af-4b13e3cf771c', 'a82c79da-485c-450f-9065-951d48f8ee07', 'To replace the need for representative data.', 4, FALSE),
  ('db8085bb-4298-4414-91e9-5ac54a7a432a', '71a96d8a-6315-4622-9b84-90f103874127', 'Strong training performance but noticeably weaker performance on unseen data.', 1, TRUE),
  ('44822838-8665-4c17-853e-ef41d22fb74f', '71a96d8a-6315-4622-9b84-90f103874127', 'Similar performance on training and validation examples.', 2, FALSE),
  ('4990385d-08a1-4fc8-8c5c-f88473c2f320', '71a96d8a-6315-4622-9b84-90f103874127', 'A model that uses fewer parameters than its baseline.', 3, FALSE),
  ('762cc45e-82ed-43e1-9bb1-0711695d7ed8', '71a96d8a-6315-4622-9b84-90f103874127', 'A validation score that improves as training data is held out.', 4, FALSE),
  ('7a2474cd-1983-4de6-af9e-cb644585b86a', '9dfe4bb0-0f72-4bc7-98ac-20db1b1929bb', 'It computes a weighted combination of inputs and a bias.', 1, TRUE),
  ('086c8695-2441-41ac-a739-cf45a3a85a64', '9dfe4bb0-0f72-4bc7-98ac-20db1b1929bb', 'It sorts all training examples by their labels.', 2, FALSE),
  ('bca2ef08-6d9a-4edf-bb56-c8356f3191e3', '9dfe4bb0-0f72-4bc7-98ac-20db1b1929bb', 'It removes the loss function from the training process.', 3, FALSE),
  ('29c8e626-9e77-4148-a2f2-8fb1b5768cff', '9dfe4bb0-0f72-4bc7-98ac-20db1b1929bb', 'It assigns clusters without using its input values.', 4, FALSE),
  ('eae81f4e-5e0f-4020-b1c6-ef578e399155', 'a9c83412-a2e5-45ce-a841-e077f63af3f5', 'They let stacked layers represent nonlinear relationships.', 1, TRUE),
  ('d5fe31f9-cc78-456c-9625-e30b31ac5a3d', 'a9c83412-a2e5-45ce-a841-e077f63af3f5', 'They guarantee that a network cannot overfit.', 2, FALSE),
  ('8afc4b92-fbfd-4302-8622-fd65b9c3a6df', 'a9c83412-a2e5-45ce-a841-e077f63af3f5', 'They convert every task into clustering.', 3, FALSE),
  ('925783ea-b872-43ee-ae78-ed06ded07d53', 'a9c83412-a2e5-45ce-a841-e077f63af3f5', 'They remove the need to update model parameters.', 4, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.exam_crosswords (exam_id, title, grid_rows, grid_columns)
VALUES ('intro_to_ai_exam_1', 'AI & Machine Learning Concepts', 6, 21)
ON CONFLICT (exam_id) DO NOTHING;

INSERT INTO public.exam_crossword_clues (crossword_id, clue_number, clue_text, answer, row, column, direction, points)
SELECT crossword.id, clues.clue_number, clues.clue_text, clues.answer, clues.row, clues.column, clues.direction, 1
FROM public.exam_crosswords crossword
CROSS JOIN (VALUES
  (1, 'A connected structure of computational units that process information.', 'NETWORK', 0, 9, 'across'),
  (2, 'An input attribute used by a model to make a prediction.', 'FEATURE', 1, 3, 'across'),
  (3, 'Learning from unlabeled examples to discover patterns.', 'UNSUPERVISED', 2, 9, 'across'),
  (4, 'A model that assigns inputs to discrete categories.', 'CLASSIFIER', 3, 0, 'across'),
  (5, 'An algorithm that adjusts parameters to reduce a loss function.', 'OPTIMIZER', 4, 9, 'across'),
  (6, 'A mechanism that weights relevant input tokens or positions.', 'ATTENTION', 5, 1, 'across'),
  (7, 'A basic computational unit that combines inputs and applies an activation.', 'NEURON', 0, 9, 'down')
) AS clues(clue_number, clue_text, answer, row, column, direction)
WHERE crossword.exam_id = 'intro_to_ai_exam_1'
ON CONFLICT (crossword_id, clue_number) DO NOTHING;

-- Serialize active attempts for each learner/exam pair. The audit found no
-- existing equivalent partial unique index and no current attempt rows.
CREATE UNIQUE INDEX IF NOT EXISTS exam_attempts_one_active_per_user_exam_idx
  ON public.exam_attempts (exam_id, user_id)
  WHERE submitted_at IS NULL;

-- All exam data is served through the authenticated backend using its
-- service-role client. With RLS enabled and no browser policies, direct anon
-- and authenticated REST access is denied for these tables.
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crosswords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crossword_clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crossword_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_options FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crosswords FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crossword_clues FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_crossword_answers FORCE ROW LEVEL SECURITY;

-- Remove the audited user-write/read policies. Server routes enforce ownership
-- and the service role continues to bypass RLS. No unrelated policy is touched.
DROP POLICY IF EXISTS "Users can view own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can insert own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can update own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can delete own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can view own exam answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Users can insert own exam answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Users can update own exam answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Users can delete own exam answers" ON public.exam_answers;

CREATE OR REPLACE FUNCTION public.save_exam_answer(
  p_attempt_id UUID,
  p_user_id UUID,
  p_question_id UUID,
  p_selected_option_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.exam_attempts%ROWTYPE;
BEGIN
  SELECT * INTO v_attempt
  FROM public.exam_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND OR v_attempt.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_attempt.submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Attempt is already submitted' USING ERRCODE = '55000';
  END IF;
  IF v_attempt.mcq_submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Part A is already submitted' USING ERRCODE = '55000';
  END IF;
  IF v_attempt.deadline_at IS NULL OR v_attempt.deadline_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'Attempt deadline has passed' USING ERRCODE = '22023';
  END IF;
  IF v_attempt.selected_question_ids IS NULL
     OR NOT (v_attempt.selected_question_ids @> jsonb_build_array(p_question_id::TEXT)) THEN
    RAISE EXCEPTION 'Question is not part of this attempt' USING ERRCODE = '22023';
  END IF;
  IF v_attempt.option_order IS NULL
     OR NOT ((v_attempt.option_order -> p_question_id::TEXT) @> jsonb_build_array(p_selected_option_id::TEXT)) THEN
    RAISE EXCEPTION 'Option is not part of this attempt question' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.exam_options
    WHERE id = p_selected_option_id AND question_id = p_question_id
  ) THEN
    RAISE EXCEPTION 'Option does not belong to question' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.exam_answers (attempt_id, question_id, selected_option_id, is_correct)
  VALUES (p_attempt_id, p_question_id, p_selected_option_id, NULL)
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id,
                is_correct = NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_exam_attempt(
  p_attempt_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.exam_attempts%ROWTYPE;
  v_passing_score INTEGER;
  v_total_questions INTEGER;
  v_answered_questions INTEGER;
  v_total_points NUMERIC;
  v_earned_points NUMERIC;
  v_mcq_correct INTEGER;
  v_mcq_percentage NUMERIC;
  v_crossword_correct INTEGER;
  v_crossword_total INTEGER;
  v_crossword_percentage NUMERIC;
  v_score NUMERIC;
  v_passed BOOLEAN;
  v_has_crossword BOOLEAN;
  v_submitted_at TIMESTAMPTZ;
  v_status TEXT;
  v_result JSONB;
BEGIN
  SELECT * INTO v_attempt
  FROM public.exam_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND OR v_attempt.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_attempt.submitted_at IS NOT NULL THEN
    RETURN COALESCE(v_attempt.result_data, '{}'::JSONB) || jsonb_build_object('attempt_id', p_attempt_id);
  END IF;

  SELECT passing_score INTO v_passing_score
  FROM public.exams WHERE id = v_attempt.exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.exam_crosswords WHERE exam_id = v_attempt.exam_id)
  INTO v_has_crossword;

  v_total_questions := COALESCE(jsonb_array_length(v_attempt.selected_question_ids), 0);
  SELECT COALESCE(SUM(q.points), 0) INTO v_total_points
  FROM jsonb_array_elements_text(COALESCE(v_attempt.selected_question_ids, '[]'::JSONB)) picked(value)
  JOIN public.exam_questions q ON q.id = picked.value::UUID AND q.exam_id = v_attempt.exam_id;

  UPDATE public.exam_answers a
  SET is_correct = o.is_correct
  FROM public.exam_options o
  WHERE a.attempt_id = p_attempt_id
    AND o.id = a.selected_option_id
    AND o.question_id = a.question_id;

  SELECT count(*) INTO v_answered_questions
  FROM public.exam_answers
  WHERE attempt_id = p_attempt_id AND selected_option_id IS NOT NULL;

  SELECT count(*) FILTER (WHERE a.is_correct = TRUE)::INTEGER,
         COALESCE(SUM(q.points) FILTER (WHERE a.is_correct = TRUE), 0)
  INTO v_mcq_correct, v_earned_points
  FROM public.exam_answers a
  JOIN public.exam_questions q ON q.id = a.question_id
  WHERE a.attempt_id = p_attempt_id;

  IF v_total_points > 0 THEN
    v_mcq_percentage := round(v_earned_points * 100 / v_total_points, 2);
  ELSE
    v_mcq_percentage := 0;
  END IF;
  v_submitted_at := clock_timestamp();

  IF v_attempt.deadline_at IS NULL OR v_submitted_at >= v_attempt.deadline_at THEN
    SELECT count(*) FILTER (WHERE a.is_correct = TRUE)::INTEGER,
           count(*)::INTEGER
    INTO v_crossword_correct, v_crossword_total
    FROM public.exam_crossword_answers a
    JOIN public.exam_crossword_clues c ON c.id = a.clue_id
    JOIN public.exam_crosswords cw ON cw.id = c.crossword_id AND cw.exam_id = v_attempt.exam_id
    WHERE a.attempt_id = p_attempt_id;
    SELECT count(*)::INTEGER INTO v_crossword_total
    FROM public.exam_crossword_clues c
    JOIN public.exam_crosswords cw ON cw.id = c.crossword_id
    WHERE cw.exam_id = v_attempt.exam_id;
    v_crossword_correct := COALESCE(v_crossword_correct, 0);
    v_crossword_total := COALESCE(v_crossword_total, 0);
    v_crossword_percentage := CASE WHEN v_crossword_total > 0
      THEN round(v_crossword_correct * 100.0 / v_crossword_total, 2) ELSE 0 END;
    v_score := CASE WHEN v_has_crossword
      THEN round(v_mcq_percentage * 0.70 + v_crossword_percentage * 0.30, 0)
      ELSE round(v_mcq_percentage, 0) END;
    v_passed := v_score >= v_passing_score;
    v_status := 'expired';
    v_result := jsonb_build_object(
      'mcq', jsonb_build_object('correct', COALESCE(v_mcq_correct, 0), 'total', v_total_questions, 'answered', v_answered_questions, 'percentage', v_mcq_percentage),
      'crossword', CASE WHEN v_has_crossword THEN jsonb_build_object('correct', v_crossword_correct, 'total', v_crossword_total, 'percentage', v_crossword_percentage) ELSE 'null'::JSONB END,
      'final_score', v_score, 'passing_score', v_passing_score, 'passed', v_passed,
      'status', v_status, 'submitted_at', v_submitted_at
    );
    UPDATE public.exam_attempts
    SET mcq_submitted_at = COALESCE(mcq_submitted_at, v_submitted_at),
        crossword_submitted_at = CASE WHEN v_has_crossword THEN COALESCE(crossword_submitted_at, v_submitted_at) ELSE crossword_submitted_at END,
        score = v_score::INTEGER,
        passed = v_passed,
        submitted_at = v_submitted_at,
        result_data = v_result
    WHERE id = p_attempt_id;
  ELSE
    IF v_attempt.mcq_submitted_at IS NOT NULL THEN
      RETURN COALESCE(v_attempt.result_data, '{}'::JSONB) || jsonb_build_object('attempt_id', p_attempt_id, 'status', 'part_b');
    END IF;
    v_result := COALESCE(v_attempt.result_data, '{}'::JSONB) || jsonb_build_object(
      'mcq', jsonb_build_object('correct', COALESCE(v_mcq_correct, 0), 'total', v_total_questions, 'answered', v_answered_questions, 'percentage', v_mcq_percentage)
    );
    IF NOT v_has_crossword THEN
      v_score := round(v_mcq_percentage, 0);
      v_passed := v_score >= v_passing_score;
      v_result := v_result || jsonb_build_object(
        'final_score', v_score, 'passing_score', v_passing_score, 'passed', v_passed,
        'status', 'submitted', 'submitted_at', v_submitted_at
      );
      UPDATE public.exam_attempts
      SET mcq_submitted_at = v_submitted_at,
          submitted_at = v_submitted_at,
          score = v_score::INTEGER,
          passed = v_passed,
          result_data = v_result
      WHERE id = p_attempt_id;
      RETURN v_result || jsonb_build_object('attempt_id', p_attempt_id);
    END IF;
    UPDATE public.exam_attempts
    SET mcq_submitted_at = v_submitted_at,
        result_data = v_result
    WHERE id = p_attempt_id;
    RETURN v_result || jsonb_build_object('attempt_id', p_attempt_id, 'status', 'part_b');
  END IF;

  RETURN v_result || jsonb_build_object('attempt_id', p_attempt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_exam_crossword_answer(
  p_attempt_id UUID,
  p_user_id UUID,
  p_clue_id UUID,
  p_answer TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.exam_attempts%ROWTYPE;
  v_correct_answer TEXT;
  v_normalized TEXT;
  v_is_correct BOOLEAN;
BEGIN
  SELECT * INTO v_attempt FROM public.exam_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND OR v_attempt.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_attempt.mcq_submitted_at IS NULL THEN
    RAISE EXCEPTION 'Part A must be submitted first' USING ERRCODE = '55000';
  END IF;
  IF v_attempt.submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Exam attempt is finalized' USING ERRCODE = '55000';
  END IF;
  IF v_attempt.deadline_at IS NULL OR v_attempt.deadline_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'Attempt deadline has passed' USING ERRCODE = '22023';
  END IF;
  SELECT c.answer INTO v_correct_answer
  FROM public.exam_crossword_clues c
  JOIN public.exam_crosswords cw ON cw.id = c.crossword_id
  WHERE c.id = p_clue_id AND cw.exam_id = v_attempt.exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clue is not part of this exam' USING ERRCODE = '22023';
  END IF;
  v_normalized := upper(regexp_replace(btrim(COALESCE(p_answer, '')), '[^A-Za-z0-9]', '', 'g'));
  v_is_correct := v_normalized = upper(regexp_replace(btrim(v_correct_answer), '[^A-Za-z0-9]', '', 'g'));
  INSERT INTO public.exam_crossword_answers (attempt_id, clue_id, submitted_answer, is_correct, updated_at)
  VALUES (p_attempt_id, p_clue_id, COALESCE(p_answer, ''), v_is_correct, clock_timestamp())
  ON CONFLICT (attempt_id, clue_id)
  DO UPDATE SET submitted_answer = EXCLUDED.submitted_answer,
                is_correct = EXCLUDED.is_correct,
                updated_at = EXCLUDED.updated_at;
  RETURN jsonb_build_object('saved', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_exam_crossword(
  p_attempt_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.exam_attempts%ROWTYPE;
  v_passing_score INTEGER;
  v_mcq_percentage NUMERIC;
  v_crossword_correct INTEGER;
  v_crossword_total INTEGER;
  v_crossword_percentage NUMERIC;
  v_final_score NUMERIC;
  v_passed BOOLEAN;
  v_submitted_at TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  SELECT * INTO v_attempt FROM public.exam_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND OR v_attempt.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_attempt.submitted_at IS NOT NULL THEN
    RETURN COALESCE(v_attempt.result_data, '{}'::JSONB) || jsonb_build_object('attempt_id', p_attempt_id);
  END IF;
  IF v_attempt.mcq_submitted_at IS NULL THEN
    RAISE EXCEPTION 'Part A must be submitted first' USING ERRCODE = '55000';
  END IF;
  IF v_attempt.deadline_at IS NULL OR v_attempt.deadline_at <= clock_timestamp() THEN
    RETURN public.submit_exam_attempt(p_attempt_id, p_user_id);
  END IF;

  SELECT passing_score INTO v_passing_score FROM public.exams WHERE id = v_attempt.exam_id;
  v_mcq_percentage := COALESCE((v_attempt.result_data #>> '{mcq,percentage}')::NUMERIC, 0);
  SELECT count(*) FILTER (WHERE a.is_correct = TRUE)::INTEGER,
         count(*)::INTEGER
  INTO v_crossword_correct, v_crossword_total
  FROM public.exam_crossword_answers a
  JOIN public.exam_crossword_clues c ON c.id = a.clue_id
  JOIN public.exam_crosswords cw ON cw.id = c.crossword_id AND cw.exam_id = v_attempt.exam_id
  WHERE a.attempt_id = p_attempt_id;
  SELECT count(*)::INTEGER INTO v_crossword_total
  FROM public.exam_crossword_clues c
  JOIN public.exam_crosswords cw ON cw.id = c.crossword_id
  WHERE cw.exam_id = v_attempt.exam_id;
  v_crossword_correct := COALESCE(v_crossword_correct, 0);
  v_crossword_total := COALESCE(v_crossword_total, 0);
  v_crossword_percentage := CASE WHEN v_crossword_total > 0
    THEN round(v_crossword_correct * 100.0 / v_crossword_total, 2) ELSE 0 END;
  v_final_score := round(v_mcq_percentage * 0.70 + v_crossword_percentage * 0.30, 0);
  v_passed := v_final_score >= v_passing_score;
  v_submitted_at := clock_timestamp();
  v_result := COALESCE(v_attempt.result_data, '{}'::JSONB) || jsonb_build_object(
    'crossword', jsonb_build_object('correct', v_crossword_correct, 'total', v_crossword_total, 'percentage', v_crossword_percentage),
    'final_score', v_final_score, 'passing_score', v_passing_score, 'passed', v_passed,
    'status', 'submitted', 'submitted_at', v_submitted_at
  );
  UPDATE public.exam_attempts
  SET crossword_submitted_at = v_submitted_at,
      submitted_at = v_submitted_at,
      score = v_final_score::INTEGER,
      passed = v_passed,
      result_data = v_result
  WHERE id = p_attempt_id;
  RETURN v_result || jsonb_build_object('attempt_id', p_attempt_id);
END;
$$;

REVOKE ALL ON FUNCTION public.save_exam_answer(UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_exam_answer(UUID, UUID, UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.submit_exam_attempt(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam_attempt(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.save_exam_crossword_answer(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_exam_crossword_answer(UUID, UUID, UUID, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.submit_exam_crossword(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam_crossword(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
