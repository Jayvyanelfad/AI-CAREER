FINAL RELEASE / COMMIT / PUSH / RENDER DEPLOYMENT

We have completed the final local hardening pass for CareerPath AI.

The current working tree contains the reviewed backend/frontend/test/migration
changes from the final pre-deployment pass.

I now want you to move these changes from LOCAL → GITHUB MAIN → RENDER
production.

IMPORTANT:
This is a RELEASE operation.

Do NOT make new feature changes.
Do NOT refactor code.
Do NOT rewrite working functionality.
Do NOT modify the database.
Do NOT execute production SQL.
Do NOT change Career Test scoring.
Do NOT change course IDs/content.
Do NOT implement Programming Studio code execution.
Do NOT force-push.
Do NOT reset the repository.
Do NOT delete another agent's work.
Do NOT deploy unreviewed changes.

============================================================
STEP 1 — INSPECT CURRENT GIT STATE
============================================================

Run:

git status
git branch --show-current
git log --oneline --decorate -10
git diff --stat
git diff --check

We expect the current branch to be:

jayvyanelfad-project-overview

and the project currently has the final local hardening changes.

Do NOT assume the working tree is clean.

Inspect all modified and untracked files.

============================================================
STEP 2 — REVIEW WHAT WILL BE RELEASED
============================================================

Before staging anything, inspect the complete diff.

The release should include the actual CareerPath AI application changes,
including the reviewed work involving:

- server.js
- certificate-api.js
- course-enrollment-api.js
- course-learning-store.js
- public/career-test.js
- public/course-detail.html
- public/course-detail.js
- public/courses.html
- public/courses.js
- public/dashboard.js
- locale files
- enrollment tests
- learning/progress tests
- certificate tests
- Career Test tests
- Course Detail tests
- Dashboard tests
- course catalog tests
- profile-related migration artifacts where intended
- course availability migration
- enrollment uniqueness migration
- production schema verification SQL
- recovery checklist

BUT:

Do NOT blindly add every untracked file.

Before staging, inspect each untracked file.

Do NOT commit:

- .env
- secrets
- credentials
- tokens
- private keys
- local caches
- node_modules
- temporary screenshots
- scratch files
- agent logs
- unrelated reports
- generated temporary files
- personal files.

If an untracked file is clearly part of the reviewed release, include it.

If it is unrelated scratch material, leave it untracked.

============================================================
STEP 3 — RUN FINAL TESTS BEFORE COMMIT
============================================================

Run the repository's intended explicit test suite.

