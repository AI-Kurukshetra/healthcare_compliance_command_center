import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { getDatabaseClient } from "@/lib/db";
import type { Database } from "@/types/database";

type AssessmentRow = Database["public"]["Tables"]["assessments"]["Row"];
type RiskRow = Database["public"]["Tables"]["risks"]["Row"];
type IncidentRow = Database["public"]["Tables"]["incidents"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
type TrainingCourseRow = Database["public"]["Tables"]["training_courses"]["Row"];

const TRAINING_COMPLETION_ACTIONS = [
  "training_completed",
  "course_completed",
  "training_marked_complete"
] as const;

const SEVERITY_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
} as const;

export type ComplianceScoreStatus = "strong" | "steady" | "attention" | "critical" | "not_started";

export type ComplianceDashboardSummary = {
  score: {
    value: number | null;
    status: ComplianceScoreStatus;
    completedAssessments: number;
    inProgressAssessments: number;
    draftAssessments: number;
  };
  widgets: {
    openIncidents: number;
    activeRisks: number;
    pendingAudits: number;
    trainingCompletionRate: number | null;
    mandatoryCourses: number;
    memberCount: number;
  };
  risks: {
    total: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
    elevated: number;
    top: Array<Pick<RiskRow, "id" | "severity" | "description" | "updated_at">>;
  };
  incidents: {
    total: number;
    open: number;
    investigating: number;
    resolved: number;
    criticalActive: number;
    recent: Array<Pick<IncidentRow, "id" | "severity" | "status" | "description" | "updated_at">>;
  };
  audits: {
    pending: number;
    completed: number;
    recentActivity: Array<Pick<AuditLogRow, "id" | "action" | "entity" | "entity_id" | "created_at">>;
    activityLast30Days: number;
  };
  training: {
    mandatoryCourses: number;
    optionalCourses: number;
    completionRate: number | null;
    uniqueCompletions: number;
    expectedCompletions: number;
  };
};

function isMissingRelationError(error: PostgrestError | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.message.toLowerCase().includes("does not exist") ||
    error.message.toLowerCase().includes("could not find the table")
  );
}

function getOptionalRows<T>(result: {
  data: T[] | null;
  error: PostgrestError | null;
}) {
  if (isMissingRelationError(result.error)) {
    return { data: [] as T[], error: null };
  }

  return { data: result.data ?? [], error: result.error };
}

function getOptionalCount(result: {
  count: number | null;
  error: PostgrestError | null;
}) {
  if (isMissingRelationError(result.error)) {
    return { count: 0, error: null };
  }

  return { count: result.count ?? 0, error: result.error };
}

function deriveComplianceStatus(
  score: number | null,
  criticalRisks: number,
  activeIncidents: number
): ComplianceScoreStatus {
  if (score === null) {
    return "not_started";
  }

  if (score >= 90 && criticalRisks === 0 && activeIncidents === 0) {
    return "strong";
  }

  if (score >= 75 && criticalRisks <= 1 && activeIncidents <= 2) {
    return "steady";
  }

  if (score >= 60 && criticalRisks <= 2 && activeIncidents <= 4) {
    return "attention";
  }

  return "critical";
}

function calculateAverageScore(assessments: Array<Pick<AssessmentRow, "status" | "score">>) {
  const scoredCompleted = assessments.filter(
    (assessment) => assessment.status === "completed" && typeof assessment.score === "number"
  );

  if (scoredCompleted.length === 0) {
    return null;
  }

  const total = scoredCompleted.reduce((sum, assessment) => sum + (assessment.score ?? 0), 0);

  return Math.round(total / scoredCompleted.length);
}

function getUniqueTrainingCompletionCount(
  entries: Array<Pick<AuditLogRow, "user_id" | "entity_id">>
) {
  return new Set(entries.map((entry) => `${entry.user_id ?? "unknown"}:${entry.entity_id}`)).size;
}

