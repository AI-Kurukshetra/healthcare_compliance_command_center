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

CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('draft', 'in_progress', 'completed')),
  score integer CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  risk_score integer CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  version text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  mandatory boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id uuid NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS assessments_organization_id_idx
  ON public.assessments(organization_id);

CREATE INDEX IF NOT EXISTS risks_organization_id_idx
  ON public.risks(organization_id);

CREATE INDEX IF NOT EXISTS incidents_organization_id_idx
  ON public.incidents(organization_id);

CREATE INDEX IF NOT EXISTS vendors_organization_id_idx
  ON public.vendors(organization_id);

CREATE INDEX IF NOT EXISTS documents_organization_id_idx
  ON public.documents(organization_id);

CREATE INDEX IF NOT EXISTS training_courses_organization_id_idx
  ON public.training_courses(organization_id);

CREATE INDEX IF NOT EXISTS questionnaires_organization_id_idx
  ON public.questionnaires(organization_id);

CREATE INDEX IF NOT EXISTS responses_organization_id_idx
  ON public.responses(organization_id);

CREATE INDEX IF NOT EXISTS responses_questionnaire_id_idx
  ON public.responses(questionnaire_id);

CREATE INDEX IF NOT EXISTS responses_user_id_idx
  ON public.responses(user_id);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

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

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risks'
      AND policyname = 'risks_select_same_org'
  ) THEN
    CREATE POLICY risks_select_same_org
      ON public.risks
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risks'
      AND policyname = 'risks_manage_same_org'
  ) THEN
    CREATE POLICY risks_manage_same_org
      ON public.risks
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
      AND tablename = 'incidents'
      AND policyname = 'incidents_select_same_org'
  ) THEN
    CREATE POLICY incidents_select_same_org
      ON public.incidents
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'incidents'
      AND policyname = 'incidents_manage_same_org'
  ) THEN
    CREATE POLICY incidents_manage_same_org
      ON public.incidents
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
      AND tablename = 'vendors'
      AND policyname = 'vendors_select_same_org'
  ) THEN
    CREATE POLICY vendors_select_same_org
      ON public.vendors
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendors'
      AND policyname = 'vendors_manage_same_org'
  ) THEN
    CREATE POLICY vendors_manage_same_org
      ON public.vendors
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
      AND tablename = 'documents'
      AND policyname = 'documents_select_same_org'
  ) THEN
    CREATE POLICY documents_select_same_org
      ON public.documents
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'documents'
      AND policyname = 'documents_manage_same_org'
  ) THEN
    CREATE POLICY documents_manage_same_org
      ON public.documents
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
      AND tablename = 'training_courses'
      AND policyname = 'training_courses_select_same_org'
  ) THEN
    CREATE POLICY training_courses_select_same_org
      ON public.training_courses
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'training_courses'
      AND policyname = 'training_courses_manage_same_org'
  ) THEN
    CREATE POLICY training_courses_manage_same_org
      ON public.training_courses
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
      AND tablename = 'questionnaires'
      AND policyname = 'questionnaires_select_same_org'
  ) THEN
    CREATE POLICY questionnaires_select_same_org
      ON public.questionnaires
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'questionnaires'
      AND policyname = 'questionnaires_manage_same_org'
  ) THEN
    CREATE POLICY questionnaires_manage_same_org
      ON public.questionnaires
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
      AND tablename = 'responses'
      AND policyname = 'responses_select_same_org'
  ) THEN
    CREATE POLICY responses_select_same_org
      ON public.responses
      FOR SELECT
      USING (organization_id = public.current_user_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'responses'
      AND policyname = 'responses_manage_same_org'
  ) THEN
    CREATE POLICY responses_manage_same_org
      ON public.responses
      FOR ALL
      USING (
        organization_id = public.current_user_organization_id()
        AND (
          public.current_user_app_role() IN ('owner', 'admin', 'compliance_officer')
          OR auth.uid() = user_id
        )
      )
      WITH CHECK (
        organization_id = public.current_user_organization_id()
        AND (
          public.current_user_app_role() IN ('owner', 'admin', 'compliance_officer')
          OR auth.uid() = user_id
        )
      );
  END IF;
END $$;

WITH target_organizations AS (
  SELECT organizations.id AS organization_id
  FROM public.organizations organizations
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.assessments assessments
    WHERE assessments.organization_id = organizations.id
  )
)
INSERT INTO public.assessments (id, organization_id, status, score)
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':assessment:completed'),
  target_organizations.organization_id,
  'completed',
  82
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':assessment:in-progress'),
  target_organizations.organization_id,
  'in_progress',
  68
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':assessment:draft'),
  target_organizations.organization_id,
  'draft',
  NULL
FROM target_organizations
ON CONFLICT (id) DO NOTHING;

WITH target_organizations AS (
  SELECT organizations.id AS organization_id
  FROM public.organizations organizations
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.risks risks
    WHERE risks.organization_id = organizations.id
  )
)
INSERT INTO public.risks (id, organization_id, severity, description)
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':risk:medium'),
  target_organizations.organization_id,
  'medium',
  '[Seed] Data classification gaps across vendor intake.'
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':risk:high'),
  target_organizations.organization_id,
  'high',
  '[Seed] Shared workstation session timeout policy is not consistently enforced.'
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':risk:critical'),
  target_organizations.organization_id,
  'critical',
  '[Seed] Backup restoration evidence is missing for a production database cluster.'
FROM target_organizations
ON CONFLICT (id) DO NOTHING;

WITH target_organizations AS (
  SELECT organizations.id AS organization_id
  FROM public.organizations organizations
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.incidents incidents
    WHERE incidents.organization_id = organizations.id
  )
)
INSERT INTO public.incidents (id, organization_id, severity, status, description)
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':incident:open'),
  target_organizations.organization_id,
  'high',
  'open',
  '[Seed] Suspicious login pattern detected on core admin account.'
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':incident:investigating'),
  target_organizations.organization_id,
  'medium',
  'investigating',
  '[Seed] Misrouted patient attachment reported from intake mailbox.'
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':incident:resolved'),
  target_organizations.organization_id,
  'low',
  'resolved',
  '[Seed] Legacy laptop encryption agent reinstalled after drift alert.'
FROM target_organizations
ON CONFLICT (id) DO NOTHING;

WITH target_organizations AS (
  SELECT organizations.id AS organization_id
  FROM public.organizations organizations
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.vendors vendors
    WHERE vendors.organization_id = organizations.id
  )
)
INSERT INTO public.vendors (id, organization_id, name, risk_score)
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':vendor:northwind'),
  target_organizations.organization_id,
  '[Seed] Northwind Health Systems',
  41
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':vendor:apex'),
  target_organizations.organization_id,
  '[Seed] Apex Claims Clearinghouse',
  63
FROM target_organizations
ON CONFLICT (id) DO NOTHING;

WITH target_organizations AS (
  SELECT organizations.id AS organization_id
  FROM public.organizations organizations
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.documents documents
    WHERE documents.organization_id = organizations.id
  )
)
INSERT INTO public.documents (id, organization_id, name, version)
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':document:policy-pack'),
  target_organizations.organization_id,
  '[Seed] HIPAA Policy Pack',
  'v1.0'
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':document:playbook'),
  target_organizations.organization_id,
  '[Seed] Incident Response Playbook',
  'v2.3'
FROM target_organizations
ON CONFLICT (id) DO NOTHING;

WITH target_organizations AS (
  SELECT organizations.id AS organization_id
  FROM public.organizations organizations
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.training_courses training_courses
    WHERE training_courses.organization_id = organizations.id
  )
)
INSERT INTO public.training_courses (id, organization_id, title, mandatory)
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':training:privacy-security'),
  target_organizations.organization_id,
  '[Seed] Privacy & Security Basics',
  true
FROM target_organizations
UNION ALL
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':training:vendor-intake'),
  target_organizations.organization_id,
  '[Seed] Secure Vendor Intake Review',
  false
FROM target_organizations
ON CONFLICT (id) DO NOTHING;

WITH target_organizations AS (
  SELECT organizations.id AS organization_id
  FROM public.organizations organizations
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.questionnaires questionnaires
    WHERE questionnaires.organization_id = organizations.id
  )
)
INSERT INTO public.questionnaires (id, organization_id, title)
SELECT
  public.seed_demo_uuid(target_organizations.organization_id::text || ':questionnaire:baseline'),
  target_organizations.organization_id,
  '[Seed] Security Baseline Survey'
FROM target_organizations
ON CONFLICT (id) DO NOTHING;

