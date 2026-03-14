-- UP
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_members'
      AND policyname = 'organization_members_insert_admin_or_owner'
  ) THEN
    CREATE POLICY organization_members_insert_admin_or_owner
      ON public.organization_members
      FOR INSERT
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_members'
      AND policyname = 'organization_members_update_admin_or_owner'
  ) THEN
    CREATE POLICY organization_members_update_admin_or_owner
      ON public.organization_members
      FOR UPDATE
      USING (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin')
      )
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_members'
      AND policyname = 'organization_members_delete_admin_or_owner'
  ) THEN
    CREATE POLICY organization_members_delete_admin_or_owner
      ON public.organization_members
      FOR DELETE
      USING (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_insert_admin_or_owner'
  ) THEN
    CREATE POLICY users_insert_admin_or_owner
      ON public.users
      FOR INSERT
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_update_admin_or_owner'
  ) THEN
    CREATE POLICY users_update_admin_or_owner
      ON public.users
      FOR UPDATE
      USING (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin')
      )
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin')
      );
  END IF;
END $$;

COMMIT;

-- DOWN
BEGIN;

DROP POLICY IF EXISTS organization_members_insert_admin_or_owner ON public.organization_members;
DROP POLICY IF EXISTS organization_members_update_admin_or_owner ON public.organization_members;
DROP POLICY IF EXISTS organization_members_delete_admin_or_owner ON public.organization_members;
DROP POLICY IF EXISTS users_insert_admin_or_owner ON public.users;
DROP POLICY IF EXISTS users_update_admin_or_owner ON public.users;

COMMIT;
