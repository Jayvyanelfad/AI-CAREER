# CareerPath AI — Overnight Improvement Report

Date: 2026-10-12. Working tree: branch `main`, HEAD `a4192ec`. **Nothing was committed, pushed, deployed, or executed against any database. No SQL was run. No secrets are included.**

## 1. Completed fixes

- **P1 Certificate extraction verified.** `certificate-api.js` preserves all 4 routes (`GET verify/id/:courseId`, `POST issue`), middleware order (public verify; auth on the rest), status codes, response shapes, and every eligibility gate. Mounted at the original position in `server.js`. Covered by 11 route/migration tests.
- **P2 Registration integrity (`auth-api.js`, new; `tests/auth-api.test.js`, new, 8 tests).** Register no longer reports silent completion when the profile insert fails: non-duplicate failures return `201 + profileComplete:false` (client repairs via `complete-registration`, which both signup and auth-callback flows already call); duplicate-key retries succeed without duplicating. `complete-registration` now reads-then-repairs: inserts missing rows, fills only NULL fields (never overwrites user edits), resolves `23505` races to 204, hides DB details behind generic errors.
- **P3 Studio honesty (`public/programming.js`; `tests/programming-studio-honesty.test.js`, 3 tests).** When `/status` reports unavailable, Run buttons disable (as before) **and** the per-lesson sandbox promise is rewritten to "temporarily unavailable + use a local runtime" (localized key exists in all 8 locales). No local execution added; static tests also assert no `eval`/`child_process`/`vm` in the studio/provider.
- **P4 Student bugs (7 fixes, `tests/student-facing-fixes.test.js` now 9 tests).** Enroll modal null-throw fixed (guards + localized `enrollModalQuestion` prompt); assessment CTA now links `career-test.html`; contact form no longer fakes delivery (composes an honest `mailto:` + live-region note); exam logout is a real `data-logout` button; `id="about"` added so About links resolve; chatbot controls named/announced/closable with live message log; dashboard grids ship loading placeholders; dead dashboard chat div is now a working link.
- **P5 Robustness.** `migrations/20261012_exam_final_discriminator.sql` (new, unapplied): explicit `is_final` flag + backfill of seeded final only. `certificate-api.js` prefers the flag, falls back to the title heuristic on old schemas (fully backward compatible). `seed-exam.js` made idempotent (upsert exam, reuse question orders, `23505` race recovery, fill missing options; writes no new columns). Covered by 3 new tests + `tests/seed-idempotency.test.js`.
- **P6 Release readiness.** `server.js` fails fast on missing `SUPABASE_URL/SERVICE_ROLE_KEY/ANON_KEY`; `/api/health` adds booleans-only `configured` flags (no values). Dashboard reveals a hidden Admin shortcut only after `/api/admin/overview` returns ok (fail-closed; authorization still server-side per request). `nav.admin` added to canonical `en.json`.

## 2. Files changed

- New: `auth-api.js`, `certificate-api.js` (prior sprint), `chat-api.js` (prior), `migrations/20261012_certificate_revoke_client_insert.sql` (prior, unapplied), `migrations/20261012_exam_final_discriminator.sql`, `tests/auth-api.test.js`, `tests/certificate-api.test.js` (prior, extended +3), `tests/programming-studio-honesty.test.js`, `tests/student-facing-fixes.test.js` (extended +2), `tests/seed-idempotency.test.js`.
- Modified: `server.js` (router mounts, env validation, health flags), `seed-exam.js` (idempotency), `public/courses.js` (modal guards), `public/courses.html` (CTA href), `public/contactus.html` (honest submit), `public/exam.html` (logout button), `public/index.html` (`id="about"`), `public/chatbot.html` + `public/chatbot.js` (a11y/close wiring), `public/dashboard.html` + `public/dashboard.js` (placeholders, admin reveal), `public/programming.js` (honesty rewrite), `public/locales/en.json` (`nav.admin`).
- Deleted (prior sprint, still gone): 5 debug pages + `career-test-debug.js`, `career-test.js.backup`, `theme - Copy.js`.

