-- UP
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.policy_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  framework text NOT NULL,
  description text NOT NULL,
  summary text NOT NULL,
  content text NOT NULL,
  recommended_review_days integer NOT NULL DEFAULT 365 CHECK (recommended_review_days > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.organization_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.policy_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
  owner_name text NOT NULL,
  approver_name text,
  review_frequency_days integer NOT NULL DEFAULT 365 CHECK (review_frequency_days > 0),
  effective_date date,
  version text NOT NULL DEFAULT '1.0',
  summary text NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.policy_templates
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS framework text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS recommended_review_days integer,
  ADD COLUMN IF NOT EXISTS is_active boolean,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.organization_policies
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS approver_name text,
  ADD COLUMN IF NOT EXISTS review_frequency_days integer,
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS version text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.policy_templates
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN framework SET NOT NULL,
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN summary SET NOT NULL,
  ALTER COLUMN content SET NOT NULL,
  ALTER COLUMN recommended_review_days SET DEFAULT 365,
  ALTER COLUMN recommended_review_days SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.organization_policies
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN owner_name SET NOT NULL,
  ALTER COLUMN review_frequency_days SET DEFAULT 365,
  ALTER COLUMN review_frequency_days SET NOT NULL,
  ALTER COLUMN version SET DEFAULT '1.0',
  ALTER COLUMN version SET NOT NULL,
  ALTER COLUMN summary SET NOT NULL,
  ALTER COLUMN content SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'policy_templates_organization_id_fkey'
      AND conrelid = 'public.policy_templates'::regclass
  ) THEN
    ALTER TABLE public.policy_templates
      ADD CONSTRAINT policy_templates_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_policies_organization_id_fkey'
      AND conrelid = 'public.organization_policies'::regclass
  ) THEN
    ALTER TABLE public.organization_policies
      ADD CONSTRAINT organization_policies_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_policies_template_id_fkey'
      AND conrelid = 'public.organization_policies'::regclass
  ) THEN
    ALTER TABLE public.organization_policies
      ADD CONSTRAINT organization_policies_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES public.policy_templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_policies_created_by_fkey'
      AND conrelid = 'public.organization_policies'::regclass
  ) THEN
    ALTER TABLE public.organization_policies
      ADD CONSTRAINT organization_policies_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_policies_updated_by_fkey'
      AND conrelid = 'public.organization_policies'::regclass
  ) THEN
    ALTER TABLE public.organization_policies
      ADD CONSTRAINT organization_policies_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'policy_templates_recommended_review_days_check'
      AND conrelid = 'public.policy_templates'::regclass
  ) THEN
    ALTER TABLE public.policy_templates
      ADD CONSTRAINT policy_templates_recommended_review_days_check
      CHECK (recommended_review_days > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_policies_review_frequency_days_check'
      AND conrelid = 'public.organization_policies'::regclass
  ) THEN
    ALTER TABLE public.organization_policies
      ADD CONSTRAINT organization_policies_review_frequency_days_check
      CHECK (review_frequency_days > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_policies_status_check'
      AND conrelid = 'public.organization_policies'::regclass
  ) THEN
    ALTER TABLE public.organization_policies
      ADD CONSTRAINT organization_policies_status_check
      CHECK (status IN ('draft', 'active', 'archived'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS policy_templates_global_slug_key
  ON public.policy_templates(slug)
  WHERE organization_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS policy_templates_organization_slug_key
  ON public.policy_templates(organization_id, slug)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS policy_templates_organization_id_idx
  ON public.policy_templates(organization_id);

CREATE INDEX IF NOT EXISTS policy_templates_category_idx
  ON public.policy_templates(category);

CREATE UNIQUE INDEX IF NOT EXISTS organization_policies_organization_slug_key
  ON public.organization_policies(organization_id, slug);

CREATE INDEX IF NOT EXISTS organization_policies_organization_id_idx
  ON public.organization_policies(organization_id);

CREATE INDEX IF NOT EXISTS organization_policies_template_id_idx
  ON public.organization_policies(template_id);

CREATE INDEX IF NOT EXISTS organization_policies_status_idx
  ON public.organization_policies(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_policies TO authenticated;

ALTER TABLE public.policy_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_policies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'policy_templates'
      AND policyname = 'policy_templates_select_same_org_or_shared'
  ) THEN
    CREATE POLICY policy_templates_select_same_org_or_shared
      ON public.policy_templates
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
      AND tablename = 'policy_templates'
      AND policyname = 'policy_templates_manage_same_org'
  ) THEN
    CREATE POLICY policy_templates_manage_same_org
      ON public.policy_templates
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
      AND tablename = 'organization_policies'
      AND policyname = 'organization_policies_select_same_org'
  ) THEN
    CREATE POLICY organization_policies_select_same_org
      ON public.organization_policies
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_policies'
      AND policyname = 'organization_policies_manage_same_org'
  ) THEN
    CREATE POLICY organization_policies_manage_same_org
      ON public.organization_policies
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

