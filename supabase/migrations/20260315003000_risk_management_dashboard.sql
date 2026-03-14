-- UP
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.seed_demo_uuid(seed_input text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    substr(md5(seed_input), 1, 8) || '-' ||
    substr(md5(seed_input), 9, 4) || '-' ||
    substr(md5(seed_input), 13, 4) || '-' ||
    substr(md5(seed_input), 17, 4) || '-' ||
    substr(md5(seed_input), 21, 12)
  )::uuid;
$$;

CREATE TABLE IF NOT EXISTS public.risk_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL CHECK (key IN ('low', 'medium', 'high', 'critical')),
  label text NOT NULL,
  description text NOT NULL,
  weight integer NOT NULL CHECK (weight > 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.risk_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL CHECK (key IN ('identified', 'monitoring', 'mitigating', 'escalated', 'resolved')),
  label text NOT NULL,
  description text NOT NULL,
  sort_order integer NOT NULL CHECK (sort_order > 0),
  is_threat boolean NOT NULL DEFAULT false,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.risk_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  level_id uuid NOT NULL REFERENCES public.risk_levels(id) ON DELETE RESTRICT,
  status_id uuid NOT NULL REFERENCES public.risk_status(id) ON DELETE RESTRICT,
  owner_name text,
  source text NOT NULL DEFAULT 'internal_assessment',
  identified_on date NOT NULL DEFAULT CURRENT_DATE,
  target_resolution_date date,
  last_reviewed_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS risk_levels_global_key
  ON public.risk_levels(key)
  WHERE organization_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS risk_levels_org_key
  ON public.risk_levels(organization_id, key)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS risk_status_global_key
  ON public.risk_status(key)
  WHERE organization_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS risk_status_org_key
  ON public.risk_status(organization_id, key)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS risk_items_organization_id_idx
  ON public.risk_items(organization_id);

CREATE INDEX IF NOT EXISTS risk_items_level_id_idx
  ON public.risk_items(level_id);

CREATE INDEX IF NOT EXISTS risk_items_status_id_idx
  ON public.risk_items(status_id);

CREATE INDEX IF NOT EXISTS risk_items_resolution_date_idx
  ON public.risk_items(target_resolution_date);

ALTER TABLE public.risk_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risk_levels'
      AND policyname = 'risk_levels_select_same_org_or_shared'
  ) THEN
    CREATE POLICY risk_levels_select_same_org_or_shared
      ON public.risk_levels
      FOR SELECT
      USING (
        organization_id IS NULL
        OR organization_id = public.current_user_organization_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risk_levels'
      AND policyname = 'risk_levels_manage_same_org'
  ) THEN
    CREATE POLICY risk_levels_manage_same_org
      ON public.risk_levels
      FOR ALL
      USING (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin', 'compliance_officer')
      )
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin', 'compliance_officer')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risk_status'
      AND policyname = 'risk_status_select_same_org_or_shared'
  ) THEN
    CREATE POLICY risk_status_select_same_org_or_shared
      ON public.risk_status
      FOR SELECT
      USING (
        organization_id IS NULL
        OR organization_id = public.current_user_organization_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risk_status'
      AND policyname = 'risk_status_manage_same_org'
  ) THEN
    CREATE POLICY risk_status_manage_same_org
      ON public.risk_status
      FOR ALL
      USING (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin', 'compliance_officer')
      )
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin', 'compliance_officer')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risk_items'
      AND policyname = 'risk_items_select_same_org'
  ) THEN
    CREATE POLICY risk_items_select_same_org
      ON public.risk_items
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risk_items'
      AND policyname = 'risk_items_manage_same_org'
  ) THEN
    CREATE POLICY risk_items_manage_same_org
      ON public.risk_items
      FOR ALL
      USING (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin', 'compliance_officer')
      )
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND public.current_user_app_role() IN ('owner', 'admin', 'compliance_officer')
      );
  END IF;
END
$$;

INSERT INTO public.risk_levels (id, organization_id, key, label, description, weight)
SELECT
  '0bfb4d84-d580-4b13-83c7-6a41063f9ab1'::uuid,
  NULL,
  'low',
  'Low',
  'Minor compliance exposure with limited operational impact.',
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM public.risk_levels
  WHERE id = '0bfb4d84-d580-4b13-83c7-6a41063f9ab1'::uuid
);

