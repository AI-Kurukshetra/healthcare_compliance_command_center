import Link from "next/link";
import { cookies } from "next/headers";

import { ComplianceMessages } from "@/components/forms/compliance-messages";
import { SubmitButton } from "@/components/forms/submit-button";
import { submitComplianceAssessmentAction } from "@/lib/compliance/actions";
import { formatAssessmentAnswerLabel, type AssessmentQuestionDomain } from "@/lib/compliance";
import { getComplianceFlash } from "@/lib/compliance/state";
import { formatRoleLabel, requirePermission, roleHasPermission } from "@/lib/auth/rbac";
import { ensureAuthAccountRecords, safelyRunAuthSideEffect } from "@/lib/auth/service";
import { createAuditLogEntry } from "@/lib/db/audit-logs";
import {
  getComplianceAssessmentWorkspace,
  getComplianceDashboardSummary
} from "@/lib/db/compliance";
import { getOrganizationWorkspaceByUserId } from "@/lib/db/organizations";
import { createClient } from "@/lib/supabase/server";

function formatPercent(value: number | null, emptyLabel = "No result yet") {
  return value === null ? emptyLabel : `${value}%`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDomainLabel(domain: AssessmentQuestionDomain) {
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

function getScoreBadgeClasses(score: number | null) {
  if (score === null) {
    return "bg-ink/10 text-ink/70";
  }

  if (score >= 85) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (score >= 70) {
    return "bg-sky-100 text-sky-700";
  }

  if (score >= 50) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

function getPriorityClasses(priority: "high" | "medium") {
  return priority === "high"
    ? "bg-rose-100 text-rose-700"
    : "bg-amber-100 text-amber-700";
}

type SummaryCardProps = {
  title: string;
  value: string;
  detail: string;
};

function SummaryCard({ title, value, detail }: SummaryCardProps) {
  return (
    <article className="rounded-[28px] border border-ink/10 bg-white/80 p-5 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ocean">{title}</p>
      <p className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-ink/70">{detail}</p>
    </article>
  );
}

export default async function CompliancePage() {
  const access = await requirePermission("view_reports");
  const flash = getComplianceFlash(cookies());
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

  const [dashboard, assessmentWorkspace] = workspaceData
    ? await Promise.all([
        getComplianceDashboardSummary(workspaceData.organization.id),
        getComplianceAssessmentWorkspace(workspaceData.organization.id)
      ])
    : [
        { data: null, error: workspace.error },
        { data: null, error: workspace.error }
      ];

  const activeTemplate = assessmentWorkspace.data?.activeTemplate ?? null;
  const latestResult = assessmentWorkspace.data?.latestResult ?? null;
  const recentResults = assessmentWorkspace.data?.recentResults ?? [];
  const canManageAssessments = roleHasPermission(access.role, "manage_assessments");
  const visibleError =
    bootstrapError ||
    workspace.error?.message ||
    dashboard.error?.message ||
    assessmentWorkspace.error?.message ||
    null;

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel overflow-hidden p-8 md:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ocean via-signal to-success" />
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
                HIPAA Assessment
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink md:text-5xl">
                {workspaceData?.organization.name ?? "Compliance workspace"}
              </h1>
              <p className="mt-5 text-lg leading-8 text-ink/75">
                Launch the baseline HIPAA questionnaire, calculate the current compliance score,
                and turn control gaps into a remediation plan without leaking state into the URL.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-ink/65">
                <span className="rounded-full bg-ocean/10 px-4 py-2 text-ocean">
                  {workspaceData ? formatRoleLabel(workspaceData.membership.role) : "Authorized viewer"}
                </span>
                {activeTemplate ? (
                  <span className="rounded-full bg-ink/5 px-4 py-2">
                    {activeTemplate.title} v{activeTemplate.version}
                  </span>
                ) : null}
                {dashboard.data ? (
                  <span className="rounded-full bg-ink/5 px-4 py-2">
                    {dashboard.data.widgets.memberCount} active members
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
              >
                Back to Dashboard
              </Link>
              {canManageAssessments ? (
                <span className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white">
                  Assessment manager
                </span>
              ) : (
                <span className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-ink/70">
                  Read-only reporting access
                </span>
              )}
            </div>
          </div>

          <div className="mt-8">
            <ComplianceMessages error={flash.error} message={flash.message} />
          </div>

          {visibleError ? (
            <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              Unable to load the compliance assessment workspace. {visibleError}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Current Score"
              value={formatPercent(latestResult?.score ?? null)}
              detail={
                latestResult
                  ? latestResult.summary
                  : "No completed assessment result is available yet for this organization."
              }
            />
            <SummaryCard
              title="Open Incidents"
              value={String(dashboard.data?.widgets.openIncidents ?? 0)}
              detail="Active incidents continue to influence the broader compliance posture."
            />
            <SummaryCard
              title="Active Risks"
              value={String(dashboard.data?.widgets.activeRisks ?? 0)}
              detail="Tracked risks visible in the current organization workspace."
            />
            <SummaryCard
              title="Remediation Items"
              value={String(latestResult?.recommendationCount ?? 0)}
              detail="Recommended follow-up actions generated from the most recent assessment."
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="glass-panel p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                  Latest Assessment Result
                </p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                  {latestResult ? latestResult.templateTitle : "Awaiting first completed assessment"}
                </h2>
              </div>
              <span
                className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${getScoreBadgeClasses(
                  latestResult?.score ?? null
                )}`}
              >
                {formatPercent(latestResult?.score ?? null)}
              </span>
            </div>

            {latestResult ? (
              <>
                <p className="mt-5 text-sm leading-7 text-ink/75">{latestResult.summary}</p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <article className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Compliant
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-emerald-800">
                      {latestResult.compliantCount}
                    </p>
                  </article>
                  <article className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Partial
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-amber-800">
                      {latestResult.partialCount}
                    </p>
                  </article>
                  <article className="rounded-[24px] border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                      Non-compliant
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-rose-800">
                      {latestResult.nonCompliantCount}
                    </p>
                  </article>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-[28px] border border-ink/10 bg-white/70 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ocean">
                      Domain Scores
                    </p>
                    <div className="mt-5 space-y-4">
                      {latestResult.domainScores.map((domain) => (
                        <div key={domain.domain}>
                          <div className="flex items-center justify-between gap-4 text-sm text-ink/70">
                            <span>{formatDomainLabel(domain.domain)}</span>
                            <span className="font-semibold text-ink">{domain.score}%</span>
                          </div>
                          <div className="mt-2 h-2.5 rounded-full bg-ink/10">
                            <div
                              className="h-2.5 rounded-full bg-gradient-to-r from-ocean to-success"
                              style={{ width: `${domain.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-ink/10 bg-white/70 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ocean">
                      Gap Analysis
                    </p>
                    {latestResult.gaps.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        {latestResult.gaps.map((gap) => (
                          <article
                            key={gap.questionId}
                            className="rounded-3xl border border-ink/10 bg-white/85 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                              <span
                                className={`rounded-full px-3 py-1 ${getPriorityClasses(gap.priority)}`}
                              >
                                {gap.priority} priority
                              </span>
                              <span className="rounded-full bg-ink/5 px-3 py-1 text-ink/65">
                                {formatDomainLabel(gap.domain)}
                              </span>
                              <span className="text-ink/50">
                                {formatAssessmentAnswerLabel(gap.answer)}
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-ink">{gap.question}</p>
                            <p className="mt-2 text-sm leading-6 text-ink/70">{gap.impact}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
                        No active control gaps were identified in the latest assessment.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-[28px] border border-dashed border-ink/15 bg-white/60 p-6 text-sm leading-7 text-ink/70">
                Complete the HIPAA questionnaire to generate a baseline score, gap analysis, and
                remediation plan for this organization.
              </div>
            )}
          </section>

          <section className="glass-panel p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
              Assessment History
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
              Recent submissions
            </h2>

            {recentResults.length > 0 ? (
              <div className="mt-6 space-y-3">
                {recentResults.map((result) => (
                  <article
                    key={result.id}
                    className="rounded-[24px] border border-ink/10 bg-white/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-ink">{result.templateTitle}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink/45">
                          {formatDateTime(result.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getScoreBadgeClasses(
                          result.score
                        )}`}
                      >
                        {result.score}%
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink/70">{result.summary}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
                      Gaps: {result.gapCount} • Recommendations: {result.recommendationCount}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-ink/15 bg-white/60 p-5 text-sm text-ink/65">
                No assessment history yet.
              </div>
            )}

            <div className="mt-6 rounded-[24px] border border-ocean/15 bg-ocean/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ocean">
                Supporting context
              </p>
              <dl className="mt-4 grid gap-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink/60">Pending audits</dt>
                  <dd className="font-semibold text-ink">
                    {dashboard.data?.widgets.pendingAudits ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink/60">Training completion</dt>
                  <dd className="font-semibold text-ink">
                    {formatPercent(dashboard.data?.widgets.trainingCompletionRate ?? null, "N/A")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink/60">Mandatory courses</dt>
                  <dd className="font-semibold text-ink">
                    {dashboard.data?.widgets.mandatoryCourses ?? 0}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-panel p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                  Assessment Questionnaire
                </p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                  {activeTemplate?.title ?? "HIPAA baseline questionnaire"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70">
                  {activeTemplate?.description ??
                    "The baseline questionnaire is currently unavailable."}
                </p>
              </div>
              {activeTemplate ? (
                <span className="rounded-full bg-ink/5 px-4 py-2 text-sm font-semibold text-ink/70">
                  {activeTemplate.questions.length} control questions
                </span>
              ) : null}
            </div>

            {canManageAssessments && activeTemplate ? (
              <form action={submitComplianceAssessmentAction} className="mt-6 space-y-4">
                <input type="hidden" name="templateSlug" value={activeTemplate.slug} />
                {activeTemplate.questions.map((question) => (
                  <article
                    key={question.id}
                    className="rounded-[28px] border border-ink/10 bg-white/80 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                      <span className="rounded-full bg-ocean/10 px-3 py-1 text-ocean">
                        {formatDomainLabel(question.domain)}
                      </span>
                      <span className="rounded-full bg-ink/5 px-3 py-1 text-ink/65">
                        Weight {question.weight}
                      </span>
                    </div>
                    <p className="mt-4 text-base font-semibold text-ink">{question.prompt}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/65">{question.guidance}</p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {(["yes", "partial", "no"] as const).map((value, index) => (
                        <label
                          key={value}
                          className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink transition hover:border-ocean/35 hover:bg-ocean/5"
                        >
                          <input
                            type="radio"
                            name={`answer_${question.id}`}
                            value={value}
                            required={index === 0}
                            className="h-4 w-4 border-ink/20 text-ocean focus:ring-ocean"
                          />
                          <span>{formatAssessmentAnswerLabel(value)}</span>
                        </label>
                      ))}
                    </div>
                  </article>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-ink/10 bg-white/70 p-5">
                  <p className="max-w-2xl text-sm leading-6 text-ink/65">
                    Submitting the questionnaire calculates the score, stores the result, and
                    creates an audit log entry for this assessment event.
                  </p>
                  <SubmitButton
                    pendingLabel="Calculating assessment..."
                    className="min-h-[48px] rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                  >
                    Complete assessment
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <div className="mt-6 rounded-[28px] border border-dashed border-ink/15 bg-white/60 p-6 text-sm leading-7 text-ink/70">
                Your current role can review assessment outcomes, but only owners, admins, and
                compliance officers can submit a new HIPAA assessment.
              </div>
            )}
          </section>

          <section className="glass-panel p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
              Remediation Recommendations
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
              Prioritized next actions
            </h2>

            {latestResult && latestResult.recommendations.length > 0 ? (
              <div className="mt-6 space-y-3">
                {latestResult.recommendations.map((recommendation) => (
                  <article
                    key={recommendation.questionId}
                    className="rounded-[24px] border border-ink/10 bg-white/80 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                      <span
                        className={`rounded-full px-3 py-1 ${getPriorityClasses(
                          recommendation.priority
                        )}`}
                      >
                        {recommendation.priority}
                      </span>
                      <span className="rounded-full bg-ink/5 px-3 py-1 text-ink/65">
                        {formatDomainLabel(recommendation.domain)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink">{recommendation.title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/70">{recommendation.action}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-ink/15 bg-white/60 p-5 text-sm text-ink/65">
                Recommendations will appear after the first completed assessment.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
