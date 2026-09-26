# AI Career Guidance Platform - Project Blueprint

## 1. PRODUCT VISION

CareerPath AI is a web application designed to provide free and premium technology courses, career assessments, and certification pathways. The platform enables users to:

- Explore a catalog of free and premium courses in AI/ML, data science, web development, DevOps, cybersecurity, and related fields.
- Take a career assessment to receive personalized course and career recommendations.
- Enroll in courses, track progress through modules and lessons, and complete quizzes/exams.
- Earn certificates upon completing all lessons and passing associated exams (where applicable).
- Manage their profile, view certificate history, and monitor learning progress via a dashboard.

The core educational journey the platform supports is:

> Explore Free Courses\
> → Available Courses\
> → Introduction to AI & ML (sample course)\
> → Start Course\
> → Modules\
> → Lessons\
> → lesson progress\
> → quiz/exam\
> → finish course\
> → certificate (if eligibility requirements are satisfied)

## 2. CURRENT VERIFIED STATE

The following items have been directly verified through code inspection, syntax checks, API testing, or file existence:

### Verified (Confirmed via testing or inspection)
- The Express server (`server.js`) starts successfully and listens on the port defined in `.env` (default 5000).
- `node --check server.js` passes with no syntax errors.
- Basic API routes return expected data:
  - `GET /api/courses` returns a list of 12 courses, including the course with ID `intro_to_ai` titled "Introduction to AI & ML".
  - `GET /api/courses/intro_to_ai` returns the correct course details (title, description, image_url, level, duration_weeks, price, isPublished).
  - `GET /api/courses/intro_to_ai/modules` returns 5 modules for the course, each with `id`, `title`, `description`, `position`, and `course_id`.
  - `GET /api/modules/<module_id>/lessons` returns lessons for a given module; verified for the first module of `intro_to_ai` (ID `e0dd9395-4b79-4f40-b045-226a1685b23c`) which contains 8 lessons with fields `id`, `title`, `description` (or `content`), `position` (`lesson_order`), `module_id`, `video_url` (null), and `duration_minutes`.
- The database schema defined in the migration files includes tables for users, career_test, enrollments, certificates, chat_history, user_activity, oauth_accounts (from `SUPABASE_MIGRATION_FIXED.sql`) and courses, modules, lessons, lesson_progress, exams, exam_questions, exam_options, exam_attempts, exam_answers, career_test_attempts (from `migrate_database_foundation_FINAL.sql`).
- Frontend files exist and are structured as a multi‑page web application:
  - `public/courses.html` contains a container (`#course-list`) intended to be populated by `public/courses.js`.
  - `public/courses.js` includes logic to fetch `/api/courses` and render course cards with navigation to `course-detail.html?id=<course_id>`, but the complete interactive catalogue flow has not been end‑to‑end verified.
  - `public/course-detail.html` contains containers for course header, progress, modules list, and lesson content, and loads `public/course-detail.js`.
  - `public/course-detail.js` implements the course detail view: fetches course data (`/api/courses/:course_id`), modules (`/api/courses/:course_id/modules`), lessons per module (`/api/modules/:module_id/lessons`), and handles lesson selection, progress tracking, and navigation.
  - Other frontend files (`login.html`, `register.html`, `dashboard.html`, `exam.html`, `profile.html`, and their corresponding JS files) are present and linked appropriately.
- The `.env` file exists and contains Supabase URL, anon key, service role key, and PORT (values are present but not inspected for security).
- `package.json` and `package-lock.json` exist, listing dependencies including `express`, `@supabase/supabase-js`, `dotenv`, `cors`, etc.

### Exists but Not Fully Verified (structure present, no end‑to‑end test)
- Authentication system: registration (`/api/auth/register`), login (`/api/auth/login`), token verification middleware (`authenticateToken`), and profile endpoints exist in code but have not been tested through a full user flow due to the current focus on the course journey.
- Career test system: endpoints (`/api/career-test`, `/api/career-test/history`) exist but have not been exercised.
- Exam system: metadata retrieval (`/api/exams/:exam_id`, `/api/exams?course_id=...`), question retrieval (`/api/exams/:exam_id/questions`), exam start (`/api/exams/:exam_id/start`), and submission (`/api/exams/:exam_id/submit`) endpoints exist; however, the exam submission flow (including answer validation and scoring) has not been end‑to‑end tested with a real user attempt.
- Certificate system: eligibility check (`/api/certificate/:courseId`) and issuance (`/api/certificate/:courseId/issue`) endpoints exist but have not been verified through a full completion flow.
- Dashboard and profile data aggregation endpoints exist but have not been validated with real user data.
- Frontend‑specific features (theme toggling, cookie banners, navigation, course card filtering) are present in the HTML/JS/CSS but have not been interactively tested.

### Unknown / Needs Testing
- Whether the server can correctly handle concurrent requests, authentication tokens, role‑based access (RLS), and Supabase‑enforced policies under real usage.
- Whether the frontend correctly handles loading states, error states, and empty data scenarios for all views.
- Whether the Seed scripts (`seed-course-content.js`, etc.) produce data that matches the backend expectations when run (they have not been executed in this verification cycle).
- Whether the career test algorithm (top careers, strengths) functions as intended.
- Whether exam question/answer security (hiding correct answers from the client) is correctly implemented in the API responses.
- Whether certificate idempotency (safe to call multiple times) works correctly.

### Known Issue (Historical, now resolved)
- PROJECT_STATUS.md previously reported a duplicate variable declaration (`examData`) in the `/api/exams/:exam_id/submit` route. Inspection of the current `server.js` shows only one declaration of `examData` within that route (line 1380), and a second declaration exists in the separate `/api/exams/:exam_id/result` route (line 1543). The server passes syntax check (`node --check`) and starts without error, indicating this issue has been resolved.

## 3. PRODUCT AREAS

| Area | Intended Role |
|------|---------------|
| **Authentication** | Handles user registration, login, JWT token issuance and verification via Supabase Auth. Middleware (`authenticateToken`) protects routes requiring a logged‑in user. Google OAuth integration is currently unresolved/frozen and must not be revisited unless explicitly requested. |
| **Career Test** | Provides a questionnaire (`/api/career-test`) to assess user interests and aptitudes, stores answers, top career matches, and strengths. Results are used for personalized course recommendations (not yet implemented in frontend). |
| **Dashboard** | Central hub showing user profile, recent career test results, enrollment progress, earned certificates, and activity logs. |
| **Profile** | Allows users to view and update their full name and career goal. |
| **Course Catalogue** (`/courses.html`) | Lists all published courses with filtering (free vs premium). Enables navigation to course detail view. |
| **Course Detail** (`/course-detail.html?id=...`) | Displays course metadata (title, description, image, duration, level), overall progress, list of modules, and lessons. Allows users to select and view lesson content. |
| **Modules & Lessons** | Lessons belong to modules, modules belong to courses. Lesson content includes title, description/content, optional video URL, and duration. Progress is tracked per lesson via the `lesson_progress` table. |
| **Lesson Progress** | Tracks which lessons a user has marked as completed (via `/api/lessons/:lesson_id/complete`). Used to compute overall course progress and unlock exams. |
| **Exams/Quizzes** | Each course may have zero or more exams. Exams contain multiple‑choice questions; correct answers are stored server‑side and are intended not to be sent to the client (requires verification). Exam attempts, scores, and pass/fail status are recorded. Passing score and maximum attempts are configurable per exam. |
| **Certificates** | Awarded when a user has (1) completed all lessons in a course and (2) passed the associated exam (if an exam exists). Certificate generation is intended to be idempotent (safe to call multiple times) but requires verification. |

**Note**: Course completion and career‑test completion are separate concepts. A user may finish a course without taking the career test, and vice‑versa.

## 4. DATABASE SOURCE OF TRUTH

The current database schema is defined by the following migration files (in order of precedence for table definitions):

1. **`SUPABASE_MIGRATION_FIXED.sql`** – Authoritative source for authentication‑adjacent tables and enables Row‑Level Security (RLS) on them. Creates:
   - `public.users` (extends `auth.users`)
   - `public.career_test`
   - `public.enrollments`
   - `public.certificates`
   - `public.chat_history`
   - `public.user_activity`
   - `public.oauth_accounts`
   RLS policies are defined for all these tables.

