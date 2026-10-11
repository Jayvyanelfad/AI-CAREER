# AI Career Guidance Platform

## Essential Files

### Backend
- `server.js` - Main Express server with Supabase integration
- `package.json` - Dependencies and scripts
- `package-lock.json` - Locked dependency versions
- `.env` - Environment variables (contains secrets, not committed)
- `.env.example` - Template for environment variables
- `SUPABASE_MIGRATION_FIXED.sql` - Database migration script

### Frontend (public/)
- `index.html` - Homepage
- `login.html` - Login page
- `register.html` - Registration page
- `dashboard.html` - User dashboard
- `career-test.html` - Career assessment test
- `courses.html` - Course catalog
- `profile.html` - User profile
- `contactus.html` - Contact page
- `styles.css` - Main stylesheet
- `theme.js` - Dark/light theme toggle
- `supabase-config.js` - Supabase configuration
- `login.js`, `register.js`, `dashboard.js`, `career-test.js`, `profile.js`, `courses.js`, `auth-callback.js` - Page-specific JavaScript

## Setup
1. Install locked dependencies: `npm ci`
2. Create `.env` from `.env.example` and configure the required service credentials.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` server-side; never place them in browser code or commit `.env`.
4. Start the application with `npm start`.
5. Visit `http://localhost:5000`.

## Database
Supabase provides authentication and PostgreSQL storage. The Express API verifies the signed-in user and performs privileged database operations server-side; the browser uses only the public Supabase client configuration. Schema changes are manual: review each migration, its target project, and its preconditions before applying it. Local migration files are not evidence that production has that schema.

## Architecture and features

- `server.js` serves the frontend and implements authenticated REST endpoints for assessments, courses, enrollment, lesson progress, exams, certificates, and profiles.
- `public/` contains the responsive HTML, CSS, and browser JavaScript. Supabase Auth manages sign-in; the application API persists learning and profile data.
- Courses contain modules and lessons. Enrollment unlocks course work; persisted lesson-completion records drive progress. Exam access and certificate issuance are checked by the API.
- The Career Test saves completed attempts and displays the stored result on the dashboard and career-result page. Programming Studio provides learning materials; it does not execute learner code in this application.

## Career assessment

The server implements the versioned `career-profile-v1` assessment. Submission requires 25 distinct active question IDs, valid integer answers from 1 through 5, and questions covering all eight supported dimensions. Each answer is normalized to `(answer - 1) / 4`; answers are averaged within each dimension. The eight-dimensional result is compared with the server's curated career profiles using mean absolute distance. Similarity is converted to a percentage, and the three highest-scoring careers are returned. The server validates submitted questions and computes the result; the browser does not choose or calculate career scores. Do not change this algorithm without a separately reviewed assessment-version change.

## Validation

Run the test suite with `node --test "tests/*.test.js"` and check production dependencies with `npm audit --omit=dev`. The browser tests use local API/auth fixtures and verify UI flows; API tests use controlled database-client fixtures. They do not verify live Supabase constraints, production RLS, authenticated production behavior, or a Render deployment. No production migration or write is part of the test suite.

## Deployment and release limitations

Render hosts the public application. Configure the environment variables from `.env.example` in the hosting service, not in source control. This checkout's release candidate is not confirmed deployed: as of 11 October 2026, the public pages and health endpoint respond, but the live JavaScript assets do not contain the current stabilization changes. No GitHub deployment record or recent workflow run was available, and the Render CLI was unavailable. The deployed commit, authenticated user journey, production schema/RLS, and migration status therefore remain unverified.

Before submission, capture screenshots or a short recording from the deployed build showing sign-in, Career Test completion/result, dashboard recommendations, course enrollment and progress, exam/certificate eligibility, profile photo cropping, and mobile/RTL layouts. Use a dedicated test account and avoid including personal data or credentials. Future release work should verify production schema/RLS read-only first, then run authenticated smoke tests after an approved deployment.
