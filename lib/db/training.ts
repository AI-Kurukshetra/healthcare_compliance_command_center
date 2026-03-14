import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import type { AppRole, TrainingProgressStatus } from "@/types/compliance";
import type { Database } from "@/types/database";

import { getDatabaseClient } from "@/lib/db";

type TrainingCourseRow = Database["public"]["Tables"]["training_courses"]["Row"];
type TrainingAssignmentRow = Database["public"]["Tables"]["training_assignments"]["Row"];
type TrainingProgressRow = Database["public"]["Tables"]["training_progress"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type TrainingWorkspaceCourse = Pick<TrainingCourseRow, "id" | "title" | "mandatory">;

export type TrainingWorkspaceMember = Pick<
  UserRow,
  "id" | "email" | "first_name" | "last_name" | "role"
>;

export type TrainingAssignmentStatus = "assigned" | "in_progress" | "completed" | "overdue";

export type TrainingAssignmentView = {
  assignmentId: string;
  courseId: string;
  courseTitle: string;
  mandatory: boolean;
  assignedUserId: string;
  assignedUserName: string;
  assignedUserEmail: string;
  assignedUserRole: AppRole;
  dueAt: string;
  reminderSentAt: string | null;
  reminderCount: number;
  progressStatus: TrainingProgressStatus;
  progressPercentage: number;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  isOverdue: boolean;
  isOwnedByViewer: boolean;
  status: TrainingAssignmentStatus;
};

export type TrainingSummarySnapshot = {
  completionRate: number | null;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  overdueAssignments: number;
  mandatoryCourses: number;
  upcomingDueCount: number;
  reminderCount: number;
  scope: "organization" | "personal";
};

export type TrainingWorkspace = {
  summary: TrainingSummarySnapshot;
  assignments: TrainingAssignmentView[];
  courses: TrainingWorkspaceCourse[];
  members: TrainingWorkspaceMember[];
};

export type TrainingDashboardSummary = TrainingSummarySnapshot & {
  alerts: TrainingAssignmentView[];
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

function getDisplayName(user: Pick<UserRow, "email" | "first_name" | "last_name"> | null) {
  if (!user) {
    return "Unknown assignee";
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

  return fullName || user.email;
}

function deriveAssignmentStatus(input: {
  dueAt: string;
  progressStatus: TrainingProgressStatus;
}) {
  if (input.progressStatus === "completed") {
    return "completed" as const;
  }

  const isOverdue = new Date(input.dueAt).getTime() < Date.now();

  if (isOverdue) {
    return "overdue" as const;
  }

  if (input.progressStatus === "in_progress") {
    return "in_progress" as const;
  }

  return "assigned" as const;
}

function buildTrainingSummary(
  assignments: TrainingAssignmentView[],
  mandatoryCourses: number,
  scope: "organization" | "personal"
): TrainingSummarySnapshot {
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter((assignment) => assignment.status === "completed").length;
  const overdueAssignments = assignments.filter((assignment) => assignment.isOverdue).length;
  const pendingAssignments = totalAssignments - completedAssignments;
  const upcomingDueCount = assignments.filter((assignment) => {
    if (assignment.status === "completed") {
      return false;
    }

    const dueAt = new Date(assignment.dueAt).getTime();
    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

    return dueAt >= now && dueAt <= sevenDaysFromNow;
  }).length;
  const reminderCount = assignments.reduce((sum, assignment) => sum + assignment.reminderCount, 0);

  return {
    completionRate:
      totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : null,
    totalAssignments,
    completedAssignments,
    pendingAssignments,
    overdueAssignments,
    mandatoryCourses,
    upcomingDueCount,
    reminderCount,
    scope
  };
}

export async function listTrainingCourses(
  organizationId: string
): Promise<{ data: TrainingWorkspaceCourse[]; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("training_courses")
    .select("id, title, mandatory")
    .eq("organization_id", organizationId)
    .order("mandatory", { ascending: false })
    .order("title", { ascending: true });

  if (error) {
    return { data: [], error };
  }

  return { data: (data ?? []) as TrainingWorkspaceCourse[], error: null };
}

export async function getTrainingCourseById(
  organizationId: string,
  courseId: string
): Promise<{ data: TrainingWorkspaceCourse | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("training_courses")
    .select("id, title, mandatory")
    .eq("organization_id", organizationId)
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data: (data ?? null) as TrainingWorkspaceCourse | null, error: null };
}

export async function getTrainingAssignmentById(
  organizationId: string,
  assignmentId: string
): Promise<{ data: TrainingAssignmentRow | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("training_assignments")
    .select(
      "id, organization_id, course_id, user_id, assigned_by_user_id, due_at, reminder_sent_at, reminder_count, created_at, updated_at"
    )
    .eq("organization_id", organizationId)
    .eq("id", assignmentId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data: (data ?? null) as TrainingAssignmentRow | null, error: null };
}

export async function getTrainingAssignmentByCourseAndUser(
  organizationId: string,
  courseId: string,
  userId: string
): Promise<{ data: TrainingAssignmentRow | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("training_assignments")
    .select(
      "id, organization_id, course_id, user_id, assigned_by_user_id, due_at, reminder_sent_at, reminder_count, created_at, updated_at"
    )
    .eq("organization_id", organizationId)
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data: (data ?? null) as TrainingAssignmentRow | null, error: null };
}

export async function getTrainingProgressByAssignmentId(
  organizationId: string,
  assignmentId: string
): Promise<{ data: TrainingProgressRow | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const { data, error } = await supabase
    .from("training_progress")
    .select(
      "id, organization_id, assignment_id, course_id, user_id, status, progress_percentage, started_at, completed_at, updated_by_user_id, created_at, updated_at"
    )
    .eq("organization_id", organizationId)
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data: (data ?? null) as TrainingProgressRow | null, error: null };
}

