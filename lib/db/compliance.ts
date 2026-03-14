import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import {
  evaluateAssessment,
  getDefaultHipaaAssessmentTemplate,
  normalizeAssessmentQuestions,
  type AssessmentDomainScore,
  type AssessmentGap,
  type AssessmentQuestion,
  type AssessmentRecommendation
} from "@/lib/compliance";
import { getDatabaseClient, getPrivilegedDatabaseClient } from "@/lib/db";
import { listTrainingWorkspace } from "@/lib/db/training";
import type { AssessmentAnswerValue } from "@/types/compliance";
import type { Database } from "@/types/database";

type AssessmentRow = Database["public"]["Tables"]["assessments"]["Row"];
type AssessmentTemplateRow = Database["public"]["Tables"]["assessment_templates"]["Row"];
type AssessmentResponseInsert = Database["public"]["Tables"]["assessment_responses"]["Insert"];
type AssessmentResponseRow = Database["public"]["Tables"]["assessment_responses"]["Row"];
type AssessmentResultInsert = Database["public"]["Tables"]["assessment_results"]["Insert"];
type AssessmentResultRow = Database["public"]["Tables"]["assessment_results"]["Row"];
type RiskRow = Database["public"]["Tables"]["risks"]["Row"];
type IncidentRow = Database["public"]["Tables"]["incidents"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

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

export type ComplianceAssessmentTemplate = {
  id: string | null;
  source: "database" | "builtin";
  slug: string;
  title: string;
  framework: string;
  version: number;
  description: string;
  questions: AssessmentQuestion[];
  maxScore: number;
};

export type ComplianceAssessmentResultSummary = {
  id: string;
  templateId: string;
  templateTitle: string;
  score: number;
  summary: string;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  gapCount: number;
  recommendationCount: number;
  createdAt: string;
};

export type ComplianceAssessmentResultDetails = ComplianceAssessmentResultSummary & {
  gaps: AssessmentGap[];
  recommendations: AssessmentRecommendation[];
  domainScores: AssessmentDomainScore[];
};

export type ComplianceAssessmentWorkspace = {
  activeTemplate: ComplianceAssessmentTemplate;
  latestResult: ComplianceAssessmentResultDetails | null;
  recentResults: ComplianceAssessmentResultSummary[];
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

function toAssessmentTemplate(row: AssessmentTemplateRow): ComplianceAssessmentTemplate {
  const questions = normalizeAssessmentQuestions(row.questions);

  return {
    id: row.id,
    source: "database",
    slug: row.slug,
    title: row.title,
    framework: row.framework,
    version: row.version,
    description: row.description,
    questions,
    maxScore: row.max_score
  };
}

function getBuiltinTemplate(): ComplianceAssessmentTemplate {
  const template = getDefaultHipaaAssessmentTemplate();

  return {
    id: null,
    source: "builtin",
    slug: template.slug,
    title: template.title,
    framework: template.framework,
    version: template.version,
    description: template.description,
    questions: template.questions,
    maxScore: template.maxScore
  };
}

function parseAssessmentGaps(value: Database["public"]["Tables"]["assessment_results"]["Row"]["gap_analysis"]) {
  if (!Array.isArray(value)) {
    return [] as AssessmentGap[];
  }

  return value.filter((item): item is AssessmentGap => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const record = item as Record<string, unknown>;

    return (
      typeof record.questionId === "string" &&
      (record.domain === "administrative" ||
        record.domain === "technical" ||
        record.domain === "physical") &&
      typeof record.question === "string" &&
      (record.answer === "yes" || record.answer === "partial" || record.answer === "no") &&
      (record.priority === "high" || record.priority === "medium") &&
      typeof record.impact === "string"
    );
  });
}

function parseAssessmentRecommendations(
  value: Database["public"]["Tables"]["assessment_results"]["Row"]["recommendations"]
) {
  if (!Array.isArray(value)) {
    return [] as AssessmentRecommendation[];
  }

  return value.filter((item): item is AssessmentRecommendation => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const record = item as Record<string, unknown>;

    return (
      typeof record.questionId === "string" &&
      (record.domain === "administrative" ||
        record.domain === "technical" ||
        record.domain === "physical") &&
      (record.priority === "high" || record.priority === "medium") &&
      typeof record.title === "string" &&
      typeof record.action === "string"
    );
  });
}

function parseAssessmentDomainScores(
  value: Database["public"]["Tables"]["assessment_results"]["Row"]["domain_scores"]
) {
  if (!Array.isArray(value)) {
    return [] as AssessmentDomainScore[];
  }

  return value.filter((item): item is AssessmentDomainScore => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const record = item as Record<string, unknown>;

    return (
      (record.domain === "administrative" ||
        record.domain === "technical" ||
        record.domain === "physical") &&
      typeof record.score === "number" &&
      typeof record.answered === "number" &&
      typeof record.possible === "number"
    );
  });
}

