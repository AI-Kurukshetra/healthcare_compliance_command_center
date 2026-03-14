-- UP
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

UPDATE public.users AS profile
SET
  first_name = COALESCE(
    profile.first_name,
    NULLIF(split_part(auth_user.raw_user_meta_data ->> 'full_name', ' ', 1), '')
  ),
  last_name = COALESCE(
    profile.last_name,
    NULLIF(
      btrim(
        substring(
          auth_user.raw_user_meta_data ->> 'full_name'
          FROM length(split_part(auth_user.raw_user_meta_data ->> 'full_name', ' ', 1)) + 1
        )
      ),
      ''
    )
  )
FROM auth.users AS auth_user
WHERE auth_user.id = profile.id
  AND (
    profile.first_name IS NULL
    OR profile.last_name IS NULL
  )
  AND auth_user.raw_user_meta_data ? 'full_name';

COMMIT;
