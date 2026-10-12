-- Permit the selectable, intentionally partial community locales to persist
-- as profile preferences. Existing valid rows remain valid; no data is
-- rewritten. Do not apply without the normal staging schema review.
BEGIN;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_profile_language_check,
  ADD CONSTRAINT users_profile_language_check
    CHECK (preferred_language IS NULL OR preferred_language IN (
      'en', 'fr', 'hinglish', 'sw', 'ar', 'pcm', 'wo', 'ha'
    ));

COMMIT;
