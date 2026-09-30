-- Add course availability without changing existing course identifiers or access rules.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available';

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_status_check;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_status_check
  CHECK (status IN ('available', 'coming_soon'));
