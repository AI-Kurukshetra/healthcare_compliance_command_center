import { z } from "zod";

const redirectToSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      return "/dashboard";
    }

    return value;
  });

export const loginWithPasswordSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  redirectTo: redirectToSchema
});

export const magicLinkSchema = z.object({
  email: z.string().trim().email(),
  redirectTo: redirectToSchema
});

export const registerSchema = z
  .object({
    organizationName: z.string().trim().min(2).max(120),
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    redirectTo: redirectToSchema
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });
