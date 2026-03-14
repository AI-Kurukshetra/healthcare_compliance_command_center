-- UP
BEGIN;

CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('draft', 'in_progress', 'completed')),
  score integer CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS assessments_organization_id_idx
  ON public.assessments(organization_id);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessments'
      AND policyname = 'assessments_select_same_org'
  ) THEN
    CREATE POLICY assessments_select_same_org
      ON public.assessments
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessments'
      AND policyname = 'assessments_manage_same_org'
  ) THEN
    CREATE POLICY assessments_manage_same_org
      ON public.assessments
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

CREATE TABLE IF NOT EXISTS public.assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  framework text NOT NULL DEFAULT 'hipaa',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  description text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_score integer NOT NULL CHECK (max_score > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (organization_id, slug, version)
);

CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.assessment_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('completed')),
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.assessment_templates(id) ON DELETE CASCADE,
  response_id uuid NOT NULL UNIQUE REFERENCES public.assessment_responses(id) ON DELETE CASCADE,
  assessment_id uuid UNIQUE REFERENCES public.assessments(id) ON DELETE SET NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  compliant_count integer NOT NULL DEFAULT 0 CHECK (compliant_count >= 0),
  partial_count integer NOT NULL DEFAULT 0 CHECK (partial_count >= 0),
  non_compliant_count integer NOT NULL DEFAULT 0 CHECK (non_compliant_count >= 0),
  summary text NOT NULL,
  gap_analysis jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  domain_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS assessment_templates_organization_id_idx
  ON public.assessment_templates(organization_id);

CREATE INDEX IF NOT EXISTS assessment_templates_active_idx
  ON public.assessment_templates(organization_id, is_active, slug);

CREATE INDEX IF NOT EXISTS assessment_responses_organization_id_idx
  ON public.assessment_responses(organization_id);

CREATE INDEX IF NOT EXISTS assessment_responses_template_id_idx
  ON public.assessment_responses(template_id);

CREATE INDEX IF NOT EXISTS assessment_responses_user_id_idx
  ON public.assessment_responses(user_id);

CREATE INDEX IF NOT EXISTS assessment_results_organization_id_idx
  ON public.assessment_results(organization_id);

CREATE INDEX IF NOT EXISTS assessment_results_template_id_idx
  ON public.assessment_results(template_id);

ALTER TABLE public.assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessment_templates'
      AND policyname = 'assessment_templates_select_same_org'
  ) THEN
    CREATE POLICY assessment_templates_select_same_org
      ON public.assessment_templates
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessment_templates'
      AND policyname = 'assessment_templates_manage_same_org'
  ) THEN
    CREATE POLICY assessment_templates_manage_same_org
      ON public.assessment_templates
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
      AND tablename = 'assessment_responses'
      AND policyname = 'assessment_responses_select_same_org'
  ) THEN
    CREATE POLICY assessment_responses_select_same_org
      ON public.assessment_responses
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessment_responses'
      AND policyname = 'assessment_responses_manage_same_org'
  ) THEN
    CREATE POLICY assessment_responses_manage_same_org
      ON public.assessment_responses
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
      AND tablename = 'assessment_results'
      AND policyname = 'assessment_results_select_same_org'
  ) THEN
    CREATE POLICY assessment_results_select_same_org
      ON public.assessment_results
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessment_results'
      AND policyname = 'assessment_results_manage_same_org'
  ) THEN
    CREATE POLICY assessment_results_manage_same_org
      ON public.assessment_results
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
END $$;

