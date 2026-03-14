"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createAuditLogEntry } from "@/lib/db/audit-logs";
import {
  deleteOrganizationMembershipRecord,
  updateOrganizationMembershipRole,
  upsertOrganizationMembershipRecord
} from "@/lib/db/organization-members";
import {
  listOrganizationUsersWithRoles
} from "@/lib/db/rbac";
import {
  getUserRecordById,
  getUserRecordByOrganizationAndId,
  updateUserRoleRecord,
  upsertUserRecord
} from "@/lib/db/users";
import { requirePermission } from "@/lib/auth/rbac";
import { setRbacFlash } from "@/lib/rbac/state";
import {
  assignUserRoleSchema,
  createOrganizationMemberSchema,
  removeOrganizationMemberSchema
} from "@/lib/rbac/schemas";

function getFieldValue(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value : "";
}

function redirectWithRbacFlash(kind: "error" | "message", message: string): never {
  setRbacFlash(kind, message, cookies());
  redirect("/users");
}

export async function assignUserRoleAction(formData: FormData) {
  const access = await requirePermission("manage_users");
  const parsed = assignUserRoleSchema.safeParse({
    userId: getFieldValue(formData, "userId"),
    role: getFieldValue(formData, "role")
  });

  if (!parsed.success) {
    redirectWithRbacFlash("error", parsed.error.issues[0]?.message ?? "Invalid role assignment.");
  }

  const values = parsed.data;
  const targetUser = await getUserRecordByOrganizationAndId(access.organizationId, values.userId);

  if (targetUser.error || !targetUser.data) {
    redirectWithRbacFlash("error", "The selected user was not found in your organization.");
  }

  const targetUserRecord = targetUser.data;

  const organizationUsers = await listOrganizationUsersWithRoles(access.organizationId);

  if (organizationUsers.error) {
    redirectWithRbacFlash("error", "Unable to validate the current owner assignments.");
  }

  const ownerCount = organizationUsers.data.filter((user) => user.role === "owner").length;
  const targetMembership = organizationUsers.data.find((user) => user.id === values.userId);

  if (!targetMembership) {
    redirectWithRbacFlash("error", "The selected membership could not be resolved.");
  }

  if (
    targetMembership.role === "owner" &&
    values.role !== "owner" &&
    ownerCount <= 1
  ) {
    redirectWithRbacFlash("error", "At least one owner must remain assigned.");
  }

  const membershipUpdate = await updateOrganizationMembershipRole(
    access.organizationId,
    values.userId,
    values.role
  );

  if (membershipUpdate.error) {
    redirectWithRbacFlash("error", "Unable to sync the organization membership role.");
  }

  const userUpdate = await updateUserRoleRecord(access.organizationId, values.userId, values.role);

  if (userUpdate.error) {
    redirectWithRbacFlash("error", "Unable to sync the application user role.");
  }

  await createAuditLogEntry({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "role_assigned",
    entity: "user_role",
    entityId: values.userId,
    details: {
      target_user: values.userId,
      previous_role: targetMembership.role,
      role_assigned: values.role,
      target_email: targetUserRecord.email
    }
  });

  redirectWithRbacFlash("message", "User role updated.");
}

export async function createOrganizationMemberAction(formData: FormData) {
  const access = await requirePermission("manage_users");
  const parsed = createOrganizationMemberSchema.safeParse({
    userId: getFieldValue(formData, "userId"),
    email: getFieldValue(formData, "email"),
    firstName: getFieldValue(formData, "firstName") || undefined,
    lastName: getFieldValue(formData, "lastName") || undefined,
    role: getFieldValue(formData, "role")
  });

  if (!parsed.success) {
    redirectWithRbacFlash("error", parsed.error.issues[0]?.message ?? "Invalid member details.");
  }

  const values = parsed.data;
  const existingUser = await getUserRecordById(values.userId);

  if (existingUser.error) {
    redirectWithRbacFlash("error", "Unable to validate the selected user.");
  }

  if (existingUser.data && existingUser.data.organization_id !== access.organizationId) {
    redirectWithRbacFlash("error", "That user already belongs to another organization.");
  }

  const organizationUsers = await listOrganizationUsersWithRoles(access.organizationId);

  if (organizationUsers.error) {
    redirectWithRbacFlash("error", "Unable to validate organization memberships.");
  }

  if (organizationUsers.data.some((user) => user.id === values.userId)) {
    redirectWithRbacFlash("error", "That user is already a member of this organization.");
  }

  const membershipInsert = await upsertOrganizationMembershipRecord({
    organizationId: access.organizationId,
    userId: values.userId,
    role: values.role,
    invitedBy: access.userId
  });

  if (membershipInsert.error) {
    redirectWithRbacFlash(
      "error",
      "Unable to add this member. Ensure they have signed in and shared their user ID."
    );
  }

  const userUpsert = await upsertUserRecord({
    id: values.userId,
    organizationId: access.organizationId,
    email: values.email,
    firstName: values.firstName ?? null,
    lastName: values.lastName ?? null,
    role: values.role
  });

  if (userUpsert.error) {
    redirectWithRbacFlash("error", "Unable to save the user profile for this member.");
  }

  await createAuditLogEntry({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "organization_member_added",
    entity: "organization_member",
    entityId: values.userId,
    details: {
      email: values.email,
      role: values.role
    }
  });

  redirectWithRbacFlash("message", "Member added.");
}

export async function removeOrganizationMemberAction(formData: FormData) {
  const access = await requirePermission("manage_users");
  const parsed = removeOrganizationMemberSchema.safeParse({
    userId: getFieldValue(formData, "userId")
  });

  if (!parsed.success) {
    redirectWithRbacFlash("error", parsed.error.issues[0]?.message ?? "Invalid member selection.");
  }

  const values = parsed.data;

  if (values.userId === access.userId) {
    redirectWithRbacFlash("error", "You cannot remove your own membership.");
  }

  const organizationUsers = await listOrganizationUsersWithRoles(access.organizationId);

  if (organizationUsers.error) {
    redirectWithRbacFlash("error", "Unable to validate organization memberships.");
  }

  const ownerCount = organizationUsers.data.filter((user) => user.role === "owner").length;
  const targetMembership = organizationUsers.data.find((user) => user.id === values.userId);

  if (!targetMembership) {
    redirectWithRbacFlash("error", "The selected membership could not be resolved.");
  }

  if (targetMembership.role === "owner" && ownerCount <= 1) {
    redirectWithRbacFlash("error", "At least one owner must remain assigned.");
  }

  const removal = await deleteOrganizationMembershipRecord(
    access.organizationId,
    values.userId
  );

  if (removal.error) {
    redirectWithRbacFlash("error", "Unable to remove this member.");
  }

  await createAuditLogEntry({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "organization_member_removed",
    entity: "organization_member",
    entityId: values.userId,
    details: {
      previous_role: targetMembership.role
    }
  });

  redirectWithRbacFlash("message", "Member removed.");
}
