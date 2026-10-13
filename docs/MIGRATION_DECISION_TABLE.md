# Migration decision table (verified from file contents, not filenames)

Schema state is UNVERIFIED live/staging — no database access in this mission.
Prior read-only evidence (earlier session): staging has the 7 base tables and
`pgcrypto`. Everything below states what each file does and the safe order.

## Fresh staging bootstrap (empty schema only)
| Order | File | Effect |
|---|---|---|
| 1 | `staging_step1.sql` | 7 base tables + self-ownership RLS. Run once (bare CREATE POLICY/INDEX). |
| 2 | `staging_step2_schema.sql` | Foundation + questions + assessment columns + secure-exam schema + indexes + profile/avatar + notifications. Re-runnable. |
| 3 | seeds: courses → modern-ai-courses → course-content → career-test-questions → exam | `seed-exam.js` and question-seed now idempotent; `seed-courses.js` skips existing. |
| 4 | `staging_step3_postseed.sql` | Exam 4–10 + crossword rows. Requires `intro_to_ai_exam_1`. |

## Incremental migrations (after bootstrap; each reviewed below)
| File | Verdict |
|---|---|
| `20260926_certificate_unique_user_course.sql` | Required. Idempotent unique index. |
| `20260925_secure_exam_foundation.sql` | Required for exams. Transactional; idempotent inserts; drops 8 browser exam policies by design (service_role bypasses RLS); 4 RPCs with ownership checks, fixed search_path, service_role-only grants. |
| `20260927_assessment_question_accessibility.sql` | Content-only, transactional, exact-text guarded. |
| `20260928_course_learning_consistency.sql` | Content-only, guarded, repeat-safe. |
| `20260928_course_library_checkpoint_{a,b,c}.sql` | Content-only, transactional; old-content guards make reruns safe no-ops. |
| `20260928_course_library_checkpoint_d.sql` | Run-once: snapshot assertions abort a rerun (rolls back, harmless). Run after A–C. |
| `migrations/20260930_admin_users.sql` | Required for admin. Transactional, re-runnable, service-role-only. |
| `migrations/20260930_course_availability_status.sql` | Required (`status` column the API reads). Not wrapped in BEGIN/COMMIT; safe autocommit DDL. |
| `migrations/20261001_course_learning_outcomes.sql` | Content-only, transactional, exact-match guarded. |
| `migrations/20261001_profile_identity_compat.sql` | AUTHORITATIVE profile variant. Use instead of FULL below. |
| `migrations/20261001_profile_identity.sql` | SUPERSEDED by `_compat` for this app (adds duplicate `users_profile_*` policies). Do not apply both. |
| `migrations/20261002_enrollment_user_course_unique.sql` | AUTHORITATIVE enrollment-uniqueness (column guards + lock + fail-closed validation). |
| `migrations/20261011_enrollment_uniqueness.sql` | REDUNDANT (creates the identical index name; no-op after 20261002). Skip. |
| `migrations/20261011_notifications.sql` | Required (table the API 503s without). Not in a transaction; idempotent DDL; preserves least-privilege grants. |
| `migrations/20261011_profile_partial_locale_preferences.sql` | Required (API accepts 8 locales). Must run AFTER profile variant. |
| `migrations/20261012_certificate_revoke_client_insert.sql` | Required (unapplied). Removes browser certificate INSERT; keeps SELECT. |
| `migrations/20261012_exam_final_discriminator.sql` | Required (unapplied). Adds `is_final` + backfills seeded final only. |
| `migrations/20261012_account_classification.sql` | Required for human-only reporting (unapplied). Additive, no backfill by design. |
| `create_questions_tables.sql` | Superseded by staging_step2 (same tables). Run-once only: bare policies/indexes. |
| `add-assessment-columns.sql` | Superseded by staging_step2. Safe standalone (IF NOT EXISTS). |
| `migrate_database_foundation_FINAL.sql` | AUTHORITATIVE foundation. Superseded by staging_step2. |
| `migrate_database_foundation_CORRECTED.sql` | SUPERSEDED (duplicate exam_answers policy). Never use. |
| `migrate_database_foundation.sql` | SUPERSEDED by FINAL. Never use. |
| `SUPABASE_MIGRATION_FIXED.sql` | FORBIDDEN as a runner (destructive header). History only; staging_step1 is its safe extract. |
| `SUPABASE_MIGRATION.sql` | FORBIDDEN (camelCase schema + `uuid-ossp`). History only. |

## Read-only verification checklist (owner runs, no writes)
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1;
SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE '%user_course_unique%' OR indexname='exam_attempts_one_active_per_user_exam_idx';
SELECT policyname, roles, cmd FROM pg_policies WHERE schemaname='public' AND tablename IN ('certificates','exam_attempts','notifications','admin_users');
SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname LIKE '%exam%';
SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name IN ('account_kind','avatar_path','preferred_language');
SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='exams' AND column_name='is_final';
SELECT count(*) FROM public.exam_questions WHERE exam_id='intro_to_ai_exam_1';
```
Rollback: every migration documents its own inverse; content migrations roll back only via restore — back up before content checkpoints.
