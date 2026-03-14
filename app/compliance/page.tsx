import Link from "next/link";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { formatRoleLabel, requirePermission } from "@/lib/auth/rbac";
import { ensureAuthAccountRecords, safelyRunAuthSideEffect } from "@/lib/auth/service";
import { createAuditLogEntry } from "@/lib/db/audit-logs";
import { getComplianceDashboardSummary, type ComplianceScoreStatus } from "@/lib/db/compliance";
import { getOrganizationWorkspaceByUserId } from "@/lib/db/organizations";
import { createClient } from "@/lib/supabase/server";

function formatPercent(value: number | null, emptyLabel = "Not started") {
  return value === null ? emptyLabel : `${value}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getScoreCopy(status: ComplianceScoreStatus) {
  switch (status) {
    case "strong":
      return {
        badge: "Stable posture",
        summary: "Controls are scoring well with no critical pressure from active incidents."
      };
    case "steady":
      return {
        badge: "Healthy progress",
        summary: "The organization is operating from a solid baseline, with a manageable remediation load."
      };
    case "attention":
      return {
        badge: "Needs attention",
        summary: "Assessment coverage exists, but the current risk and incident load needs active follow-through."
      };
    case "critical":
      return {
        badge: "Escalate review",
        summary: "Critical risks or unresolved incidents are suppressing the current compliance posture."
      };
    case "not_started":
      return {
        badge: "Awaiting baseline",
        summary: "Run and complete assessments to establish a defensible compliance score."
      };
  }
}

function getScoreClasses(status: ComplianceScoreStatus) {
  switch (status) {
    case "strong":
      return {
        badge: "bg-success/15 text-success",
        meter: "#2f855a"
      };
    case "steady":
      return {
        badge: "bg-ocean/15 text-ocean",
        meter: "#2f7ea1"
      };
    case "attention":
      return {
        badge: "bg-signal/15 text-signal",
        meter: "#d66b2d"
      };
    case "critical":
      return {
        badge: "bg-alert/15 text-alert",
        meter: "#b33a3a"
      };
    case "not_started":
      return {
        badge: "bg-ink/10 text-ink/70",
        meter: "#8ba0b2"
      };
  }
}

function getSeverityClasses(severity: "low" | "medium" | "high" | "critical") {
  switch (severity) {
    case "critical":
      return "bg-alert/10 text-alert";
    case "high":
      return "bg-signal/10 text-signal";
    case "medium":
      return "bg-ocean/10 text-ocean";
    case "low":
      return "bg-success/10 text-success";
  }
}

function getBarWidth(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.max(8, Math.round((value / total) * 100));
}

type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
};

function MetricCard({ title, value, detail }: MetricCardProps) {
  return (
    <article className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-panel backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ocean">{title}</p>
      <p className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-ink/70">{detail}</p>
    </article>
  );
}

type DistributionRowProps = {
  label: string;
  value: number;
  total: number;
  toneClass: string;
};

function DistributionRow({ label, value, total, toneClass }: DistributionRowProps) {
  const width = getBarWidth(value, total);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm text-ink/70">
        <span>{label}</span>
        <span className="font-semibold text-ink">{value}</span>
      </div>
      <div className="mt-2 h-2.5 rounded-full bg-ink/10">
        <div
          className={`h-2.5 rounded-full ${toneClass}`}
          style={{ width: total === 0 ? "0%" : `${width}%` }}
        />
      </div>
    </div>
  );
}

export default async function CompliancePage() {
  const access = await requirePermission("view_reports");
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  let bootstrapError: string | null = null;

  if (user) {
    try {
      await ensureAuthAccountRecords(user);
    } catch (error) {
      bootstrapError = error instanceof Error ? error.message : "Account bootstrap failed.";
    }
  }

  const workspace = await getOrganizationWorkspaceByUserId(access.userId);
  const workspaceData = workspace.data;

  if (workspaceData) {
    await safelyRunAuthSideEffect(async () => {
      await createAuditLogEntry({
        organizationId: workspaceData.organization.id,
        userId: access.userId,
        action: "compliance_dashboard_viewed",
        entity: "compliance_dashboard",
        entityId: workspaceData.organization.id,
        details: {
          role: access.role
        }
      });
    });
  }

  const dashboard = workspaceData
    ? await getComplianceDashboardSummary(workspaceData.organization.id)
    : { data: null, error: workspace.error };

  const score = dashboard.data?.score ?? null;
  const scoreValue = score?.value ?? 0;
  const scoreCopy = getScoreCopy(score?.status ?? "not_started");
  const scoreClasses = getScoreClasses(score?.status ?? "not_started");
  const pendingAssessments = score ? score.inProgressAssessments + score.draftAssessments : 0;

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel overflow-hidden p-8 md:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ocean via-signal to-success" />
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
                Compliance
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink md:text-5xl">
                {workspaceData?.organization.name ?? "Compliance workspace"}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/75">
                Unified visibility across assessments, risks, incidents, audit activity, and
                training coverage for the current organization.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-ink/65">
                <span className="rounded-full bg-ocean/10 px-4 py-2 text-ocean">
                  {workspaceData ? formatRoleLabel(workspaceData.membership.role) : "Authorized viewer"}
                </span>
                {workspaceData?.organization.plan ? (
                  <span className="rounded-full bg-ink/5 px-4 py-2">
                    {formatLabel(workspaceData.organization.plan)} plan
                  </span>
                ) : null}
                {dashboard.data ? (
                  <span className="rounded-full bg-ink/5 px-4 py-2">
                    {dashboard.data.widgets.memberCount} active members
                  </span>
                ) : null}
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-panel backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ocean">
                    Overall Compliance
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-display)] text-5xl font-semibold text-ink">
                    {formatPercent(score ? score.value : null)}
                  </p>
                </div>
                <div
                  className="grid h-24 w-24 place-items-center rounded-full"
                  style={{
                    backgroundImage: `conic-gradient(${scoreClasses.meter} ${scoreValue}%, rgba(139, 160, 178, 0.2) ${scoreValue}% 100%)`
                  }}
                >
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-sm font-semibold text-ink">
                    {score && score.value !== null ? score.value : "N/A"}
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${scoreClasses.badge}`}
                >
                  {scoreCopy.badge}
                </span>
                <p className="mt-4 text-sm leading-6 text-ink/70">{scoreCopy.summary}</p>
              </div>
            </div>
          </div>

          {workspace.error || dashboard.error || bootstrapError ? (
            <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {bootstrapError
                ? `Unable to reconcile this account with an organization workspace. ${bootstrapError}`
                : "Unable to load the compliance dashboard. Confirm the organization workspace and supporting compliance tables are provisioned before using this route."}
            </div>
          ) : null}

          {dashboard.data ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                title="Compliance Score"
                value={formatPercent(dashboard.data.score.value)}
                detail={`${dashboard.data.score.completedAssessments} completed assessments are contributing to the current posture.`}
              />
              <MetricCard
                title="Open Incidents"
                value={`${dashboard.data.widgets.openIncidents}`}
                detail={`${dashboard.data.incidents.criticalActive} critical incidents are still active across open and investigating states.`}
              />
              <MetricCard
                title="Active Risks"
                value={`${dashboard.data.widgets.activeRisks}`}
                detail={`${dashboard.data.risks.elevated} high or critical risks currently need remediation attention.`}
              />
              <MetricCard
                title="Pending Audits"
                value={`${dashboard.data.widgets.pendingAudits}`}
                detail="Derived from draft and in-progress assessment work until the audit scheduling module is implemented."
              />
              <MetricCard
                title="Training Status"
                value={formatPercent(dashboard.data.widgets.trainingCompletionRate, "No baseline")}
                detail={`${dashboard.data.training.mandatoryCourses} mandatory courses tracked across ${dashboard.data.widgets.memberCount} members.`}
              />
            </div>
          ) : null}
        </section>

        {dashboard.data ? (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="glass-panel p-6 md:p-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                      Assessment Posture
                    </p>
                    <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                      Measure the current audit backlog.
                    </h2>
                  </div>
                  <p className="text-sm text-ink/60">
                    Completed: {dashboard.data.score.completedAssessments} {"  "}
                    Pending: {pendingAssessments}
                  </p>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[28px] border border-ocean/15 bg-ocean/5 p-5">
                    <p className="text-sm text-ink/60">Completed</p>
                    <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
                      {dashboard.data.score.completedAssessments}
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-signal/15 bg-signal/5 p-5">
                    <p className="text-sm text-ink/60">In Progress</p>
                    <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
                      {dashboard.data.score.inProgressAssessments}
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-ink/10 bg-ink/5 p-5">
                    <p className="text-sm text-ink/60">Draft</p>
                    <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
                      {dashboard.data.score.draftAssessments}
                    </p>
                  </div>
                </div>

                <div className="mt-8 rounded-[28px] border border-white/70 bg-white/70 p-5">
                  <div className="flex items-center justify-between gap-4 text-sm text-ink/70">
                    <span>Audit readiness</span>
                    <span className="font-semibold text-ink">
                      {dashboard.data.score.completedAssessments}/{dashboard.data.score.completedAssessments + pendingAssessments || 0}
                    </span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-ink/10">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-ocean to-success"
                      style={{
                        width: `${
                          dashboard.data.score.completedAssessments + pendingAssessments === 0
                            ? 0
                            : Math.round(
                                (dashboard.data.score.completedAssessments /
                                  (dashboard.data.score.completedAssessments + pendingAssessments)) *
                                  100
                              )
                        }%`
                      }}
                    />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-ink/70">
                    Pending audits are currently inferred from assessment records that are not yet
                    completed, which keeps the dashboard usable before the dedicated audit calendar
                    ships.
                  </p>
                </div>
              </section>

              <section className="glass-panel p-6 md:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                  Risk Distribution
                </p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                  Severity mix across tracked risks.
                </h2>
                <div className="mt-8 space-y-5">
                  <DistributionRow
                    label="Critical"
                    value={dashboard.data.risks.critical}
                    total={dashboard.data.risks.total}
                    toneClass="bg-alert"
                  />
                  <DistributionRow
                    label="High"
                    value={dashboard.data.risks.high}
                    total={dashboard.data.risks.total}
                    toneClass="bg-signal"
                  />
                  <DistributionRow
                    label="Medium"
                    value={dashboard.data.risks.medium}
                    total={dashboard.data.risks.total}
                    toneClass="bg-ocean"
                  />
                  <DistributionRow
                    label="Low"
                    value={dashboard.data.risks.low}
                    total={dashboard.data.risks.total}
                    toneClass="bg-success"
                  />
                </div>

                <div className="mt-8 rounded-[28px] border border-ink/10 bg-white/75 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ocean">
                      Priority Queue
                    </p>
                    <span className="text-sm text-ink/60">
                      {dashboard.data.risks.elevated} elevated risks
                    </span>
                  </div>
                  {dashboard.data.risks.top.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {dashboard.data.risks.top.map((risk) => (
                        <article key={risk.id} className="rounded-2xl border border-ink/10 bg-white px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getSeverityClasses(risk.severity)}`}
                            >
                              {risk.severity}
                            </span>
                            <span className="text-xs text-ink/45">{formatDate(risk.updated_at)}</span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-ink/75">{risk.description}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-ink/15 bg-white/60 p-4 text-sm text-ink/65">
                      No risk records have been created yet for this organization.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <section className="glass-panel p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                      Incident Watchlist
                    </p>
                    <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                      Open issues that affect compliance exposure.
                    </h2>
                  </div>
                  <Link
                    href="/incidents"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                  >
                    View incidents
                  </Link>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5">
                    <p className="text-sm text-ink/60">Open</p>
                    <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
                      {dashboard.data.incidents.open}
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
                    <p className="text-sm text-ink/60">Investigating</p>
                    <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
                      {dashboard.data.incidents.investigating}
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-sm text-ink/60">Resolved</p>
                    <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
                      {dashboard.data.incidents.resolved}
                    </p>
                  </div>
                </div>

                {dashboard.data.incidents.recent.length > 0 ? (
                  <div className="mt-8 space-y-3">
                    {dashboard.data.incidents.recent.map((incident) => (
                      <article key={incident.id} className="rounded-[28px] border border-ink/10 bg-white/75 p-5">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                          <span
                            className={`rounded-full px-3 py-1 ${getSeverityClasses(incident.severity)}`}
                          >
                            {incident.severity}
                          </span>
                          <span className="rounded-full bg-ink/5 px-3 py-1 text-ink/65">
                            {formatLabel(incident.status)}
                          </span>
                          <span className="text-ink/45">{formatDate(incident.updated_at)}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-ink/75">{incident.description}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-8 rounded-[28px] border border-dashed border-ink/15 bg-white/60 p-5 text-sm text-ink/65">
                    No open or investigating incidents are currently on the watchlist.
                  </div>
                )}
              </section>

              <div className="grid gap-6">
                <section className="glass-panel p-6 md:p-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                    Training Coverage
                  </p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                    Logged completions against the mandatory program.
                  </h2>

                  <div className="mt-8 rounded-[28px] border border-ocean/15 bg-ocean/5 p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-ink/60">Completion status</p>
                        <p className="mt-3 font-[family-name:var(--font-display)] text-5xl font-semibold text-ink">
                          {formatPercent(dashboard.data.training.completionRate, "No baseline")}
                        </p>
                      </div>
                      <div className="text-right text-sm text-ink/65">
                        <p>{dashboard.data.training.mandatoryCourses} mandatory courses</p>
                        <p>{dashboard.data.training.optionalCourses} optional courses</p>
                      </div>
                    </div>
                    <div className="mt-5 h-3 rounded-full bg-white/80">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-ocean to-success"
                        style={{
                          width: `${dashboard.data.training.completionRate ?? 0}%`
                        }}
                      />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-ink/70">
                      This rate is derived from distinct `training_course` completion events in the
                      audit log against the current member count and mandatory course catalog.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-white/70 bg-white/75 p-5">
                      <p className="text-sm text-ink/60">Logged completions</p>
                      <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
                        {dashboard.data.training.uniqueCompletions}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white/70 bg-white/75 p-5">
                      <p className="text-sm text-ink/60">Expected completions</p>
                      <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
                        {dashboard.data.training.expectedCompletions}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="glass-panel p-6 md:p-8">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                        Audit Activity
                      </p>
                      <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                        Evidence and recent platform activity.
                      </h2>
                    </div>
                    <p className="text-sm text-ink/60">
                      {dashboard.data.audits.activityLast30Days} events logged in the last 30 days
                    </p>
                  </div>

                  {dashboard.data.audits.recentActivity.length > 0 ? (
                    <div className="mt-8 space-y-3">
                      {dashboard.data.audits.recentActivity.map((entry) => (
                        <article key={entry.id} className="rounded-[24px] border border-ink/10 bg-white/75 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-ink">
                                {formatLabel(entry.action)}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink/45">
                                {formatLabel(entry.entity)} · {entry.entity_id.slice(0, 8)}
                              </p>
                            </div>
                            <span className="text-xs text-ink/45">{formatTimestamp(entry.created_at)}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-8 rounded-[24px] border border-dashed border-ink/15 bg-white/60 p-5 text-sm text-ink/65">
                      No audit activity has been logged yet for this organization.
                    </div>
                  )}
                </section>
              </div>
            </div>

            <section className="glass-panel p-6 md:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                    Recommended Actions
                  </p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                    Move directly from signal to follow-up work.
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <RoleGuard permission="manage_assessments">
                    <Link
                      href="/dashboard"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                    >
                      Executive dashboard
                    </Link>
                  </RoleGuard>
                  <RoleGuard permission="view_incidents">
                    <Link
                      href="/incidents"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                    >
                      Incident queue
                    </Link>
                  </RoleGuard>
                  <RoleGuard permission="view_reports">
                    <Link
                      href="/reports"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                    >
                      Reporting
                    </Link>
                  </RoleGuard>
                  <Link
                    href="/documents"
                    className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                  >
                    Documents
                  </Link>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
