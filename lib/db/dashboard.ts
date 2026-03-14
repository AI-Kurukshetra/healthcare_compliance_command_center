import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { getDatabaseClient } from "@/lib/db";
import type { Database } from "@/types/database";

type RiskRow = Database["public"]["Tables"]["risks"]["Row"];
type IncidentRow = Database["public"]["Tables"]["incidents"]["Row"];
type AssessmentRow = Database["public"]["Tables"]["assessments"]["Row"];

export type DashboardRiskSummary = {
  total: number;
  critical: number;
  highOrCritical: number;
};

export type DashboardIncidentSummary = {
  total: number;
  active: number;
  criticalActive: number;
  alerts: Array<Pick<IncidentRow, "id" | "severity" | "status" | "description" | "updated_at">>;
};

export type DashboardComplianceSummary = {
  completedCount: number;
  inProgressCount: number;
  averageScore: number | null;
};

export type DashboardSummary = {
  risks: DashboardRiskSummary;
  incidents: DashboardIncidentSummary;
  assessments: DashboardComplianceSummary;
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

function summarizeAssessments(
  assessments: Array<Pick<AssessmentRow, "status" | "score">>
): DashboardComplianceSummary {
  const completed = assessments.filter((assessment) => assessment.status === "completed");
  const scoredCompleted = completed.filter((assessment) => typeof assessment.score === "number");
  const totalScore = scoredCompleted.reduce((sum, assessment) => sum + (assessment.score ?? 0), 0);

  return {
    completedCount: completed.length,
    inProgressCount: assessments.filter((assessment) => assessment.status === "in_progress").length,
    averageScore:
      scoredCompleted.length > 0 ? Math.round(totalScore / scoredCompleted.length) : null
  };
}

export async function getDashboardSummary(
  organizationId: string
): Promise<{ data: DashboardSummary | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const [risksResult, incidentsSummaryResult, incidentAlertsResult, assessmentsResult] = await Promise.all([
    supabase
      .from("risks")
      .select("id, severity")
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
      .from("assessments")
      .select("status, score")
      .eq("organization_id", organizationId)
  ]);

  const normalizedRisksResult = getOptionalRows<Pick<RiskRow, "id" | "severity">>(risksResult);
  const normalizedIncidentsSummaryResult = getOptionalRows<
    Pick<IncidentRow, "id" | "severity" | "status">
  >(incidentsSummaryResult);
  const normalizedIncidentAlertsResult = getOptionalRows<
    Pick<IncidentRow, "id" | "severity" | "status" | "description" | "updated_at">
  >(incidentAlertsResult);
  const normalizedAssessmentsResult = getOptionalRows<Pick<AssessmentRow, "status" | "score">>(
    assessmentsResult
  );

  if (normalizedRisksResult.error) {
    return { data: null, error: normalizedRisksResult.error };
  }

  if (normalizedIncidentsSummaryResult.error) {
    return { data: null, error: normalizedIncidentsSummaryResult.error };
  }

  if (normalizedIncidentAlertsResult.error) {
    return { data: null, error: normalizedIncidentAlertsResult.error };
  }

  if (normalizedAssessmentsResult.error) {
    return { data: null, error: normalizedAssessmentsResult.error };
  }

  const riskRows = normalizedRisksResult.data;
  const incidentSummaryRows = normalizedIncidentsSummaryResult.data;
  const incidentAlertRows = normalizedIncidentAlertsResult.data;
  const assessmentRows = normalizedAssessmentsResult.data;

  const activeIncidents = incidentSummaryRows.filter(
    (incident) => incident.status === "open" || incident.status === "investigating"
  );

  return {
    data: {
      risks: {
        total: riskRows.length,
        critical: riskRows.filter((risk) => risk.severity === "critical").length,
        highOrCritical: riskRows.filter(
          (risk) => risk.severity === "high" || risk.severity === "critical"
        ).length
      },
      incidents: {
        total: incidentSummaryRows.length,
        active: activeIncidents.length,
        criticalActive: activeIncidents.filter((incident) => incident.severity === "critical").length,
        alerts: incidentAlertRows
      },
      assessments: summarizeAssessments(assessmentRows)
    },
    error: null
  };
}
