# CareerPath AI — AI Career Guidance & Personalised Learning

**CareerPath AI** is a multilingual web platform that helps learners explore technology career paths, discover learning resources and build skills through guided learning experiences.

[🌐 Live Platform](https://ai-careerr.onrender.com) · [📦 GitHub Repository](https://github.com/Jayvyanelfad/AI-CAREER)

## What the platform offers

- **Career discovery:** an assessment that helps learners explore suitable technology domains.
- **Learning resources:** course catalogues, enrolment and structured learning content.
- **Story-based learning:** Donkey Learning content designed to make concepts more approachable.
- **Multilingual interface:** English, French, Hinglish, Swahili, Arabic, Hausa, Nigerian Pidgin and Wolof interface resources, with English fallback for intentionally partial locales.
- **Learning progress:** lesson progress, exams and certificates tied to verified learning activity.
- **AI-assisted support:** optional Gemini-powered chat; navigation guidance remains available without the API key.
- **Programming practice:** an optional Python/JavaScript execution integration that remains disabled unless an approved Piston provider is configured.

## Technology

| Area | Technologies |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Database & authentication | Supabase, PostgreSQL, Supabase JWT |
| AI integration | Google Gemini API |
| Testing | Node.js test runner, Playwright |
| Deployment | Render |

The frontend is served from `public/`; the Express application is started from `server.js`. Supabase service-role access is kept on the server, not exposed to the browser.

## Run locally

**Requirements:** Node.js 24.x and access to a configured Supabase project.

1. Clone the repository:
   ```bash
   git clone https://github.com/Jayvyanelfad/AI-CAREER.git
   cd AI-CAREER
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure the required variables:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
   ```
4. Start the application:
   ```bash
   npm start
   ```
5. Open [http://localhost:5000](http://localhost:5000).

Optional integrations:

- Set `GEMINI_API_KEY` to enable Gemini-powered AI chat responses.
- Configure `PROGRAMMING_EXECUTION_PROVIDER=piston` and `PISTON_BASE_URL` to enable the supported programming execution integration. Without this configuration, code execution stays disabled.

**Security:** Never commit `.env` or expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

## Tests

Run the automated test suite:

```bash
node --test tests/*.test.js
```

The unit and integration suites use mocked Supabase services and local test servers. Browser tests use Playwright with mocked API routes; they are not intended to modify a live database.

## Database setup and migration notes

Database setup is documented in the SQL files and migration history. For the documented staging sequence:

1. Run `staging_step1.sql` once to create the base tables.
2. Apply `staging_step2_schema.sql` sections in order.
3. Run the seed scripts in the order documented below.
4. Apply `staging_step3_postseed.sql` after the required exam seed exists.
5. Apply the listed transactional migrations.

Seed order:

```text
seed-courses.js
seed-modern-ai-courses.js
seed-course-content.js
seed-career-test-questions.js
seed-exam.js
```

> **Important:** Do not run `SUPABASE_MIGRATION_FIXED.sql`. Its header contains destructive table drops. It is retained as migration history, not as a setup script. Review every SQL file and take a database backup before applying migrations to any environment.

## Current implementation notes

| Capability | Configuration / status |
|---|---|
| Registration, assessment, courses, progress, exams, certificates and admin | Available with a correctly configured database |
| Gemini chat responses | Requires `GEMINI_API_KEY`; navigation guidance is available without it |
| Programming execution | Requires the approved Piston provider configuration; otherwise disabled |
| Activity feeds and completion-rate analytics | Not currently tracked |

## Language support

The interface uses English as its canonical locale. French, Hinglish, Swahili and Arabic have fuller translation coverage; Hausa, Nigerian Pidgin and Wolof intentionally cover core interface areas and fall back to English where translations are not yet available. Lesson and catalogue bodies are currently in English.

## Project status and contributions

CareerPath AI is an evolving project. Contributions, bug reports and thoughtful suggestions are welcome through GitHub Issues.

When reporting a problem, include the steps to reproduce it, expected behaviour and actual behaviour. Please do not include credentials, private learner data or API keys in issues.

---

Built to make career exploration and learning more accessible.
