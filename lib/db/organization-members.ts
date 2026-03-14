import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import type { AppRole } from "@/types/compliance";

import { getDatabaseClient } from "@/lib/db";
import type { Database } from "@/types/database";

type UpsertOrganizationMembershipInput = {
  organizationId: string;
  userId: string;
  role: AppRole;
  invitedBy?: string | null;
};

type OrganizationMembershipRow = Database["public"]["Tables"]["organization_members"]["Row"];

export type OrganizationMembershipRecord = Pick<
  OrganizationMembershipRow,
  "id" | "organization_id" | "user_id" | "role" | "role_id" | "invited_by" | "created_at"
>;

async function getRoleIdForOrganization(organizationId: string, role: AppRole) {
  const supabase = getDatabaseClient();

  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", role)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error };
  }

  const roleRow = data as unknown as { id: string };

  return { data: roleRow.id, error: null };
}

export async function getOrganizationMembershipByUserId(
  userId: string
): Promise<{ data: OrganizationMembershipRecord | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, organization_id, user_id, role, role_id, invited_by, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

export async function upsertOrganizationMembershipRecord({
  organizationId,
  userId,
  role,
  invitedBy = null
}: UpsertOrganizationMembershipInput) {
  const supabase = getDatabaseClient();
  const roleId = await getRoleIdForOrganization(organizationId, role);

  if (roleId.error || !roleId.data) {
    return { data: null, error: roleId.error };
  }

  const membershipRecord: Database["public"]["Tables"]["organization_members"]["Insert"] = {
    organization_id: organizationId,
    user_id: userId,
    role,
    role_id: roleId.data,
    invited_by: invitedBy
  };

  return supabase.from("organization_members").upsert(membershipRecord as never, {
    onConflict: "organization_id,user_id"
  });
}

export async function updateOrganizationMembershipRole(
  organizationId: string,
  userId: string,
  role: AppRole
) {
  const supabase = getDatabaseClient();
  const roleId = await getRoleIdForOrganization(organizationId, role);

  if (roleId.error || !roleId.data) {
    return { data: null, error: roleId.error };
  }

  return supabase
    .from("organization_members")
    .update({ role, role_id: roleId.data } as never)
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
}

export async function deleteOrganizationMembershipRecord(organizationId: string, userId: string) {
  const supabase = getDatabaseClient();

  return supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
}
