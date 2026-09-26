# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in the AI Career Guidance Platform repository.

## Project purpose

AI Career Guidance Platform is a web application that provides free and premium courses in technology fields including AI/ML, data science, web development, DevOps, cybersecurity, and more. Users can take career assessments, enroll in courses, track progress through modules and lessons, take exams, and earn certificates upon completion.

## Architecture

### Express backend (`server.js`)
- Main entry point for the application
- Handles REST API endpoints for authentication, career tests, courses, modules, lessons, progress tracking, exams, and certificates
- Uses Supabase as the primary database via `@supabase/supabase-js`
- Implements JWT-based authentication with Supabase Auth
- Includes helper functions for PostgreSQL array handling and data parsing

### Frontend (in `public/` directory)
- Single-page application with multiple HTML files for different views
- Static assets (CSS, JavaScript) served directly by Express
- Uses Supabase client for database operations from the frontend
- Implements client-side routing and state management
- Features responsive design with custom CSS and Font Awesome icons

### Supabase
- PostgreSQL database with Row Level Security (RLS) policies
- Stores user profiles, career test results, course enrollments, lesson progress, exams, exam attempts, and certificates
- Authentication handled via Supabase Auth (email/password and OAuth)
- Database schema defined in migration files (see Database source of truth below)

### Authentication
- Email/password authentication via Supabase Auth
- Google OAuth integration (though currently not fully implemented in frontend)
- JWT tokens stored in localStorage and sent via Authorization header
- Middleware (`authenticateToken`) verifies tokens and fetches user metadata

### Course system
- Courses organized into modules, which contain lessons
- Progress tracked via `lesson_progress` table (completed/incomplete status)
- Enrollments track user progress through courses
- Lessons can be marked as complete via API endpoint

### Exams
- Multiple-choice exams associated with courses
- Questions stored separately from correct answers (security measure)
- Exam attempts tracked with scoring and pass/fail determination
- Configurable passing scores and maximum attempts

### Certificates
- Awarded upon completion of all lessons in a course and passing the associated exam (if exam exists)
- Certificate generation is idempotent (safe to call multiple times)

## Important files

### Backend
- `server.js` - Main Express application with all API routes
- `package.json` - Project dependencies and scripts
- `.env` - Environment variables (Supabase URL/keys, PORT)
- `.env.example` - Template for environment variables

### Frontend (public/)
- `index.html` - Homepage with course exploration
- `login.html` / `register.html` - Authentication pages
- `career-test.html` - Career assessment test
- `dashboard.html` - User dashboard showing enrollments, progress, certificates
- `courses.html` - Course catalog with filtering
- `course-detail.html` - Detailed view of course modules and lessons
- `exam.html` - Exam taking interface
- `profile.html` - User profile management
- `styles.css` - Main styling for the application
- `theme.js` - Dark/light theme toggle functionality
- `supabase-config.js` - Shared Supabase configuration for frontend
- Page-specific JS files: `login.js`, `register.js`, `courses.js`, `course-detail.js`, `exam.js`, `dashboard.js`, `profile.js`, `auth-callback.js`

### Database/migration
- `SUPABASE_MIGRATION_FIXED.sql` - Current database schema with snake_case columns matching server.js expectations
- `migrate_database_foundation_FINAL.sql` - Foundation tables for courses, modules, lessons, exams
- `create_questions_tables.sql` - Tables for dynamic career test questions
- `seed-course-content.js` - Script to populate course content from definitions into database

### Utility scripts
- `check-*.js` - Verification scripts for courses, users, enrollments, exams, modules/lessons
- `seed-*.js` - Data seeding scripts

## Database source of truth

The current database schema is defined by:
1. `SUPABASE_MIGRATION_FIXED.sql` - This is the authoritative migration file that creates tables with snake_case columns to match server.js expectations
2. `migrate_database_foundation_FINAL.sql` - Creates core educational tables (courses, modules, lessons, exams, etc.)
3. `create_questions_tables.sql` - Creates tables for the career test system

**Important**: Multiple migration files exist, but `SUPABASE_MIGRATION_FIXED.sql` represents the current, corrected schema that matches the backend implementation. The other migration files (CORRECTED, FIXED, etc.) show the evolution of the schema but should not be considered interchangeable. Always inspect the actual database schema rather than assuming based on migration filenames.

The seed data in `seed-course-content.js` defines the course structure (Introduction to AI & ML, Python for Career Development, etc.) that gets inserted into the tables defined by the migrations.

## Coding rules — VERY IMPORTANT

1. **ALWAYS inspect the current file before editing it.**
2. **NEVER rewrite an entire file when a targeted change is sufficient.**
3. **Make the smallest possible change that solves the requested problem.**
4. **Do not modify unrelated files.**
5. **Do not duplicate existing functions, routes, event listeners, handlers, API calls, or initialization code.**
6. **Before adding a route/function/handler, search the file for an existing implementation.**
7. **If a text replacement fails, STOP and re-read the current file. Do not use a broader destructive replacement.**
8. **After every JavaScript/server edit, run the appropriate syntax check.**
9. **Do not claim a change works until it has actually been tested.**
10. **If a command/tool/provider fails, do not assume the requested edit succeeded.**
11. **Never invent database columns, API fields, routes, IDs, or table names.**
12. **Use the existing database as the source of truth for existing course/module/lesson/exam data.**
13. **Do not seed or duplicate database records unless the task explicitly requires it.**
14. **Do not change authentication or OAuth while working on unrelated features.**
15. **Do not change database schema while working on unrelated frontend/backend bugs.**
16. **Preserve existing working functionality.**
17. **If the requested change cannot be completed safely, report the exact blocker instead of guessing.**
18. **Prefer verification over additional changes.**

## Editing protocol

For every coding task:

**PHASE A — INSPECT**
* Read the relevant files.
* Find the existing implementation.
* Identify dependencies.

**PHASE B — PLAN**
* State exactly which files need modification.
* State what will NOT be modified.

**PHASE C — EDIT**
* Make minimal targeted edits.
* Do not rewrite unrelated code.

**PHASE D — VERIFY**
* Run syntax checks.
* Run relevant API/database/frontend checks.
* Check the actual changed behavior.

**PHASE E — REPORT**
Report:
* files changed
* exact changes
* tests/checks run
* results
* remaining blockers

Then STOP.

## Current course goal

Document the intended user journey:

Explore Free Courses
→ Available Courses
→ Introduction to AI & ML
→ Start Course
→ Modules
→ Lessons
→ lesson progress
→ quiz/exam
→ finish course

**Note**: This journey has been verified to work end-to-end for the Introduction to AI & ML course, including enrollment, lesson completion, progress tracking, exam taking, and certificate generation.