# Database Setup for AI Career Guidance Platform

This document outlines the database schema needed for the application to function properly with Supabase.

## Tables Required

### 1. `profiles` Table
Stores user profile information.

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text unique,
  career_goal text default 'undecided',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;

-- Policies
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);
```

### 2. `career_tests` Table
Stores career assessment results.

```sql
create table career_tests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  career text not null,
  answers jsonb not null,
  courses text[] not null,
  confidence integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table career_tests enable row level security;

-- Policies
create policy "Users can view own career tests"
  on career_tests for select
  using (auth.uid() = user_id);

create policy "Users can insert own career tests"
  on career_tests for insert
  with check (auth.uid() = user_id);
```

### 3. `enrollments` Table
Tracks user course enrollment and progress.

```sql
create table enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  course text not null,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table enrollments enable row level security;

-- Policies
create policy "Users can view own enrollments"
  on enrollments for select
  using (auth.uid() = user_id);

create policy "Users can insert own enrollments"
  on enrollments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own enrollments"
  on enrollments for update
  using (auth.uid() = user_id);
```

### 4. `certificates` Table
Stores earned certificates.

```sql
create table certificates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  course text not null,
  issued_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table certificates enable row level security;

-- Policies
create policy "Users can view own certificates"
  on certificates for select
  using (auth.uid() = user_id);

create policy "Users can insert own certificates"
  on certificates for insert
  with check (auth.uid() = user_id);
```

### 5. `chat_history` Table
Persists AI chatbot conversations.

```sql
create table chat_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  message text not null,
  sender text not null check (sender in ('user', 'bot')),
  response_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table chat_history enable row level security;

-- Policies
create policy "Users can view own chat history"
  on chat_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own chat history"
  on chat_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own chat history"
  on chat_history for delete
  using (auth.uid() = user_id);
```

### 6. `oauth_accounts` Table
Tracks OAuth connections (managed by Supabase Auth).

```sql
-- This table is automatically managed by Supabase Auth when you enable OAuth providers
-- No manual creation needed
```

## Indexes for Performance

```sql
-- Indexes for better query performance
create index idx_career_tests_user_id on career_tests(user_id);
create index idx_enrollments_user_id on enrollments(user_id);
create index idx_certificates_user_id on certificates(user_id);
create index idx_chat_history_user_id on chat_history(user_id);
create index idx_chat_history_created_at on chat_history(created_at desc);
```

## Triggers for Updated At Timestamps

```sql
-- Create function to update updated_at column
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language 'plpgsql';

-- Create triggers for tables that need updated_at
create trigger update_profiles_updated_at
  before update on profiles
  for each row
  execute procedure update_updated_at_column();

create trigger update_enrollments_updated_at
  before update on enrollments
  for each row
  execute procedure update_updated_at_column();
```

## Sample Data for Development (Optional)

```sql
-- Insert sample profile for testing
insert into profiles (id, name, email, career_goal)
values ('00000000-0000-0000-0000-000000000000', 'Demo User', 'demo@example.com', 'Software Developer')
on conflict do nothing;

-- Insert sample career test
insert into career_tests (id, user_id, career, answers, courses, confidence)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'Software Developer',
  '{"problem_solving": "code", "creating": "design", "analyzing": "data", "leading": "startup"}',
  ARRAY['Python for Tech Careers', 'Web Development Fundamentals', 'Data Structures & Algorithms'],
  85
)
on conflict do nothing;
```

## Setup Instructions

1. **Create these tables** in your Supabase dashboard under SQL Editor
2. **Enable RLS** on each table (the SQL above includes RLS setup)
3. **Create the policies** for each table
4. **Add indexes** for better query performance
5. **Create the triggers** for automatic timestamp updates
6. **Optional**: Insert sample data for testing

## Notes

- The application uses Supabase Auth for user management, so the `auth.users` table is managed by Supabase
- All tables use UUID foreign keys referencing `auth.users.id`
- Row Level Security (RLS) is enabled on all tables for data isolation
- The application expects the exact table and column names as specified above
- For development, you can use the Supabase dashboard to insert sample data as shown