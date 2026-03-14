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
END
$$;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'compliance_officer', 'staff', 'auditor'));

DROP INDEX IF EXISTS public.organization_members_user_id_key;

UPDATE public.organizations
SET
  organization_id = id,
  updated_at = timezone('utc', now())
WHERE organization_id IS DISTINCT FROM id;

WITH owner_candidates AS (
  SELECT
    organizations.id AS organization_id,
    COALESCE(
      organizations.created_by,
      (
        SELECT members.user_id
        FROM public.organization_members members
        WHERE members.organization_id = organizations.id
        ORDER BY members.created_at ASC
        LIMIT 1
      ),
      (
        SELECT users.id
        FROM public.users users
        WHERE users.organization_id = organizations.id
        ORDER BY users.created_at ASC
        LIMIT 1
      )
    ) AS owner_user_id
  FROM public.organizations organizations
)
UPDATE public.organizations organizations
SET
  created_by = owner_candidates.owner_user_id,
  updated_at = timezone('utc', now())
FROM owner_candidates
WHERE organizations.id = owner_candidates.organization_id
  AND owner_candidates.owner_user_id IS NOT NULL
  AND organizations.created_by IS DISTINCT FROM owner_candidates.owner_user_id;

WITH role_seed(name, description) AS (
  VALUES
    ('owner', 'Full access to organization administration, membership, and billing controls.'),
    ('admin', 'Full access to organization administration, incidents, and security settings.'),
    ('compliance_officer', 'Manages compliance workflows, reports, and policy documents.'),
    ('staff', 'Completes assigned training and participates in compliance tasks.'),
    ('auditor', 'Read-only access to reports and audit evidence.')
)
INSERT INTO public.roles (organization_id, name, description)
SELECT organizations.id, role_seed.name, role_seed.description
FROM public.organizations organizations
CROSS JOIN role_seed
ON CONFLICT (organization_id, name) DO UPDATE
SET
  description = EXCLUDED.description,
  updated_at = timezone('utc', now());

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
FROM public.organizations organizations
CROSS JOIN permission_seed
ON CONFLICT (organization_id, name) DO UPDATE
SET
  description = EXCLUDED.description,
  updated_at = timezone('utc', now());

WITH role_permission_seed(role_name, permission_name) AS (
  VALUES
    ('owner', 'manage_users'),
    ('owner', 'view_reports'),
    ('owner', 'manage_assessments'),
    ('owner', 'view_incidents'),
    ('owner', 'manage_incidents'),
    ('owner', 'upload_documents'),
    ('owner', 'view_audit_logs'),
    ('owner', 'configure_security_settings'),
    ('owner', 'complete_training'),
    ('owner', 'participate_assessments'),
    ('owner', 'view_assigned_tasks'),
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
    ('staff', 'complete_training'),
    ('staff', 'participate_assessments'),
    ('staff', 'view_assigned_tasks'),
    ('auditor', 'view_reports'),
    ('auditor', 'view_audit_logs')
)
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT
  roles.organization_id,
  roles.id,
  permissions.id
FROM role_permission_seed
JOIN public.roles roles
  ON roles.name = role_permission_seed.role_name
JOIN public.permissions permissions
  ON permissions.organization_id = roles.organization_id
 AND permissions.name = role_permission_seed.permission_name
ON CONFLICT (organization_id, role_id, permission_id) DO UPDATE
SET updated_at = timezone('utc', now());

UPDATE public.users
SET
  role = CASE WHEN role = 'employee' THEN 'staff' ELSE role END,
  updated_at = timezone('utc', now())
WHERE role = 'employee';

UPDATE public.organization_members
SET
  role = CASE WHEN role = 'employee' THEN 'staff' ELSE role END,
  updated_at = timezone('utc', now())
WHERE role = 'employee';

WITH missing_memberships AS (
  SELECT
    users.organization_id,
    users.id AS user_id,
    CASE
      WHEN users.id = organizations.created_by THEN 'owner'
      WHEN users.role IS NULL OR users.role = 'employee' THEN 'staff'
      ELSE users.role
    END AS role_name,
    organizations.created_by AS invited_by
  FROM public.users users
  JOIN public.organizations organizations
    ON organizations.id = users.organization_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.organization_members members
    WHERE members.organization_id = users.organization_id
      AND members.user_id = users.id
  )
), resolved_missing_memberships AS (
  SELECT
    missing_memberships.organization_id,
    missing_memberships.user_id,
    missing_memberships.role_name,
    roles.id AS role_id,
    missing_memberships.invited_by
  FROM missing_memberships
  JOIN public.roles roles
    ON roles.organization_id = missing_memberships.organization_id
   AND roles.name = missing_memberships.role_name
)
INSERT INTO public.organization_members (organization_id, user_id, role, role_id, invited_by)
SELECT
  resolved_missing_memberships.organization_id,
  resolved_missing_memberships.user_id,
  resolved_missing_memberships.role_name,
  resolved_missing_memberships.role_id,
  resolved_missing_memberships.invited_by
FROM resolved_missing_memberships
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
    WHEN members.role IS NULL OR members.role = 'employee' THEN COALESCE(
      NULLIF(
        (
          SELECT users.role
          FROM public.users users
          WHERE users.organization_id = members.organization_id
            AND users.id = members.user_id
          LIMIT 1
        ),
        'employee'
      ),
      'staff'
    )
    ELSE members.role
  END,
  invited_by = COALESCE(members.invited_by, organizations.created_by),
  updated_at = timezone('utc', now())
FROM public.organizations organizations
WHERE organizations.id = members.organization_id
  AND (
    members.user_id = organizations.created_by
    OR members.role IS NULL
    OR members.role = 'employee'
    OR members.invited_by IS NULL
  );

UPDATE public.organization_members members
SET
  role_id = roles.id,
  updated_at = timezone('utc', now())
FROM public.roles roles
WHERE roles.organization_id = members.organization_id
  AND roles.name = members.role
  AND members.role_id IS DISTINCT FROM roles.id;

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

UPDATE public.users users
SET
  role = members.role,
  updated_at = timezone('utc', now())
FROM public.organization_members members
WHERE members.organization_id = users.organization_id
  AND members.user_id = users.id
  AND users.role IS DISTINCT FROM members.role;

INSERT INTO public.user_roles (organization_id, user_id, role_id)
SELECT
  members.organization_id,
  members.user_id,
  members.role_id
FROM public.organization_members members
ON CONFLICT (organization_id, user_id) DO UPDATE
SET
  role_id = EXCLUDED.role_id,
  updated_at = timezone('utc', now());

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
   AND roles.organization_id = public.organization_members.organization_id
  WHERE public.organization_members.user_id = auth.uid()
    AND public.organization_members.organization_id = public.current_user_organization_id()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_app_role() TO authenticated;

COMMIT;