2. **`migrate_database_foundation_FINAL.sql`** – Creates the core educational tables and enables RLS on user‑specific tables:
   - `public.courses`
   - `public.modules`
   - `public.lessons`
   - `public.lesson_progress`
   - `public.exams`
   - `public.exam_questions`
   - `public.exam_options`
   - `public.exam_attempts`
   - `public.exam_answers`
   - `public.career_test_attempts`
   RLS policies are applied to `lesson_progress`, `exam_attempts`, `exam_answers`, and `career_test_attempts`.

3. **`create_questions_tables.sql`** – Creates tables for dynamic career test questions (used by the career test system):
   - `public.questions`
   - `public.question_options`

**Important**: The migration files are not interchangeable. `SUPABASE_MIGRATION_FIXED.sql` is the baseline for auth‑related tables; the other two add educational and career‑test schema. The live database schema should reflect the union of these files. No tables or columns should be assumed without inspecting the actual migration scripts.

## 5. COURSE DATA SOURCE OF TRUTH

Canonical course data originates from the database tables `courses`, `modules`, and `lessons`. The following sources exist but must be treated as derivatives or initialization scripts:

- **Actual database course data**: The verifiable source of truth for what is presented to users. Verified via API responses (`/api/courses`, `/api/courses/:course_id/modules`, etc.).
- **Seed scripts** (`seed-course-content.js`, `seed-modules-lessons.js`, `seed-exam.js`, etc.): Contain JavaScript/Node.js code that can insert or update course, module, lesson, and exam data into the database. These scripts are **not** the live data source; they are used to populate the database initially or after schema changes. Running them will **overwrite** existing data if they contain `DELETE` or `DROP` statements, or will insert/upsert depending on their implementation.
- **Frontend/static course data**: No static course data is embedded in HTML/JS; all course information is fetched from the backend APIs.
- **Migration/schema files**: Define table structure only; they do not contain row data.

Therefore, the **database** (as inspected through the API) is the source of truth for existing course/module/lesson/exam data. Seed scripts should be reviewed before execution to avoid unintended data loss or duplication.

## 6. CANONICAL FILES

The following files represent the current, active implementation for each major area:

### Backend
- `server.js` – Main Express application; contains all API route definitions, Supabase client setup, authentication middleware, and helper functions (PostgreSQL array handling, JSON parsing).
- `package.json` / `package-lock.json` – Dependency definitions and locked versions.
- `.env` – Environment variables (Supabase URLs/keys, PORT).

### Frontend (in `public/` directory)
- `index.html` – Homepage with course exploration sections; loads shared CSS/JS.
- `courses.html` – Course catalog page; loads `courses.js` for dynamic course listing.
- `courses.js` – Fetches `/api/courses` and renders course cards with navigation to course detail.
- `course-detail.html` – Detailed view of a selected course; loads `course-detail.js`.
- `course-detail.js` – Implements course detail logic: fetches course, modules, lessons; handles lesson selection, progress UI, and navigation.
- `exam.html` – Exam taking interface; loads `exam.js`.
- `exam.js` – Handles exam fetching, rendering, answer submission, and result display.
- `dashboard.html` – User dashboard; loads `dashboard.js`.
- `dashboard.js` – Fetches user profile, career test history, enrollments, certificates; renders dashboard widgets.
- `career-test.html` – Career assessment interface; loads `career-test.js`.
- `career-test.js` – Manages test state, answer submission, and result display.
- `login.html` / `register.html` – Authentication pages; load `login.js` / `register.js`.
- `login.js` / `register.js` – Handle form submission, Supabase Auth calls, token storage.
- `auth-callback.js` – Handles OAuth redirect callbacks (placeholder for Google OAuth).
- `profile.html` – User profile view/edit; loads `profile.js`.
- `profile.js` – Fetches user data and updates profile via API.
- `supabase-config.js` – Shared Supabase client configuration (URL, anon key) used by frontend pages.
- `theme.js` – Implements dark/light theme toggle functionality.
- `styles.css` – Main stylesheet for the application (custom CSS, Font Awesome integration).

### Database / Migration
- `SUPABASE_MIGRATION_FIXED.sql` – Base schema (auth‑adjacent tables) with RLS.
- `migrate_database_foundation_FINAL.sql` – Core educational tables (courses, modules, lessons, exams, etc.) with RLS on user‑specific tables.
- `create_questions_tables.sql` – Career test questions schema.

