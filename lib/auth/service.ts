import "server-only";

import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";

import { createAuditLogEntry } from "@/lib/db/audit-logs";
import {
  getOrganizationMembershipByUserId,
  upsertOrganizationMembershipRecord
} from "@/lib/db/organization-members";
import { ensureOrganizationRbacCatalog } from "@/lib/db/rbac";
import { upsertOrganizationRecord } from "@/lib/db/organizations";
import { getUserRecordById, getUserRecordByOrganizationAndId, upsertUserRecord } from "@/lib/db/users";
import { serverEnv } from "@/lib/env/server";
import type { AppRole } from "@/types/compliance";

const authMetadataSchema = z.object({
  organization_id: z.string().uuid().optional(),
  organization_name: z.string().trim().min(2).max(120).optional(),
  full_name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(["owner", "admin", "compliance_officer", "staff", "auditor"]).optional()
});

type AuthMethod = "password" | "magic_link";

function getFallbackOrganizationName(email?: string | null) {
  const prefix = email?.split("@")[0]?.trim();

  return `${prefix || "Default"} Workspace`;
}

function assertMutationSucceeded(
  result: { error: { message: string } | null } | null | undefined,
  context: string
) {
  if (result?.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
}

export function splitFullName(fullName?: string | null) {
  const normalized = fullName?.trim() ?? "";

  if (!normalized) {
    return {
      firstName: null,
      lastName: null
    };
  }

  const segments = normalized.split(/\s+/);

  return {
    firstName: segments[0] ?? null,
    lastName: segments.slice(1).join(" ") || null
  };
}

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
  const organizationId = metadata?.organization_id ?? user.id;
  const organizationName = metadata?.organization_name ?? getFallbackOrganizationName(user.email);
  const role: AppRole = metadata?.role ?? "owner";
  const profileName = splitFullName(
    metadata?.full_name ??
      [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" ")
  );
  const existingMembership = await getOrganizationMembershipByUserId(user.id);

  if (!existingMembership.error && existingMembership.data) {
    assertMutationSucceeded(
      await ensureOrganizationRbacCatalog(existingMembership.data.organization_id),
      "Failed to ensure RBAC catalog"
    );

    if (user.email) {
      const existingUser = await getUserRecordByOrganizationAndId(
        existingMembership.data.organization_id,
        user.id
      );

      if (existingUser.error || !existingUser.data) {
        assertMutationSucceeded(
          await upsertUserRecord({
            id: user.id,
            organizationId: existingMembership.data.organization_id,
            email: user.email,
            firstName: profileName.firstName,
            lastName: profileName.lastName,
            role: existingMembership.data.role
          }),
          "Failed to bootstrap public user record"
        );

        assertMutationSucceeded(
          await createAuditLogEntry({
            organizationId: existingMembership.data.organization_id,
            userId: user.id,
            action: "user_bootstrapped",
            entity: "user",
            entityId: user.id,
            details: {
              email: user.email,
              role: existingMembership.data.role
            }
          }),
          "Failed to log user bootstrap"
        );
      }
    }

    return { organizationId: existingMembership.data.organization_id };
  }

  const existingUser = await getUserRecordById(user.id);

  if (!existingUser.error && existingUser.data) {
    assertMutationSucceeded(
      await ensureOrganizationRbacCatalog(existingUser.data.organization_id),
      "Failed to ensure RBAC catalog"
    );

    assertMutationSucceeded(
      await upsertOrganizationMembershipRecord({
        organizationId: existingUser.data.organization_id,
        userId: user.id,
        role: existingUser.data.role,
        invitedBy: existingUser.data.id
      }),
      "Failed to repair organization membership"
    );

    assertMutationSucceeded(
      await createAuditLogEntry({
        organizationId: existingUser.data.organization_id,
        userId: user.id,
        action: "organization_membership_created",
        entity: "organization_member",
        entityId: user.id,
        details: {
          role: existingUser.data.role,
          source: "bootstrap_repair"
        }
      }),
      "Failed to log membership repair"
    );

    return { organizationId: existingUser.data.organization_id };
  }

  if (!user.email) {
    return { organizationId: null };
  }

  assertMutationSucceeded(
    await upsertOrganizationRecord({
      id: organizationId,
      name: organizationName,
      createdBy: user.id
    }),
    "Failed to upsert organization"
  );

  assertMutationSucceeded(
    await ensureOrganizationRbacCatalog(organizationId),
    "Failed to ensure RBAC catalog"
  );

  assertMutationSucceeded(
    await upsertOrganizationMembershipRecord({
      organizationId,
      userId: user.id,
      role,
      invitedBy: user.id
    }),
    "Failed to upsert organization membership"
  );

  assertMutationSucceeded(
    await upsertUserRecord({
      id: user.id,
      organizationId,
      email: user.email,
      firstName: profileName.firstName,
      lastName: profileName.lastName,
      role
    }),
    "Failed to upsert public user record"
  );

  assertMutationSucceeded(
    await createAuditLogEntry({
      organizationId,
      userId: user.id,
      action: "organization_created",
      entity: "organization",
      entityId: organizationId,
      details: {
        name: organizationName,
        plan: "starter"
      }
    }),
    "Failed to log organization creation"
  );

  assertMutationSucceeded(
    await createAuditLogEntry({
      organizationId,
      userId: user.id,
      action: "organization_membership_created",
      entity: "organization_member",
      entityId: user.id,
      details: {
        role
      }
    }),
    "Failed to log membership creation"
  );

  assertMutationSucceeded(
    await createAuditLogEntry({
      organizationId,
      userId: user.id,
      action: "user_bootstrapped",
      entity: "user",
      entityId: user.id,
      details: {
        email: user.email,
        role
      }
    }),
    "Failed to log user bootstrap"
  );

  return { organizationId };
}

async function resolveOrganizationId(user: User) {
  const membership = await getOrganizationMembershipByUserId(user.id);

  if (!membership.error && membership.data) {
    return membership.data.organization_id;
  }

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