export async function createTrainingAssignment(input: {
  organizationId: string;
  courseId: string;
  userId: string;
  assignedByUserId: string;
  dueAt: string;
}): Promise<{ data: TrainingAssignmentRow | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const payload: Database["public"]["Tables"]["training_assignments"]["Insert"] = {
    organization_id: input.organizationId,
    course_id: input.courseId,
    user_id: input.userId,
    assigned_by_user_id: input.assignedByUserId,
    due_at: input.dueAt
  };

  const { data, error } = await supabase
    .from("training_assignments")
    .insert(payload as never)
    .select(
      "id, organization_id, course_id, user_id, assigned_by_user_id, due_at, reminder_sent_at, reminder_count, created_at, updated_at"
    )
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as TrainingAssignmentRow, error: null };
}

export async function createTrainingProgress(input: {
  organizationId: string;
  assignmentId: string;
  courseId: string;
  userId: string;
  updatedByUserId: string;
}): Promise<{ data: TrainingProgressRow | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const payload: Database["public"]["Tables"]["training_progress"]["Insert"] = {
    organization_id: input.organizationId,
    assignment_id: input.assignmentId,
    course_id: input.courseId,
    user_id: input.userId,
    status: "not_started",
    progress_percentage: 0,
    updated_by_user_id: input.updatedByUserId
  };

  const { data, error } = await supabase
    .from("training_progress")
    .insert(payload as never)
    .select(
      "id, organization_id, assignment_id, course_id, user_id, status, progress_percentage, started_at, completed_at, updated_by_user_id, created_at, updated_at"
    )
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as TrainingProgressRow, error: null };
}

export async function updateTrainingProgressByAssignment(
  organizationId: string,
  assignmentId: string,
  values: Database["public"]["Tables"]["training_progress"]["Update"]
): Promise<{ data: TrainingProgressRow | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();

  const { data, error } = await supabase
    .from("training_progress")
    .update({
      ...values,
      updated_at: new Date().toISOString()
    } as never)
    .eq("organization_id", organizationId)
    .eq("assignment_id", assignmentId)
    .select(
      "id, organization_id, assignment_id, course_id, user_id, status, progress_percentage, started_at, completed_at, updated_by_user_id, created_at, updated_at"
    )
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as TrainingProgressRow, error: null };
}

export async function updateTrainingAssignmentReminder(
  organizationId: string,
  assignmentId: string,
  nextReminderCount: number
): Promise<{ data: TrainingAssignmentRow | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();

  const { data, error } = await supabase
    .from("training_assignments")
    .update({
      reminder_sent_at: new Date().toISOString(),
      reminder_count: nextReminderCount,
      updated_at: new Date().toISOString()
    } as never)
    .eq("organization_id", organizationId)
    .eq("id", assignmentId)
    .select(
      "id, organization_id, course_id, user_id, assigned_by_user_id, due_at, reminder_sent_at, reminder_count, created_at, updated_at"
    )
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as TrainingAssignmentRow, error: null };
}