WITH response_seed AS (
  SELECT
    organizations.id AS organization_id,
    questionnaire.id AS questionnaire_id,
    users.id AS user_id
  FROM public.organizations organizations
  JOIN public.questionnaires questionnaire
    ON questionnaire.organization_id = organizations.id
   AND questionnaire.id = public.seed_demo_uuid(organizations.id::text || ':questionnaire:baseline')
  JOIN LATERAL (
    SELECT public_users.id
    FROM public.users public_users
    WHERE public_users.organization_id = organizations.id
    ORDER BY CASE WHEN public_users.id = organizations.created_by THEN 0 ELSE 1 END, public_users.created_at ASC
    LIMIT 1
  ) users ON true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.responses responses
    WHERE responses.organization_id = organizations.id
  )
)
INSERT INTO public.responses (id, questionnaire_id, user_id, organization_id)
SELECT
  public.seed_demo_uuid(response_seed.organization_id::text || ':response:baseline'),
  response_seed.questionnaire_id,
  response_seed.user_id,
  response_seed.organization_id
FROM response_seed
ON CONFLICT (id) DO NOTHING;

WITH audit_seed AS (
  SELECT
    organizations.id AS organization_id,
    users.id AS user_id
  FROM public.organizations organizations
  JOIN LATERAL (
    SELECT public_users.id
    FROM public.users public_users
    WHERE public_users.organization_id = organizations.id
    ORDER BY CASE WHEN public_users.id = organizations.created_by THEN 0 ELSE 1 END, public_users.created_at ASC
    LIMIT 1
  ) users ON true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.audit_logs audit_logs
    WHERE audit_logs.organization_id = organizations.id
  )
)
INSERT INTO public.audit_logs (id, organization_id, user_id, action, entity, entity_id, details)
SELECT
  public.seed_demo_uuid(audit_seed.organization_id::text || ':audit:seed-data'),
  audit_seed.organization_id,
  audit_seed.user_id,
  'seed_data',
  'organization',
  audit_seed.organization_id,
  '{"seed": true, "source": "backfill_migration"}'::jsonb
FROM audit_seed
UNION ALL
SELECT
  public.seed_demo_uuid(audit_seed.organization_id::text || ':audit:report-exported'),
  audit_seed.organization_id,
  audit_seed.user_id,
  'report_exported',
  'document',
  public.seed_demo_uuid(audit_seed.organization_id::text || ':document:playbook'),
  '{"seed": true, "channel": "dashboard"}'::jsonb
FROM audit_seed
UNION ALL
SELECT
  public.seed_demo_uuid(audit_seed.organization_id::text || ':audit:training-completed'),
  audit_seed.organization_id,
  audit_seed.user_id,
  'training_completed',
  'training_course',
  public.seed_demo_uuid(audit_seed.organization_id::text || ':training:privacy-security'),
  '{"seed": true, "completion_method": "backfill_migration"}'::jsonb
FROM audit_seed
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- DOWN
BEGIN;

DELETE FROM public.responses
WHERE id IN (
  SELECT public.seed_demo_uuid(organizations.id::text || ':response:baseline')
  FROM public.organizations organizations
);

DELETE FROM public.audit_logs
WHERE id IN (
  SELECT public.seed_demo_uuid(organizations.id::text || ':audit:seed-data')
  FROM public.organizations organizations
  UNION ALL
  SELECT public.seed_demo_uuid(organizations.id::text || ':audit:report-exported')
  FROM public.organizations organizations
  UNION ALL
  SELECT public.seed_demo_uuid(organizations.id::text || ':audit:training-completed')
  FROM public.organizations organizations
);

DELETE FROM public.questionnaires
WHERE id IN (
  SELECT public.seed_demo_uuid(organizations.id::text || ':questionnaire:baseline')
  FROM public.organizations organizations
);

DELETE FROM public.training_courses
WHERE id IN (
  SELECT public.seed_demo_uuid(organizations.id::text || ':training:privacy-security')
  FROM public.organizations organizations
  UNION ALL
  SELECT public.seed_demo_uuid(organizations.id::text || ':training:vendor-intake')
  FROM public.organizations organizations
);

DELETE FROM public.documents
WHERE id IN (
  SELECT public.seed_demo_uuid(organizations.id::text || ':document:policy-pack')
  FROM public.organizations organizations
  UNION ALL
  SELECT public.seed_demo_uuid(organizations.id::text || ':document:playbook')
  FROM public.organizations organizations
);

DELETE FROM public.vendors
WHERE id IN (
  SELECT public.seed_demo_uuid(organizations.id::text || ':vendor:northwind')
  FROM public.organizations organizations
  UNION ALL
  SELECT public.seed_demo_uuid(organizations.id::text || ':vendor:apex')
  FROM public.organizations organizations
);

