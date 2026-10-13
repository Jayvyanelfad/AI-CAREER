# Release readiness (as of this mission; all claims tied to evidence below)

## Capability matrix
| Feature | Status | Evidence |
|---|---|---|
| Registration, login, profile create/repair | DONE AND TESTED | `tests/auth-api.test.js` (8) |
| Career assessment submit/score/history | DONE AND TESTED | `tests/career-assessment.test.js` (4) + route validation in `server.js` |
| Courses, enrollment (idempotent), lessons, progress | DONE AND TESTED | store/progress/browser suites |
| Exams (server-graded RPCs, ownership, deadlines) | DONE AND TESTED (mocked) | existing exam tests + RPC review |
| Certificates (eligibility, idempotent, verify) | DONE AND TESTED (mocked) | `tests/certificate-api.test.js` (12) |
| Admin dashboard + human-only reporting | DONE AND TESTED (mocked) | 10 + 6 + 4 admin tests |
| Notifications | CODE COMPLETE, NOT LIVE-VERIFIED | needs `notifications` table live |
| AI chat replies | BLOCKED BY CONFIGURATION | needs `GEMINI_API_KEY`; offline guide works |
| Studio code execution | BLOCKED BY CONFIGURATION | needs approved Piston provider |
| Activity feeds, completion rates | Unavailable by design | UI labels them as such |
| Docker image | Missing | decision required |
| Demo video | Missing | script in evidence pack (owner TEMP) |

## Test report
`node --test tests/*.test.js` — counts recorded per run in the final report.
`node --check` on changed JS; `git diff --check` clean.

## Security and privacy decisions
- Service-role key: server-only, never in `public/`, tests, or commits (scanned).
- Exam writes: RPC-only, FORCE RLS, no browser policies, service-role grants.
- Admin: server membership check, fail-closed 401/403/503; no browser policies on `admin_users`.
- Certificates: browser INSERT revoked (migration prepared, unapplied); issuance server-only.
- PII minimized in admin summaries; answers never listed; chat content never logged.
- Error messages generic; no stack/secret leakage paths found.

## Known limitations and mitigation
- `seed-career-test-questions.js` now skips identical active rows (fixed this mission).
- `ha`/`pcm`/`wo` cover core UI only; English fallback is deterministic.
- Studio lesson bodies and catalog content are English by design.
- No payment provider: premium labels are informational only.

## 5–7 minute demo script
1. Register → profile auto-created (30s). 2. Take assessment → dimension results (90s).
3. Enroll → complete lesson → progress bar (60s). 4. Start exam → answer → submit → score (90s).
5. Issue certificate → open public `?verify=` logged out (60s). 6. Admin: overview counts → search user → journey → 403 as learner (90s). 7. Honesty tour: Studio disabled note, chatbot guide, no-exam course message (30s).
