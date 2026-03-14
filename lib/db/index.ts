import "server-only";

import { createClient } from "@/lib/supabase/server";

export function getDatabaseClient() {
  return createClient();
}
