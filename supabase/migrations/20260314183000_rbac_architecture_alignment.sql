-- UP
BEGIN;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS role_id uuid,
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_members_role_check'
      AND conrelid = 'public.organization_members'::regclass
  ) THEN
    ALTER TABLE public.organization_members DROP CONSTRAINT organization_members_role_check;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_members_user_id_key'
      AND conrelid = 'public.organization_members'::regclass
  ) THEN
    ALTER TABLE public.organization_members DROP CONSTRAINT organization_members_user_id_key;
  END IF;
END
$$;

DROP INDEX IF EXISTS public.organization_members_user_id_key;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'compliance_officer', 'staff', 'auditor'));

WITH orphan_users AS (
  SELECT users.id, users.email
  FROM public.users users
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.organization_members members
    WHERE members.user_id = users.id
  )
), inserted_organizations AS (
  INSERT INTO public.organizations (id, organization_id, name, plan, created_by)
  SELECT
    gen_random_uuid(),
    gen_random_uuid(),
    COALESCE(NULLIF(split_part(orphan_users.email, '@', 1), ''), 'Default Organization') || ' Workspace',
    'starter',
    orphan_users.id
  FROM orphan_users
  RETURNING id, created_by
)
UPDATE public.users
SET organization_id = inserted_organizations.id
FROM inserted_organizations
WHERE public.users.id = inserted_organizations.created_by;

UPDATE public.organizations
SET
  organization_id = id,
  created_by = COALESCE(
    created_by,
    (
      SELECT members.user_id
      FROM public.organization_members members
      WHERE members.organization_id = public.organizations.id
      ORDER BY members.created_at ASC
      LIMIT 1
    )
  )
WHERE organization_id <> id
   OR created_by IS NULL;

WITH organization_seed AS (
  SELECT organizations.id AS organization_id, organizations.created_by
  FROM public.organizations organizations
), role_seed AS (
  VALUES
    ('owner', 'Full access to organization administration, membership, and billing controls.'),
    ('admin', 'Manage members, incidents, compliance tooling, and documents.'),
    ('compliance_officer', 'Manage assessments, incidents, and policy workflows.'),
    ('auditor', 'Read-only access to compliance reports and audit trails.'),
    ('staff', 'Limited access to assigned tasks and training activities.')
)
INSERT INTO public.roles (organization_id, name, description)
SELECT organization_seed.organization_id, role_seed.column1, role_seed.column2
FROM organization_seed
CROSS JOIN role_seed
ON CONFLICT (organization_id, name) DO UPDATE
SET
  description = EXCLUDED.description,
  updated_at = timezone('utc', now());

WITH orphan_users AS (
  SELECT users.id AS user_id, users.organization_id, organizations.created_by
  FROM public.users users
  JOIN public.organizations organizations
    ON organizations.id = users.organization_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.organization_members members
    WHERE members.organization_id = users.organization_id
      AND members.user_id = users.id
  )
), resolved_roles AS (
  SELECT
    orphan_users.user_id,
    orphan_users.organization_id,
    roles.id AS role_id,
    roles.name AS role_name,
    orphan_users.created_by
  FROM orphan_users
  JOIN public.roles roles
    ON roles.organization_id = orphan_users.organization_id
   AND roles.name = CASE
     WHEN orphan_users.created_by = orphan_users.user_id THEN 'owner'
     ELSE 'staff'
   END
)
INSERT INTO public.organization_members (organization_id, user_id, role, role_id, invited_by)
SELECT
  resolved_roles.organization_id,
  resolved_roles.user_id,
  resolved_roles.role_name,
  resolved_roles.role_id,
  resolved_roles.created_by
FROM resolved_roles
ON CONFLICT (organization_id, user_id) DO UPDATE
SET
  role = EXCLUDED.role,
  role_id = EXCLUDED.role_id,
  invited_by = COALESCE(public.organization_members.invited_by, EXCLUDED.invited_by),
  updated_at = timezone('utc', now());

UPDATE public.organization_members members
SET
  role = CASE
    WHEN members.user_id = organizations.created_by THEN 'owner'
    WHEN members.role = 'employee' THEN 'staff'
    ELSE members.role
  END
FROM public.organizations organizations
WHERE organizations.id = members.organization_id;

UPDATE public.organization_members members
SET role_id = roles.id
FROM public.roles roles
WHERE roles.organization_id = members.organization_id
  AND roles.name = members.role
  AND (
    members.role_id IS NULL
    OR members.role_id <> roles.id
  );

ALTER TABLE public.organization_members
  ALTER COLUMN role_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_members_role_id_fkey'
      AND conrelid = 'public.organization_members'::regclass
  ) THEN
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_role_id_fkey
      FOREIGN KEY (role_id, organization_id)
      REFERENCES public.roles(id, organization_id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS organization_members_role_id_idx
  ON public.organization_members(role_id);

CREATE INDEX IF NOT EXISTS organizations_created_by_idx
  ON public.organizations(created_by);

CREATE OR REPLACE FUNCTION public.current_user_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT roles.name
  FROM public.organization_members
  JOIN public.roles
    ON roles.id = public.organization_members.role_id
  WHERE public.organization_members.user_id = auth.uid()
    AND public.organization_members.organization_id = public.current_user_organization_id()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_app_role() TO authenticated;

DROP POLICY IF EXISTS roles_manage_admin_or_seed ON public.roles;
CREATE POLICY roles_manage_admin_or_seed
  ON public.roles
  FOR ALL
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_app_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      public.current_user_app_role() IN ('owner', 'admin')
      OR NOT EXISTS (
        SELECT 1
        FROM public.roles existing_roles
        WHERE existing_roles.organization_id = public.current_user_organization_id()
      )
    )
  );

DROP POLICY IF EXISTS permissions_manage_admin_or_seed ON public.permissions;
CREATE POLICY permissions_manage_admin_or_seed
  ON public.permissions
  FOR ALL
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_app_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      public.current_user_app_role() IN ('owner', 'admin')
      OR NOT EXISTS (
        SELECT 1
        FROM public.permissions existing_permissions
        WHERE existing_permissions.organization_id = public.current_user_organization_id()
      )
    )
  );

DROP POLICY IF EXISTS role_permissions_manage_admin_or_seed ON public.role_permissions;
CREATE POLICY role_permissions_manage_admin_or_seed
  ON public.role_permissions
  FOR ALL
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_app_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      public.current_user_app_role() IN ('owner', 'admin')
      OR NOT EXISTS (
        SELECT 1
        FROM public.role_permissions existing_role_permissions
        WHERE existing_role_permissions.organization_id = public.current_user_organization_id()
      )
    )
  );

DROP POLICY IF EXISTS user_roles_manage_admin_or_seed ON public.user_roles;
CREATE POLICY user_roles_manage_admin_or_seed
  ON public.user_roles
  FOR ALL
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.current_user_app_role() IN ('owner', 'admin')
      OR auth.uid() = user_id
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      public.current_user_app_role() IN ('owner', 'admin')
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

COMMIT;