Use the explicit tests/*.test.js pattern/configuration rather than blindly
running:

node --test

if that accidentally discovers browser-only public JavaScript.

Required:

- all intended unit/API tests
- browser tests
- enrollment tests
- progress/learning tests
- certificate tests
- Career Test tests
- Course Detail tests
- Dashboard tests
- Courses tests
- Profile tests
- Career Result tests
- Programming Studio tests
- localization parity checks
- JavaScript syntax checks
- git diff --check

Expected current baseline:

47 passed
0 failed

If the count changes because tests were legitimately added, report the new
exact count.

If ANY test fails:

STOP.

Do not commit a failing release.

Investigate the failure and only fix it if the fix is clearly part of the
already-reviewed release scope.

Do not hide or skip a failing test.

============================================================
STEP 4 — SECURITY CHECK BEFORE COMMIT
============================================================

Search the staged/release files for accidental secrets.

Check for:

service_role
SUPABASE_SERVICE_ROLE_KEY
passwords
API keys
private keys
tokens
Bearer credentials
OAuth secrets

Do not print secret values.

Confirm:

- service-role credentials remain server-side
- public/ contains no private credentials
- .env is ignored
- no authentication token was accidentally committed.

If a real secret is discovered:

STOP and report it.

Do NOT commit it.

============================================================
STEP 5 — REVIEW DATABASE MIGRATION FILES
============================================================

The repository contains migration artifacts.

These files are code/documentation for later production DB administration.

They must NOT be executed by this task.

Do NOT connect to Supabase.
Do NOT run SQL.
Do NOT modify production.

Confirm the migrations are present and readable:

- course availability migration
- profile compatibility migration
- enrollment uniqueness migration
- production schema verification SQL

The production database will be verified separately.

============================================================
STEP 6 — STAGE ONLY THE RELEASE FILES
============================================================

After the review and tests pass:

Stage the intended release files.

Do NOT use:

git add .

unless you have first confirmed that EVERY untracked file in the repository
is intended for this release.

Prefer explicitly staging the reviewed files.

Then run:

git status
git diff --cached --stat
git diff --cached --check

Review the staged diff.

Make sure no unrelated files are staged.

============================================================
STEP 7 — CREATE RELEASE COMMIT
============================================================

Create ONE clear release commit.

Suggested commit message:

Complete CareerPath AI production hardening

or, if the existing project convention requires:

Complete CareerPath platform release

Do NOT amend an unrelated historical commit.

Do NOT rewrite history.

After committing:

git status
git log --oneline -3

Confirm the commit exists.

============================================================
STEP 8 — PUSH THE FEATURE BRANCH SAFELY
============================================================

Push the current branch normally:

git push origin jayvyanelfad-project-overview

Do NOT force push.

Confirm the remote push succeeded.

============================================================
STEP 9 — MOVE RELEASE INTO MAIN
============================================================

Production Render is expected to deploy from GitHub main.

First verify the current main state:

git fetch origin
git log --oneline --decorate origin/main -5

Then safely integrate the release into main.

Preferred safe procedure:

git checkout main
git pull --ff-only origin main
git merge --ff-only jayvyanelfad-project-overview

IMPORTANT:

Only use --ff-only.

Do NOT create an unexpected merge commit.
Do NOT force push.
Do NOT reset main.

If --ff-only fails because main contains independent commits that are not
present locally:

STOP.

Do NOT resolve the situation by force-pushing or resetting.

Report the exact Git state so I can decide how to proceed.

If fast-forward succeeds:

run:

git status
git log --oneline --decorate -5

Confirm main now contains the release commit.

============================================================
STEP 10 — PUSH MAIN
============================================================

Push:

git push origin main

Do NOT force push.

Confirm:

origin/main contains the new release commit.

Run:

git fetch origin
git status
git log --oneline --decorate -5

The local main branch and origin/main should agree.

============================================================
STEP 11 — RENDER DEPLOYMENT
============================================================

Now determine how this repository's Render service deploys.

Production service is:

AI-CAREERR

Expected production URL:

https://ai-careerr.onrender.com

IMPORTANT:

Do not invent Render credentials or API access.

First inspect whether the environment already has an authenticated Render
CLI/API integration available.

If an authorized Render deployment mechanism is already configured and
available to you, use it to trigger/verify deployment.

If Render is configured for automatic deploys from GitHub main, the push to
main should trigger the deployment automatically.

In that case:

- do NOT trigger a second unnecessary deployment
- wait for/inspect the deployment status if the available tooling permits it
- verify the deployed commit corresponds to the release commit.

If you do NOT have authorized Render access from this environment:

STOP after successfully pushing main and clearly report:

"GitHub main was successfully updated. Render deployment must now be
triggered/verified from the Render dashboard because no authorized Render
deployment interface is available in this environment."

Do NOT claim Render deployed successfully unless you can actually verify it.

============================================================
STEP 12 — PRODUCTION SMOKE TEST
============================================================

ONLY if the deployment can actually be verified:

Check:

https://ai-careerr.onrender.com

and at minimum:

/api/health

Then verify that the deployed application is serving the new release.

Do NOT expose authentication tokens.

Do NOT paste bearer tokens into the report.

If the production environment requires authentication, do not invent credentials.

Verify only what can safely be verified.

============================================================
STEP 13 — DO NOT RUN PRODUCTION DATABASE MIGRATIONS
============================================================

This is extremely important.

Even after deployment, DO NOT execute:

- course availability migration
- profile migration
- enrollment uniqueness migration
- any seed script

against production.

Those will be verified/applied manually through the approved Supabase
administration process.

The application deployment and database migration are separate operations.

============================================================
STEP 14 — FINAL REPORT
============================================================

Return a concise but complete release report with:

1. Current branch before release
2. Release commit hash
3. Files included
4. Files intentionally excluded
5. Test result
6. Syntax result
7. Localization result
8. Security scan result
9. Feature branch push result
10. Main merge result
11. Main push result
12. Render deployment result
13. Render deployed commit, IF actually verified
14. Production smoke-test result, IF actually performed
15. Remaining production blockers

Use this exact status format:

GIT:
GREEN / YELLOW / RED

TESTS:
GREEN / YELLOW / RED

SECURITY:
GREEN / YELLOW / RED

GITHUB MAIN:
GREEN / YELLOW / RED

RENDER:
GREEN / YELLOW / RED

DATABASE:
GREEN / YELLOW / RED

PRODUCTION:
GREEN / YELLOW / RED

IMPORTANT:

GREEN means actually verified.

YELLOW means prepared/implemented but not independently verified.

RED means failed, unavailable, or not completed.

Never call Render deployment successful unless the deployment is actually
observable/verified.

Never claim production is fixed merely because GitHub push succeeded.

DO NOT COMMIT AGAIN AFTER THIS RELEASE COMMIT.
DO NOT PUSH ANYTHING ELSE.
DO NOT FORCE PUSH.
DO NOT DEPLOY UNRELATED CHANGES.