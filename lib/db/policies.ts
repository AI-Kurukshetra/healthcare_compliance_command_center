import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { getDatabaseClient } from "@/lib/db";
import type { Database } from "@/types/database";

type PolicyTemplateRow = Database["public"]["Tables"]["policy_templates"]["Row"];
type OrganizationPolicyRow = Database["public"]["Tables"]["organization_policies"]["Row"];
type OrganizationPolicyInsert = Database["public"]["Tables"]["organization_policies"]["Insert"];
type OrganizationPolicyUpdate = Database["public"]["Tables"]["organization_policies"]["Update"];

export type PolicyTemplateRecord = Pick<
  PolicyTemplateRow,
  | "id"
  | "organization_id"
  | "slug"
  | "title"
  | "category"
  | "framework"
  | "description"
  | "summary"
  | "content"
  | "recommended_review_days"
  | "is_active"
  | "updated_at"
>;

export type OrganizationPolicyRecord = Pick<
  OrganizationPolicyRow,
  | "id"
  | "organization_id"
  | "template_id"
  | "name"
  | "slug"
  | "status"
  | "owner_name"
  | "approver_name"
  | "review_frequency_days"
  | "effective_date"
  | "version"
  | "summary"
  | "content"
  | "created_by"
  | "updated_by"
  | "created_at"
  | "updated_at"
>;

export async function listPolicyTemplates(
  organizationId: string
): Promise<{ data: PolicyTemplateRecord[]; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("policy_templates")
    .select(
      "id, organization_id, slug, title, category, framework, description, summary, content, recommended_review_days, is_active, updated_at"
    )
    .eq("is_active", true)
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    return { data: [], error };
  }

  return { data: (data ?? []) as PolicyTemplateRecord[], error: null };
}

export async function getPolicyTemplateById(
  organizationId: string,
  templateId: string
): Promise<{ data: PolicyTemplateRecord | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("policy_templates")
    .select(
      "id, organization_id, slug, title, category, framework, description, summary, content, recommended_review_days, is_active, updated_at"
    )
    .eq("id", templateId)
    .eq("is_active", true)
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data: (data ?? null) as PolicyTemplateRecord | null, error: null };
}

export async function listOrganizationPolicies(
  organizationId: string
): Promise<{ data: OrganizationPolicyRecord[]; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("organization_policies")
    .select(
      "id, organization_id, template_id, name, slug, status, owner_name, approver_name, review_frequency_days, effective_date, version, summary, content, created_by, updated_by, created_at, updated_at"
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) {
    return { data: [], error };
  }

  return { data: (data ?? []) as OrganizationPolicyRecord[], error: null };
}

export async function getOrganizationPolicyById(
  organizationId: string,
  policyId: string
): Promise<{ data: OrganizationPolicyRecord | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("organization_policies")
    .select(
      "id, organization_id, template_id, name, slug, status, owner_name, approver_name, review_frequency_days, effective_date, version, summary, content, created_by, updated_by, created_at, updated_at"
    )
    .eq("organization_id", organizationId)
    .eq("id", policyId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data: (data ?? null) as OrganizationPolicyRecord | null, error: null };
}

export async function listOrganizationPolicySlugMatches(organizationId: string, baseSlug: string) {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("organization_policies")
    .select("id, slug")
    .eq("organization_id", organizationId)
    .like("slug", `${baseSlug}%`);

  if (error) {
    return { data: [] as Array<Pick<OrganizationPolicyRow, "id" | "slug">>, error };
  }

  return {
    data: (data ?? []) as Array<Pick<OrganizationPolicyRow, "id" | "slug">>,
    error: null
  };
}

export async function createOrganizationPolicyRecord(input: OrganizationPolicyInsert) {
  const supabase = getDatabaseClient();

  const { data, error } = await supabase
    .from("organization_policies")
    .insert(input as never)
    .select(
      "id, organization_id, template_id, name, slug, status, owner_name, approver_name, review_frequency_days, effective_date, version, summary, content, created_by, updated_by, created_at, updated_at"
    )
    .maybeSingle();

  return {
    data: (data ?? null) as OrganizationPolicyRecord | null,
    error
  };
}

export async function updateOrganizationPolicyRecord(
  organizationId: string,
  policyId: string,
  input: OrganizationPolicyUpdate
) {
  const supabase = getDatabaseClient();

  const { data, error } = await supabase
    .from("organization_policies")
    .update(input as never)
    .eq("organization_id", organizationId)
    .eq("id", policyId)
    .select(
      "id, organization_id, template_id, name, slug, status, owner_name, approver_name, review_frequency_days, effective_date, version, summary, content, created_by, updated_by, created_at, updated_at"
    )
    .maybeSingle();

  return {
    data: (data ?? null) as OrganizationPolicyRecord | null,
    error
  };
}
