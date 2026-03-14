import { z } from "zod";

export const assignTrainingSchema = z.object({
  courseId: z.string().uuid("Select a valid training course."),
  userId: z.string().uuid("Select a valid assignee."),
  dueDate: z
    .string()
    .min(1, "Choose a due date.")
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Choose a valid due date.")
});

export const updateTrainingAssignmentSchema = z.object({
  assignmentId: z.string().uuid("Select a valid training assignment.")
});
