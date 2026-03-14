-- UP
BEGIN;

DO $$
DECLARE
  seed_org_id uuid;
  seed_user_id uuid;
  seed_role_id uuid;
  seed_role_name text;
  seed_permission_id uuid;
  seed_questionnaire_id uuid;
BEGIN
  IF to_regclass('public.organizations') IS NULL THEN
    RAISE NOTICE 'public.organizations does not exist. Skipping seed.';
    RETURN;
  END IF;

  SELECT id
    INTO seed_org_id
  FROM public.organizations
  ORDER BY created_at ASC
  LIMIT 1;

  IF seed_org_id IS NULL THEN
    RAISE NOTICE 'No public.organizations rows found. Skipping seed.';
    RETURN;
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT id
      INTO seed_user_id
    FROM public.users
    WHERE organization_id = seed_org_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF seed_user_id IS NULL THEN
      SELECT id
        INTO seed_user_id
      FROM public.users
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  END IF;

  IF to_regclass('public.roles') IS NOT NULL THEN
    SELECT id, name
      INTO seed_role_id, seed_role_name
    FROM public.roles
    WHERE organization_id = seed_org_id
      AND name = 'owner'
    LIMIT 1;

    IF seed_role_id IS NULL THEN
      SELECT id, name
        INTO seed_role_id, seed_role_name
      FROM public.roles
      WHERE organization_id = seed_org_id
        AND name = 'admin'
      LIMIT 1;
    END IF;
  END IF;

  IF seed_role_id IS NOT NULL
     AND seed_user_id IS NOT NULL
     AND to_regclass('public.organization_members') IS NOT NULL THEN
    INSERT INTO public.organization_members (id, organization_id, user_id, role, role_id, invited_by)
    VALUES (
      '00000000-0000-0000-0000-000000000201',
      seed_org_id,
      seed_user_id,
      seed_role_name,
      seed_role_id,
      seed_user_id
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  IF seed_role_id IS NOT NULL
     AND seed_user_id IS NOT NULL
     AND to_regclass('public.user_roles') IS NOT NULL THEN
    INSERT INTO public.user_roles (id, organization_id, user_id, role_id)
    VALUES (
      '00000000-0000-0000-0000-000000000101',
      seed_org_id,
      seed_user_id,
      seed_role_id
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  IF seed_role_id IS NOT NULL AND to_regclass('public.permissions') IS NOT NULL THEN
    SELECT id
      INTO seed_permission_id
    FROM public.permissions
    WHERE organization_id = seed_org_id
      AND name = 'view_reports'
    LIMIT 1;

    IF seed_permission_id IS NOT NULL AND to_regclass('public.role_permissions') IS NOT NULL THEN
      INSERT INTO public.role_permissions (id, organization_id, role_id, permission_id)
      VALUES (
        '00000000-0000-0000-0000-000000000301',
        seed_org_id,
        seed_role_id,
        seed_permission_id
      )
      ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
    END IF;
  END IF;

  IF to_regclass('public.assessments') IS NOT NULL THEN
    INSERT INTO public.assessments (id, organization_id, status, score)
    VALUES
      ('00000000-0000-0000-0000-000000000401', seed_org_id, 'completed', 82),
      ('00000000-0000-0000-0000-000000000410', seed_org_id, 'in_progress', 68),
      ('00000000-0000-0000-0000-000000000411', seed_org_id, 'draft', NULL)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.risks') IS NOT NULL THEN
    INSERT INTO public.risks (id, organization_id, severity, description)
    VALUES
      (
        '00000000-0000-0000-0000-000000000402',
        seed_org_id,
        'medium',
        '[Seed] Data classification gaps across vendor intake.'
      ),
      (
        '00000000-0000-0000-0000-000000000412',
        seed_org_id,
        'high',
        '[Seed] Shared workstation session timeout policy is not consistently enforced.'
      ),
      (
        '00000000-0000-0000-0000-000000000413',
        seed_org_id,
        'critical',
        '[Seed] Backup restoration evidence is missing for a production database cluster.'
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.incidents') IS NOT NULL THEN
    INSERT INTO public.incidents (id, organization_id, severity, status, description)
    VALUES
      (
        '00000000-0000-0000-0000-000000000403',
        seed_org_id,
        'high',
        'open',
        '[Seed] Suspicious login pattern detected on core admin account.'
      ),
      (
        '00000000-0000-0000-0000-000000000414',
        seed_org_id,
        'medium',
        'investigating',
        '[Seed] Misrouted patient attachment reported from intake mailbox.'
      ),
      (
        '00000000-0000-0000-0000-000000000415',
        seed_org_id,
        'low',
        'resolved',
        '[Seed] Legacy laptop encryption agent reinstalled after drift alert.'
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.vendors') IS NOT NULL THEN
    INSERT INTO public.vendors (id, organization_id, name, risk_score)
    VALUES
      (
        '00000000-0000-0000-0000-000000000405',
        seed_org_id,
        '[Seed] Northwind Health Systems',
        41
      ),
      (
        '00000000-0000-0000-0000-000000000416',
        seed_org_id,
        '[Seed] Apex Claims Clearinghouse',
        63
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.documents') IS NOT NULL THEN
    INSERT INTO public.documents (id, organization_id, name, version)
    VALUES
      (
        '00000000-0000-0000-0000-000000000406',
        seed_org_id,
        '[Seed] HIPAA Policy Pack',
        'v1.0'
      ),
      (
        '00000000-0000-0000-0000-000000000417',
        seed_org_id,
        '[Seed] Incident Response Playbook',
        'v2.3'
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.training_courses') IS NOT NULL THEN
    INSERT INTO public.training_courses (id, organization_id, title, mandatory)
    VALUES
      (
        '00000000-0000-0000-0000-000000000407',
        seed_org_id,
        '[Seed] Privacy & Security Basics',
        true
      ),
      (
        '00000000-0000-0000-0000-000000000418',
        seed_org_id,
        '[Seed] Secure Vendor Intake Review',
        false
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.questionnaires') IS NOT NULL THEN
    SELECT id
      INTO seed_questionnaire_id
    FROM public.questionnaires
    WHERE organization_id = seed_org_id
      AND id = '00000000-0000-0000-0000-000000000408'
    LIMIT 1;

    IF seed_questionnaire_id IS NULL THEN
      INSERT INTO public.questionnaires (id, organization_id, title)
      VALUES (
        '00000000-0000-0000-0000-000000000408',
        seed_org_id,
        '[Seed] Security Baseline Survey'
      )
      ON CONFLICT (id) DO NOTHING;

      seed_questionnaire_id := '00000000-0000-0000-0000-000000000408';
    END IF;
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    INSERT INTO public.audit_logs (id, organization_id, user_id, action, entity, entity_id, details)
    VALUES
      (
        '00000000-0000-0000-0000-000000000404',
        seed_org_id,
        seed_user_id,
        'seed_data',
        'organization',
        seed_org_id,
        '{"seed": true, "source": "migration"}'::jsonb
      ),
      (
        '00000000-0000-0000-0000-000000000419',
        seed_org_id,
        seed_user_id,
        'report_exported',
        'document',
        '00000000-0000-0000-0000-000000000417',
        '{"seed": true, "channel": "dashboard"}'::jsonb
      )
    ON CONFLICT (id) DO NOTHING;

    IF seed_user_id IS NOT NULL AND to_regclass('public.training_courses') IS NOT NULL THEN
      INSERT INTO public.audit_logs (id, organization_id, user_id, action, entity, entity_id, details)
      VALUES (
        '00000000-0000-0000-0000-000000000420',
        seed_org_id,
        seed_user_id,
        'training_completed',
        'training_course',
        '00000000-0000-0000-0000-000000000407',
        '{"seed": true, "completion_method": "migration"}'::jsonb
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;

  IF seed_questionnaire_id IS NOT NULL
     AND seed_user_id IS NOT NULL
     AND to_regclass('public.responses') IS NOT NULL THEN
    INSERT INTO public.responses (id, questionnaire_id, user_id, organization_id)
    VALUES (
      '00000000-0000-0000-0000-000000000409',
      seed_questionnaire_id,
      seed_user_id,
      seed_org_id
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

COMMIT;

-- DOWN
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.responses') IS NOT NULL THEN
    DELETE FROM public.responses WHERE id = '00000000-0000-0000-0000-000000000409';
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    DELETE FROM public.audit_logs
    WHERE id IN (
      '00000000-0000-0000-0000-000000000404',
      '00000000-0000-0000-0000-000000000419',
      '00000000-0000-0000-0000-000000000420'
    );
  END IF;

  IF to_regclass('public.questionnaires') IS NOT NULL THEN
    DELETE FROM public.questionnaires WHERE id = '00000000-0000-0000-0000-000000000408';
  END IF;

  IF to_regclass('public.training_courses') IS NOT NULL THEN
    DELETE FROM public.training_courses
    WHERE id IN (
      '00000000-0000-0000-0000-000000000407',
      '00000000-0000-0000-0000-000000000418'
    );
  END IF;

  IF to_regclass('public.documents') IS NOT NULL THEN
    DELETE FROM public.documents
    WHERE id IN (
      '00000000-0000-0000-0000-000000000406',
      '00000000-0000-0000-0000-000000000417'
    );
  END IF;

  IF to_regclass('public.vendors') IS NOT NULL THEN
    DELETE FROM public.vendors
    WHERE id IN (
      '00000000-0000-0000-0000-000000000405',
      '00000000-0000-0000-0000-000000000416'
    );
  END IF;

  IF to_regclass('public.incidents') IS NOT NULL THEN
    DELETE FROM public.incidents
    WHERE id IN (
      '00000000-0000-0000-0000-000000000403',
      '00000000-0000-0000-0000-000000000414',
      '00000000-0000-0000-0000-000000000415'
    );
  END IF;

  IF to_regclass('public.risks') IS NOT NULL THEN
    DELETE FROM public.risks
    WHERE id IN (
      '00000000-0000-0000-0000-000000000402',
      '00000000-0000-0000-0000-000000000412',
      '00000000-0000-0000-0000-000000000413'
    );
  END IF;

  IF to_regclass('public.assessments') IS NOT NULL THEN
    DELETE FROM public.assessments
    WHERE id IN (
      '00000000-0000-0000-0000-000000000401',
      '00000000-0000-0000-0000-000000000410',
      '00000000-0000-0000-0000-000000000411'
    );
  END IF;

  IF to_regclass('public.role_permissions') IS NOT NULL THEN
    DELETE FROM public.role_permissions WHERE id = '00000000-0000-0000-0000-000000000301';
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE id = '00000000-0000-0000-0000-000000000101';
  END IF;

  IF to_regclass('public.organization_members') IS NOT NULL THEN
    DELETE FROM public.organization_members WHERE id = '00000000-0000-0000-0000-000000000201';
  END IF;
END $$;

COMMIT;
