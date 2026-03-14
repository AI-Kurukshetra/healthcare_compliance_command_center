-- UP
BEGIN;

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (organization_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS roles_id_organization_id_key
  ON public.roles(id, organization_id);

CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (organization_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS permissions_id_organization_id_key
  ON public.permissions(id, organization_id);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT role_permissions_role_org_fkey
    FOREIGN KEY (role_id, organization_id)
    REFERENCES public.roles(id, organization_id)
    ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_org_fkey
    FOREIGN KEY (permission_id, organization_id)
    REFERENCES public.permissions(id, organization_id)
    ON DELETE CASCADE,
  UNIQUE (organization_id, role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT user_roles_role_org_fkey
    FOREIGN KEY (role_id, organization_id)
    REFERENCES public.roles(id, organization_id)
    ON DELETE CASCADE,
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS roles_organization_id_idx
  ON public.roles(organization_id);

CREATE INDEX IF NOT EXISTS permissions_organization_id_idx
  ON public.permissions(organization_id);

CREATE INDEX IF NOT EXISTS role_permissions_organization_id_idx
  ON public.role_permissions(organization_id);

CREATE INDEX IF NOT EXISTS user_roles_organization_id_idx
  ON public.user_roles(organization_id);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx
  ON public.user_roles(user_id);

CREATE OR REPLACE FUNCTION public.current_user_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_members.role
  FROM public.organization_members
  WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id = public.current_user_organization_id()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_app_role() TO authenticated;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'roles'
      AND policyname = 'roles_select_same_org'
  ) THEN
    CREATE POLICY roles_select_same_org
      ON public.roles
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'roles'
      AND policyname = 'roles_manage_admin_or_seed'
  ) THEN
    CREATE POLICY roles_manage_admin_or_seed
      ON public.roles
      FOR ALL
      USING (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() = 'admin'
      )
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND (
          public.current_user_app_role() = 'admin'
          OR NOT EXISTS (
            SELECT 1
            FROM public.roles existing_roles
            WHERE existing_roles.organization_id = public.current_user_organization_id()
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'permissions'
      AND policyname = 'permissions_select_same_org'
  ) THEN
    CREATE POLICY permissions_select_same_org
      ON public.permissions
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'permissions'
      AND policyname = 'permissions_manage_admin_or_seed'
  ) THEN
    CREATE POLICY permissions_manage_admin_or_seed
      ON public.permissions
      FOR ALL
      USING (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() = 'admin'
      )
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND (
          public.current_user_app_role() = 'admin'
          OR NOT EXISTS (
            SELECT 1
            FROM public.permissions existing_permissions
            WHERE existing_permissions.organization_id = public.current_user_organization_id()
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'role_permissions'
      AND policyname = 'role_permissions_select_same_org'
  ) THEN
    CREATE POLICY role_permissions_select_same_org
      ON public.role_permissions
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'role_permissions'
      AND policyname = 'role_permissions_manage_admin_or_seed'
  ) THEN
    CREATE POLICY role_permissions_manage_admin_or_seed
      ON public.role_permissions
      FOR ALL
      USING (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() = 'admin'
      )
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND (
          public.current_user_app_role() = 'admin'
          OR NOT EXISTS (
            SELECT 1
            FROM public.role_permissions existing_role_permissions
            WHERE existing_role_permissions.organization_id = public.current_user_organization_id()
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'user_roles_select_same_org'
  ) THEN
    CREATE POLICY user_roles_select_same_org
      ON public.user_roles
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'user_roles_manage_admin_or_seed'
  ) THEN
    CREATE POLICY user_roles_manage_admin_or_seed
      ON public.user_roles
      FOR ALL
      USING (
        organization_id = public.current_user_organization_id()
        AND (
          public.current_user_app_role() = 'admin'
          OR auth.uid() = user_id
        )
      )
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND (
          public.current_user_app_role() = 'admin'
          OR (
            auth.uid() = user_id
            AND NOT EXISTS (
              SELECT 1
              FROM public.user_roles existing_user_roles
              WHERE existing_user_roles.organization_id = public.current_user_organization_id()
                AND existing_user_roles.user_id = auth.uid()
            )
          )
        )
      );
  END IF;
END
$$;

WITH permission_seed(name, description) AS (
  VALUES
    ('manage_users', 'Manage organization users and role assignments.'),
    ('view_reports', 'View compliance and audit reporting surfaces.'),
    ('manage_assessments', 'Manage compliance assessments and policy workflows.'),
    ('view_incidents', 'View incident records and triage status.'),
    ('manage_incidents', 'Manage incidents and remediation workflows.'),
    ('upload_documents', 'Manage and upload compliance documents.'),
    ('view_audit_logs', 'View audit log exports and evidence trails.'),
    ('configure_security_settings', 'Configure organization security settings.'),
    ('complete_training', 'Complete assigned training activities.'),
    ('participate_assessments', 'Participate in organization assessments.'),
    ('view_assigned_tasks', 'View assigned compliance tasks.')
)
INSERT INTO public.permissions (organization_id, name, description)
SELECT organizations.id, permission_seed.name, permission_seed.description
FROM public.organizations
CROSS JOIN permission_seed
ON CONFLICT (organization_id, name) DO UPDATE
SET
  description = EXCLUDED.description,
  updated_at = timezone('utc', now());

WITH role_seed(name, description) AS (
  VALUES
    ('admin', 'Full access to organization administration, incidents, and security settings.'),
    ('compliance_officer', 'Manages compliance workflows, reports, and policy documents.'),
    ('employee', 'Completes assigned training and participates in compliance tasks.'),
    ('auditor', 'Read-only access to reports and audit evidence.')
)
INSERT INTO public.roles (organization_id, name, description)
SELECT organizations.id, role_seed.name, role_seed.description
FROM public.organizations
CROSS JOIN role_seed
ON CONFLICT (organization_id, name) DO UPDATE
SET
  description = EXCLUDED.description,
  updated_at = timezone('utc', now());

WITH role_permission_seed(role_name, permission_name) AS (
  VALUES
    ('admin', 'manage_users'),
    ('admin', 'view_reports'),
    ('admin', 'manage_assessments'),
    ('admin', 'view_incidents'),
    ('admin', 'manage_incidents'),
    ('admin', 'upload_documents'),
    ('admin', 'view_audit_logs'),
    ('admin', 'configure_security_settings'),
    ('admin', 'complete_training'),
    ('admin', 'participate_assessments'),
    ('admin', 'view_assigned_tasks'),
    ('compliance_officer', 'manage_assessments'),
    ('compliance_officer', 'view_incidents'),
    ('compliance_officer', 'manage_incidents'),
    ('compliance_officer', 'view_reports'),
    ('compliance_officer', 'upload_documents'),
    ('employee', 'complete_training'),
    ('employee', 'participate_assessments'),
    ('employee', 'view_assigned_tasks'),
    ('auditor', 'view_reports'),
    ('auditor', 'view_audit_logs')
)
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT roles.organization_id, roles.id, permissions.id
FROM role_permission_seed
JOIN public.roles
  ON roles.name = role_permission_seed.role_name
JOIN public.permissions
  ON permissions.organization_id = roles.organization_id
 AND permissions.name = role_permission_seed.permission_name
ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;

INSERT INTO public.user_roles (organization_id, user_id, role_id)
SELECT users.organization_id, users.id, roles.id
FROM public.users
JOIN public.roles
  ON roles.organization_id = users.organization_id
 AND roles.name = users.role
ON CONFLICT (organization_id, user_id) DO NOTHING;

COMMIT;