## 3. Test results

- Baseline: 74 passed / 0 failed. Final: **98 passed / 0 failed** (`node --test`, 16 non-browser suites).
- `node --check` clean on all 10 touched JS files. `git diff --check` clean (only pre-existing CRLF notices).
- Browser tests (8 files) **not run**: no Playwright browsers installed (`~/.cache/ms-playwright` empty). Live-DB/server tests not run (need credentials). Static serving/token sweeps pass.

## 4. Not completed

- Contact `wa.me/tel/linkedin` placeholder URLs untouched (need real business details).
- Debug-adjacent root orphans (`lesson-experience.html`, `test-career-test.html`) left alone per no-broad-cleanup rule.
- No visual/CSS polish pass; no new admin writes; no Piston configuration (intentionally).
- `seed-career-test-questions.js` still non-idempotent (deactivates + duplicates on rerun) — deferred; needs a stable-identity redesign, not a quick patch.

## 5. Database actions still required (NOT executed — staging SQL editor, staging project only)

1. `staging_step2_schema.sql` (Sections 0–11, in order; all re-runnable).
2. Seeds: `seed-courses.js` → `seed-modern-ai-courses.js` → `seed-course-content.js` → `seed-career-test-questions.js` → `seed-exam.js`.
3. `staging_step3_postseed.sql` (prereq: `exams` contains `intro_to_ai_exam_1`).
4. `migrations/20261012_certificate_revoke_client_insert.sql` — removes browser INSERT, keeps SELECT. Verify: `SELECT policyname FROM pg_policies WHERE tablename='certificates'` → only `Users can view own certificates`; authenticated REST INSERT must fail; `POST /api/certificate/:courseId/issue` must still work.
5. `migrations/20261012_exam_final_discriminator.sql` — adds `is_final` + backfills the seeded final. Verify: `SELECT id, is_final FROM exams WHERE id='intro_to_ai_exam_1'` → true; issuance works with and without the column (fallback tested).

## 6. Programming Studio status

**Intentionally disabled by default.** Real sandbox pipeline (Piston-compatible, validated HTTPS-only URL, 5s timeout, 64KB truncation, 15/min + 4-concurrent limits) but ships unconfigured, so `/status.available=false`, Run disables with truthful messaging everywhere after this sprint. To enable: set `PROGRAMMING_EXECUTION_PROVIDER=piston` + approved `PISTON_BASE_URL` (+ optional key/versions) in staging env, then verify `/api/programming/status.available=true` and one live Python run. Never eval/execute locally.

## 7. Admin access

Verified from source: route `/admin.html` (hash views), all 8 `/api/admin/*` endpoints behind `authenticateToken` + `admin_users` membership check (401/403/503 fail-closed; client flags ignored). Read-only, no audit trail. No deployment exists to claim availability from. New: dashboard shows an Admin shortcut only after `GET /api/admin/overview` → 200; otherwise hidden (direct URL still works for admins).

## 8. Release blockers

- **P0:** Apply the two certificate migrations on staging (unapplied = issue + mint policy still open). `seed-career-test-questions.js` rerun duplication. No deployment target/config exists.
- **P1:** Chat + registration fixes need live staging verification (mock-tested only). Piston unconfigured (by design until approved).
- **P2:** Placeholder contact channels, print styles (certificates only), remaining contrast/keyboard polish.

## 9. Next three actions

1. Execute §5 steps 1–5 on **staging**, run the verification queries, and smoke-test register → assessment → enroll → lessons → exam → certificate → chatbot as a real user.
2. Decide Piston approval for the Studio (or keep disabled and remove Run buttons entirely instead of disabling).
3. Redesign `seed-career-test-questions.js` around stable question identities, then create the staging deployment target + config so the release is reproducible.
