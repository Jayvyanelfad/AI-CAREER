# Production release checklist

This is the operator checklist for the auth and Supabase hardening PR. A green CI run is not a substitute for a live end-to-end authentication test.

## Status snapshot — 2026-10-14

- GitHub Actions run #20 passed: 165 tests, 0 failures, 0 skipped.
- The primary `AI-CAREER` Supabase project records the reviewed `20261014` privilege, index, and RLS migrations.
- Verified on the primary database: no table, column, or sequence grants for `anon`/`authenticated` in the `public` schema; required `service_role` grants remain.
- The RLS advisor reports no longer any RLS-enabled public tables without policies. Its remaining warning is leaked-password protection disabled; Supabase lists that feature as Pro and above.
- `careerpath-ai-staging` is incomplete. No schema or data migration has been applied there.
- Locale dictionaries `fr`, `hinglish`, `sw`, and `ar` match English's 1,314 key set. Hausa, Nigerian Pidgin, and Wolof remain partial UI translations.

## 1. Configure Render environment

- [ ] Set `SUPABASE_URL` to the primary project's URL.
- [ ] Set `SUPABASE_PUBLISHABLE_KEY` to the active public/publishable API key from Supabase Project Settings → API.
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` only in the server's environment variables. Never put it in a browser file, commit, or support ticket.
- [ ] Keep `SUPABASE_ANON_KEY` only as a temporary fallback if another deployment still uses the legacy name.
- [ ] Confirm `RENDER_EXTERNAL_URL` resolves to the deployed application origin so the server sends the correct email callback URL.
- [ ] Confirm the deployed runtime uses Node 24 as required by `package.json`.

## 2. Configure Supabase Auth URLs

In Supabase Dashboard → Authentication → URL Configuration:

- [ ] Set **Site URL** to `https://ai-careerr.onrender.com`.
- [ ] Add the exact production redirect URLs `https://ai-careerr.onrender.com/auth-callback.html` and `https://ai-careerr.onrender.com/reset-password.html`.
- [ ] For local development, add `http://localhost:5000/auth-callback.html` and `http://localhost:5000/reset-password.html` only if local authentication tests are needed.
- [ ] If Google sign-in is used, confirm the Google provider is enabled and its provider callback URI still points to the Supabase project's Auth callback endpoint. The app's `auth-callback.html` is the post-login destination, not the Google provider callback URI.

Supabase's Site URL is the default auth redirect, and a requested `redirectTo` must match an allowed URL. See [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 3. Deploy and smoke-test auth

Run these with a real test account after a deployment of the PR branch:

- [ ] Direct request to `/dashboard.html` with no session redirects to login.
- [ ] Password login succeeds and a verified `cp_auth_access` HttpOnly cookie is set.
- [ ] New registration works with both immediate session and email-confirmation-required configurations.
- [ ] Email confirmation and Google OAuth return to `/auth-callback.html` and can open a protected page.
- [ ] A refreshed access token is mirrored to the cookie, and direct refresh of a private page still works.
- [ ] Logout deletes the cookie and clears browser-side Auth state.
- [ ] A non-admin user gets HTTP 403 for `/admin.html`; a known admin user succeeds.
- [ ] Private certificate view requires authentication while `/certificate.html?verify=...` remains public.
- [ ] Course enrollment, lesson completion, exam attempt/save/submit, notifications, profile update, assessment save, and certificate issuance all work against the primary database.
- [ ] Browser-role direct table reads/writes are rejected; the Express API and service-role database operations continue to work.
- [ ] Check responsive layouts and right-to-left direction with Arabic.

Do not test destructive actions using a real learner's account or real learner records.

## 4. Database migration rules

- [ ] Do not rerun the already-recorded `20261014` migrations against the primary project manually; the database already records them.
- [ ] Before hardening staging, build its complete schema in the documented order, seed the required course/exam rows, and test all server API routes there. Staging currently has only the initial seven tables and no migration records.
- [ ] Never execute `SUPABASE_MIGRATION_FIXED.sql`; its header drops application tables.
- [ ] Re-run the Supabase Security Advisor after future database changes.

The permissions migrations change grants/policies, not learner data rows. They assume the application reads/writes public tables through Express using the service-role client; do not introduce browser-side `.from(...)` calls without a reviewed policy/grant design.

## 5. Localization acceptance

- [ ] Verify language selection, persistence, text wrapping, and Arabic RTL on desktop and mobile.
- [ ] Treat locale-key parity as coverage only; ask fluent reviewers to approve meaning and terminology.
- [ ] Do not advertise Hausa, Nigerian Pidgin, or Wolof as fully localized yet.
- [ ] Long-form lesson bodies, exam questions, and career-assessment question content still need a separate content-localization plan; the current change fills missing interface/course-description/diagram strings, not every lesson body.

## 6. Remaining plan limitation

Supabase's current docs list leaked-password protection as Pro and above. The linked organization is currently on the Free plan; this setting remains the only Security Advisor warning unless the organization changes plan. Do not upgrade automatically or incur a charge without an explicit decision.
