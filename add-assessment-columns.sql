-- Add columns for the new CS career assessment system to career_test_attempts
-- These columns will store the new assessment data while preserving backward compatibility

-- Add assessment_version to track which version of the assessment was used
ALTER TABLE public.career_test_attempts
ADD COLUMN IF NOT EXISTS assessment_version VARCHAR(50);

-- Add question_ids to store the specific UUIDs of questions used in this attempt
ALTER TABLE public.career_test_attempts
ADD COLUMN IF NOT EXISTS question_ids JSONB;

-- Add dimension_scores to store the raw scores for each of the 8 dimensions
ALTER TABLE public.career_test_attempts
ADD COLUMN IF NOT EXISTS dimension_scores JSONB;

-- Add strengths column if it doesn't exist (it appeared to be missing from our tests)
ALTER TABLE public.career_test_attempts
ADD COLUMN IF NOT EXISTS strengths TEXT[];

-- Add updated_at timestamp for tracking when the record was last modified
ALTER TABLE public.career_test_attempts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Note: We do NOT modify the existing career_test table as per instructions
-- The career_test table will continue to store the old assessment results
-- New attempts will go to career_test_attempts with the new schema