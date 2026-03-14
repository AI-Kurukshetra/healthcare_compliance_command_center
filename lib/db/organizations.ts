import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { getDatabaseClient } from "@/lib/db";
import { getOrganizationMembershipByUserId } from "@/lib/db/organization-members";
import type { Database } from "@/types/database";

type UpsertOrganizationInput = {
  id: string;
  name: string;
  plan?: string | null;
  createdBy?: string | null;
};

type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];
type OrganizationRecord = Pick<
  OrganizationRow,
  "id" | "organization_id" | "name" | "plan" | "created_at" | "created_by"
>;

export type OrganizationWorkspace = {
  organization: OrganizationRecord;
  membership: {
    role: Database["public"]["Tables"]["organization_members"]["Row"]["role"];
    joinedAt: string;
  };
  memberCount: number;
};

export async function upsertOrganizationRecord({
  id,
  name,
  plan = "starter",
  createdBy = null
}: UpsertOrganizationInput) {
  const supabase = getDatabaseClient();
  const organizationRecord: Database["public"]["Tables"]["organizations"]["Insert"] = {
    id,
    organization_id: id,
    name,
    plan,
    created_by: createdBy
  };

  return supabase.from("organizations").upsert(
    organizationRecord as never,
    {
      onConflict: "id"
    }
  );
}

export async function getOrganizationRecordById(
  organizationId: string
): Promise<{ data: OrganizationRecord | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, organization_id, name, plan, created_at, created_by")
    .eq("id", organizationId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

export async function getOrganizationWorkspaceByUserId(
  userId: string
): Promise<{ data: OrganizationWorkspace | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const membership = await getOrganizationMembershipByUserId(userId);

  if (membership.error || !membership.data) {
    return { data: null, error: membership.error };
  }

  const organization = await getOrganizationRecordById(membership.data.organization_id);

  if (organization.error || !organization.data) {
    return { data: null, error: organization.error };
  }

  const { count, error } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", membership.data.organization_id);

  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      organization: organization.data,
      membership: {
        role: membership.data.role,
        joinedAt: membership.data.created_at
      },
      memberCount: count ?? 0
    },
    error: null
  };
}