function toAssessmentResultSummary(
  row: AssessmentResultRow,
  templateTitle: string
): ComplianceAssessmentResultSummary {
  const gaps = parseAssessmentGaps(row.gap_analysis);
  const recommendations = parseAssessmentRecommendations(row.recommendations);

  return {
    id: row.id,
    templateId: row.template_id,
    templateTitle,
    score: row.score,
    summary: row.summary,
    compliantCount: row.compliant_count,
    partialCount: row.partial_count,
    nonCompliantCount: row.non_compliant_count,
    gapCount: gaps.length,
    recommendationCount: recommendations.length,
    createdAt: row.created_at
  };
}

function toAssessmentResultDetails(
  row: AssessmentResultRow,
  templateTitle: string
): ComplianceAssessmentResultDetails {
  return {
    ...toAssessmentResultSummary(row, templateTitle),
    gaps: parseAssessmentGaps(row.gap_analysis),
    recommendations: parseAssessmentRecommendations(row.recommendations),
    domainScores: parseAssessmentDomainScores(row.domain_scores)
  };
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
    recentActivityResult,
    recentActivityCountResult,
    membersCountResult,
    trainingWorkspaceResult
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
      .eq("organization_id", organizationId),
    listTrainingWorkspace(organizationId, "", true)
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

  if (normalizedRecentActivityResult.error) {
    return { data: null, error: normalizedRecentActivityResult.error };
  }

  if (normalizedRecentActivityCountResult.error) {
    return { data: null, error: normalizedRecentActivityCountResult.error };
  }

  if (membersCountResult.error) {
    return { data: null, error: membersCountResult.error };
  }

  if (trainingWorkspaceResult.error || !trainingWorkspaceResult.data) {
    return { data: null, error: trainingWorkspaceResult.error };
  }

  const assessments = normalizedAssessmentsResult.data;
  const risks = normalizedRisksResult.data;
  const incidents = normalizedIncidentsResult.data;
  const recentIncidents = normalizedRecentIncidentsResult.data;
  const recentActivity = normalizedRecentActivityResult.data;
  const trainingWorkspace = trainingWorkspaceResult.data;

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
  const mandatoryCourses = trainingWorkspace.summary.mandatoryCourses;
  const completedAssignments = trainingWorkspace.summary.completedAssignments;
  const expectedTrainingCompletions = trainingWorkspace.summary.totalAssignments;
  const trainingCompletionRate = trainingWorkspace.summary.completionRate;

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
        optionalCourses: trainingWorkspace.courses.length - mandatoryCourses,
        completionRate: trainingCompletionRate,
        uniqueCompletions: completedAssignments,
        expectedCompletions: expectedTrainingCompletions
      }
    },
    error: null
  };
}

