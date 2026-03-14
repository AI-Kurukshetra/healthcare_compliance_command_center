-- UP
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_members_user_id_public_fkey'
      AND conrelid = 'public.organization_members'::regclass
  ) THEN
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_user_id_public_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;

-- DOWN
BEGIN;

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_user_id_public_fkey;

COMMIT;
