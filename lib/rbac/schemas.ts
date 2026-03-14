import { z } from "zod";

export const assignUserRoleSchema = z.object({
  userId: z.string().uuid("Invalid user identifier."),
  role: z.enum(["owner", "admin", "compliance_officer", "staff", "auditor"])
});

export const createOrganizationMemberSchema = z.object({
  userId: z.string().uuid("Invalid user identifier."),
  email: z.string().email("Enter a valid email address."),
  firstName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  role: z.enum(["owner", "admin", "compliance_officer", "staff", "auditor"])
});

export const removeOrganizationMemberSchema = z.object({
  userId: z.string().uuid("Invalid user identifier.")
});