DELETE FROM public.incidents
WHERE id IN (
  SELECT public.seed_demo_uuid(organizations.id::text || ':incident:open')
  FROM public.organizations organizations
  UNION ALL
  SELECT public.seed_demo_uuid(organizations.id::text || ':incident:investigating')
  FROM public.organizations organizations
  UNION ALL
  SELECT public.seed_demo_uuid(organizations.id::text || ':incident:resolved')
  FROM public.organizations organizations
);

DELETE FROM public.risks
WHERE id IN (
  SELECT public.seed_demo_uuid(organizations.id::text || ':risk:medium')
  FROM public.organizations organizations
  UNION ALL
  SELECT public.seed_demo_uuid(organizations.id::text || ':risk:high')
  FROM public.organizations organizations
  UNION ALL
  SELECT public.seed_demo_uuid(organizations.id::text || ':risk:critical')
  FROM public.organizations organizations
);

DELETE FROM public.assessments
WHERE id IN (
  SELECT public.seed_demo_uuid(organizations.id::text || ':assessment:completed')
  FROM public.organizations organizations
  UNION ALL
  SELECT public.seed_demo_uuid(organizations.id::text || ':assessment:in-progress')
  FROM public.organizations organizations
  UNION ALL
  SELECT public.seed_demo_uuid(organizations.id::text || ':assessment:draft')
  FROM public.organizations organizations
);

DO $$
BEGIN
  IF to_regclass('public.responses') IS NOT NULL THEN
    DROP POLICY IF EXISTS responses_select_same_org ON public.responses;
    DROP POLICY IF EXISTS responses_manage_same_org ON public.responses;
  END IF;

  IF to_regclass('public.questionnaires') IS NOT NULL THEN
    DROP POLICY IF EXISTS questionnaires_select_same_org ON public.questionnaires;
    DROP POLICY IF EXISTS questionnaires_manage_same_org ON public.questionnaires;
  END IF;

  IF to_regclass('public.training_courses') IS NOT NULL THEN
    DROP POLICY IF EXISTS training_courses_select_same_org ON public.training_courses;
    DROP POLICY IF EXISTS training_courses_manage_same_org ON public.training_courses;
  END IF;

  IF to_regclass('public.documents') IS NOT NULL THEN
    DROP POLICY IF EXISTS documents_select_same_org ON public.documents;
    DROP POLICY IF EXISTS documents_manage_same_org ON public.documents;
  END IF;

  IF to_regclass('public.vendors') IS NOT NULL THEN
    DROP POLICY IF EXISTS vendors_select_same_org ON public.vendors;
    DROP POLICY IF EXISTS vendors_manage_same_org ON public.vendors;
  END IF;

  IF to_regclass('public.incidents') IS NOT NULL THEN
    DROP POLICY IF EXISTS incidents_select_same_org ON public.incidents;
    DROP POLICY IF EXISTS incidents_manage_same_org ON public.incidents;
  END IF;

  IF to_regclass('public.risks') IS NOT NULL THEN
    DROP POLICY IF EXISTS risks_select_same_org ON public.risks;
    DROP POLICY IF EXISTS risks_manage_same_org ON public.risks;
  END IF;

  IF to_regclass('public.assessments') IS NOT NULL THEN
    DROP POLICY IF EXISTS assessments_select_same_org ON public.assessments;
    DROP POLICY IF EXISTS assessments_manage_same_org ON public.assessments;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.responses') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.responses) THEN
    DROP TABLE public.responses;
  END IF;

  IF to_regclass('public.questionnaires') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.questionnaires) THEN
    DROP TABLE public.questionnaires;
  END IF;

  IF to_regclass('public.training_courses') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.training_courses) THEN
    DROP TABLE public.training_courses;
  END IF;

  IF to_regclass('public.documents') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.documents) THEN
    DROP TABLE public.documents;
  END IF;

  IF to_regclass('public.vendors') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.vendors) THEN
    DROP TABLE public.vendors;
  END IF;

  IF to_regclass('public.incidents') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.incidents) THEN
    DROP TABLE public.incidents;
  END IF;

  IF to_regclass('public.risks') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.risks) THEN
    DROP TABLE public.risks;
  END IF;

  IF to_regclass('public.assessments') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.assessments) THEN
    DROP TABLE public.assessments;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.seed_demo_uuid(text);

COMMIT;
