-- Extend the existing public.users profile and add user-owned avatar storage.
-- Supabase Auth remains authoritative for email and credentials.
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT,
  ADD COLUMN IF NOT EXISTS theme_preference TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_profile_language_check,
  ADD CONSTRAINT users_profile_language_check
    CHECK (preferred_language IS NULL OR preferred_language IN ('en', 'fr', 'hinglish', 'sw', 'ar')),
  DROP CONSTRAINT IF EXISTS users_profile_theme_check,
  ADD CONSTRAINT users_profile_theme_check
    CHECK (theme_preference IS NULL OR theme_preference IN ('system', 'light', 'dark')),
  DROP CONSTRAINT IF EXISTS users_profile_bio_length_check,
  ADD CONSTRAINT users_profile_bio_length_check
    CHECK (bio IS NULL OR char_length(bio) <= 240);

CREATE OR REPLACE FUNCTION public.set_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_profile_updated_at ON public.users;
CREATE TRIGGER users_profile_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_updated_at();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Keep direct authenticated access scoped to the caller. The application API
-- also derives every profile row ID from the verified bearer-token subject.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_profile_select_own') THEN
    CREATE POLICY users_profile_select_own ON public.users
      FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_profile_insert_own') THEN
    CREATE POLICY users_profile_insert_own ON public.users
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_profile_update_own') THEN
    CREATE POLICY users_profile_update_own ON public.users
      FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-avatars', 'profile-avatars', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'profile-avatars' AND public = TRUE
      AND file_size_limit = 5242880
      AND allowed_mime_types @> ARRAY['image/jpeg', 'image/png', 'image/webp']
  ) THEN
    RAISE EXCEPTION 'Existing profile-avatars bucket has incompatible access or upload limits; review it before migration';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profile_avatars_owner_insert') THEN
    CREATE POLICY profile_avatars_owner_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profile_avatars_owner_delete') THEN
    CREATE POLICY profile_avatars_owner_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
  END IF;
END;
$$;

COMMIT;
