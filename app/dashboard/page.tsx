import Link from "next/link";
import { redirect } from "next/navigation";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { SubmitButton } from "@/components/forms/submit-button";
import { logoutAction } from "@/lib/auth/actions";
import { currentUserHasPermission, formatRoleLabel } from "@/lib/auth/rbac";
import { ensureAuthAccountRecords, safelyRunAuthSideEffect } from "@/lib/auth/service";
import { createAuditLogEntry } from "@/lib/db/audit-logs";
import { getDashboardSummary } from "@/lib/db/dashboard";
import { getOrganizationWorkspaceByUserId } from "@/lib/db/organizations";
import { getTrainingDashboardSummary } from "@/lib/db/training";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatScore(value: number | null) {
  return value === null ? "No score yet" : `${value}%`;
}

function formatIncidentStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getMetricValueClasses(value: string) {
  return /^\d+%?$/.test(value)
    ? "mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold text-ink"
    : "mt-4 text-lg font-semibold text-ink/65";
}

function getCompactMetricValueClasses(value: string) {
  return /^\d+%?$/.test(value)
    ? "mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink"
    : "mt-3 text-base font-semibold text-ink/65";
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let bootstrapError: string | null = null;

  try {
    await ensureAuthAccountRecords(user);
  } catch (error) {
    bootstrapError = error instanceof Error ? error.message : "Account bootstrap failed.";
  }

  const workspace = await getOrganizationWorkspaceByUserId(user.id);
  const workspaceData = workspace.data;

  if (workspaceData) {
    await safelyRunAuthSideEffect(async () => {
      await createAuditLogEntry({
        organizationId: workspaceData.organization.id,
        userId: user.id,
        action: "dashboard_viewed",
        entity: "dashboard",
        entityId: workspaceData.organization.id,
        details: {
          role: workspaceData.membership.role
        }
      });
    });
  }

  const dashboard = workspaceData
    ? await getDashboardSummary(workspaceData.organization.id)
    : { data: null, error: workspace.error };
  const canViewIncidents = await currentUserHasPermission("view_incidents");
  const canManageAssessments = await currentUserHasPermission("manage_assessments");
  const canCompleteTraining = await currentUserHasPermission("complete_training");
  const canViewReports = await currentUserHasPermission("view_reports");
  const trainingSummary =
    workspaceData && (canManageAssessments || canCompleteTraining)
      ? await getTrainingDashboardSummary(
          workspaceData.organization.id,
          user.id,
          canManageAssessments
        )
      : { data: null, error: null };

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel overflow-hidden p-8 md:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ocean via-signal to-success" />
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">Dashboard</p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
                {workspace.data?.organization.name ?? "Organization setup required"}
              </h1>
              <p className="mt-4 max-w-3xl text-lg text-ink/75">
                {workspace.data
                  ? "Monitor organization risk, active incidents, and assessment completion from one secure operating view."
                  : "Your account is authenticated, but the organization workspace is not fully provisioned yet."}
              </p>
            </div>
            {workspace.data ? (
              <div className="rounded-[28px] border border-white/70 bg-white/75 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ocean">
                  Signed in as
                </p>
                <p className="mt-2 text-base font-semibold text-ink">{user.email ?? user.id}</p>
                <p className="mt-1 text-sm text-ink/65">
                  {formatRoleLabel(workspace.data.membership.role)} in{" "}
                  {workspace.data.organization.plan ?? "Starter"} plan
                </p>
              </div>
            ) : null}
          </div>

          {workspace.error || dashboard.error || trainingSummary.error || bootstrapError ? (
            <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {bootstrapError
                ? `Unable to reconcile this account with an organization workspace. ${bootstrapError}`
                : "Unable to load dashboard data. Verify the organization, profile, RBAC, and training migrations before opening protected compliance modules."}
            </div>
          ) : null}

          {workspace.data && dashboard.data ? (
            <>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <article className="rounded-[28px] border border-ink/10 bg-white/80 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                    Risk Summary
                  </p>
                  <p className="mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold text-ink">
                    {dashboard.data.risks.highOrCritical}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-ink/70">
                    High or critical risks currently require attention across{" "}
                    {dashboard.data.risks.total} tracked risk records.
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-alert">
                    Critical only: {dashboard.data.risks.critical}
                  </p>
                </article>

                <article className="rounded-[28px] border border-ink/10 bg-white/80 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                    Incident Alerts
                  </p>
                  <p className="mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold text-ink">
                    {dashboard.data.incidents.active}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-ink/70">
                    Open or investigating incidents currently visible in your organization.
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-alert">
                    Critical active incidents: {dashboard.data.incidents.criticalActive}
                  </p>
                </article>

                <article className="rounded-[28px] border border-ink/10 bg-white/80 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                    Compliance Score
                  </p>
                  <p className={getMetricValueClasses(formatScore(dashboard.data.assessments.averageScore))}>
                    {formatScore(dashboard.data.assessments.averageScore)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-ink/70">
                    Average score across completed assessments, alongside in-progress compliance work.
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-success">
                    Completed: {dashboard.data.assessments.completedCount} • In progress:{" "}
                    {dashboard.data.assessments.inProgressCount}
                  </p>
                </article>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-[28px] border border-ink/10 bg-white/75 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                        Incident Alerts
                      </p>
                      <p className="mt-2 text-sm text-ink/65">
                        Most recent active incidents scoped to your organization.
                      </p>
                    </div>
                    {canViewIncidents ? (
                      <Link
                        href="/incidents"
                        className="text-sm font-semibold text-ocean transition hover:text-ocean/80"
                      >
                        Open incidents
                      </Link>
                    ) : null}
                  </div>

                  {dashboard.data.incidents.alerts.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {dashboard.data.incidents.alerts.map((incident) => (
                        <article
                          key={incident.id}
                          className="rounded-3xl border border-ink/10 bg-white/80 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                            <span className="rounded-full bg-alert/10 px-3 py-1 text-alert">
                              {incident.severity}
                            </span>
                            <span className="rounded-full bg-ink/5 px-3 py-1 text-ink/65">
                              {formatIncidentStatus(incident.status)}
                            </span>
                            <span className="text-ink/45">{formatDate(incident.updated_at)}</span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-ink/75">{incident.description}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-3xl border border-dashed border-ink/15 bg-white/60 p-5 text-sm text-ink/65">
                      No active incident alerts yet. Once incident tracking starts, the latest open or
                      investigating records will appear here.
                    </div>
                  )}
                </section>

                <div className="grid gap-4">
                  {trainingSummary.data ? (
                    <section className="rounded-[28px] border border-success/20 bg-success/5 p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                            Training Readiness
                          </p>
                          <p className="mt-2 max-w-sm text-sm leading-6 text-ink/65">
                            {trainingSummary.data.scope === "organization"
                              ? "Organization-wide assignment completion and due-date pressure."
                              : "Your assigned training completion and upcoming due dates."}
                          </p>
                        </div>
                        <Link
                          href="/training"
                          className="inline-flex min-h-[40px] w-fit shrink-0 items-center justify-center rounded-2xl border border-success/20 bg-white/85 px-4 py-2 text-sm font-semibold text-ink transition hover:border-success/35 hover:bg-white"
                        >
                          Open Training
                        </Link>
                      </div>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                        <div className="rounded-3xl border border-white/70 bg-white/80 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] leading-5 text-ocean">
                            Completion
                          </p>
                          <p className={getCompactMetricValueClasses(formatScore(trainingSummary.data.completionRate))}>
                            {formatScore(trainingSummary.data.completionRate)}
                          </p>
                        </div>
                        <div className="rounded-3xl border border-white/70 bg-white/80 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] leading-5 text-ocean">
                            Overdue Alerts
                          </p>
                          <p className={getCompactMetricValueClasses(String(trainingSummary.data.overdueAssignments))}>
                            {trainingSummary.data.overdueAssignments}
                          </p>
                        </div>
                        <div className="rounded-3xl border border-white/70 bg-white/80 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] leading-5 text-ocean">
                            Assigned
                          </p>
                          <p className={getCompactMetricValueClasses(String(trainingSummary.data.totalAssignments))}>
                            {trainingSummary.data.totalAssignments}
                          </p>
                        </div>
                      </div>
                      {trainingSummary.data.alerts.length > 0 ? (
                        <div className="mt-5 space-y-3">
                          {trainingSummary.data.alerts.map((assignment) => (
                            <article
                              key={assignment.assignmentId}
                              className="rounded-3xl border border-white/70 bg-white/85 p-4"
                            >
                              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                                <span className="rounded-full bg-white px-3 py-1 text-ocean">
                                  {assignment.courseTitle}
                                </span>
                                <span
                                  className={`rounded-full px-3 py-1 ${
                                    assignment.isOverdue
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-signal/10 text-signal"
                                  }`}
                                >
                                  {assignment.isOverdue ? "Overdue" : "Upcoming"}
                                </span>
                              </div>
                              <p className="mt-3 text-sm text-ink/75">
                                {assignment.assignedUserName} due {formatDate(assignment.dueAt)}
                              </p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-5 rounded-3xl border border-dashed border-success/20 bg-white/70 p-4 text-sm text-ink/65">
                          No overdue or upcoming training alerts right now.
                        </div>
                      )}
                    </section>
                  ) : null}

                  <section className="rounded-[28px] border border-ocean/15 bg-ocean/5 p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                      Operations Snapshot
                    </p>
                    <dl className="mt-5 grid gap-4">
                      <div>
                        <dt className="text-sm text-ink/55">Organization</dt>
                        <dd className="mt-2 text-base font-semibold text-ink">
                          {workspace.data.organization.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-ink/55">Role</dt>
                        <dd className="mt-2 text-base font-semibold text-ink">
                          {formatRoleLabel(workspace.data.membership.role)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-ink/55">Members</dt>
                        <dd className="mt-2 text-base font-semibold text-ink">
                          {workspace.data.memberCount}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section className="rounded-[28px] border border-ink/10 bg-white/75 p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                      Quick Actions
                    </p>
                    <div className="mt-5 grid gap-3">
                      <Link
                        href="/profile"
                        className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                      >
                        Manage profile
                      </Link>
                      <RoleGuard permission="manage_assessments">
                        <Link
                          href="/compliance"
                          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                        >
                          Review assessments
                        </Link>
                      </RoleGuard>
                      <RoleGuard permission="view_incidents">
                        <Link
                          href="/incidents"
                          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                        >
                          View incidents
                        </Link>
                      </RoleGuard>
                      <RoleGuard permission="view_reports">
                        <Link
                          href="/risks"
                          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                        >
                          Risk dashboard
                        </Link>
                      </RoleGuard>
                      <RoleGuard permission="view_reports">
                        <Link
                          href="/documents"
                          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                        >
                          Open policy library
                        </Link>
                      </RoleGuard>
                      <RoleGuard permission="view_reports">
                        <Link
                          href="/reports"
                          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                        >
                          Open reports
                        </Link>
                      </RoleGuard>
                      {(canManageAssessments || canCompleteTraining) ? (
                        <Link
                          href="/training"
                          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                        >
                          Training workspace
                        </Link>
                      ) : null}
                      <RoleGuard permission="manage_users">
                        <Link
                          href="/users"
                          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                        >
                          Manage members
                        </Link>
                      </RoleGuard>
                    </div>
                  </section>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-ink/65">
                <span className="rounded-full bg-white/80 px-4 py-2">
                  Incident visibility: {canViewIncidents ? "Enabled" : "Restricted"}
                </span>
                <span className="rounded-full bg-white/80 px-4 py-2">
                  Assessment management: {canManageAssessments ? "Enabled" : "Restricted"}
                </span>
                <span className="rounded-full bg-white/80 px-4 py-2">
                  Training completion: {canCompleteTraining ? "Enabled" : "Restricted"}
                </span>
                <span className="rounded-full bg-white/80 px-4 py-2">
                  Report access: {canViewReports ? "Enabled" : "Restricted"}
                </span>
              </div>
            </>
          ) : null}

          <form action={logoutAction} className="mt-8">
            <SubmitButton
              pendingLabel="Signing out..."
              className="min-h-[48px] rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
            >
              Sign out
            </SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
