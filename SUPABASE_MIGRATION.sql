-- Supabase Migration Script for AI Career Guidance Platform
-- Run these SQL commands in the Supabase SQL editor to create the required tables

-- Users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  full_name text,
  career_goal text default 'undecided',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Career test results
create table if not exists public.career_test (
  id uuid default uuid_generate_v4() primary key,
  userId uuid references auth.users not null,
  answers text not null, -- JSON string of answers
  topCareers text not null, -- JSON string of top carreras
  strengths text not null, -- JSON string of strengths
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enrollments table
create table if not exists public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  userId uuid references auth.users not null,
  courseId text not null,
  courseName text not null,
  totalHours integer default 0,
  completedHours integer default 0,
  progress integer default 0, -- percentage
  nextLessonTitle text,
  enrolledAt timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Certificates table
create table if not exists public.certificates (
  id uuid default uuid_generate_v4() primary key,
  userId uuid references auth.users not null,
  courseId text not null,
  courseName text not null,
  earnedAt timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chat history table
create table if not exists public.chat_history (
  id uuid default uuid_generate_v4() primary key,
  userId uuid references auth.users not null,
  message text not null,
  response text not null,
  createdAt timestamp with time zone default timezone('utc'::text, now()) not null
);

-- OAuth accounts table (optional, if you want to track OAuth connections)
create table if not exists public.oauth_accounts (
  id uuid default uuid_generate_v4() primary key,
  userId uuid references auth.users not null,
  provider text not null, -- e.g., 'google'
  providerUserId text not null,
  accessToken text,
  refreshToken text,
  expiresAt timestamp with time zone,
  createdAt timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(userId, provider)
);

-- Enable Row Level Security (RLS) for all tables
alter table public.users enable row level security;
alter table public.career_test enable row level security;
alter table public.enrollments enable row level security;
alter table public.certificates enable row level security;
alter table public.chat_history enable row level security;
alter table public.oauth_accounts enable row level security;

-- Create policies for each table (allow users to only access their own data)

-- Users policy
create policy "Users can view their own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert their own data"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update their own data"
  on public.users for update
  using (auth.uid() = id);

-- Career test policy
create policy "Users can view their own career test results"
  on public.career_test for select
  using (auth.uid() = userId);

create policy "Users can insert their own career test results"
  on public.career_test for insert
  with check (auth.uid() = userId);

create policy "Users can update their own career test results"
  on public.career_test for update
  using (auth.uid() = userId);

-- Enrollments policy
create policy "Users can view their own enrollments"
  on public.enrollments for select
  using (auth.uid() = userId);

create policy "Users can insert their own enrollments"
  on public.enrollments for insert
  with check (auth.uid() = userId);

create policy "Users can update their own enrollments"
  on public.enrollments for update
  using (auth.uid() = userId);

-- Certificates policy
create policy "Users can view their own certificates"
  on public.certificates for select
  using (auth.uid() = userId);

create policy "Users can insert their own certificates"
  on public.certificates for insert
  with check (auth.uid() = userId);

-- Chat history policy
create policy "Users can view their own chat history"
  on public.chat_history for select
  using (auth.uid() = userId);

create policy "Users can insert their own chat history"
  on public.chat_history for insert
  with check (auth.uid() = userId);

create policy "Users can delete their own chat history"
  on public.chat_history for delete
  using (auth.uid() = userId);

-- OAuth accounts policy
create policy "Users can view their own OAuth accounts"
  on public.oauth_accounts for select
  using (auth.uid() = userId);

create policy "Users can insert their own OAuth accounts"
  on public.oauth_accounts for insert
  with check (auth.uid() = userId);

create policy "Users can update their own OAuth accounts"
  on public.oauth_accounts for update
  using (auth.uid() = userId);

create policy "Users can delete their own OAuth accounts"
  on public.oauth_accounts for delete
  using (auth.uid() = userId);
