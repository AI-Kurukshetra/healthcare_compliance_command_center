import "server-only";

import { redirect } from "next/navigation";

import type { AppRole } from "@/types/compliance";

import {
  formatRoleLabel,
  getRouteRequiredPermission,
  type PermissionName,
  roleHasPermission
} from "@/lib/auth/rbac-config";
import { getOrganizationMembershipByUserId } from "@/lib/db/organization-members";
import { getMembershipRoleByUserId } from "@/lib/db/rbac";
import { createClient } from "@/lib/supabase/server";

export type AccessContext = {
  userId: string;
  organizationId: string;
  role: AppRole;
};

export async function getUserRole(userId: string): Promise<AppRole | null> {
  const membership = await getOrganizationMembershipByUserId(userId);

  if (membership.error || !membership.data) {
    return null;
  }

  const assignment = await getMembershipRoleByUserId(membership.data.organization_id, userId);

  if (!assignment.error && assignment.data) {
    return assignment.data.roleName;
  }

  return membership.data.role;
}

export async function getCurrentAccessContext(): Promise<AccessContext | null> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const membership = await getOrganizationMembershipByUserId(user.id);

  if (membership.error || !membership.data) {
    return null;
  }

  const role = await getUserRole(user.id);

  if (!role) {
    return null;
  }

  return {
    userId: user.id,
    organizationId: membership.data.organization_id,
    role
  };
}

export async function hasPermission(userId: string, permission: PermissionName) {
  const role = await getUserRole(userId);

  if (!role) {
    return false;
  }

  return roleHasPermission(role, permission);
}

export async function currentUserHasPermission(permission: PermissionName) {
  const access = await getCurrentAccessContext();

  if (!access) {
    return false;
  }

  return roleHasPermission(access.role, permission);
}

export async function requirePermission(permission: PermissionName) {
  const access = await getCurrentAccessContext();

  if (!access) {
    redirect("/login");
  }

  if (!roleHasPermission(access.role, permission)) {
    redirect("/unauthorized");
  }

  return access;
}

export {
  formatRoleLabel,
  getRouteRequiredPermission,
  type PermissionName,
  roleHasPermission
};