INSERT INTO public.risk_levels (id, organization_id, key, label, description, weight)
SELECT
  '5b9cc267-203e-4522-b0c3-716f021fbf3a'::uuid,
  NULL,
  'medium',
  'Medium',
  'Noticeable control weakness that should be planned into remediation work.',
  2
WHERE NOT EXISTS (
  SELECT 1
  FROM public.risk_levels
  WHERE id = '5b9cc267-203e-4522-b0c3-716f021fbf3a'::uuid
);

INSERT INTO public.risk_levels (id, organization_id, key, label, description, weight)
SELECT
  'b6d4d8b4-8abf-4651-9bb3-98b9d8ab2b75'::uuid,
  NULL,
  'high',
  'High',
  'Material compliance risk needing accelerated remediation and tracking.',
  3
WHERE NOT EXISTS (
  SELECT 1
  FROM public.risk_levels
  WHERE id = 'b6d4d8b4-8abf-4651-9bb3-98b9d8ab2b75'::uuid
);

INSERT INTO public.risk_levels (id, organization_id, key, label, description, weight)
SELECT
  'd4ca1f4d-1fa6-49ad-a9ba-b4d7d7ef703f'::uuid,
  NULL,
  'critical',
  'Critical',
  'Severe exposure with immediate escalation and executive visibility.',
  4
WHERE NOT EXISTS (
  SELECT 1
  FROM public.risk_levels
  WHERE id = 'd4ca1f4d-1fa6-49ad-a9ba-b4d7d7ef703f'::uuid
);

INSERT INTO public.risk_status (id, organization_id, key, label, description, sort_order, is_threat, is_closed)
SELECT
  '10d4f499-f5ef-4db1-906d-60df857b9c53'::uuid,
  NULL,
  'identified',
  'Identified',
  'Logged and awaiting triage or assignment.',
  1,
  false,
  false
WHERE NOT EXISTS (
  SELECT 1
  FROM public.risk_status
  WHERE id = '10d4f499-f5ef-4db1-906d-60df857b9c53'::uuid
);

INSERT INTO public.risk_status (id, organization_id, key, label, description, sort_order, is_threat, is_closed)
SELECT
  '51f073c9-1bf8-4b61-9fb4-b50f07b99c1b'::uuid,
  NULL,
  'monitoring',
  'Monitoring',
  'Observed for active threat indicators or control drift.',
  2,
  true,
  false
WHERE NOT EXISTS (
  SELECT 1
  FROM public.risk_status
  WHERE id = '51f073c9-1bf8-4b61-9fb4-b50f07b99c1b'::uuid
);

INSERT INTO public.risk_status (id, organization_id, key, label, description, sort_order, is_threat, is_closed)
SELECT
  'a6aa6be2-fb29-4751-88ab-861cceca68ce'::uuid,
  NULL,
  'mitigating',
  'Mitigating',
  'Assigned remediation is in progress and being tracked.',
  3,
  false,
  false
WHERE NOT EXISTS (
  SELECT 1
  FROM public.risk_status
  WHERE id = 'a6aa6be2-fb29-4751-88ab-861cceca68ce'::uuid
);

INSERT INTO public.risk_status (id, organization_id, key, label, description, sort_order, is_threat, is_closed)
SELECT
  '44cf32fa-48e3-48ff-a2de-270f68d77adf'::uuid,
  NULL,
  'escalated',
  'Escalated',
  'Leadership review is required due to elevated or active threat conditions.',
  4,
  true,
  false
WHERE NOT EXISTS (
  SELECT 1
  FROM public.risk_status
  WHERE id = '44cf32fa-48e3-48ff-a2de-270f68d77adf'::uuid
);

INSERT INTO public.risk_status (id, organization_id, key, label, description, sort_order, is_threat, is_closed)
SELECT
  '49c8f8ff-5ccf-48a3-a77d-2e46562ac474'::uuid,
  NULL,
  'resolved',
  'Resolved',
  'Risk has been remediated or accepted and formally closed.',
  5,
  false,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.risk_status
  WHERE id = '49c8f8ff-5ccf-48a3-a77d-2e46562ac474'::uuid
);

