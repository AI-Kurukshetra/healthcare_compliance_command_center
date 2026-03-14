import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import type { AppRole } from "@/types/compliance";

import { getDatabaseClient } from "@/lib/db";
import type { Database } from "@/types/database";

type UpsertUserInput = {
  id: string;
  organizationId: string;
  email: string;
  role: AppRole;
};

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UserRecord = Pick<UserRow, "id" | "organization_id" | "email" | "role">;

export async function getUserRecordById(
  userId: string
): Promise<{ data: UserRecord | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, organization_id, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

export async function upsertUserRecord({ id, organizationId, email, role }: UpsertUserInput) {
  const supabase = getDatabaseClient();
  const userRecord: Database["public"]["Tables"]["users"]["Insert"] = {
    id,
    organization_id: organizationId,
    email,
    role
  };

  return supabase.from("users").upsert(
    userRecord as never,
    {
      onConflict: "id"
    }
  );
}