INSERT INTO public.policy_templates (
  id,
  organization_id,
  slug,
  title,
  category,
  framework,
  description,
  summary,
  content,
  recommended_review_days,
  is_active
)
SELECT
  '46fd90ae-fe22-47ce-a6bb-a54dca78e4b1'::uuid,
  NULL,
  'hipaa-privacy-policy',
  'HIPAA Privacy Policy',
  'Privacy',
  'HIPAA',
  'Baseline privacy safeguards for workforce access, minimum necessary handling, and patient rights.',
  'Defines how the organization limits, uses, and discloses protected health information in daily operations.',
  E'# Purpose\nEstablish the organization''s baseline approach for handling protected health information in accordance with HIPAA privacy requirements.\n\n# Scope\nThis policy applies to all workforce members, contractors, and business associates who access or process protected health information on behalf of the organization.\n\n# Core Controls\n1. Access protected health information only when required for assigned duties.\n2. Apply the minimum necessary standard to every use and disclosure.\n3. Verify identity before releasing information externally.\n4. Escalate privacy complaints or suspected violations to the compliance officer within one business day.\n\n# Workforce Expectations\nComplete privacy training at onboarding and annually thereafter. Report any inappropriate disclosure, snooping, or unsecured transmission immediately.\n\n# Review Cadence\nReview this policy at least annually and after any material regulatory, operational, or security change.',
  365,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.policy_templates
  WHERE id = '46fd90ae-fe22-47ce-a6bb-a54dca78e4b1'::uuid
);

INSERT INTO public.policy_templates (
  id,
  organization_id,
  slug,
  title,
  category,
  framework,
  description,
  summary,
  content,
  recommended_review_days,
  is_active
)
SELECT
  '7de25889-b205-43f4-b346-a86c25f3f9e2'::uuid,
  NULL,
  'incident-response-policy',
  'Incident Response Policy',
  'Security',
  'HIPAA / HITECH',
  'Coordinated response expectations for security events, investigation, containment, and breach escalation.',
  'Defines how the organization triages, escalates, documents, and closes security incidents affecting regulated systems or data.',
  E'# Purpose\nDefine a repeatable incident response process for security events that affect confidential systems, regulated data, or core clinical operations.\n\n# Scope\nThis policy applies to workforce members, managed service providers, and third-party operators supporting the organization''s technology environment.\n\n# Response Stages\n1. Identify and log the event.\n2. Contain the affected systems and preserve evidence.\n3. Assess impact on confidentiality, integrity, and availability.\n4. Notify leadership and the compliance officer when regulated data may be involved.\n5. Track remediation and closure actions to completion.\n\n# Documentation\nEvery incident must record timeline, systems affected, suspected root cause, containment actions, and final remediation outcome.\n\n# Escalation\nPotential breach events must be escalated immediately for legal, privacy, and notification review.',
  180,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.policy_templates
  WHERE id = '7de25889-b205-43f4-b346-a86c25f3f9e2'::uuid
);

INSERT INTO public.policy_templates (
  id,
  organization_id,
  slug,
  title,
  category,
  framework,
  description,
  summary,
  content,
  recommended_review_days,
  is_active
)
SELECT
  '6db1d892-e9a5-4cbf-a65d-64b00550c2d7'::uuid,
  NULL,
  'data-retention-policy',
  'Data Retention Policy',
  'Records Management',
  'HIPAA',
  'Retention and disposal guidance for compliance artifacts, system logs, and supporting operational records.',
  'Defines how long regulated records are retained, who approves disposal, and how secure destruction is documented.',
  E'# Purpose\nEstablish retention and secure disposal standards for compliance records, audit evidence, and operational documentation.\n\n# Scope\nThis policy applies to digital and physical records managed by the organization, including audit trails, incident records, training attestations, and supporting documentation.\n\n# Retention Standards\n1. Retain audit logs for a minimum of six years.\n2. Preserve incident documentation according to legal, regulatory, and contractual obligations.\n3. Retain policy acknowledgements and training evidence for the applicable compliance window.\n\n# Disposal Controls\nDispose of records only after the retention period expires and any legal hold is cleared. Disposal must use secure destruction methods appropriate to the medium.\n\n# Accountability\nThe designated policy owner approves retention exceptions and coordinates with legal or compliance leadership on extended preservation requirements.',
  365,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.policy_templates
  WHERE id = '6db1d892-e9a5-4cbf-a65d-64b00550c2d7'::uuid
);

NOTIFY pgrst, 'reload schema';

COMMIT;

-- DOWN
BEGIN;

-- Intentionally non-destructive: this repair migration may have recreated missing production tables.
NOTIFY pgrst, 'reload schema';

COMMIT;
