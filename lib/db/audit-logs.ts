import "server-only";

import { getDatabaseClient } from "@/lib/db";
import type { Database, Json } from "@/types/database";

type CreateAuditLogInput = {
  organizationId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  details?: Json | null;
};

export async function createAuditLogEntry({
  organizationId,
  userId,
  action,
  entity,
  entityId,
  details
}: CreateAuditLogInput) {
  const supabase = getDatabaseClient();
  const auditLogEntry: Database["public"]["Tables"]["audit_logs"]["Insert"] = {
    organization_id: organizationId,
    user_id: userId ?? null,
    action,
    entity,
    entity_id: entityId,
    details: details ?? null
  };

  return supabase.from("audit_logs").insert(auditLogEntry as never);
}
