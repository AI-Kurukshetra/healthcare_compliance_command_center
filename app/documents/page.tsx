import Link from "next/link";
import { cookies } from "next/headers";

import { PolicyComposer } from "@/components/forms/policy-composer";
import { PolicyLibraryMessages } from "@/components/forms/policy-library-messages";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatRoleLabel, requirePermission, roleHasPermission } from "@/lib/auth/rbac";
import { safelyRunAuthSideEffect } from "@/lib/auth/service";
import { createAuditLogEntry } from "@/lib/db/audit-logs";
import {
  listOrganizationPolicies,
  listPolicyTemplates,
  type OrganizationPolicyRecord,
  type PolicyTemplateRecord
} from "@/lib/db/policies";
import { getOrganizationWorkspaceByUserId } from "@/lib/db/organizations";
import {
  createOrganizationPolicyAction,
  updateOrganizationPolicyAction
} from "@/lib/policies/actions";
import { getPolicyFlash } from "@/lib/policies/state";

function formatDate(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatRelativeDayCount(value: number) {
  return `${value} day review`;
}

function getStatusClasses(status: OrganizationPolicyRecord["status"]) {
  switch (status) {
    case "active":
      return "bg-success/10 text-success";
    case "archived":
      return "bg-ink/10 text-ink/70";
    case "draft":
      return "bg-signal/10 text-signal";
  }
}

function getTemplateTone(index: number) {
  const tones = [
    "border-ocean/20 bg-ocean/5",
    "border-signal/20 bg-signal/5",
    "border-success/20 bg-success/5"
  ] as const;

  return tones[index % tones.length];
}

function buildTemplateOptions(templates: PolicyTemplateRecord[]) {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    category: template.category,
    framework: template.framework,
    description: template.description,
    summary: template.summary,
    content: template.content,
    recommendedReviewDays: template.recommended_review_days
  }));
}

