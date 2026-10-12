# Production Recovery Checklist

## Scope

This release recovery is intentionally limited to the audited production gaps already confirmed during the local review:

- `public.courses.status` must exist and be constrained to `available` or `coming_soon`.
- `public.enrollments(user_id, course_id)` must be unique for duplicate-safe enrollment.
- `public.users` must support `avatar_path`, `bio`, `preferred_language`, `theme_preference`, and `updated_at`.
- The existing authenticated `public.users` ownership policies must remain intact.
- The `profile-avatars` storage bucket must exist if the profile UI is enabled.

## Safe execution path

1. Use the compatibility migration under `migrations/20261001_profile_identity_compat.sql` instead of the broader identity migration when the production database already has the correct user policies.
2. Apply `migrations/20260930_course_availability_status.sql` if the courses table still lacks the availability flag.
3. Before applying `migrations/20261002_enrollment_user_course_unique.sql`, inspect the duplicate query in that migration. It takes a table write lock and aborts without modifying enrollment rows if key columns are nullable or duplicates exist. Resolve duplicate records only through a separately reviewed data-repair plan; do not delete them automatically.
4. Run `tests/production-schema-verification.sql` in the Supabase SQL editor or an equivalent approved admin path to confirm the database state.
5. Do not attempt to bypass the security model or create a custom SQL execution endpoint inside the app.

## Validation checklist

- The `public.users` table includes the required profile columns.
- The `public.courses` table includes the `status` column with the allowed values.
- No duplicate or null enrollment keys remain, and the unique `(user_id, course_id)` index is present.
- The `users_profile_select_own`, `users_profile_insert_own`, and `users_profile_update_own` policies remain present and enforced.
- The `profile-avatars` bucket is visible in `storage.buckets`.
- The app continues to use the verified bearer-token subject rather than trusting browser-supplied IDs.

## Stop conditions

Stop and escalate if any of the following occur:

- the production database schema differs from the audited baseline,
- an existing policy is missing or unexpectedly modified,
- the bucket or column states conflict with the confirmed local production findings,
- or the environment exposes no approved database management path.
