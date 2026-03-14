import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SubmitButton } from "@/components/forms/submit-button";
import { TrainingMessages } from "@/components/forms/training-messages";
import { getCurrentAccessContext, formatRoleLabel, roleHasPermission } from "@/lib/auth/rbac";
import { safelyRunAuthSideEffect } from "@/lib/auth/service";
import { createAuditLogEntry } from "@/lib/db/audit-logs";
import { getOrganizationWorkspaceByUserId } from "@/lib/db/organizations";
import { listTrainingWorkspace, type TrainingAssignmentView } from "@/lib/db/training";
import {
  assignTrainingAction,
  completeTrainingAssignmentAction,
  sendTrainingReminderAction,
  startTrainingAssignmentAction
} from "@/lib/training/actions";
import { getTrainingFlash } from "@/lib/training/state";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatStatusLabel(status: TrainingAssignmentView["status"]) {
  switch (status) {
    case "assigned":
      return "Assigned";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "overdue":
      return "Overdue";
  }
}

function getStatusClasses(status: TrainingAssignmentView["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "in_progress":
      return "bg-sky-100 text-sky-700";
    case "overdue":
      return "bg-rose-100 text-rose-700";
    case "assigned":
      return "bg-amber-100 text-amber-700";
  }
}

function formatCompletionRate(value: number | null) {
  return value === null ? "N/A" : `${value}%`;
}

function formatScopeLabel(scope: "organization" | "personal") {
  return scope === "organization" ? "Organization-wide" : "My assignments";
}