export async function getComplianceDashboardSummary(
  organizationId: string
): Promise<{ data: ComplianceDashboardSummary | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    assessmentsResult,
    risksResult,
    incidentsResult,
    recentIncidentsResult,
    trainingCoursesResult,
    trainingCompletionLogsResult,
    recentActivityResult,
    recentActivityCountResult,
    membersCountResult
  ] = await Promise.all([
    supabase.from("assessments").select("status, score").eq("organization_id", organizationId),
    supabase
      .from("risks")
      .select("id, severity, description, updated_at")
      .eq("organization_id", organizationId),
    supabase
      .from("incidents")
      .select("id, severity, status")
      .eq("organization_id", organizationId),
    supabase
      .from("incidents")
      .select("id, severity, status, description, updated_at")
      .eq("organization_id", organizationId)
      .in("status", ["open", "investigating"])
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("training_courses")
      .select("id, title, mandatory")
      .eq("organization_id", organizationId),
    supabase
      .from("audit_logs")
      .select("user_id, entity_id")
      .eq("organization_id", organizationId)
      .eq("entity", "training_course")
      .in("action", [...TRAINING_COMPLETION_ACTIONS]),
    supabase
      .from("audit_logs")
      .select("id, action, entity, entity_id, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
  ]);

  const normalizedAssessmentsResult = getOptionalRows<Pick<AssessmentRow, "status" | "score">>(
    assessmentsResult
  );
  const normalizedRisksResult = getOptionalRows<
    Pick<RiskRow, "id" | "severity" | "description" | "updated_at">
  >(risksResult);
  const normalizedIncidentsResult = getOptionalRows<Pick<IncidentRow, "id" | "severity" | "status">>(
    incidentsResult
  );
  const normalizedRecentIncidentsResult = getOptionalRows<
    Pick<IncidentRow, "id" | "severity" | "status" | "description" | "updated_at">
  >(recentIncidentsResult);
  const normalizedTrainingCoursesResult = getOptionalRows<
    Pick<TrainingCourseRow, "id" | "title" | "mandatory">
  >(trainingCoursesResult);
  const normalizedTrainingCompletionLogsResult = getOptionalRows<
    Pick<AuditLogRow, "user_id" | "entity_id">
  >(trainingCompletionLogsResult);
  const normalizedRecentActivityResult = getOptionalRows<
    Pick<AuditLogRow, "id" | "action" | "entity" | "entity_id" | "created_at">
  >(recentActivityResult);
  const normalizedRecentActivityCountResult = getOptionalCount(recentActivityCountResult);

  if (normalizedAssessmentsResult.error) {
    return { data: null, error: normalizedAssessmentsResult.error };
  }

  if (normalizedRisksResult.error) {
    return { data: null, error: normalizedRisksResult.error };
  }

  if (normalizedIncidentsResult.error) {
    return { data: null, error: normalizedIncidentsResult.error };
  }

  if (normalizedRecentIncidentsResult.error) {
    return { data: null, error: normalizedRecentIncidentsResult.error };
  }

  if (normalizedTrainingCoursesResult.error) {
    return { data: null, error: normalizedTrainingCoursesResult.error };
  }

  if (normalizedTrainingCompletionLogsResult.error) {
    return { data: null, error: normalizedTrainingCompletionLogsResult.error };
  }

  if (normalizedRecentActivityResult.error) {
    return { data: null, error: normalizedRecentActivityResult.error };
  }

  if (normalizedRecentActivityCountResult.error) {
    return { data: null, error: normalizedRecentActivityCountResult.error };
  }

  if (membersCountResult.error) {
    return { data: null, error: membersCountResult.error };
  }

  const assessments = normalizedAssessmentsResult.data;
  const risks = normalizedRisksResult.data;
  const incidents = normalizedIncidentsResult.data;
  const recentIncidents = normalizedRecentIncidentsResult.data;
  const trainingCourses = normalizedTrainingCoursesResult.data;
  const trainingCompletionLogs = normalizedTrainingCompletionLogsResult.data;
  const recentActivity = normalizedRecentActivityResult.data;

  const completedAssessments = assessments.filter((assessment) => assessment.status === "completed").length;
  const inProgressAssessments = assessments.filter(
    (assessment) => assessment.status === "in_progress"
  ).length;
  const draftAssessments = assessments.filter((assessment) => assessment.status === "draft").length;
  const averageScore = calculateAverageScore(assessments);

  const openIncidents = incidents.filter((incident) => incident.status === "open").length;
  const investigatingIncidents = incidents.filter(
    (incident) => incident.status === "investigating"
  ).length;
  const activeIncidents = openIncidents + investigatingIncidents;

  const criticalRisks = risks.filter((risk) => risk.severity === "critical").length;
  const memberCount = membersCountResult.count ?? 0;
  const mandatoryCourses = trainingCourses.filter((course) => course.mandatory).length;
  const uniqueTrainingCompletions = getUniqueTrainingCompletionCount(trainingCompletionLogs);
  const expectedTrainingCompletions = mandatoryCourses * memberCount;
  const trainingCompletionRate =
    expectedTrainingCompletions > 0
      ? Math.min(100, Math.round((uniqueTrainingCompletions / expectedTrainingCompletions) * 100))
      : null;

  return {
    data: {
      score: {
        value: averageScore,
        status: deriveComplianceStatus(averageScore, criticalRisks, activeIncidents),
        completedAssessments,
        inProgressAssessments,
        draftAssessments
      },
      widgets: {
        openIncidents: activeIncidents,
        activeRisks: risks.length,
        pendingAudits: draftAssessments + inProgressAssessments,
        trainingCompletionRate,
        mandatoryCourses,
        memberCount
      },
      risks: {
        total: risks.length,
        low: risks.filter((risk) => risk.severity === "low").length,
        medium: risks.filter((risk) => risk.severity === "medium").length,
        high: risks.filter((risk) => risk.severity === "high").length,
        critical: criticalRisks,
        elevated: risks.filter((risk) => risk.severity === "high" || risk.severity === "critical").length,
        top: [...risks]
          .sort((left, right) => SEVERITY_WEIGHT[right.severity] - SEVERITY_WEIGHT[left.severity])
          .slice(0, 3)
      },
      incidents: {
        total: incidents.length,
        open: openIncidents,
        investigating: investigatingIncidents,
        resolved: incidents.filter(
          (incident) => incident.status === "resolved" || incident.status === "closed"
        ).length,
        criticalActive: incidents.filter(
          (incident) =>
            (incident.status === "open" || incident.status === "investigating") &&
            incident.severity === "critical"
        ).length,
        recent: recentIncidents
      },
      audits: {
        pending: draftAssessments + inProgressAssessments,
        completed: completedAssessments,
        recentActivity,
        activityLast30Days: normalizedRecentActivityCountResult.count
      },
      training: {
        mandatoryCourses,
        optionalCourses: trainingCourses.length - mandatoryCourses,
        completionRate: trainingCompletionRate,
        uniqueCompletions: uniqueTrainingCompletions,
        expectedCompletions: expectedTrainingCompletions
      }
    },
    error: null
  };
}
