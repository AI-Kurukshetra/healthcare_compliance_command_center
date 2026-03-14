"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentAccessContext, requirePermission, roleHasPermission } from "@/lib/auth/rbac";
import { createAuditLogEntry } from "@/lib/db/audit-logs";
import {
  createTrainingAssignment,
  createTrainingProgress,
  getTrainingAssignmentByCourseAndUser,
  getTrainingAssignmentById,
  getTrainingCourseById,
  getTrainingProgressByAssignmentId,
  updateTrainingAssignmentReminder,
  updateTrainingProgressByAssignment
} from "@/lib/db/training";
import { getUserRecordByOrganizationAndId } from "@/lib/db/users";
import { assignTrainingSchema, updateTrainingAssignmentSchema } from "@/lib/training/schemas";
import { setTrainingFlash } from "@/lib/training/state";

function getFieldValue(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value : "";
}

function redirectWithTrainingFlash(kind: "error" | "message", message: string): never {
  setTrainingFlash(kind, message, cookies());
  redirect("/training");
}

function getDueDateTimestamp(value: string) {
  return new Date(`${value}T17:00:00.000Z`).toISOString();
}

export async function assignTrainingAction(formData: FormData) {
  const access = await requirePermission("manage_assessments");
  const parsed = assignTrainingSchema.safeParse({
    courseId: getFieldValue(formData, "courseId"),
    userId: getFieldValue(formData, "userId"),
    dueDate: getFieldValue(formData, "dueDate")
  });

  if (!parsed.success) {
    redirectWithTrainingFlash(
      "error",
      parsed.error.issues[0]?.message ?? "Provide valid training assignment details."
    );
  }

  const dueAt = getDueDateTimestamp(parsed.data.dueDate);
  const [course, userRecord, existingAssignment] = await Promise.all([
    getTrainingCourseById(access.organizationId, parsed.data.courseId),
    getUserRecordByOrganizationAndId(access.organizationId, parsed.data.userId),
    getTrainingAssignmentByCourseAndUser(
      access.organizationId,
      parsed.data.courseId,
      parsed.data.userId
    )
  ]);

  if (course.error || !course.data) {
    redirectWithTrainingFlash("error", "The selected training course is unavailable.");
  }

  if (userRecord.error || !userRecord.data) {
    redirectWithTrainingFlash("error", "The selected assignee does not belong to this organization.");
  }

  if (existingAssignment.error) {
    redirectWithTrainingFlash("error", "Unable to validate existing training assignments.");
  }

  if (existingAssignment.data) {
    redirectWithTrainingFlash("error", "This course is already assigned to that member.");
  }

  const assignment = await createTrainingAssignment({
    organizationId: access.organizationId,
    courseId: parsed.data.courseId,
    userId: parsed.data.userId,
    assignedByUserId: access.userId,
    dueAt
  });

  if (assignment.error || !assignment.data) {
    redirectWithTrainingFlash("error", "Unable to create the training assignment.");
  }

  const assignmentRecord = assignment.data;
  const progress = await createTrainingProgress({
    organizationId: access.organizationId,
    assignmentId: assignmentRecord.id,
    courseId: assignmentRecord.course_id,
    userId: assignmentRecord.user_id,
    updatedByUserId: access.userId
  });

  if (progress.error || !progress.data) {
    redirectWithTrainingFlash("error", "Unable to initialize training progress.");
  }

  await createAuditLogEntry({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "training_assigned",
    entity: "training_assignment",
    entityId: assignmentRecord.id,
    details: {
      course_id: course.data.id,
      course_title: course.data.title,
      assigned_user_id: userRecord.data.id,
      assigned_user_email: userRecord.data.email,
      due_at: dueAt
    }
  });

  revalidatePath("/training");
  revalidatePath("/dashboard");
  revalidatePath("/compliance");
  redirectWithTrainingFlash("message", `Assigned ${course.data.title} successfully.`);
}