function sortAssignments(assignments: TrainingAssignmentView[]) {
  return [...assignments].sort(
    (left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
  );
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

export default async function TrainingPage() {
  const access = await getCurrentAccessContext();

  if (!access) {
    redirect("/login");
  }

  const canManageTraining = roleHasPermission(access.role, "manage_assessments");
  const canCompleteTraining = roleHasPermission(access.role, "complete_training");

  if (!canManageTraining && !canCompleteTraining) {
    redirect("/unauthorized");
  }

  const flash = getTrainingFlash(cookies());
  const [workspace, trainingWorkspace] = await Promise.all([
    getOrganizationWorkspaceByUserId(access.userId),
    listTrainingWorkspace(access.organizationId, access.userId, canManageTraining)
  ]);
  const workspaceData = workspace.data;

  if (workspaceData) {
    await safelyRunAuthSideEffect(async () => {
      await createAuditLogEntry({
        organizationId: access.organizationId,
        userId: access.userId,
        action: "training_workspace_viewed",
        entity: "training_workspace",
        entityId: access.organizationId,
        details: {
          role: access.role,
          scope: canManageTraining ? "organization" : "personal"
        }
      });
    });
  }

  const visibleError = workspace.error?.message || trainingWorkspace.error?.message || null;
  const sortedAssignments = sortAssignments(trainingWorkspace.data?.assignments ?? []);
  const attentionAssignments = sortedAssignments.filter((assignment) => assignment.status !== "completed");

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel overflow-hidden p-8 md:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ocean via-signal to-success" />
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
                Employee Training
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink md:text-5xl">
                {workspaceData?.organization.name ?? "Training workspace"}
              </h1>
              <p className="mt-5 text-lg leading-8 text-ink/75">
                Assign mandatory compliance courses, track completion status, and surface overdue
                training before it becomes an audit gap.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-ink/65">
                <span className="rounded-full bg-ocean/10 px-4 py-2 text-ocean">
                  {formatRoleLabel(access.role)}
                </span>
                <span className="rounded-full bg-ink/5 px-4 py-2">
                  {formatScopeLabel(trainingWorkspace.data?.summary.scope ?? "personal")}
                </span>
                <span className="rounded-full bg-ink/5 px-4 py-2">
                  {trainingWorkspace.data?.courses.length ?? 0} course templates
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
                Managers can assign and remind. Assignees can mark training in progress or
                complete directly from this route without leaking workflow state into the URL.
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
            <TrainingMessages error={flash.error} message={flash.message} />
          </div>

          {visibleError ? (
            <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              Unable to load the training workspace. {visibleError}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Completion Rate"
              value={formatCompletionRate(trainingWorkspace.data?.summary.completionRate ?? null)}
              detail="Completion percentage across the currently visible training assignments."
            />
            <SummaryCard
              title="Overdue Alerts"
              value={String(trainingWorkspace.data?.summary.overdueAssignments ?? 0)}
              detail="Assignments that passed their due date without a recorded completion."
            />
            <SummaryCard
              title="Mandatory Courses"
              value={String(trainingWorkspace.data?.summary.mandatoryCourses ?? 0)}
              detail="Tenant-scoped mandatory compliance courses available in the catalog."
            />
            <SummaryCard
              title="Pending Assignments"
              value={String(trainingWorkspace.data?.summary.pendingAssignments ?? 0)}
              detail="Assigned learning still awaiting progress or final completion."
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-panel p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                  {canManageTraining ? "Assignment Operations" : "Assigned Training"}
                </p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
                  {canManageTraining
                    ? "Assign courses and manage reminder cadence."
                    : "Track your assigned compliance learning."}
                </h2>
              </div>
            </div>

            {canManageTraining ? (
              <form action={assignTrainingAction} className="mt-8 rounded-[28px] border border-ink/10 bg-white/75 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-ink" htmlFor="course-id">
                      Course
                    </label>
                    <select
                      id="course-id"
                      name="courseId"
                      defaultValue=""
                      className="min-h-[48px] rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                    >
                      <option value="" disabled>
                        Select course
                      </option>
                      {(trainingWorkspace.data?.courses ?? []).map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                          {course.mandatory ? " (Mandatory)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-ink" htmlFor="user-id">
                      Assignee
                    </label>
                    <select
                      id="user-id"
                      name="userId"
                      defaultValue=""
                      className="min-h-[48px] rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                    >
                      <option value="" disabled>
                        Select member
                      </option>
                      {(trainingWorkspace.data?.members ?? []).map((member) => (
                        <option key={member.id} value={member.id}>
                          {[member.first_name, member.last_name].filter(Boolean).join(" ") ||
                            member.email}{" "}
                          ({formatRoleLabel(member.role)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-ink" htmlFor="due-date">
                      Due date
                    </label>
                    <input
                      id="due-date"
                      name="dueDate"
                      type="date"
                      required
                      className="min-h-[48px] rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                    />
                  </div>
                </div>
                <div className="mt-5 flex">
                  <SubmitButton
                    pendingLabel="Assigning..."
                    className="min-h-[48px] rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                  >
                    Assign training
                  </SubmitButton>
                </div>
              </form>
            ) : null}

            <div className="mt-8 space-y-4">
              {sortedAssignments.length > 0 ? (
                sortedAssignments.map((assignment) => (
                  <article
                    key={assignment.assignmentId}
                    className="rounded-[28px] border border-ink/10 bg-white/75 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                          <span className="rounded-full bg-ocean/10 px-3 py-1 text-ocean">
                            {assignment.mandatory ? "Mandatory" : "Optional"}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 ${getStatusClasses(
                              assignment.status
                            )}`}
                          >
                            {formatStatusLabel(assignment.status)}
                          </span>
                          <span className="text-ink/45">Due {formatDate(assignment.dueAt)}</span>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-ink">
                          {assignment.courseTitle}
                        </h3>
                        <p className="mt-2 text-sm text-ink/70">
                          Assigned to {assignment.assignedUserName} ({assignment.assignedUserEmail})
                        </p>
                        <p className="mt-3 text-sm text-ink/65">
                          Progress {assignment.progressPercentage}% • Reminders sent{" "}
                          {assignment.reminderCount}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {assignment.isOwnedByViewer && canCompleteTraining ? (
                          <>
                            {assignment.progressStatus === "not_started" ? (
                              <form action={startTrainingAssignmentAction}>
                                <input
                                  type="hidden"
                                  name="assignmentId"
                                  value={assignment.assignmentId}
                                />
                                <SubmitButton
                                  pendingLabel="Starting..."
                                  className="min-h-[44px] rounded-2xl border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
                                >
                                  Start course
                                </SubmitButton>
                              </form>
                            ) : null}
                            {assignment.status !== "completed" ? (
                              <form action={completeTrainingAssignmentAction}>
                                <input
                                  type="hidden"
                                  name="assignmentId"
                                  value={assignment.assignmentId}
                                />
                                <SubmitButton
                                  pendingLabel="Saving..."
                                  className="min-h-[44px] rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90"
                                >
                                  Mark complete
                                </SubmitButton>
                              </form>
                            ) : null}
                          </>
                        ) : null}

                        {canManageTraining && assignment.status !== "completed" ? (
                          <form action={sendTrainingReminderAction}>
                            <input type="hidden" name="assignmentId" value={assignment.assignmentId} />
                            <SubmitButton
                              pendingLabel="Sending..."
                              className="min-h-[44px] rounded-2xl border border-signal/30 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal transition hover:bg-signal/15"
                            >
                              Send reminder
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[28px] border border-dashed border-ink/15 bg-white/60 p-6 text-sm leading-6 text-ink/65">
                  {canManageTraining
                    ? "No training assignments yet. Use the form above to assign a course and start collecting completion evidence."
                    : "You do not have any assigned training yet. Assigned courses will appear here with progress controls."}
                </div>
              )}
            </div>
          </section>

          <section className="glass-panel p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
              Attention Queue
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
              Overdue and upcoming assignments.
            </h2>
            <p className="mt-4 text-sm leading-6 text-ink/70">
              Review assignments approaching their due date and trigger reminders before training
              gaps become audit findings.
            </p>

            <div className="mt-6 space-y-4">
              {attentionAssignments.length > 0 ? (
                attentionAssignments.slice(0, 6).map((assignment) => (
                  <article
                    key={assignment.assignmentId}
                    className="rounded-[28px] border border-ink/10 bg-white/80 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                      <span className="rounded-full bg-white px-3 py-1 text-ocean">
                        {assignment.courseTitle}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 ${getStatusClasses(assignment.status)}`}
                      >
                        {formatStatusLabel(assignment.status)}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-ink">
                      {assignment.assignedUserName}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink/70">
                      Due {formatDate(assignment.dueAt)} with {assignment.progressPercentage}%
                      completion recorded.
                    </p>
                    {assignment.reminderSentAt ? (
                      <p className="mt-2 text-xs text-ink/55">
                        Last reminder logged on {formatDate(assignment.reminderSentAt)}.
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-[28px] border border-dashed border-success/20 bg-success/5 p-6 text-sm leading-6 text-ink/65">
                  No active training alerts right now. Completed assignments and future-dated work
                  will keep this queue clear.
                </div>
              )}
            </div>

            <div className="mt-8 rounded-[28px] border border-ink/10 bg-white/80 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ocean">
                Coverage Snapshot
              </p>
              <dl className="mt-5 grid gap-4">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-ink/55">Upcoming due in 7 days</dt>
                  <dd className="text-base font-semibold text-ink">
                    {trainingWorkspace.data?.summary.upcomingDueCount ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-ink/55">Completed assignments</dt>
                  <dd className="text-base font-semibold text-ink">
                    {trainingWorkspace.data?.summary.completedAssignments ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-ink/55">Reminder events logged</dt>
                  <dd className="text-base font-semibold text-ink">
                    {trainingWorkspace.data?.summary.reminderCount ?? 0}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
