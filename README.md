# AI Career Guidance Platform (CareerPath AI)

Live: `https://ai-careerr.onrender.com` · Repo: `Jayvyanelfad/AI-CAREER` (`main`)

## Setup (local)
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in values (never commit `.env`).
3. Run: `npm start`
4. Visit: `http://localhost:5000`

Required env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
Optional: `GEMINI_API_KEY` (AI chat; without it the chatbot answers navigation
guidance only), `PROGRAMMING_EXECUTION_PROVIDER=piston` + `PISTON_BASE_URL`
(Python/JavaScript sandbox; without them Run is honestly disabled).

## Tests
```bash
node --test tests/*.test.js
```
Unit/integration suites use mocked Supabase and ephemeral localhost servers;
browser suites use Playwright with mocked API routes. No test touches a real
database. `node --check <file>` for syntax; `git diff --check` for whitespace.

## Database (staging order — Supabase SQL editor, never psql a destructive file)
1. `staging_step1.sql` (7 base tables; run once, not re-runnable).
2. `staging_step2_schema.sql` (Sections 0–11 in order; re-runnable).
3. Seed scripts: `seed-courses.js` → `seed-modern-ai-courses.js` →
   `seed-course-content.js` → `seed-career-test-questions.js` → `seed-exam.js`.
4. `staging_step3_postseed.sql` (requires `exams.id = 'intro_to_ai_exam_1'`).
5. `migrations/20261012_certificate_revoke_client_insert.sql`,
   `migrations/20261012_exam_final_discriminator.sql`,
   `migrations/20261012_account_classification.sql`,
   `migrations/20260930_admin_users.sql` (each transactional and re-runnable).

> WARNING: never run `SUPABASE_MIGRATION_FIXED.sql` — its header drops all
> application tables. It is kept only as migration history.

## Architecture
- Frontend: static HTML/CSS/JS in `public/`, dark-green/cream theme, 8 locales
  (`en` canonical; `fr`/`hinglish`/`sw`/`ar` full; `ha`/`pcm`/`wo` intentional
  subsets with English fallback). Lesson/catalog bodies are English by design.
- Backend: Express (`server.js`) + Supabase (service-role server-side only).
  Auth via Supabase JWT; admin via `admin_users` membership (fail-closed).
- Exams are server-graded through service-role RPCs; exam tables deny browser
  access. Certificates issue only from verified enrollment + lessons + passed
  final exam; public verification stays open, private views stay owned.

## Capability matrix (default configuration)
| Feature | State |
|---|---|
| Registration, assessment, courses, progress, exams, certificates, admin | Working (needs configured database) |
| AI chat replies | Needs `GEMINI_API_KEY`; offline navigation guide otherwise |
| Studio code execution | Needs approved Piston provider; honestly disabled otherwise |
| Activity feeds, completion rates | Not tracked by design; UI labels them unavailable |

## Known limitations
- `seed-career-test-questions.js` reuses identical active rows and retires only stale ones, so reruns are no-ops.
- `ha`/`pcm`/`wo` cover core UI only.
- Deployment is manual/via Render dashboard; no deployment-as-code in repo.