export default async function DocumentsPage() {
  const access = await requirePermission("view_reports");
  const flash = getPolicyFlash(cookies());
  const canManagePolicies = roleHasPermission(access.role, "manage_assessments");
  const [workspace, templates, policies] = await Promise.all([
    getOrganizationWorkspaceByUserId(access.userId),
    listPolicyTemplates(access.organizationId),
    listOrganizationPolicies(access.organizationId)
  ]);
  const workspaceData = workspace.data;
  const activePolicies = policies.data.filter((policy) => policy.status === "active").length;
  const templatesById = new Map(templates.data.map((template) => [template.id, template]));
  const defaultOwnerName = workspaceData
    ? `${workspaceData.organization.name} Compliance Team`
    : "Compliance Team";

  await safelyRunAuthSideEffect(async () => {
    await createAuditLogEntry({
      organizationId: access.organizationId,
      userId: access.userId,
      action: "policy_library_viewed",
      entity: "policy_library",
      entityId: access.organizationId,
      details: {
        role: access.role
      }
    });
  });

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel overflow-hidden p-8 md:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ocean via-signal to-success" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
                Policy Library
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink md:text-5xl">
                Build organization-ready compliance policies from a shared template catalog.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/75">
                Review core policy templates, tailor approved language to your operating model, and
                keep a versioned library of organization-specific policies in one controlled space.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-ink/65">
                <span className="rounded-full bg-ocean/10 px-4 py-2 text-ocean">
                  {formatRoleLabel(access.role)}
                </span>
                <span className="rounded-full bg-ink/5 px-4 py-2">
                  {templates.data.length} active templates
                </span>
                <span className="rounded-full bg-ink/5 px-4 py-2">
                  {policies.data.length} organization policies
                </span>
                <span className="rounded-full bg-ink/5 px-4 py-2">
                  {activePolicies} active
                </span>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-panel backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ocean">
                Workspace
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                {workspaceData?.organization.name ?? "Current organization"}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Templates are read-only shared references. Organization policies are tenant-scoped
                artifacts with audit logging on every create and update.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                >
                  Back to Dashboard
                </Link>
                <Link
                  href="/compliance"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90"
                >
                  Open compliance
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <PolicyLibraryMessages error={flash.error} message={flash.message} />
          </div>

          {workspace.error || templates.error || policies.error ? (
            <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              Unable to load the policy library.
              {workspace.error ? ` Workspace error: ${workspace.error.message}` : ""}
              {templates.error ? ` Template error: ${templates.error.message}` : ""}
              {policies.error ? ` Policy error: ${policies.error.message}` : ""}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-[28px] border border-ink/10 bg-white/80 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                Shared Templates
              </p>
              <p className="mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold text-ink">
                {templates.data.length}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Global policy blueprints covering privacy, response, and records management
                controls.
              </p>
            </article>
            <article className="rounded-[28px] border border-ink/10 bg-white/80 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                Org Policies
              </p>
              <p className="mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold text-ink">
                {policies.data.length}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Organization-specific policies currently versioned inside the workspace.
              </p>
            </article>
            <article className="rounded-[28px] border border-ink/10 bg-white/80 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                Editable Access
              </p>
              <p className="mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold text-ink">
                {canManagePolicies ? "Yes" : "No"}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Only owners, admins, and compliance officers can create or revise organization
                policies.
              </p>
            </article>
          </div>

          <section className="mt-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                  Template Catalog
                </p>
                <p className="mt-2 text-sm text-ink/65">
                  Seeded templates stay shared and read-only so every organization starts from a
                  consistent compliance baseline.
                </p>
              </div>
            </div>

            {templates.data.length > 0 ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {templates.data.map((template, index) => (
                  <article
                    key={template.id}
                    className={`rounded-[28px] border p-6 ${getTemplateTone(index)}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                      <span className="rounded-full bg-white px-3 py-1 text-ocean">
                        {template.framework}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-ink/70">
                        {template.category}
                      </span>
                    </div>
                    <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
                      {template.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-ink/75">{template.description}</p>
                    <p className="mt-4 text-sm leading-6 text-ink/70">{template.summary}</p>
                    <div className="mt-5 rounded-3xl border border-white/70 bg-white/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ocean">
                        Core excerpt
                      </p>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink/75">
                        {template.content.slice(0, 240)}
                        {template.content.length > 240 ? "..." : ""}
                      </p>
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
                      Recommended cadence: {formatRelativeDayCount(template.recommended_review_days)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[28px] border border-dashed border-ink/15 bg-white/65 p-6 text-sm text-ink/65">
                No policy templates are available yet. Apply the latest policy-library migration to
                load the seeded template catalog.
              </div>
            )}
          </section>

          <section className="mt-8 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[32px] border border-ink/10 bg-white/75 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                Create Organization Policy
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
                Start from a template, tailor the language to your environment, and save a
                versioned policy record scoped to your organization.
              </p>

              {canManagePolicies ? (
                templates.data.length > 0 ? (
                  <div className="mt-6">
                    <PolicyComposer
                      createAction={createOrganizationPolicyAction}
                      defaultOwnerName={defaultOwnerName}
                      templates={buildTemplateOptions(templates.data)}
                    />
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-ink/5 p-5 text-sm text-ink/65">
                    Add or seed policy templates before creating organization policies.
                  </div>
                )
              ) : (
                <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                  You have read-only access to the library. Request a role with policy management
                  privileges to create or revise organization policies.
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-ink/10 bg-white/75 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                Organization Policies
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Current policy records for the active organization, ordered by most recent change.
              </p>

              {policies.data.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {policies.data.map((policy) => {
                    const sourceTemplate = policy.template_id
                      ? templatesById.get(policy.template_id) ?? null
                      : null;
                    const fallbackTemplateId = sourceTemplate?.id ?? templates.data[0]?.id ?? "";

                    return (
                      <article
                        key={policy.id}
                        className="rounded-[28px] border border-ink/10 bg-white/85 p-5"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
                                {policy.name}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                                <span className={`rounded-full px-3 py-1 ${getStatusClasses(policy.status)}`}>
                                  {policy.status}
                                </span>
                                <span className="rounded-full bg-ink/5 px-3 py-1 text-ink/65">
                                  v{policy.version}
                                </span>
                                <span className="rounded-full bg-ink/5 px-3 py-1 text-ink/65">
                                  {formatRelativeDayCount(policy.review_frequency_days)}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-ink/60">
                              <p>Updated {formatDate(policy.updated_at)}</p>
                              <p className="mt-1">Effective {formatDate(policy.effective_date)}</p>
                            </div>
                          </div>

                          <dl className="grid gap-3 text-sm text-ink/70 md:grid-cols-2">
                            <div>
                              <dt className="text-ink/45">Source template</dt>
                              <dd className="mt-1 font-semibold text-ink">
                                {sourceTemplate?.title ?? "Custom policy record"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-ink/45">Owner</dt>
                              <dd className="mt-1 font-semibold text-ink">{policy.owner_name}</dd>
                            </div>
                            <div>
                              <dt className="text-ink/45">Approver</dt>
                              <dd className="mt-1 font-semibold text-ink">
                                {policy.approver_name || "Not assigned"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-ink/45">Slug</dt>
                              <dd className="mt-1 font-semibold text-ink">{policy.slug}</dd>
                            </div>
                          </dl>

                          <p className="text-sm leading-6 text-ink/75">{policy.summary}</p>

                          <details className="rounded-3xl border border-ink/10 bg-ink/5">
                            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-ink">
                              View policy content{canManagePolicies ? " and edit" : ""}
                            </summary>
                            <div className="border-t border-ink/10 px-4 py-4">
                              {canManagePolicies ? (
                                <form action={updateOrganizationPolicyAction} className="grid gap-4">
                                  <input type="hidden" name="policyId" value={policy.id} />
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                      <label className="text-sm font-semibold text-ink" htmlFor={`policy-name-${policy.id}`}>
                                        Policy title
                                      </label>
                                      <input
                                        id={`policy-name-${policy.id}`}
                                        name="title"
                                        defaultValue={policy.name}
                                        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <label className="text-sm font-semibold text-ink" htmlFor={`policy-template-${policy.id}`}>
                                        Template
                                      </label>
                                      <select
                                        id={`policy-template-${policy.id}`}
                                        name="templateId"
                                        defaultValue={fallbackTemplateId}
                                        className="min-h-[48px] rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                                      >
                                        {templates.data.map((template) => (
                                          <option key={template.id} value={template.id}>
                                            {template.title}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="grid gap-2 xl:col-span-2">
                                      <label className="text-sm font-semibold text-ink" htmlFor={`policy-owner-${policy.id}`}>
                                        Owner
                                      </label>
                                      <input
                                        id={`policy-owner-${policy.id}`}
                                        name="ownerName"
                                        defaultValue={policy.owner_name}
                                        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <label className="text-sm font-semibold text-ink" htmlFor={`policy-approver-${policy.id}`}>
                                        Approver
                                      </label>
                                      <input
                                        id={`policy-approver-${policy.id}`}
                                        name="approverName"
                                        defaultValue={policy.approver_name ?? ""}
                                        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <label className="text-sm font-semibold text-ink" htmlFor={`policy-version-${policy.id}`}>
                                        Version
                                      </label>
                                      <input
                                        id={`policy-version-${policy.id}`}
                                        name="version"
                                        defaultValue={policy.version}
                                        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid gap-4 md:grid-cols-3">
                                    <div className="grid gap-2">
                                      <label className="text-sm font-semibold text-ink" htmlFor={`policy-status-${policy.id}`}>
                                        Status
                                      </label>
                                      <select
                                        id={`policy-status-${policy.id}`}
                                        name="status"
                                        defaultValue={policy.status}
                                        className="min-h-[48px] rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                                      >
                                        <option value="draft">Draft</option>
                                        <option value="active">Active</option>
                                        <option value="archived">Archived</option>
                                      </select>
                                    </div>
                                    <div className="grid gap-2">
                                      <label className="text-sm font-semibold text-ink" htmlFor={`policy-effective-${policy.id}`}>
                                        Effective date
                                      </label>
                                      <input
                                        id={`policy-effective-${policy.id}`}
                                        name="effectiveDate"
                                        type="date"
                                        defaultValue={policy.effective_date ?? ""}
                                        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <label className="text-sm font-semibold text-ink" htmlFor={`policy-review-${policy.id}`}>
                                        Review cadence
                                      </label>
                                      <input
                                        id={`policy-review-${policy.id}`}
                                        name="reviewFrequencyDays"
                                        defaultValue={policy.review_frequency_days}
                                        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid gap-2">
                                    <label className="text-sm font-semibold text-ink" htmlFor={`policy-summary-${policy.id}`}>
                                      Summary
                                    </label>
                                    <textarea
                                      id={`policy-summary-${policy.id}`}
                                      name="summary"
                                      rows={4}
                                      defaultValue={policy.summary}
                                      className="rounded-3xl border border-ink/10 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                                    />
                                  </div>

                                  <div className="grid gap-2">
                                    <label className="text-sm font-semibold text-ink" htmlFor={`policy-content-${policy.id}`}>
                                      Content
                                    </label>
                                    <textarea
                                      id={`policy-content-${policy.id}`}
                                      name="content"
                                      rows={14}
                                      defaultValue={policy.content}
                                      className="rounded-[28px] border border-ink/10 bg-white px-4 py-4 text-sm leading-6 text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                                    />
                                  </div>

                                  <div className="flex">
                                    <SubmitButton
                                      pendingLabel="Saving..."
                                      className="min-h-[48px] rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                                    >
                                      Save policy
                                    </SubmitButton>
                                  </div>
                                </form>
                              ) : (
                                <p className="whitespace-pre-line text-sm leading-6 text-ink/75">
                                  {policy.content}
                                </p>
                              )}
                            </div>
                          </details>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] border border-dashed border-ink/15 bg-white/65 p-6 text-sm text-ink/65">
                  No organization policies yet. Start from the template catalog to publish your
                  first policy record for this workspace.
                </div>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
