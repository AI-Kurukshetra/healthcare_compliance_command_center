import Link from "next/link";

import { formatRoleLabel, requirePermission } from "@/lib/auth/rbac";
import { ensureAuthAccountRecords, safelyRunAuthSideEffect } from "@/lib/auth/service";
import { createAuditLogEntry } from "@/lib/db/audit-logs";
import { getOrganizationWorkspaceByUserId } from "@/lib/db/organizations";
import { getRiskManagementSummary } from "@/lib/db/risks";
import { createClient } from "@/lib/supabase/server";
import type { RiskSeverity, RiskStatusKey } from "@/types/compliance";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getSeverityBadgeClasses(severity: RiskSeverity) {
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

function getSeverityPanelClasses(severity: RiskSeverity) {
  switch (severity) {
    case "critical":
      return "bg-alert";
    case "high":
      return "bg-signal";
    case "medium":
      return "bg-ocean";
    case "low":
      return "bg-success";
  }
}

function getStatusBadgeClasses(status: RiskStatusKey) {
  switch (status) {
    case "escalated":
      return "bg-alert/10 text-alert";
    case "monitoring":
      return "bg-signal/10 text-signal";
    case "mitigating":
      return "bg-ocean/10 text-ocean";
    case "identified":
      return "bg-ink/10 text-ink/70";
    case "resolved":
      return "bg-success/10 text-success";
  }
}

function getBarWidth(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.max(6, Math.round((value / total) * 100));
}

function getMetricValueClasses(value: string) {
  return /^\d+%?$/.test(value)
    ? "mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink"
    : "mt-4 text-lg font-semibold text-ink/65";
}

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <article className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-panel backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ocean">{label}</p>
      <p className={getMetricValueClasses(value)}>{value}</p>
      <p className="mt-3 text-sm leading-6 text-ink/70">{detail}</p>
    </article>
  );
}

function getHeatCellClasses(levelKey: RiskSeverity, count: number) {
  if (count === 0) {
    return "border border-dashed border-ink/10 bg-white text-ink/45";
  }

  switch (levelKey) {
    case "critical":
      return count > 1
        ? "border border-alert/20 bg-alert/20 text-alert"
        : "border border-alert/15 bg-alert/10 text-alert";
    case "high":
      return count > 1
        ? "border border-signal/20 bg-signal/20 text-signal"
        : "border border-signal/15 bg-signal/10 text-signal";
    case "medium":
      return count > 1
        ? "border border-ocean/20 bg-ocean/20 text-ocean"
        : "border border-ocean/15 bg-ocean/10 text-ocean";
    case "low":
      return count > 1
        ? "border border-success/20 bg-success/20 text-success"
        : "border border-success/15 bg-success/10 text-success";
  }
}

type SeverityBarProps = {
  label: string;
  value: number;
  total: number;
  toneClass: string;
};

function SeverityBar({ label, value, total, toneClass }: SeverityBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm text-ink/70">
        <span>{label}</span>
        <span className="font-semibold text-ink">{value}</span>
      </div>
      <div className="mt-2 h-2.5 rounded-full bg-ink/10">
        <div
          className={`h-2.5 rounded-full ${toneClass}`}
          style={{ width: total === 0 ? "0%" : `${getBarWidth(value, total)}%` }}
        />
      </div>
    </div>
  );
}

