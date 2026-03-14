import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import type { AppRole } from "@/types/compliance";
import type { Database } from "@/types/database";

import { getDatabaseClient } from "@/lib/db";
import { ROLE_DEFINITIONS } from "@/lib/auth/rbac-config";

type RoleRow = Database["public"]["Tables"]["roles"]["Row"];

export type RoleCatalogRecord = {
  id: string;
  organization_id: string;
  name: AppRole;
  description: string;
};

export type MembershipRoleRecord = {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string;
  roleName: AppRole;
  created_at: string;
};

export type OrganizationUserWithRole = {
  id: string;
  organizationId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: AppRole;
  membershipId: string;
};

export async function listRoleCatalogForOrganization(
  organizationId: string
): Promise<{ data: RoleCatalogRecord[]; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, organization_id, name, description")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) {
    return { data: [], error };
  }

  return {
    data: (data ?? []) as RoleCatalogRecord[],
    error: null
  };
}

export async function ensureOrganizationRbacCatalog(organizationId: string) {
  const supabase = getDatabaseClient();
  const roles: Database["public"]["Tables"]["roles"]["Insert"][] = ROLE_DEFINITIONS.map((role) => ({
    organization_id: organizationId,
    name: role.name,
    description: role.description
  }));

  return supabase.from("roles").upsert(roles as never, {
    onConflict: "organization_id,name"
  });
}

export async function getMembershipRoleByUserId(
  organizationId: string,
  userId: string
): Promise<{ data: MembershipRoleRecord | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, organization_id, user_id, role_id, created_at, roles!inner(name)")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  const membershipRow = data as unknown as {
    id: string;
    organization_id: string;
    user_id: string;
    role_id: string;
    created_at: string;
    roles?: { name?: string } | { name?: string }[];
  };
  const rawRole = membershipRow.roles;
  const roleName = Array.isArray(rawRole) ? rawRole[0]?.name : rawRole?.name;

  if (!roleName) {
    return { data: null, error: null };
  }

  return {
    data: {
      id: membershipRow.id,
      organization_id: membershipRow.organization_id,
      user_id: membershipRow.user_id,
      role_id: membershipRow.role_id,
      created_at: membershipRow.created_at,
      roleName: roleName as AppRole
    },
    error: null
  };
}

export async function listOrganizationUsersWithRoles(
  organizationId: string
): Promise<{ data: OrganizationUserWithRole[]; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, organization_id, user_id, roles!inner(name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error };
  }

  const membershipRows = (data ?? []) as Array<{
    id: string;
    organization_id: string;
    user_id: string;
    roles?: { name?: string } | Array<{ name?: string }>;
  }>;

  if (membershipRows.length === 0) {
    return { data: [], error: null };
  }

  const userIds = Array.from(new Set(membershipRows.map((row) => row.user_id)));
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, organization_id, email, first_name, last_name")
    .eq("organization_id", organizationId)
    .in("id", userIds);

  if (userError) {
    return { data: [], error: userError };
  }

  const usersById = new Map(
    (userData ?? []).map((user) => [
      user.id,
      {
        email: user.email,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null
      }
    ])
  );

  return {
    data: membershipRows.flatMap((membership) => {
      const rawRole = Array.isArray(membership.roles) ? membership.roles[0] : membership.roles;
      const user = usersById.get(membership.user_id);

      if (!user?.email || !rawRole?.name) {
        return [];
      }

      return [
        {
          id: membership.user_id,
          organizationId: membership.organization_id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: rawRole.name as AppRole,
          membershipId: membership.id
        }
      ];
    }),
    error: null
  };
}

export async function getRoleRecordByName(
  organizationId: string,
  roleName: AppRole
): Promise<{ data: Pick<RoleRow, "id" | "organization_id" | "name"> | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, organization_id, name")
    .eq("organization_id", organizationId)
    .eq("name", roleName)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data: (data ?? null) as Pick<RoleRow, "id" | "organization_id" | "name"> | null, error: null };
}