export async function listAssessmentTemplates(
  organizationId: string
): Promise<{ data: ComplianceAssessmentTemplate[]; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("assessment_templates")
    .select("id, slug, title, framework, version, description, questions, max_score, is_active, organization_id, created_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("version", { ascending: false });

  if (isMissingRelationError(error)) {
    return { data: [getBuiltinTemplate()], error: null };
  }

  if (error) {
    return { data: [], error };
  }

  if (!data || data.length === 0) {
    return { data: [getBuiltinTemplate()], error: null };
  }

  return {
    data: (data as AssessmentTemplateRow[]).map(toAssessmentTemplate),
    error: null
  };
}

export async function getOrCreateAssessmentTemplateBySlug(
  organizationId: string,
  slug: string
): Promise<{ data: ComplianceAssessmentTemplate | null; error: PostgrestError | null }> {
  const supabase = getPrivilegedDatabaseClient();
  const { data, error } = await supabase
    .from("assessment_templates")
    .select("id, slug, title, framework, version, description, questions, max_score, is_active, organization_id, created_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && !isMissingRelationError(error)) {
    return { data: null, error };
  }

  if (data) {
    return {
      data: toAssessmentTemplate(data as AssessmentTemplateRow),
      error: null
    };
  }

  const fallback = getDefaultHipaaAssessmentTemplate();

  if (slug !== fallback.slug) {
    return { data: null, error: null };
  }

  const insertPayload: Database["public"]["Tables"]["assessment_templates"]["Insert"] = {
    organization_id: organizationId,
    slug: fallback.slug,
    title: fallback.title,
    framework: fallback.framework,
    version: fallback.version,
    description: fallback.description,
    questions: fallback.questions as unknown as Database["public"]["Tables"]["assessment_templates"]["Insert"]["questions"],
    max_score: fallback.maxScore,
    is_active: true
  };
  const insertResult = await supabase
    .from("assessment_templates")
    .insert(insertPayload as never)
    .select("id, slug, title, framework, version, description, questions, max_score, is_active, organization_id, created_at, updated_at")
    .single();

  if (insertResult.error) {
    const retry = await supabase
      .from("assessment_templates")
      .select("id, slug, title, framework, version, description, questions, max_score, is_active, organization_id, created_at, updated_at")
      .eq("organization_id", organizationId)
      .eq("slug", slug)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (retry.error || !retry.data) {
      return { data: null, error: insertResult.error };
    }

    return {
      data: toAssessmentTemplate(retry.data as AssessmentTemplateRow),
      error: null
    };
  }

  return {
    data: toAssessmentTemplate(insertResult.data as AssessmentTemplateRow),
    error: null
  };
}

export async function getComplianceAssessmentWorkspace(
  organizationId: string
): Promise<{ data: ComplianceAssessmentWorkspace | null; error: PostgrestError | null }> {
  const [templatesResult, resultsResult] = await Promise.all([
    listAssessmentTemplates(organizationId),
    getDatabaseClient()
      .from("assessment_results")
      .select(
        "id, template_id, response_id, assessment_id, score, compliant_count, partial_count, non_compliant_count, summary, gap_analysis, recommendations, domain_scores, organization_id, created_at, updated_at"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  if (templatesResult.error) {
    return { data: null, error: templatesResult.error };
  }

  if (isMissingRelationError(resultsResult.error)) {
    return {
      data: {
        activeTemplate: templatesResult.data[0] ?? getBuiltinTemplate(),
        latestResult: null,
        recentResults: []
      },
      error: null
    };
  }

  if (resultsResult.error) {
    return { data: null, error: resultsResult.error };
  }

  const templatesById = new Map(
    templatesResult.data
      .filter((template): template is ComplianceAssessmentTemplate & { id: string } => Boolean(template.id))
      .map((template) => [template.id, template.title])
  );

  const rows = (resultsResult.data ?? []) as AssessmentResultRow[];
  const recentResults = rows.map((row) =>
    toAssessmentResultSummary(row, templatesById.get(row.template_id) ?? "HIPAA Assessment")
  );

  return {
    data: {
      activeTemplate: templatesResult.data[0] ?? getBuiltinTemplate(),
      latestResult:
        rows[0] === undefined
          ? null
          : toAssessmentResultDetails(
              rows[0],
              templatesById.get(rows[0].template_id) ?? "HIPAA Assessment"
            ),
      recentResults
    },
    error: null
  };
}

export async function createAssessmentRecord(
  organizationId: string,
  score: number
): Promise<{ data: AssessmentRow | null; error: PostgrestError | null }> {
  const supabase = getPrivilegedDatabaseClient();
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      organization_id: organizationId,
      status: "completed",
      score
    } as never)
    .select("id, organization_id, status, score, created_at, updated_at")
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as AssessmentRow, error: null };
}

export async function createAssessmentResponse(input: {
  organizationId: string;
  templateId: string;
  userId: string;
  answers: Array<{ questionId: string; answer: AssessmentAnswerValue }>;
}): Promise<{ data: AssessmentResponseRow | null; error: PostgrestError | null }> {
  const supabase = getPrivilegedDatabaseClient();
  const payload: AssessmentResponseInsert = {
    organization_id: input.organizationId,
    template_id: input.templateId,
    user_id: input.userId,
    status: "completed",
    submitted_at: new Date().toISOString(),
    answers: input.answers as unknown as AssessmentResponseInsert["answers"]
  };
  const { data, error } = await supabase
    .from("assessment_responses")
    .insert(payload as never)
    .select("id, organization_id, template_id, user_id, status, submitted_at, answers, created_at, updated_at")
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as AssessmentResponseRow, error: null };
}

export async function createAssessmentResult(input: {
  organizationId: string;
  templateId: string;
  responseId: string;
  assessmentId: string | null;
  evaluation: ReturnType<typeof evaluateAssessment>;
}): Promise<{ data: AssessmentResultRow | null; error: PostgrestError | null }> {
  const supabase = getPrivilegedDatabaseClient();
  const payload: AssessmentResultInsert = {
    organization_id: input.organizationId,
    template_id: input.templateId,
    response_id: input.responseId,
    assessment_id: input.assessmentId,
    score: input.evaluation.score,
    compliant_count: input.evaluation.compliantCount,
    partial_count: input.evaluation.partialCount,
    non_compliant_count: input.evaluation.nonCompliantCount,
    summary: input.evaluation.summary,
    gap_analysis: input.evaluation.gaps as unknown as AssessmentResultInsert["gap_analysis"],
    recommendations:
      input.evaluation.recommendations as unknown as AssessmentResultInsert["recommendations"],
    domain_scores: input.evaluation.domainScores as unknown as AssessmentResultInsert["domain_scores"]
  };
  const { data, error } = await supabase
    .from("assessment_results")
    .insert(payload as never)
    .select(
      "id, organization_id, template_id, response_id, assessment_id, score, compliant_count, partial_count, non_compliant_count, summary, gap_analysis, recommendations, domain_scores, created_at, updated_at"
    )
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as AssessmentResultRow, error: null };
}
