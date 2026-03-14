import { z } from "zod";

export const loginWithPasswordSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

export const magicLinkSchema = z.object({
  email: z.string().trim().email()
});

export const registerSchema = z
  .object({
    organizationName: z.string().trim().min(2).max(120),
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });
