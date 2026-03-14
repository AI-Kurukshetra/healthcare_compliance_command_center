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

COMMIT;

-- DOWN
BEGIN;

DROP POLICY IF EXISTS assessments_manage_same_org ON public.assessments;
DROP POLICY IF EXISTS assessments_select_same_org ON public.assessments;
DROP INDEX IF EXISTS public.assessments_organization_id_idx;
DROP TABLE IF EXISTS public.assessments;

COMMIT;
