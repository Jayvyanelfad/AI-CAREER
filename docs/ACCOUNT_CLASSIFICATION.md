# Account classification — operator runbook

## Rule
An account counts as a **human learner** only when `public.users.account_kind`
is explicitly `'human'`. Every other value — including missing values and any
unrecognized string — resolves to `'unclassified'`. Nothing is ever inferred
from email domains, display names, activity levels, or missing profiles.

## Lifecycle
- New rows default to `'unclassified'` (migration default; no backfill exists).
- Promotion is a reviewed, one-row-at-a-time `UPDATE` by an authorized operator
  after checking provenance: known test UUIDs, test-fixture markers, operator
  session notes, or direct confirmation from the account owner.
- Log each promotion (who, which UUID, what evidence) in the team's own audit
  trail; the database does not record the reviewer.

## Review queue
Admin Overview shows `unclassifiedUsers`; the Users view filters
`?kind=unclassified`. Start there.

## Promotion SQL (staging or production SQL editor, service-role)
```sql
UPDATE public.users SET account_kind = 'human' WHERE id = '<uuid>';
UPDATE public.users SET account_kind = 'test' WHERE id = '<uuid>';
UPDATE public.users SET account_kind = 'demo' WHERE id = '<uuid>';
```
Verify: `SELECT account_kind, count(*) FROM public.users GROUP BY account_kind;`
then reload admin Overview and confirm `humanUsers` changed by exactly one.

## Rollback
See the commented rollback block at the end of
`migrations/20261012_account_classification.sql`. The application degrades to
all-unclassified on schemas without the column, so rolling back cannot break
reads — it only zeroes the human metrics until re-promotion.
