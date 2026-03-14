"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/rbac";
import { createAuditLogEntry } from "@/lib/db/audit-logs";
import {
  createOrganizationPolicyRecord,
  getOrganizationPolicyById,
  getPolicyTemplateById,
  listOrganizationPolicySlugMatches,
  updateOrganizationPolicyRecord
} from "@/lib/db/policies";
import { setPolicyFlash } from "@/lib/policies/state";
import {
  createOrganizationPolicySchema,
  updateOrganizationPolicySchema
} from "@/lib/policies/schemas";

function getFieldValue(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value : "";
}

function redirectWithPolicyFlash(kind: "error" | "message", message: string): never {
  setPolicyFlash(kind, message, cookies());
  redirect("/documents");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function buildUniquePolicySlug(
  organizationId: string,
  title: string,
  currentPolicyId?: string
) {
  const baseSlug = slugify(title) || "policy";
  const existing = await listOrganizationPolicySlugMatches(organizationId, baseSlug);

  if (existing.error) {
    redirectWithPolicyFlash("error", "Unable to validate the policy name.");
  }

  const taken = new Set(
    existing.data
      .filter((record) => record.id !== currentPolicyId)
      .map((record) => record.slug)
  );

  if (!taken.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;

  while (taken.has(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}

export async function createOrganizationPolicyAction(formData: FormData) {
  const access = await requirePermission("manage_assessments");
  const parsed = createOrganizationPolicySchema.safeParse({
    templateId: getFieldValue(formData, "templateId"),
    title: getFieldValue(formData, "title"),
    status: getFieldValue(formData, "status"),
    ownerName: getFieldValue(formData, "ownerName"),
    approverName: getFieldValue(formData, "approverName") || undefined,
    effectiveDate: getFieldValue(formData, "effectiveDate") || undefined,
    reviewFrequencyDays: getFieldValue(formData, "reviewFrequencyDays"),
    version: getFieldValue(formData, "version"),
    summary: getFieldValue(formData, "summary"),
    content: getFieldValue(formData, "content")
  });

  if (!parsed.success) {
    redirectWithPolicyFlash("error", parsed.error.issues[0]?.message ?? "Invalid policy details.");
  }

  const values = parsed.data;
  const template = await getPolicyTemplateById(access.organizationId, values.templateId);

  if (template.error || !template.data) {
    redirectWithPolicyFlash("error", "The selected policy template is unavailable.");
  }

  const slug = await buildUniquePolicySlug(access.organizationId, values.title);
  const creation = await createOrganizationPolicyRecord({
    organization_id: access.organizationId,
    template_id: values.templateId,
    name: values.title,
    slug,
    status: values.status,
    owner_name: values.ownerName,
    approver_name: values.approverName ?? null,
    review_frequency_days: values.reviewFrequencyDays,
    effective_date: values.effectiveDate || null,
    version: values.version,
    summary: values.summary,
    content: values.content,
    created_by: access.userId,
    updated_by: access.userId
  });

  if (creation.error || !creation.data) {
    redirectWithPolicyFlash("error", "Unable to create the organization policy.");
  }

  await createAuditLogEntry({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "organization_policy_created",
    entity: "organization_policy",
    entityId: creation.data.id,
    details: {
      name: creation.data.name,
      status: creation.data.status,
      template_id: values.templateId,
      template_title: template.data.title,
      version: creation.data.version
    }
  });

  redirectWithPolicyFlash("message", "Organization policy created.");
}

export async function updateOrganizationPolicyAction(formData: FormData) {
  const access = await requirePermission("manage_assessments");
  const parsed = updateOrganizationPolicySchema.safeParse({
    policyId: getFieldValue(formData, "policyId"),
    templateId: getFieldValue(formData, "templateId"),
    title: getFieldValue(formData, "title"),
    status: getFieldValue(formData, "status"),
    ownerName: getFieldValue(formData, "ownerName"),
    approverName: getFieldValue(formData, "approverName") || undefined,
    effectiveDate: getFieldValue(formData, "effectiveDate") || undefined,
    reviewFrequencyDays: getFieldValue(formData, "reviewFrequencyDays"),
    version: getFieldValue(formData, "version"),
    summary: getFieldValue(formData, "summary"),
    content: getFieldValue(formData, "content")
  });

  if (!parsed.success) {
    redirectWithPolicyFlash("error", parsed.error.issues[0]?.message ?? "Invalid policy update.");
  }

  const values = parsed.data;
  const [existingPolicy, template] = await Promise.all([
    getOrganizationPolicyById(access.organizationId, values.policyId),
    getPolicyTemplateById(access.organizationId, values.templateId)
  ]);

  if (existingPolicy.error || !existingPolicy.data) {
    redirectWithPolicyFlash("error", "The organization policy could not be found.");
  }

  if (template.error || !template.data) {
    redirectWithPolicyFlash("error", "The selected policy template is unavailable.");
  }

  const slug = await buildUniquePolicySlug(access.organizationId, values.title, values.policyId);
  const update = await updateOrganizationPolicyRecord(access.organizationId, values.policyId, {
    template_id: values.templateId,
    name: values.title,
    slug,
    status: values.status,
    owner_name: values.ownerName,
    approver_name: values.approverName ?? null,
    effective_date: values.effectiveDate || null,
    review_frequency_days: values.reviewFrequencyDays,
    version: values.version,
    summary: values.summary,
    content: values.content,
    updated_by: access.userId,
    updated_at: new Date().toISOString()
  });

  if (update.error || !update.data) {
    redirectWithPolicyFlash("error", "Unable to update the organization policy.");
  }

  await createAuditLogEntry({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "organization_policy_updated",
    entity: "organization_policy",
    entityId: values.policyId,
    details: {
      name: update.data.name,
      previous_name: existingPolicy.data.name,
      status: update.data.status,
      previous_status: existingPolicy.data.status,
      template_id: values.templateId,
      template_title: template.data.title,
      version: update.data.version
    }
  });

  redirectWithPolicyFlash("message", "Organization policy updated.");
}