export async function startTrainingAssignmentAction(formData: FormData) {
  const access = await getCurrentAccessContext();

  if (!access) {
    redirect("/login");
  }

  if (!roleHasPermission(access.role, "complete_training")) {
    redirect("/unauthorized");
  }

  const parsed = updateTrainingAssignmentSchema.safeParse({
    assignmentId: getFieldValue(formData, "assignmentId")
  });

  if (!parsed.success) {
    redirectWithTrainingFlash(
      "error",
      parsed.error.issues[0]?.message ?? "Select a valid training assignment."
    );
  }

  const [assignment, progress] = await Promise.all([
    getTrainingAssignmentById(access.organizationId, parsed.data.assignmentId),
    getTrainingProgressByAssignmentId(access.organizationId, parsed.data.assignmentId)
  ]);

  if (assignment.error || !assignment.data || assignment.data.user_id !== access.userId) {
    redirectWithTrainingFlash("error", "That training assignment is unavailable.");
  }

  if (progress.error || !progress.data) {
    redirectWithTrainingFlash("error", "Unable to load training progress.");
  }

  if (progress.data.status !== "not_started") {
    redirectWithTrainingFlash("message", "Training progress is already underway.");
  }

  const update = await updateTrainingProgressByAssignment(access.organizationId, assignment.data.id, {
    status: "in_progress",
    progress_percentage: 25,
    started_at: progress.data.started_at ?? new Date().toISOString(),
    updated_by_user_id: access.userId
  });

  if (update.error || !update.data) {
    redirectWithTrainingFlash("error", "Unable to update training progress.");
  }

  await createAuditLogEntry({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "training_started",
    entity: "training_assignment",
    entityId: assignment.data.id,
    details: {
      course_id: assignment.data.course_id
    }
  });

  revalidatePath("/training");
  revalidatePath("/dashboard");
  redirectWithTrainingFlash("message", "Training marked as in progress.");
}

export async function completeTrainingAssignmentAction(formData: FormData) {
  const access = await getCurrentAccessContext();

  if (!access) {
    redirect("/login");
  }

  if (!roleHasPermission(access.role, "complete_training")) {
    redirect("/unauthorized");
  }

  const parsed = updateTrainingAssignmentSchema.safeParse({
    assignmentId: getFieldValue(formData, "assignmentId")
  });

  if (!parsed.success) {
    redirectWithTrainingFlash(
      "error",
      parsed.error.issues[0]?.message ?? "Select a valid training assignment."
    );
  }

  const [assignment, progress] = await Promise.all([
    getTrainingAssignmentById(access.organizationId, parsed.data.assignmentId),
    getTrainingProgressByAssignmentId(access.organizationId, parsed.data.assignmentId)
  ]);

  if (assignment.error || !assignment.data || assignment.data.user_id !== access.userId) {
    redirectWithTrainingFlash("error", "That training assignment is unavailable.");
  }

  if (progress.error || !progress.data) {
    redirectWithTrainingFlash("error", "Unable to load training progress.");
  }

  if (progress.data.status === "completed") {
    redirectWithTrainingFlash("message", "Training was already completed.");
  }

  const completedAt = new Date().toISOString();
  const update = await updateTrainingProgressByAssignment(access.organizationId, assignment.data.id, {
    status: "completed",
    progress_percentage: 100,
    started_at: progress.data.started_at ?? completedAt,
    completed_at: completedAt,
    updated_by_user_id: access.userId
  });

  if (update.error || !update.data) {
    redirectWithTrainingFlash("error", "Unable to mark the training complete.");
  }

  await createAuditLogEntry({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "training_completed",
    entity: "training_assignment",
    entityId: assignment.data.id,
    details: {
      course_id: assignment.data.course_id,
      completed_at: completedAt
    }
  });

  revalidatePath("/training");
  revalidatePath("/dashboard");
  revalidatePath("/compliance");
  redirectWithTrainingFlash("message", "Training completion recorded.");
}

export async function sendTrainingReminderAction(formData: FormData) {
  const access = await requirePermission("manage_assessments");
  const parsed = updateTrainingAssignmentSchema.safeParse({
    assignmentId: getFieldValue(formData, "assignmentId")
  });

  if (!parsed.success) {
    redirectWithTrainingFlash(
      "error",
      parsed.error.issues[0]?.message ?? "Select a valid training assignment."
    );
  }

  const [assignment, progress] = await Promise.all([
    getTrainingAssignmentById(access.organizationId, parsed.data.assignmentId),
    getTrainingProgressByAssignmentId(access.organizationId, parsed.data.assignmentId)
  ]);

  if (assignment.error || !assignment.data) {
    redirectWithTrainingFlash("error", "That training assignment no longer exists.");
  }

  if (progress.error || !progress.data) {
    redirectWithTrainingFlash("error", "Unable to load training progress.");
  }

  if (progress.data.status === "completed") {
    redirectWithTrainingFlash("message", "No reminder sent because the assignment is complete.");
  }

  const update = await updateTrainingAssignmentReminder(
    access.organizationId,
    assignment.data.id,
    assignment.data.reminder_count + 1
  );

  if (update.error || !update.data) {
    redirectWithTrainingFlash("error", "Unable to record the reminder event.");
  }

  const reminderRecord = update.data;
  await createAuditLogEntry({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "training_reminder_sent",
    entity: "training_assignment",
    entityId: assignment.data.id,
    details: {
      course_id: assignment.data.course_id,
      target_user_id: assignment.data.user_id,
      reminder_count: reminderRecord.reminder_count
    }
  });

  revalidatePath("/training");
  revalidatePath("/dashboard");
  redirectWithTrainingFlash("message", "Reminder recorded for the assigned learner.");
}
