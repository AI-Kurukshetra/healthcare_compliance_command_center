-- UP
BEGIN;

WITH auth_bootstrap AS (
  SELECT
    auth_users.id AS user_id,
    auth_users.email,
    CASE
      WHEN COALESCE(auth_users.raw_user_meta_data ->> 'organization_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (auth_users.raw_user_meta_data ->> 'organization_id')::uuid
      ELSE auth_users.id
    END AS organization_id,
    COALESCE(
      NULLIF(auth_users.raw_user_meta_data ->> 'organization_name', ''),
      COALESCE(NULLIF(split_part(auth_users.email, '@', 1), ''), 'Default Organization') || ' Workspace'
    ) AS organization_name,
    CASE
      WHEN auth_users.raw_user_meta_data ->> 'role' IN ('owner', 'admin', 'compliance_officer', 'staff', 'auditor')
        THEN auth_users.raw_user_meta_data ->> 'role'
      ELSE 'owner'
    END AS role_name,
    NULLIF(split_part(COALESCE(auth_users.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '') AS first_name,
    NULLIF(
      btrim(
        substring(
          COALESCE(auth_users.raw_user_meta_data ->> 'full_name', '')
          FROM length(split_part(COALESCE(auth_users.raw_user_meta_data ->> 'full_name', ''), ' ', 1)) + 1
        )
      ),
      ''
    ) AS last_name
  FROM auth.users auth_users
  WHERE auth_users.email IS NOT NULL
),
missing_public_users AS (
  SELECT auth_bootstrap.*
  FROM auth_bootstrap
  LEFT JOIN public.users users
    ON users.id = auth_bootstrap.user_id
  WHERE users.id IS NULL
)
INSERT INTO public.organizations (id, organization_id, name, plan, created_by)
SELECT
  missing_public_users.organization_id,
  missing_public_users.organization_id,
  missing_public_users.organization_name,
  'starter',
  missing_public_users.user_id
FROM missing_public_users
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  name = COALESCE(public.organizations.name, EXCLUDED.name),
  created_by = COALESCE(public.organizations.created_by, EXCLUDED.created_by),
  updated_at = timezone('utc', now());

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
WHERE EXISTS (
  SELECT 1
  FROM public.users users
  WHERE users.organization_id = organizations.id
)
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
WHERE EXISTS (
  SELECT 1
  FROM public.users users
  WHERE users.organization_id = organizations.id
)
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

WITH auth_bootstrap AS (
  SELECT
    auth_users.id AS user_id,
    auth_users.email,
    CASE
      WHEN COALESCE(auth_users.raw_user_meta_data ->> 'organization_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (auth_users.raw_user_meta_data ->> 'organization_id')::uuid
      ELSE auth_users.id
    END AS organization_id,
    CASE
      WHEN auth_users.raw_user_meta_data ->> 'role' IN ('owner', 'admin', 'compliance_officer', 'staff', 'auditor')
        THEN auth_users.raw_user_meta_data ->> 'role'
      ELSE 'owner'
    END AS role_name,
    NULLIF(split_part(COALESCE(auth_users.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '') AS first_name,
    NULLIF(
      btrim(
        substring(
          COALESCE(auth_users.raw_user_meta_data ->> 'full_name', '')
          FROM length(split_part(COALESCE(auth_users.raw_user_meta_data ->> 'full_name', ''), ' ', 1)) + 1
        )
      ),
      ''
    ) AS last_name
  FROM auth.users auth_users
  WHERE auth_users.email IS NOT NULL
),
missing_public_users AS (
  SELECT auth_bootstrap.*
  FROM auth_bootstrap
  LEFT JOIN public.users users
    ON users.id = auth_bootstrap.user_id
  WHERE users.id IS NULL
)
INSERT INTO public.users (id, organization_id, email, first_name, last_name, role)
SELECT
  missing_public_users.user_id,
  missing_public_users.organization_id,
  missing_public_users.email,
  missing_public_users.first_name,
  missing_public_users.last_name,
  missing_public_users.role_name
FROM missing_public_users
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  email = EXCLUDED.email,
  first_name = COALESCE(public.users.first_name, EXCLUDED.first_name),
  last_name = COALESCE(public.users.last_name, EXCLUDED.last_name),
  role = EXCLUDED.role,
  updated_at = timezone('utc', now());

WITH membership_candidates AS (
  SELECT
    users.organization_id,
    users.id AS user_id,
    CASE
      WHEN organizations.created_by = users.id THEN 'owner'
      WHEN users.role IN ('owner', 'admin', 'compliance_officer', 'staff', 'auditor') THEN users.role
      ELSE 'staff'
    END AS role_name,
    organizations.created_by AS invited_by
  FROM public.users users
  JOIN public.organizations organizations
    ON organizations.id = users.organization_id
)
INSERT INTO public.organization_members (organization_id, user_id, role, role_id, invited_by)
SELECT
  membership_candidates.organization_id,
  membership_candidates.user_id,
  membership_candidates.role_name,
  roles.id,
  membership_candidates.invited_by
FROM membership_candidates
JOIN public.roles roles
  ON roles.organization_id = membership_candidates.organization_id
 AND roles.name = membership_candidates.role_name
ON CONFLICT (organization_id, user_id) DO UPDATE
SET
  role = EXCLUDED.role,
  role_id = EXCLUDED.role_id,
  invited_by = COALESCE(public.organization_members.invited_by, EXCLUDED.invited_by),
  updated_at = timezone('utc', now());

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

COMMIT;

-- DOWN
BEGIN;

-- This data repair is intentionally not reversed automatically.

COMMIT;
