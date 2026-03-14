import type { ReactNode } from "react";

import { currentUserHasPermission, type PermissionName } from "@/lib/auth/rbac";

type RoleGuardProps = {
  permission: PermissionName;
  children: ReactNode;
  fallback?: ReactNode;
};

export async function RoleGuard({ permission, children, fallback = null }: RoleGuardProps) {
  const allowed = await currentUserHasPermission(permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
