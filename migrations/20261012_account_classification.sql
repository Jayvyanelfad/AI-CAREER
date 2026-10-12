-- Explicit learner-account classification for human-only reporting.
-- Existing rows deliberately default to 'unclassified': no account is
-- automatically treated as human or automated. An authorized operator promotes
-- rows with a reviewed UPDATE after checking provenance (test fixtures, known
-- test UUIDs, operator-created demo accounts). Frontend never writes this.
-- Additive and re-runnable. Requires public.users. No backfill is performed
-- here by design; see docs/ACCOUNT_CLASSIFICATION.md (operator runbook).
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_kind TEXT NOT NULL DEFAULT 'unclassified';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_account_kind_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_account_kind_check
      CHECK (account_kind IN ('human', 'test', 'demo', 'unclassified'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS users_account_kind_idx
  ON public.users (account_kind);

COMMIT;

-- Operator promotion (run manually, one reviewed row at a time):
--   UPDATE public.users SET account_kind = 'human' WHERE id = '<uuid>';
-- Rollback: DROP INDEX IF EXISTS public.users_account_kind_idx;
--   ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_account_kind_check;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS account_kind;
