import "server-only";

import { getDatabaseClient } from "@/lib/db";
import type { Database } from "@/types/database";

type UpsertOrganizationInput = {
  id: string;
  name: string;
  plan?: string | null;
};

export async function upsertOrganizationRecord({
  id,
  name,
  plan = "starter"
}: UpsertOrganizationInput) {
  const supabase = getDatabaseClient();
  const organizationRecord: Database["public"]["Tables"]["organizations"]["Insert"] = {
    id,
    organization_id: id,
    name,
    plan
  };

  return supabase.from("organizations").upsert(
    organizationRecord as never,
    {
      onConflict: "id"
    }
  );
}
