-- Supabase Migration Script for Questions Tables
-- RUN THIS IN SUPABASE SQL EDITOR TO CREATE TABLES FOR DYNAMIC QUESTIONS

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  category TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question options table
CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  option_value TEXT NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to select questions and options
CREATE POLICY "Questions are viewable by authenticated users" ON public.questions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Question options are viewable by authenticated users" ON public.question_options
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_questions_category ON public.questions(category);
CREATE INDEX idx_questions_active ON public.questions(active);
CREATE INDEX idx_question_options_question_id ON public.question_options(question_id);