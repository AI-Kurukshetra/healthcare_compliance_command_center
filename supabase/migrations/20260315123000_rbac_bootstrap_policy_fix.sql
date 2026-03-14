-- UP
BEGIN;

CREATE OR REPLACE FUNCTION public.is_organization_creator(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations organizations
    WHERE organizations.id = target_organization_id
      AND organizations.created_by = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_organization_creator(uuid) TO authenticated;

DROP POLICY IF EXISTS roles_manage_admin_or_seed ON public.roles;
CREATE POLICY roles_manage_admin_or_seed
  ON public.roles
  FOR ALL
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_app_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    (
      organization_id = public.current_user_organization_id()
      AND public.current_user_app_role() IN ('owner', 'admin')
    )
    OR public.is_organization_creator(organization_id)
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
    (
      organization_id = public.current_user_organization_id()
      AND public.current_user_app_role() IN ('owner', 'admin')
    )
    OR public.is_organization_creator(organization_id)
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
    (
      organization_id = public.current_user_organization_id()
      AND public.current_user_app_role() IN ('owner', 'admin')
    )
    OR public.is_organization_creator(organization_id)
  );

COMMIT;

-- DOWN
BEGIN;

DROP POLICY IF EXISTS role_permissions_manage_admin_or_seed ON public.role_permissions;
CREATE POLICY role_permissions_manage_admin_or_seed
  ON public.role_permissions
  FOR ALL
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_app_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    (
      organization_id = public.current_user_organization_id()
      AND public.current_user_app_role() IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations organizations
      WHERE organizations.id = role_permissions.organization_id
        AND organizations.created_by = auth.uid()
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
    (
      organization_id = public.current_user_organization_id()
      AND public.current_user_app_role() IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations organizations
      WHERE organizations.id = permissions.organization_id
        AND organizations.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS roles_manage_admin_or_seed ON public.roles;
CREATE POLICY roles_manage_admin_or_seed
  ON public.roles
  FOR ALL
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_app_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    (
      organization_id = public.current_user_organization_id()
      AND public.current_user_app_role() IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations organizations
      WHERE organizations.id = roles.organization_id
        AND organizations.created_by = auth.uid()
    )
  );

DROP FUNCTION IF EXISTS public.is_organization_creator(uuid);

COMMIT;
