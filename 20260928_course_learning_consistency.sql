-- Align the two generic course summaries with their audited live curricula.
-- Guarded and repeat-safe: accepts only the exact audited value or this update.
BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.courses WHERE id IN ('intro_to_ai', 'python_for_careers')) <> 2 THEN
    RAISE EXCEPTION 'Expected both audited courses before updating descriptions';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = 'intro_to_ai'
      AND description NOT IN (
        'Learn the fundamentals of Artificial Intelligence and Machine Learning.',
        'Learn how AI and machine learning differ, how data and models produce predictions, and how to evaluate results responsibly. Progress from foundational terms and learning methods to neural networks, real-world applications, and a guided beginner project: a small classifier with a test plan and documented limitations. No prior AI experience is required.'
      )
  ) THEN
    RAISE EXCEPTION 'Introduction to AI & ML description changed since audit';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = 'python_for_careers'
      AND description NOT IN (
        'Master Python programming for data science and automation.',
        'Start with Python basics: values, conditions, and loops. Then use functions, collections, files, JSON, and a beginner API request. Finish by planning, building, safely testing, and presenting a local file-organization assistant. No programming experience is required.'
      )
  ) THEN
    RAISE EXCEPTION 'Python for Career Development description changed since audit';
  END IF;
END $$;

UPDATE public.courses
SET description = 'Learn how AI and machine learning differ, how data and models produce predictions, and how to evaluate results responsibly. Progress from foundational terms and learning methods to neural networks, real-world applications, and a guided beginner project: a small classifier with a test plan and documented limitations. No prior AI experience is required.'
WHERE id = 'intro_to_ai'
  AND description = 'Learn the fundamentals of Artificial Intelligence and Machine Learning.';

UPDATE public.courses
SET description = 'Start with Python basics: values, conditions, and loops. Then use functions, collections, files, JSON, and a beginner API request. Finish by planning, building, safely testing, and presenting a local file-organization assistant. No programming experience is required.'
WHERE id = 'python_for_careers'
  AND description = 'Master Python programming for data science and automation.';

COMMIT;
