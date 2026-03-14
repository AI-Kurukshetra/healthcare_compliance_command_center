import { z } from "zod";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const versionPattern = /^\d+(?:\.\d+){0,2}$/;

const reviewFrequencySchema = z.coerce
  .number()
  .int("Review cadence must be a whole number.")
  .min(30, "Review cadence must be at least 30 days.")
  .max(730, "Review cadence must be 730 days or less.");

export const createOrganizationPolicySchema = z.object({
  templateId: z.string().uuid("Select a valid policy template."),
  title: z.string().trim().min(3, "Policy title is required.").max(160, "Policy title is too long."),
  status: z.enum(["draft", "active", "archived"]),
  ownerName: z.string().trim().min(2, "Policy owner is required.").max(120, "Policy owner is too long."),
  approverName: z.string().trim().max(120, "Approver name is too long.").optional(),
  effectiveDate: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isoDatePattern.test(value), "Enter a valid effective date."),
  reviewFrequencyDays: reviewFrequencySchema,
  version: z
    .string()
    .trim()
    .regex(versionPattern, "Use a version like 1, 1.0, or 2.1.")
    .max(20, "Version is too long."),
  summary: z
    .string()
    .trim()
    .min(20, "Summary should explain how this policy applies to your organization.")
    .max(1200, "Summary is too long."),
  content: z
    .string()
    .trim()
    .min(80, "Policy content is too short.")
    .max(20000, "Policy content is too long.")
});

export const updateOrganizationPolicySchema = createOrganizationPolicySchema.extend({
  policyId: z.string().uuid("Select a valid organization policy.")
});
