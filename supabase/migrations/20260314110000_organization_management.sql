-- UP
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'compliance_officer', 'employee', 'auditor')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_user_id_key
  ON public.organization_members(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_organization_user_key
  ON public.organization_members(organization_id, user_id);

CREATE INDEX IF NOT EXISTS organization_members_organization_id_idx
  ON public.organization_members(organization_id);

CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_organization_id() TO authenticated;

ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND policyname = 'organizations_select_own'
  ) THEN
    CREATE POLICY organizations_select_own
      ON public.organizations
      FOR SELECT
      USING (id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND policyname = 'organizations_insert_own'
  ) THEN
    CREATE POLICY organizations_insert_own
      ON public.organizations
      FOR INSERT
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND id = organization_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.organization_members existing_membership
          WHERE existing_membership.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND policyname = 'organizations_update_own'
  ) THEN
    CREATE POLICY organizations_update_own
      ON public.organizations
      FOR UPDATE
      USING (id = public.current_user_organization_id())
      WITH CHECK (
        id = public.current_user_organization_id()
        AND organization_id = public.current_user_organization_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_members'
      AND policyname = 'organization_members_select_same_org'
  ) THEN
    CREATE POLICY organization_members_select_same_org
      ON public.organization_members
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_members'
      AND policyname = 'organization_members_insert_self'
  ) THEN
    CREATE POLICY organization_members_insert_self
      ON public.organization_members
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1
          FROM public.organizations organizations
          WHERE organizations.id = organization_members.organization_id
            AND organizations.organization_id = organization_members.organization_id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.organization_members existing_membership
          WHERE existing_membership.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_members'
      AND policyname = 'organization_members_update_self'
  ) THEN
    CREATE POLICY organization_members_update_self
      ON public.organization_members
      FOR UPDATE
      USING (
        user_id = auth.uid()
        AND organization_id = public.current_user_organization_id()
      )
      WITH CHECK (
        user_id = auth.uid()
        AND organization_id = public.current_user_organization_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_select_same_org'
  ) THEN
    CREATE POLICY users_select_same_org
      ON public.users
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_insert_self'
  ) THEN
    CREATE POLICY users_insert_self
      ON public.users
      FOR INSERT
      WITH CHECK (
        auth.uid() = id
        AND organization_id = public.current_user_organization_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_update_self'
  ) THEN
    CREATE POLICY users_update_self
      ON public.users
      FOR UPDATE
      USING (
        id = auth.uid()
        AND organization_id = public.current_user_organization_id()
      )
      WITH CHECK (
        id = auth.uid()
        AND organization_id = public.current_user_organization_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'audit_logs_select_same_org'
  ) THEN
    CREATE POLICY audit_logs_select_same_org
      ON public.audit_logs
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'audit_logs_insert_same_org'
  ) THEN
    CREATE POLICY audit_logs_insert_same_org
      ON public.audit_logs
      FOR INSERT
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND (user_id IS NULL OR user_id = auth.uid())
      );
  END IF;
END
$$;

COMMIT;