export async function listTrainingWorkspace(
  organizationId: string,
  viewerUserId: string,
  includeAllAssignments: boolean
): Promise<{ data: TrainingWorkspace | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const [coursesResult, assignmentsResult, progressResult, usersResult] = await Promise.all([
    supabase
      .from("training_courses")
      .select("id, title, mandatory")
      .eq("organization_id", organizationId)
      .order("mandatory", { ascending: false })
      .order("title", { ascending: true }),
    (() => {
      const query = supabase
        .from("training_assignments")
        .select(
          "id, organization_id, course_id, user_id, assigned_by_user_id, due_at, reminder_sent_at, reminder_count, created_at, updated_at"
        )
        .eq("organization_id", organizationId)
        .order("due_at", { ascending: true });

      return includeAllAssignments ? query : query.eq("user_id", viewerUserId);
    })(),
    (() => {
      const query = supabase
        .from("training_progress")
        .select(
          "id, organization_id, assignment_id, course_id, user_id, status, progress_percentage, started_at, completed_at, updated_by_user_id, created_at, updated_at"
        )
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });

      return includeAllAssignments ? query : query.eq("user_id", viewerUserId);
    })(),
    (() => {
      const query = supabase
        .from("users")
        .select("id, email, first_name, last_name, role")
        .eq("organization_id", organizationId)
        .order("email", { ascending: true });

      return includeAllAssignments ? query : query.eq("id", viewerUserId);
    })()
  ]);

  const normalizedCourses = getOptionalRows<TrainingWorkspaceCourse>(coursesResult);
  const normalizedAssignments = getOptionalRows<TrainingAssignmentRow>(assignmentsResult);
  const normalizedProgress = getOptionalRows<TrainingProgressRow>(progressResult);
  const normalizedUsers = getOptionalRows<TrainingWorkspaceMember>(usersResult);

  if (normalizedCourses.error) {
    return { data: null, error: normalizedCourses.error };
  }

  if (normalizedAssignments.error) {
    return { data: null, error: normalizedAssignments.error };
  }

  if (normalizedProgress.error) {
    return { data: null, error: normalizedProgress.error };
  }

  if (normalizedUsers.error) {
    return { data: null, error: normalizedUsers.error };
  }

  const courses = normalizedCourses.data;
  const assignments = normalizedAssignments.data;
  const progressRows = normalizedProgress.data;
  const members = normalizedUsers.data;

  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const usersById = new Map(members.map((user) => [user.id, user]));
  const progressByAssignmentId = new Map(progressRows.map((progress) => [progress.assignment_id, progress]));
  const derivedAssignments = assignments.flatMap((assignment) => {
    const course = coursesById.get(assignment.course_id);
    const user = usersById.get(assignment.user_id);

    if (!course || !user) {
      return [];
    }

    const progress = progressByAssignmentId.get(assignment.id);
    const progressStatus = progress?.status ?? "not_started";
    const progressPercentage = progress?.progress_percentage ?? 0;
    const status = deriveAssignmentStatus({
      dueAt: assignment.due_at,
      progressStatus
    });

    return [
      {
        assignmentId: assignment.id,
        courseId: assignment.course_id,
        courseTitle: course.title,
        mandatory: course.mandatory,
        assignedUserId: assignment.user_id,
        assignedUserName: getDisplayName(user),
        assignedUserEmail: user.email,
        assignedUserRole: user.role,
        dueAt: assignment.due_at,
        reminderSentAt: assignment.reminder_sent_at,
        reminderCount: assignment.reminder_count,
        progressStatus,
        progressPercentage:
          status === "completed" ? 100 : Math.max(0, Math.min(100, progressPercentage)),
        startedAt: progress?.started_at ?? null,
        completedAt: progress?.completed_at ?? null,
        updatedAt: progress?.updated_at ?? assignment.updated_at,
        isOverdue: status === "overdue",
        isOwnedByViewer: assignment.user_id === viewerUserId,
        status
      } satisfies TrainingAssignmentView
    ];
  });

  const summary = buildTrainingSummary(
    derivedAssignments,
    courses.filter((course) => course.mandatory).length,
    includeAllAssignments ? "organization" : "personal"
  );

  return {
    data: {
      summary,
      assignments: derivedAssignments,
      courses,
      members
    },
    error: null
  };
}

export async function getTrainingDashboardSummary(
  organizationId: string,
  viewerUserId: string,
  includeAllAssignments: boolean
): Promise<{ data: TrainingDashboardSummary | null; error: PostgrestError | null }> {
  const workspace = await listTrainingWorkspace(organizationId, viewerUserId, includeAllAssignments);

  if (workspace.error || !workspace.data) {
    return { data: null, error: workspace.error };
  }

  const alerts = [...workspace.data.assignments]
    .filter((assignment) => assignment.status !== "completed")
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())
    .slice(0, 3);

  return {
    data: {
      ...workspace.data.summary,
      alerts
    },
    error: null
  };
}