WITH target_organizations AS (
  SELECT organizations.id AS organization_id
  FROM public.organizations organizations
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.risk_items risk_items
    WHERE risk_items.organization_id = organizations.id
  )
)
INSERT INTO public.risk_items (
  id,
  organization_id,
  title,
  description,
  level_id,
  status_id,
  owner_name,
  source,
  identified_on,
  target_resolution_date,
  last_reviewed_at
)
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':risk-item:backup-evidence'),
  target_organizations.organization_id,
  'Backup restoration evidence gap',
  'Disaster recovery restore exercises for production systems are missing documented evidence for the last two quarters.',
  'd4ca1f4d-1fa6-49ad-a9ba-b4d7d7ef703f'::uuid,
  '44cf32fa-48e3-48ff-a2de-270f68d77adf'::uuid,
  'Compliance Program Lead',
  'audit_review',
  CURRENT_DATE - 24,
  CURRENT_DATE + 7,
  timezone('utc', now()) - interval '1 day'
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':risk-item:mfa-coverage'),
  target_organizations.organization_id,
  'Privileged MFA coverage inconsistency',
  'A subset of privileged administrative accounts is missing enforced MFA in a legacy identity boundary.',
  'b6d4d8b4-8abf-4651-9bb3-98b9d8ab2b75'::uuid,
  '51f073c9-1bf8-4b61-9fb4-b50f07b99c1b'::uuid,
  'Identity and Access Manager',
  'security_monitoring',
  CURRENT_DATE - 16,
  CURRENT_DATE + 10,
  timezone('utc', now()) - interval '2 days'
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':risk-item:vendor-intake'),
  target_organizations.organization_id,
  'Vendor intake evidence backlog',
  'Third-party due diligence packets for several lower-tier vendors are incomplete and awaiting review.',
  '5b9cc267-203e-4522-b0c3-716f021fbf3a'::uuid,
  'a6aa6be2-fb29-4751-88ab-861cceca68ce'::uuid,
  'Vendor Risk Coordinator',
  'vendor_review',
  CURRENT_DATE - 11,
  CURRENT_DATE + 21,
  timezone('utc', now()) - interval '3 days'
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':risk-item:retention-schedule'),
  target_organizations.organization_id,
  'Records retention schedule exception',
  'One departmental retention schedule has not yet been aligned with the approved master policy and disposal controls.',
  '0bfb4d84-d580-4b13-83c7-6a41063f9ab1'::uuid,
  '10d4f499-f5ef-4db1-906d-60df857b9c53'::uuid,
  'Records Administrator',
  'policy_review',
  CURRENT_DATE - 5,
  CURRENT_DATE + 30,
  timezone('utc', now()) - interval '5 hours'
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':risk-item:workstation-encryption'),
  target_organizations.organization_id,
  'Workstation encryption control restored',
  'A prior endpoint encryption drift issue was remediated and closed after validation sampling completed.',
  '5b9cc267-203e-4522-b0c3-716f021fbf3a'::uuid,
  '49c8f8ff-5ccf-48a3-a77d-2e46562ac474'::uuid,
  'Endpoint Operations',
  'endpoint_management',
  CURRENT_DATE - 41,
  CURRENT_DATE - 3,
  timezone('utc', now()) - interval '4 hours'
FROM target_organizations
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- DOWN
BEGIN;

DROP POLICY IF EXISTS risk_items_manage_same_org ON public.risk_items;
DROP POLICY IF EXISTS risk_items_select_same_org ON public.risk_items;
DROP POLICY IF EXISTS risk_status_manage_same_org ON public.risk_status;
DROP POLICY IF EXISTS risk_status_select_same_org_or_shared ON public.risk_status;
DROP POLICY IF EXISTS risk_levels_manage_same_org ON public.risk_levels;
DROP POLICY IF EXISTS risk_levels_select_same_org_or_shared ON public.risk_levels;

DROP TABLE IF EXISTS public.risk_items;
DROP TABLE IF EXISTS public.risk_status;
DROP TABLE IF EXISTS public.risk_levels;

COMMIT;
