import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import type { AppRole } from "@/types/compliance";

import { getDatabaseClient } from "@/lib/db";
import type { Database } from "@/types/database";

type UpsertUserInput = {
  id: string;
  organizationId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: AppRole;
};

type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type UserRecord = Pick<
  UserRow,
  "id" | "organization_id" | "email" | "first_name" | "last_name" | "role"
>;

export async function getUserRecordById(
  userId: string
): Promise<{ data: UserRecord | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, organization_id, email, first_name, last_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

export async function getUserRecordByOrganizationAndId(
  organizationId: string,
  userId: string
): Promise<{ data: UserRecord | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, organization_id, email, first_name, last_name, role")
    .eq("organization_id", organizationId)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

export async function updateUserProfileRecord(
  organizationId: string,
  userId: string,
  input: Pick<Database["public"]["Tables"]["users"]["Update"], "first_name" | "last_name">
) {
  const supabase = getDatabaseClient();

  return supabase
    .from("users")
    .update(input as never)
    .eq("organization_id", organizationId)
    .eq("id", userId);
}

export async function updateUserRoleRecord(
  organizationId: string,
  userId: string,
  role: AppRole
) {
  const supabase = getDatabaseClient();

  return supabase
    .from("users")
    .update({ role } as never)
    .eq("organization_id", organizationId)
    .eq("id", userId);
}

export async function upsertUserRecord({
  id,
  organizationId,
  email,
  firstName = null,
  lastName = null,
  role
}: UpsertUserInput) {
  const supabase = getDatabaseClient();
  const userRecord: Database["public"]["Tables"]["users"]["Insert"] = {
    id,
    organization_id: organizationId,
    email,
    first_name: firstName,
    last_name: lastName,
    role
  };

  return supabase.from("users").upsert(
    userRecord as never,
    {
      onConflict: "id"
    }
  );
}
