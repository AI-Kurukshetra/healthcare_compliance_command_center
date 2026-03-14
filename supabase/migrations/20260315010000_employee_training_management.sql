-- UP
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  mandatory boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS training_courses_organization_id_idx
  ON public.training_courses(organization_id);

ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  due_at timestamptz NOT NULL,
  reminder_sent_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0 CHECK (reminder_count >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.training_assignments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percentage integer NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  started_at timestamptz,
  completed_at timestamptz,
  updated_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS training_assignments_org_course_user_idx
  ON public.training_assignments(organization_id, course_id, user_id);

CREATE INDEX IF NOT EXISTS training_assignments_org_due_idx
  ON public.training_assignments(organization_id, due_at);

CREATE INDEX IF NOT EXISTS training_assignments_org_user_idx
  ON public.training_assignments(organization_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS training_progress_assignment_idx
  ON public.training_progress(assignment_id);

CREATE INDEX IF NOT EXISTS training_progress_org_user_idx
  ON public.training_progress(organization_id, user_id);

CREATE INDEX IF NOT EXISTS training_progress_org_status_idx
  ON public.training_progress(organization_id, status);

ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
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
      AND tablename = 'training_assignments'
      AND policyname = 'training_assignments_select_same_org'
  ) THEN
    CREATE POLICY training_assignments_select_same_org
      ON public.training_assignments
      FOR SELECT
      USING (
        organization_id = public.current_user_organization_id()
        AND (
          public.current_user_app_role() IN ('owner', 'admin', 'compliance_officer')
          OR auth.uid() = user_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'training_assignments'
      AND policyname = 'training_assignments_manage_same_org'
  ) THEN
    CREATE POLICY training_assignments_manage_same_org
      ON public.training_assignments
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
      AND tablename = 'training_progress'
      AND policyname = 'training_progress_select_same_org'
  ) THEN
    CREATE POLICY training_progress_select_same_org
      ON public.training_progress
      FOR SELECT
      USING (
        organization_id = public.current_user_organization_id()
        AND (
          public.current_user_app_role() IN ('owner', 'admin', 'compliance_officer')
          OR auth.uid() = user_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'training_progress'
      AND policyname = 'training_progress_manage_same_org'
  ) THEN
    CREATE POLICY training_progress_manage_same_org
      ON public.training_progress
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

COMMIT;

-- DOWN
BEGIN;

DROP POLICY IF EXISTS training_progress_manage_same_org ON public.training_progress;
DROP POLICY IF EXISTS training_progress_select_same_org ON public.training_progress;
DROP POLICY IF EXISTS training_assignments_manage_same_org ON public.training_assignments;
DROP POLICY IF EXISTS training_assignments_select_same_org ON public.training_assignments;
DROP POLICY IF EXISTS training_courses_manage_same_org ON public.training_courses;
DROP POLICY IF EXISTS training_courses_select_same_org ON public.training_courses;

DROP TABLE IF EXISTS public.training_progress;
DROP TABLE IF EXISTS public.training_assignments;

COMMIT;
