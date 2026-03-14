"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { evaluateAssessment } from "@/lib/compliance";
import { submitComplianceAssessmentSchema } from "@/lib/compliance/schemas";
import { setComplianceFlash } from "@/lib/compliance/state";
import { requirePermission } from "@/lib/auth/rbac";
import { createAuditLogEntry } from "@/lib/db/audit-logs";
import {
  createAssessmentRecord,
  createAssessmentResponse,
  createAssessmentResult,
  getOrCreateAssessmentTemplateBySlug
} from "@/lib/db/compliance";

function getFieldValue(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value : "";
}

function redirectWithComplianceFlash(kind: "error" | "message", message: string): never {
  setComplianceFlash(kind, message, cookies());
  redirect("/compliance");
}

export async function submitComplianceAssessmentAction(formData: FormData) {
  const access = await requirePermission("manage_assessments");
  const templateSlug = getFieldValue(formData, "templateSlug");
  const templateResult = await getOrCreateAssessmentTemplateBySlug(access.organizationId, templateSlug);

  if (templateResult.error || !templateResult.data) {
    redirectWithComplianceFlash("error", "Unable to load the requested assessment template.");
  }

  if (!templateResult.data.id) {
    redirectWithComplianceFlash("error", "Unable to resolve a persisted assessment template.");
  }

  const answers = Object.fromEntries(
    templateResult.data.questions.map((question) => [
      question.id,
      getFieldValue(formData, `answer_${question.id}`)
    ])
  );

  const parsed = submitComplianceAssessmentSchema.safeParse({
    templateSlug,
    answers
  });

  if (!parsed.success) {
    redirectWithComplianceFlash(
      "error",
      parsed.error.issues[0]?.message ?? "All assessment questions must be answered."
    );
  }

  const questionIds = new Set(templateResult.data.questions.map((question) => question.id));
  const answerEntries = Object.entries(parsed.data.answers);

  if (
    answerEntries.length !== templateResult.data.questions.length ||
    answerEntries.some(([questionId]) => !questionIds.has(questionId))
  ) {
    redirectWithComplianceFlash("error", "The submitted assessment payload was incomplete.");
  }

  const evaluation = evaluateAssessment(templateResult.data.questions, parsed.data.answers);
  const response = await createAssessmentResponse({
    organizationId: access.organizationId,
    templateId: templateResult.data.id,
    userId: access.userId,
    answers: answerEntries.map(([questionId, answer]) => ({
      questionId,
      answer
    }))
  });

  if (response.error || !response.data) {
    redirectWithComplianceFlash("error", "Unable to save the assessment response.");
  }

  const assessmentRecord = await createAssessmentRecord(access.organizationId, evaluation.score);

  if (assessmentRecord.error || !assessmentRecord.data) {
    redirectWithComplianceFlash("error", "Unable to save the assessment score.");
  }

  const templateId = templateResult.data.id;

  const result = await createAssessmentResult({
    organizationId: access.organizationId,
    templateId,
    responseId: response.data.id,
    assessmentId: assessmentRecord.data.id,
    evaluation
  });

  if (result.error || !result.data) {
    redirectWithComplianceFlash("error", "Unable to generate the assessment recommendations.");
  }

  await createAuditLogEntry({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "hipaa_assessment_completed",
    entity: "assessment_result",
    entityId: result.data.id,
    details: {
      template_slug: templateResult.data.slug,
      template_title: templateResult.data.title,
      score: evaluation.score,
      compliant_count: evaluation.compliantCount,
      partial_count: evaluation.partialCount,
      non_compliant_count: evaluation.nonCompliantCount
    }
  });

  revalidatePath("/compliance");
  revalidatePath("/dashboard");
  redirectWithComplianceFlash(
    "message",
    `Assessment completed. Current HIPAA baseline score: ${evaluation.score}%.`
  );
}