WITH target_organizations AS (
  SELECT organizations.id AS organization_id
  FROM public.organizations organizations
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.assessment_templates templates
    WHERE templates.organization_id = organizations.id
      AND templates.slug = 'hipaa-security-rule-baseline'
      AND templates.version = 1
  )
)
INSERT INTO public.assessment_templates (
  organization_id,
  slug,
  title,
  framework,
  version,
  description,
  questions,
  max_score,
  is_active
)
SELECT
  target_organizations.organization_id,
  'hipaa-security-rule-baseline',
  'HIPAA Security Rule Baseline Assessment',
  'hipaa',
  1,
  'Baseline administrative, physical, and technical safeguard review for healthcare organizations.',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'security-risk-analysis',
      'domain', 'administrative',
      'prompt', 'Has the organization completed and documented a current security risk analysis?',
      'guidance', 'Review the annual risk analysis artifact, scope, and remediation backlog.',
      'weight', 5,
      'recommendation_title', 'Establish a formal security risk analysis cadence',
      'recommendation_body', 'Complete a documented enterprise risk analysis and refresh it at least annually or after major system changes.'
    ),
    jsonb_build_object(
      'id', 'workforce-training',
      'domain', 'administrative',
      'prompt', 'Do workforce members complete HIPAA privacy and security training on a recurring basis?',
      'guidance', 'Verify onboarding training, annual refreshers, and completion evidence.',
      'weight', 4,
      'recommendation_title', 'Strengthen workforce training coverage',
      'recommendation_body', 'Assign recurring HIPAA security training, track completions, and remediate missed or overdue courses.'
    ),
    jsonb_build_object(
      'id', 'access-management',
      'domain', 'technical',
      'prompt', 'Are access requests, changes, and removals approved and logged through a defined process?',
      'guidance', 'Inspect joiner, mover, and leaver controls for systems handling ePHI.',
      'weight', 5,
      'recommendation_title', 'Tighten access provisioning controls',
      'recommendation_body', 'Require documented approvals, periodic access reviews, and timely deprovisioning for all workforce accounts.'
    ),
    jsonb_build_object(
      'id', 'audit-logging',
      'domain', 'technical',
      'prompt', 'Are system audit logs enabled, retained, and reviewed for systems storing or processing ePHI?',
      'guidance', 'Confirm log coverage, retention, alerting, and documented review procedures.',
      'weight', 5,
      'recommendation_title', 'Expand audit logging and review',
      'recommendation_body', 'Enable detailed audit trails, retain logs for the required period, and define a recurring review workflow.'
    ),
    jsonb_build_object(
      'id', 'encryption-controls',
      'domain', 'technical',
      'prompt', 'Is ePHI encrypted in transit and at rest across critical systems and backups?',
      'guidance', 'Validate transport encryption, storage encryption, and backup handling.',
      'weight', 4,
      'recommendation_title', 'Close encryption gaps',
      'recommendation_body', 'Apply encryption for databases, storage, backups, and data transfers where ePHI is present.'
    ),
    jsonb_build_object(
      'id', 'facility-access',
      'domain', 'physical',
      'prompt', 'Are facility access, workstation placement, and device protections enforced for areas handling ePHI?',
      'guidance', 'Check badge access, screen protections, clean desk controls, and device security.',
      'weight', 3,
      'recommendation_title', 'Improve physical safeguards',
      'recommendation_body', 'Restrict physical access to sensitive areas and document workstation and device protection requirements.'
    ),
    jsonb_build_object(
      'id', 'incident-response',
      'domain', 'administrative',
      'prompt', 'Does the organization maintain a tested incident response and breach notification process?',
      'guidance', 'Review the incident playbook, notification timelines, and tabletop exercise evidence.',
      'weight', 4,
      'recommendation_title', 'Formalize incident response readiness',
      'recommendation_body', 'Maintain a documented breach response plan and test it with periodic exercises.'
    ),
    jsonb_build_object(
      'id', 'vendor-management',
      'domain', 'administrative',
      'prompt', 'Are business associates risk assessed and covered by current Business Associate Agreements?',
      'guidance', 'Inspect vendor inventories, BAAs, and vendor review records.',
      'weight', 3,
      'recommendation_title', 'Reinforce business associate oversight',
      'recommendation_body', 'Maintain current BAAs, assess vendor risk, and document remediation expectations for high-risk vendors.'
    )
  ),
  33,
  true
FROM target_organizations;

COMMIT;

-- DOWN
BEGIN;

DROP POLICY IF EXISTS assessment_results_manage_same_org ON public.assessment_results;
DROP POLICY IF EXISTS assessment_results_select_same_org ON public.assessment_results;
DROP POLICY IF EXISTS assessment_responses_manage_same_org ON public.assessment_responses;
DROP POLICY IF EXISTS assessment_responses_select_same_org ON public.assessment_responses;
DROP POLICY IF EXISTS assessment_templates_manage_same_org ON public.assessment_templates;
DROP POLICY IF EXISTS assessment_templates_select_same_org ON public.assessment_templates;

DROP TABLE IF EXISTS public.assessment_results;
DROP TABLE IF EXISTS public.assessment_responses;
DROP TABLE IF EXISTS public.assessment_templates;

COMMIT;