export default async function RisksPage() {
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
        action: "risk_dashboard_viewed",
        entity: "risk_dashboard",
        entityId: workspaceData.organization.id,
        details: {
          role: access.role
        }
      });
    });
  }

  const dashboard = workspaceData
    ? await getRiskManagementSummary(workspaceData.organization.id)
    : { data: null, error: workspace.error };
  const riskData = dashboard.data;

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel overflow-hidden p-8 md:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ocean via-signal to-alert" />
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
                Risk Management
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink md:text-5xl">
                {workspaceData?.organization.name ?? "Risk dashboard"}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/75">
                Centralized risk register coverage, severity exposure, and threat monitoring for the
                current organization.
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
                {riskData ? (
                  <span className="rounded-full bg-ink/5 px-4 py-2">
                    {riskData.overview.trackedRisks} risk items tracked
                  </span>
                ) : null}
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-panel backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ocean">
                Risk Status
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-5xl font-semibold text-ink">
                {riskData?.overview.activeThreats ?? 0}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Risk items currently in monitoring or escalated states and requiring active
                operational review.
              </p>
              {riskData ? (
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-alert/8 px-4 py-3">
                    <p className="text-ink/55">Elevated</p>
                    <p className="mt-2 text-xl font-semibold text-ink">
                      {riskData.overview.elevatedRisks}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-signal/8 px-4 py-3">
                    <p className="text-ink/55">Threats</p>
                    <p className="mt-2 text-xl font-semibold text-ink">
                      {riskData.overview.activeThreats}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-ocean/8 px-4 py-3">
                    <p className="text-ink/55">Overdue</p>
                    <p className="mt-2 text-xl font-semibold text-ink">
                      {riskData.overview.overdueItems}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-success/8 px-4 py-3">
                    <p className="text-ink/55">Resolved</p>
                    <p className="mt-2 text-xl font-semibold text-ink">
                      {riskData.overview.resolvedItems}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {workspace.error || dashboard.error || bootstrapError ? (
            <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {bootstrapError
                ? `Unable to reconcile this account with an organization workspace. ${bootstrapError}`
                : "Unable to load risk management data. Verify the organization, RBAC, and domain migrations before opening this dashboard."}
            </div>
          ) : null}

          {workspaceData && riskData ? (
            <>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Risk Register"
                  value={`${riskData.overview.trackedRisks}`}
                  detail="Tracked risk records available to this organization under current tenant isolation."
                />
                <MetricCard
                  label="Elevated Severity"
                  value={`${riskData.overview.elevatedRisks}`}
                  detail="High or critical risks requiring near-term remediation attention."
                />
                <MetricCard
                  label="Active Threats"
                  value={`${riskData.overview.activeThreats}`}
                  detail="Risk items currently flagged as active threat monitoring or escalation work."
                />
                <MetricCard
                  label="Overdue Items"
                  value={`${riskData.overview.overdueItems}`}
                  detail="Open items that have crossed their target resolution date and need follow-up."
                />
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[28px] border border-ink/10 bg-white/75 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                        Risk Heat Map
                      </p>
                      <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                        Status-by-severity exposure across the register.
                      </h2>
                    </div>
                    <span className="rounded-full bg-ink/5 px-4 py-2 text-sm text-ink/65">
                      {riskData.overview.trackedRisks} total records
                    </span>
                  </div>

                  <div className="mt-8 rounded-[28px] border border-ink/10 bg-white/80 p-4">
                    <div className="grid gap-3">
                      <div className="grid grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))] gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
                        <span className="px-3 py-2">Status</span>
                        {riskData.heatMap.levels.map((level) => (
                          <span key={level.key} className="px-3 py-2 text-center">
                            {level.label}
                          </span>
                        ))}
                      </div>
                      {riskData.heatMap.rows.map((row) => (
                        <div
                          key={row.key}
                          className="grid grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))] gap-2"
                        >
                          <div className="rounded-2xl border border-ink/10 bg-ink/5 px-4 py-3">
                            <p className="text-sm font-semibold text-ink">{row.label}</p>
                            <p className="mt-1 text-xs text-ink/55">
                              {row.total} items
                              {row.isThreat ? " • threat state" : ""}
                              {row.isClosed ? " • closed" : ""}
                            </p>
                          </div>
                          {row.cells.map((cell) => (
                            <div
                              key={`${row.key}-${cell.levelKey}`}
                              className={`grid min-h-[78px] place-items-center rounded-2xl px-3 py-3 text-center ${getHeatCellClasses(
                                cell.levelKey,
                                cell.count
                              )}`}
                            >
                              <div>
                                <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
                                  {cell.count}
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.12em]">
                                  {cell.levelKey}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-ink/10 bg-white/75 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                    Severity Indicators
                  </p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                    Readout for review cadence and escalation.
                  </h2>

                  <div className="mt-8 space-y-5">
                    {riskData.severityIndicators.map((indicator) => (
                      <SeverityBar
                        key={indicator.key}
                        label={`${indicator.label} (${indicator.percentage}%)`}
                        value={indicator.count}
                        total={riskData.overview.trackedRisks}
                        toneClass={getSeverityPanelClasses(indicator.key)}
                      />
                    ))}
                  </div>

                  <div className="mt-8 rounded-[28px] border border-ink/10 bg-ink px-5 py-5 text-white">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
                      Severity Guidance
                    </p>
                    <div className="mt-5 space-y-3">
                      {riskData.severityIndicators.map((indicator) => (
                        <div
                          key={indicator.key}
                          className="rounded-2xl bg-white/10 px-4 py-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{indicator.label}</span>
                            <span>{indicator.count}</span>
                          </div>
                          <p className="mt-2 text-white/70">{indicator.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-[28px] border border-ink/10 bg-white/75 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                        Risk Register
                      </p>
                      <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                        Tenant-scoped items ranked by severity and active status.
                      </h2>
                    </div>
                    <span className="rounded-full bg-ink/5 px-4 py-2 text-sm text-ink/65">
                      Top {riskData.register.length} items
                    </span>
                  </div>

                  {riskData.register.length > 0 ? (
                    <div className="mt-8 space-y-3">
                      {riskData.register.map((risk) => (
                        <article
                          key={risk.id}
                          className="rounded-[24px] border border-ink/10 bg-white px-5 py-4"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                            <span
                              className={`rounded-full px-3 py-1 ${getSeverityBadgeClasses(risk.level.key)}`}
                            >
                              {risk.level.label}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 ${getStatusBadgeClasses(risk.status.key)}`}
                            >
                              {risk.status.label}
                            </span>
                            <span className="text-ink/45">Updated {formatDate(risk.updated_at)}</span>
                          </div>
                          <p className="mt-3 text-lg font-semibold text-ink">{risk.title}</p>
                          <p className="mt-3 text-sm leading-6 text-ink/75">{risk.description}</p>
                          <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink/55">
                            <span>Owner: {risk.owner_name ?? "Unassigned"}</span>
                            <span>Source: {formatLabel(risk.source)}</span>
                            <span>Identified: {formatDate(risk.identified_on)}</span>
                            <span>
                              Target:{" "}
                              {risk.target_resolution_date ? formatDate(risk.target_resolution_date) : "None"}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-8 rounded-[24px] border border-dashed border-ink/15 bg-white/60 p-5 text-sm text-ink/65">
                      No risk items have been recorded yet for this organization.
                    </div>
                  )}
                </section>

                <section className="rounded-[28px] border border-ink/10 bg-white/75 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                        Threat Monitoring
                      </p>
                      <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                        Active threat-state risks requiring surveillance.
                      </h2>
                    </div>
                    <Link
                      href="/compliance"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                    >
                      Open compliance
                    </Link>
                  </div>

                  {riskData.threatMonitoring.length > 0 ? (
                    <div className="mt-8 space-y-3">
                      {riskData.threatMonitoring.map((threat) => (
                        <article
                          key={threat.id}
                          className="rounded-[24px] border border-ink/10 bg-white px-5 py-4"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                            <span
                              className={`rounded-full px-3 py-1 ${getSeverityBadgeClasses(threat.level.key)}`}
                            >
                              {threat.level.label}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 ${getStatusBadgeClasses(threat.status.key)}`}
                            >
                              {threat.status.label}
                            </span>
                            <span className="text-ink/45">Updated {formatDate(threat.updated_at)}</span>
                          </div>
                          <p className="mt-3 text-lg font-semibold text-ink">{threat.title}</p>
                          <p className="mt-3 text-sm leading-6 text-ink/75">{threat.description}</p>
                          <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink/55">
                            <span>Owner: {threat.owner_name ?? "Unassigned"}</span>
                            <span>
                              Last review:{" "}
                              {threat.last_reviewed_at ? formatDate(threat.last_reviewed_at) : "Not reviewed"}
                            </span>
                            <span>
                              Target:{" "}
                              {threat.target_resolution_date
                                ? formatDate(threat.target_resolution_date)
                                : "None"}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-8 rounded-[24px] border border-dashed border-ink/15 bg-white/60 p-5 text-sm text-ink/65">
                      No risk items are currently flagged for active threat monitoring.
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
