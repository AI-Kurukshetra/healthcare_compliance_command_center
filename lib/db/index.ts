import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type DatabaseClient = ReturnType<typeof createClient>;

export function getDatabaseClient(): DatabaseClient {
  return createClient();
}

export function getPrivilegedDatabaseClient(): DatabaseClient {
  return (createAdminClient() ?? createClient()) as DatabaseClient;
}
