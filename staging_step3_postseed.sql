-- staging_step3_postseed.sql — CareerPath AI STAGING ONLY (careerpath-ai-staging).
-- Run AFTER: staging_step2_schema.sql AND seed-courses.js + seed-exam.js
-- (requires parent row exams.id='intro_to_ai_exam_1' with course_id='intro_to_ai').
-- Prerequisite check (must return 1 row before running):
--   SELECT count(*) FROM public.exams WHERE id='intro_to_ai_exam_1';
-- Extracted verbatim from 20260925_secure_exam_foundation.sql lines 80-140
-- (ON CONFLICT DO NOTHING — safe re-run). Single transaction: any FK failure
-- rolls back everything; fix seeds and re-run.
-- Do NOT run against production.

BEGIN;

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

INSERT INTO public.exam_crossword_clues (crossword_id, clue_number, clue_text, answer, row, "column", direction, points)
SELECT crossword.id, clues.clue_number, clues.clue_text, clues.answer, clues.row, clues."column", clues.direction, 1
FROM public.exam_crosswords crossword
CROSS JOIN (VALUES
  (1, 'A connected structure of computational units that process information.', 'NETWORK', 0, 9, 'across'),
  (2, 'An input attribute used by a model to make a prediction.', 'FEATURE', 1, 3, 'across'),
  (3, 'Learning from unlabeled examples to discover patterns.', 'UNSUPERVISED', 2, 9, 'across'),
  (4, 'A model that assigns inputs to discrete categories.', 'CLASSIFIER', 3, 0, 'across'),
  (5, 'An algorithm that adjusts parameters to reduce a loss function.', 'OPTIMIZER', 4, 9, 'across'),
  (6, 'A mechanism that weights relevant input tokens or positions.', 'ATTENTION', 5, 1, 'across'),
  (7, 'A basic computational unit that combines inputs and applies an activation.', 'NEURON', 0, 9, 'down')
) AS clues(clue_number, clue_text, answer, row, "column", direction)
WHERE crossword.exam_id = 'intro_to_ai_exam_1'
ON CONFLICT (crossword_id, clue_number) DO NOTHING;

COMMIT;

-- VERIFICATION (read-only; expect 10 questions total for intro_to_ai_exam_1
-- after seed-exam.js 3 + this file 7; 7 clues):
-- SELECT count(*) FROM public.exam_questions WHERE exam_id='intro_to_ai_exam_1';
-- SELECT count(*) FROM public.exam_crossword_clues c JOIN public.exam_crosswords w
--   ON w.id=c.crossword_id WHERE w.exam_id='intro_to_ai_exam_1';
