"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ZodType, infer as ZodInfer } from "zod";

import { createAuditLogEntry } from "@/lib/db/audit-logs";
import { getUserRecordById, type UserRecord, updateUserProfileRecord } from "@/lib/db/users";
import { safelyRunAuthSideEffect } from "@/lib/auth/service";
import { createClient } from "@/lib/supabase/server";
import { setProfileFlash } from "@/lib/profile/state";
import { updatePasswordSchema, updateProfileSchema } from "@/lib/profile/schemas";

function redirectWithProfileFlash(kind: "error" | "message", message: string) {
  setProfileFlash(kind, message, cookies());
  redirect("/profile");
}

function getFieldValue(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value : "";
}

function parseOrRedirect<Schema extends ZodType>(
  schema: Schema,
  input: unknown,
  fallbackMessage: string
): ZodInfer<Schema> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    redirectWithProfileFlash("error", parsed.error.issues[0]?.message ?? fallbackMessage);
  }

  return parsed.data as ZodInfer<Schema>;
}

async function getProfileContext() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userRecord = await getUserRecordById(user.id);

  if (userRecord.error || !userRecord.data) {
    redirectWithProfileFlash("error", "Unable to load your profile record.");
  }

  return {
    supabase,
    user,
    userRecord: userRecord.data as UserRecord
  };
}

export async function updateProfileAction(formData: FormData) {
  const values = parseOrRedirect(
    updateProfileSchema,
    {
      firstName: getFieldValue(formData, "firstName"),
      lastName: getFieldValue(formData, "lastName")
    },
    "Invalid profile details."
  );

  const { supabase, user, userRecord } = await getProfileContext();
  const { error } = await updateUserProfileRecord(userRecord.organization_id, user.id, {
    first_name: values.firstName,
    last_name: values.lastName
  });

  if (error) {
    redirectWithProfileFlash("error", "Unable to save your profile details.");
  }

  await createAuditLogEntry({
    organizationId: userRecord.organization_id,
    userId: user.id,
    action: "profile_updated",
    entity: "user_profile",
    entityId: user.id,
    details: {
      first_name: values.firstName,
      last_name: values.lastName
    }
  });

  await safelyRunAuthSideEffect(async () => {
    await supabase.auth.updateUser({
      data: {
        full_name: `${values.firstName} ${values.lastName}`.trim(),
        first_name: values.firstName,
        last_name: values.lastName
      }
    });
  });

  redirectWithProfileFlash("message", "Profile details saved.");
}

export async function updatePasswordAction(formData: FormData) {
  const values = parseOrRedirect(
    updatePasswordSchema,
    {
      password: getFieldValue(formData, "password"),
      confirmPassword: getFieldValue(formData, "confirmPassword")
    },
    "Invalid password details."
  );

  const { supabase, user, userRecord } = await getProfileContext();
  const { error } = await supabase.auth.updateUser({
    password: values.password
  });

  if (error) {
    redirectWithProfileFlash("error", error.message);
  }

  await createAuditLogEntry({
    organizationId: userRecord.organization_id,
    userId: user.id,
    action: "password_updated",
    entity: "user_profile",
    entityId: user.id,
    details: {
      email: user.email ?? null
    }
  });

  redirectWithProfileFlash("message", "Password updated successfully.");
}
