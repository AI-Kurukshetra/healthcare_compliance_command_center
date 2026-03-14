"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ZodType, infer as ZodInfer } from "zod";

import {
  buildAuthCallbackUrl,
  ensureAuthAccountRecords,
  recordLoginEvent,
  recordLogoutEvent,
  safelyRunAuthSideEffect
} from "@/lib/auth/service";
import {
  clearAuthFlash,
  clearAuthRedirectTarget,
  getAuthRedirectTarget,
  setAuthFlash,
  setAuthRedirectTarget
} from "@/lib/auth/state";
import { loginWithPasswordSchema, magicLinkSchema, registerSchema } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";

function getFieldValue(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value : "";
}

function redirectWithError(pathname: string, message: string) {
  setAuthFlash("error", message, cookies());
  redirect(pathname);
}

function redirectWithMessage(pathname: string, message: string) {
  setAuthFlash("message", message, cookies());
  redirect(pathname);
}

function parseOrRedirect<Schema extends ZodType>(
  schema: Schema,
  input: unknown,
  pathname: string,
  fallbackMessage: string
): ZodInfer<Schema> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    redirectWithError(pathname, parsed.error.issues[0]?.message ?? fallbackMessage);
  }

  return parsed.data as ZodInfer<Schema>;
}

export async function loginWithPasswordAction(formData: FormData) {
  const values = parseOrRedirect(
    loginWithPasswordSchema,
    {
      email: getFieldValue(formData, "email"),
      password: getFieldValue(formData, "password")
    },
    "/login",
    "Invalid login details."
  );

  const cookieStore = cookies();
  const supabase = createClient();
  const redirectTo = getAuthRedirectTarget(cookieStore);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password
  });

  if (error) {
    redirectWithError("/login", error.message);
  }

  if (!data.user) {
    redirectWithError("/login", "Unable to sign in.");
  }

  const user = data.user as NonNullable<typeof data.user>;
  await safelyRunAuthSideEffect(async () => {
    await ensureAuthAccountRecords(user);
    await recordLoginEvent(user, "password");
  });

  clearAuthFlash(cookieStore);
  clearAuthRedirectTarget(cookieStore);
  redirect(redirectTo);
}

export async function sendMagicLinkAction(formData: FormData) {
  const values = parseOrRedirect(
    magicLinkSchema,
    {
      email: getFieldValue(formData, "email")
    },
    "/login",
    "Invalid email address."
  );

  const cookieStore = cookies();
  const redirectTo = getAuthRedirectTarget(cookieStore);
  setAuthRedirectTarget(redirectTo, cookieStore);
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: values.email,
    options: {
      emailRedirectTo: buildAuthCallbackUrl()
    }
  });

  if (error) {
    redirectWithError("/login", error.message);
  }

  redirectWithMessage("/login", "Magic link sent. Check your email to continue.");
}

export async function registerAction(formData: FormData) {
  const values = parseOrRedirect(
    registerSchema,
    {
      organizationName: getFieldValue(formData, "organizationName"),
      fullName: getFieldValue(formData, "fullName"),
      email: getFieldValue(formData, "email"),
      password: getFieldValue(formData, "password"),
      confirmPassword: getFieldValue(formData, "confirmPassword")
    },
    "/register",
    "Invalid registration details."
  );

  const organizationId = randomUUID();
  const cookieStore = cookies();
  const redirectTo = getAuthRedirectTarget(cookieStore);
  setAuthRedirectTarget(redirectTo, cookieStore);
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(),
      data: {
        full_name: values.fullName,
        organization_id: organizationId,
        organization_name: values.organizationName,
        role: "admin"
      }
    }
  });

  if (error) {
    redirectWithError("/register", error.message);
  }

  const user = data.user;

  if (user && data.session) {
    await safelyRunAuthSideEffect(async () => {
      await ensureAuthAccountRecords(user);
      await recordLoginEvent(user, "password");
    });
    clearAuthFlash(cookieStore);
    clearAuthRedirectTarget(cookieStore);
    redirect(redirectTo);
  }

  redirectWithMessage(
    "/login",
    "Account created. Check your email to confirm your sign-in before accessing the dashboard."
  );
}

export async function logoutAction() {
  const cookieStore = cookies();
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    await safelyRunAuthSideEffect(async () => {
      await recordLogoutEvent(user);
    });
  }

  await supabase.auth.signOut();

  clearAuthRedirectTarget(cookieStore);
  redirectWithMessage("/login", "You have been signed out.");
}