### Utility Scripts (Inspection Only)
- `check-*.js` – Verification scripts for API routes and data integrity (e.g., `check-api.js`, `check-courses.js`, `check-enrollments.js`, `check-exams.js`, `check-modules-lessons.js`, `check-users.js`).
- `seed-*.js` – Data seeding scripts (e.g., `seed-course-content.js`, `seed-modules-lessons.js`, `seed-exam.js`). These are **not** to be run unless explicitly intended to initialize or reset data.

## 7. LEGACY / SUSPICIOUS / POSSIBLY OBSOLETE FILES

The following files appear to be legacy, duplicated, temporary, or otherwise candidates for later review. **Do not delete or modify them without explicit instruction**; they are listed for awareness only.

- Files with duplicate or similar names (possible backups):
  - `server.js.backup`, `server.js.bak2`, `server.js.syntax_fixed`
  - Multiple migration variants: `migrate_database_foundation.sql`, `migrate_database_foundation_CORRECTED.sql`, `migrate_database_foundation_FIXED.sql`, `migrate_database_foundation_FINAL.sql`
  - Various audit and summary markdown files from prior work (e.g., `FINAL_AUDIT_SUMMARY.md`, `FINAL_REPOSITORY_HYGIENE_RESULT.md`, `FINAL_SUMMARY.md`, `PHASE_1_DATABASE_IMPLEMENTATION.md`, `PHASE2_IMPLEMENTATION_SUMMARY.md`, `PHASE2_INTEGRITY_AUDIT.md`, etc.)
- Temporary check/seed scripts that may have been used for debugging:
  - `add-unique-constraint.js`, `create-test-user.js`, `migrate-db.js`, `seed-intro_to_ai_pilot.js`, `test-auth.js`, `test-auth-flow.js`, `test-login-only.sh`, `test-registration-detailed.js`, etc.
- Old documentation that may have been superseded:
  - `README.md` (still relevant but not the source of truth for architecture)
  - `STATUS.md`, `AUDIT_COMPLETE.md`, `VERIFICATION_REPORT.md`, `VERIFICATION_SUMMARY.md` (these are historical records; the current blueprint supersedes them for architectural understanding)
- Root‑level files that appear to be incorrect path objects (likely artifacts of earlier operations):
  - `C:UsersJay-1DownloadsAI`, `UsersJay-1DownloadsAI`

**Important**: These files are **not** to be deleted or altered in this task. Their presence does not affect the running application unless they are inadvertently imported or executed.

## 8. KNOWN PROBLEMS / TECHNICAL DEBT

Based on code inspection and prior notes, the following technical debt items are known:

- **Row Level Security (RLS) gaps**: The `SUPABASE_MIGRATION_FIXED.sql` file does **not** enable RLS on the `courses`, `modules`, `lessons`, `exams`, `exam_questions`, or `exam_options` tables. This means that if the database is configured solely using these migration files, those tables would be accessible anonymously (though the application currently relies on Supabase anon/public routes for public course data). The educational tables in `migrate_database_foundation_FINAL.sql` *do* have RLS enabled on the user‑specific tables (`lesson_progress`, `exam_attempts`, `exam_answers`, `career_test_attempts`).
- **Hardcoded default passing score**: In `/api/exams/:exam_id/submit`, if `examData.passing_score` is null, the code defaults to a passing score of 60%. This default is not reflected in the `exams` table schema (which has a `NOT NULL DEFAULT 70`). Consistency between schema defaults and application logic should be reviewed.
- **Unused Google Gemini API references**: The `README.md` mentions obtaining a Gemini API key from Google AI Studio, but no visible integration exists in the inspected code. This may be leftover from a prior experiment or future feature.
- **Potential duplicate seeding logic**: Multiple seed scripts exist (`seed-course-content.js`, `seed-modules-lessons.js`, `seed-exam.js`, etc.) that may overlap or conflict if run without coordination.
- **Legacy audit files**: Numerous markdown files in the repository root capture past audit findings, decisions, and cleanup results. While useful for historical context, they contribute to repository noise and may be candidates for archival consolidation.

## 9. FROZEN AREAS

For the current development phase (focus on course journey verification and foundational stability), the following areas are **frozen** unless explicitly requested to be worked on:

- Google OAuth integration (frontend references in `login.js`/`register.js` and `auth-callback.js`).
- Authentication architecture (Supabase Auth setup, token middleware, cookie/session handling).
- Career‑test architecture (question storage, answer processing, top‑career calculation).
- Database migration files (schema definitions, RLS policies).
- Seed data scripts (content of `seed-*.js` files).
- Unrelated dashboard/profile functionality beyond what is necessary to support the course journey (e.g., activity logs, advanced analytics).
- Any modifications to the `.env` file or environment variable handling.

These areas should not be changed without explicit approval, as the current effort is limited to verifying and documenting the course journey flow.

## 10. DEVELOPMENT PRIORITY

The following staged order reflects a sensible progression based on the current verified state. **Only document; do not implement.**

1. **Stabilize core course data flow**
   - Ensure `server.js` starts without errors and maintains API responsiveness.
   - Verify that course, module, and lesson APIs return correct data and handle edge cases (invalid IDs, missing data).
   - Confirm frontend rendering of course catalog and detail views works with real API data.

2. **Complete lesson progress and exam eligibility**
   - Implement and test lesson completion marking (`/api/lessons/:lesson_id/complete`) and progress calculation.
   - Verify that exam access is gated by lesson completion (via UI logic in `course-detail.js` and/or backend checks in exam start endpoint).
   - Test exam start, answer submission, scoring, and result retrieval for at least one course with an exam.

3. **Certificate issuance flow**
   - Validate certificate eligibility logic (all lessons completed + exam passed).
   - Test certificate retrieval and issuance endpoints.
   - Ensure idempotent behavior (calling issue multiple times returns same certificate).

4. **Authentication and career test integration**
   - Enable user registration, login, and protected route access.
   - Test career test submission and history retrieval.
   - Use career test results to influence course recommendations (if desired).

5. **Polish and extend frontend experience**
   - Refine loading/error states, navigation UX, and responsive design.
   - Add course filtering, search, and sorting features.
   - Implement theme persistence and accessibility improvements.

6. **Finalize deployment and documentation**
   - Ensure migration scripts can be applied to a fresh Supabase instance.
   - Document setup steps (`README.md`, `.env.example`).
   - Archive or consolidate legacy audit files for clarity.

## 11. STRICT FCC EDITING RULES

All future edits to the project must adhere to these rules. Violations will result in rejected changes and require re‑work.

1. **Inspect before editing**: Always read the current file(s) and understand the surrounding context before making any change.
2. **Make the smallest possible change**: Limit modifications to the exact lines needed to address the issue or add the feature. Avoid broad refactors unless explicitly authorized.
3. **Never make broad speculative rewrites**: Do not rewrite entire functions, files, or modules based on assumptions; only change what is necessary.
4. **Never retry an identical failed edit**: If an edit attempt fails (e.g., “Error editing file” or a syntax/logic issue), stop, re‑read the file, and reassess before trying a different approach.
5. **If an edit fails, STOP and re‑read the current file**: Do not persist with the same modification; revert to inspection.
6. **If the file state is uncertain, STOP and report uncertainty**: Do not guess or assume file contents.
7. **Never create duplicate declarations**: Ensure variables, functions, routes, or constants are not declared twice in the same scope.
8. **Never add debugging code unless explicitly requested**: Remove `console.log`, `alert`, `debugger`, or similar statements after verification unless they are part of a requested logging feature.
9. **Never create documentation files unless explicitly requested**: The only documentation to be created or updated in this task is `PROJECT_BLUEPRINT.md`. Other `.md` files should remain unchanged unless directed.
10. **Never modify unrelated files**: Changes must be confined to the files directly implicated by the task. Do not touch authentication, OAuth, exams, frontend, database migrations, seeding, career test, dashboard, or certificates unless the task explicitly requires it.
11. **Never claim something is verified unless it was actually tested**: Verification requires actual observation (API response, frontend behavior, server start, etc.). Inspection alone does not constitute verification of dynamic behavior.
12. **After every code change, run the appropriate syntax/check command**: For server‑side JavaScript, run `node --check server.js`. For frontend JS, consider a quick syntax check via `node --check <file>` if applicable.
13. **Report exactly which files changed**: Provide a clear list of any modified files in your final report.
14. **Stop after the requested task is complete**: Once the assigned work is finished, cease further modifications and await next instructions.

## 12. DOCUMENTATION HIERARCHY

The project documentation maintains a clear hierarchy to avoid confusion and ensure each file serves a distinct purpose:

- **README.md**: General project overview, setup instructions, technology stack, and basic usage. Intended for newcomers and contributors seeking a quick start.
- **CLAUDE.md** – Project‑specific operating and editing rules for Claude Code (the AI assistant). Contains the coding rules, editing protocol, and current course goal. Should be edited only when the project’s development guidelines change.
- **PROJECT_STATUS.md** – Snapshot of the current verified state at a given point in time. Records what has been tested, what exists but is unverified, known blockers, and items needing verification. Updated after each verification or testing cycle.
- **PROJECT_BLUEPRINT.md** (this file) – Authoritative product and architectural understanding. Describes the intended vision, verified current state, product areas, database/source of truth, canonical files, legacy items, known problems, frozen areas, and development priorities. Serves as the reference for future development decisions and onboarding.
- **Other `.md` files** (e.g., `FINAL_*-SUMMARY.md`, `PHASE*_.md`, `VERIFICATION_*.md`) are historical records of past work, audits, or summaries. They are **not** to be treated as current reference unless explicitly noted.

When in doubt, defer to `PROJECT_BLUEPRINT.md` for architectural decisions, `CLAUDE.md` for editing rules, and `PROJECT_STATUS.md` for the latest verification status.

## 13. IMPORTANT HISTORICAL CONTEXT

Prior to this blueprint creation, substantial work was performed on the project, including:

- Cleanup of `server.js`: removal of temporary seed endpoints, request loggers, unused GoogleGenAI imports, duplicate authentication calls in dashboard, and correction of various logical flaws (e.g., lesson completion logic, enrollment field naming, exam validation/scoring, duplicate token verification).
- Standardization of Supabase client usage: distinction between `supabaseAdmin` (service role) for privileged operations and `supabase` (anon key) for user‑operations where appropriate.
- Enforcement of Row Level Security (RLS) on user‑specific tables (`lesson_progress`, `exam_attempts`, `exam_answers`, `career_test_attempts`) via migration files.
- Multiple migration variants still exist (e.g., migrate_database_foundation.sql, migrate_database_foundation_CORRECTED.sql, migrate_database_foundation_FIXED.sql, migrate_database_foundation_FINAL.sql) and have not been deleted or consolidated; clarification of which file is the source of truth for each schema segment was established.
- Creation of multiple verification and audit documents to capture findings and track progress.

The current state reflects the aftermath of those cleanup and stabilization efforts. **Do not reintroduce** the removed debugging/temporary patterns (e.g., global request logger, hard‑coded test endpoints, unused imports).

## 14. FINAL REPORT

After creating `PROJECT_BLUEPRINT.md`:

1. **File created**: `PROJECT_BLUEPRINT.md` in the repository root.
2. **Files inspected**:
   - Root‐level: `CLAUDE.md`, `PROJECT_STATUS.md`, `README.md`, `package.json`, `.env`, `.env.example`.
   - Backend: `server.js` (full inspection).
   - Frontend: `public/courses.html`, `public/courses.js`, `public/course-detail.html`, `public/course-detail.js`, plus a cursory check of `login.html`, `register.html`, `dashboard.html`, `exam.html`, `profile.html`, `theme.js`, `supabase-config.js`, `styles.css`.
   - Database: `SUPABASE_MIGRATION_FIXED.sql`, `migrate_database_foundation_FINAL.sql`, `create_questions_tables.sql`.
   - Utility scripts: `check-api.js`, `check-courses.js`, `check-modules-lessons.js` (representative).
3. **Files changed**: Only `PROJECT_BLUEPRINT.md` was created; no existing files were modified.
4. **Uncertainty noted**:
   - The live database schema has not been directly queried; reliance is on migration file inspection. Actual Supabase dashboard RLS settings may differ.
   - Career test, exam, and certificate endpoints have not been exercised through a full user flow (registration → enrollment → lesson completion → exam → certificate).
   - Seed scripts have not been run, so their effect on the database is unknown.
   - Google OAuth integration presence in frontend files (`login.js`, `register.js`, `auth-callback.js`) has not been validated for functionality.
   - The exact behavior of the `theme.js` dark/light toggle and cookie banner persistence has not been interactively tested.

All work ceased after file creation; no further modifications were made.