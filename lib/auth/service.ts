import "server-only";

import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";

import { createAuditLogEntry } from "@/lib/db/audit-logs";
import { upsertOrganizationRecord } from "@/lib/db/organizations";
import { getUserRecordById, upsertUserRecord } from "@/lib/db/users";
import { serverEnv } from "@/lib/env/server";
import type { AppRole } from "@/types/compliance";

const authMetadataSchema = z.object({
  organization_id: z.string().uuid().optional(),
  organization_name: z.string().trim().min(2).max(120).optional(),
  full_name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(["admin", "compliance_officer", "employee", "auditor"]).optional()
});

type AuthMethod = "password" | "magic_link";

function getAuthMetadata(user: User) {
  const result = authMetadataSchema.safeParse(user.user_metadata);

  if (!result.success) {
    return null;
  }

  return result.data;
}

export function sanitizeRedirectTo(redirectTo?: string | null) {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/dashboard";
  }

  return redirectTo;
}

export function getBaseUrl() {
  const headerStore = headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");
  const proto =
    headerStore.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${proto}://${host}`;
  }

  if (serverEnv.NEXT_PUBLIC_SITE_URL) {
    return serverEnv.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function buildAuthCallbackUrl() {
  const callbackUrl = new URL("/auth/callback", getBaseUrl());

  return callbackUrl.toString();
}

export async function ensureAuthAccountRecords(user: User) {
  const metadata = getAuthMetadata(user);
  const organizationId = metadata?.organization_id;
  const organizationName = metadata?.organization_name;
  const role: AppRole = metadata?.role ?? "admin";

  if (!organizationId || !organizationName || !user.email) {
    return { organizationId: organizationId ?? null };
  }

  const existingUser = await getUserRecordById(user.id);

  if (!existingUser.error && existingUser.data) {
    return { organizationId: existingUser.data.organization_id };
  }

  await upsertOrganizationRecord({
    id: organizationId,
    name: organizationName
  });

  await upsertUserRecord({
    id: user.id,
    organizationId,
    email: user.email,
    role
  });

  return { organizationId };
}

async function resolveOrganizationId(user: User) {
  const metadata = getAuthMetadata(user);

  if (metadata?.organization_id) {
    return metadata.organization_id;
  }

  const existingUser = await getUserRecordById(user.id);

  if (existingUser.error || !existingUser.data) {
    return null;
  }

  return existingUser.data.organization_id;
}

export async function recordLoginEvent(user: User, method: AuthMethod) {
  const organizationId = await resolveOrganizationId(user);

  if (!organizationId) {
    return;
  }

  await createAuditLogEntry({
    organizationId,
    userId: user.id,
    action: "login",
    entity: "auth_session",
    entityId: user.id,
    details: {
      email: user.email ?? null,
      method
    }
  });
}

export async function recordLogoutEvent(user: User) {
  const organizationId = await resolveOrganizationId(user);

  if (!organizationId) {
    return;
  }

  await createAuditLogEntry({
    organizationId,
    userId: user.id,
    action: "logout",
    entity: "auth_session",
    entityId: user.id,
    details: {
      email: user.email ?? null
    }
  });
}

export async function safelyRunAuthSideEffect(task: () => Promise<void>) {
  try {
    await task();
  } catch (error) {
    console.error("Auth side effect failed.", error);
  }
}
