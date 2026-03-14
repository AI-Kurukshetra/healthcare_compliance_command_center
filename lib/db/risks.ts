import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { getDatabaseClient } from "@/lib/db";
import type { RiskSeverity, RiskStatusKey } from "@/types/compliance";
import type { Database } from "@/types/database";

type RiskLevelRow = Database["public"]["Tables"]["risk_levels"]["Row"];
type RiskStatusRow = Database["public"]["Tables"]["risk_status"]["Row"];
type RiskItemRow = Database["public"]["Tables"]["risk_items"]["Row"];

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

const STATUS_ORDER: Record<RiskStatusKey, number> = {
  escalated: 5,
  monitoring: 4,
  mitigating: 3,
  identified: 2,
  resolved: 1
} as const;

export type RiskLevelDefinition = Pick<
  RiskLevelRow,
  "id" | "key" | "label" | "description" | "weight"
>;

export type RiskStatusDefinition = Pick<
  RiskStatusRow,
  "id" | "key" | "label" | "description" | "sort_order" | "is_threat" | "is_closed"
>;

export type RiskRegisterEntry = Pick<
  RiskItemRow,
  | "id"
  | "title"
  | "description"
  | "owner_name"
  | "source"
  | "identified_on"
  | "target_resolution_date"
  | "last_reviewed_at"
  | "updated_at"
> & {
  level: RiskLevelDefinition;
  status: RiskStatusDefinition;
};

export type RiskManagementSummary = {
  overview: {
    trackedRisks: number;
    elevatedRisks: number;
    activeThreats: number;
    overdueItems: number;
    resolvedItems: number;
  };
  severityIndicators: Array<{
    key: RiskSeverity;
    label: string;
    description: string;
    count: number;
    percentage: number;
  }>;
  heatMap: {
    levels: Array<Pick<RiskLevelDefinition, "key" | "label">>;
    rows: Array<{
      key: RiskStatusKey;
      label: string;
      total: number;
      isThreat: boolean;
      isClosed: boolean;
      cells: Array<{
        levelKey: RiskSeverity;
        count: number;
      }>;
    }>;
  };
  register: RiskRegisterEntry[];
  threatMonitoring: RiskRegisterEntry[];
};

function isMissingRelationError(error: PostgrestError | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.message.toLowerCase().includes("does not exist") ||
    error.message.toLowerCase().includes("could not find the table")
  );
}

function getOptionalRows<T>(result: {
  data: T[] | null;
  error: PostgrestError | null;
}) {
  if (isMissingRelationError(result.error)) {
    return { data: [] as T[], error: null };
  }

  return { data: result.data ?? [], error: result.error };
}

function getSeverityPercentage(count: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

function buildSeverityIndicators(levels: RiskLevelDefinition[], items: RiskRegisterEntry[]) {
  return levels.map((level) => {
    const count = items.filter((item) => item.level.key === level.key).length;

    return {
      key: level.key,
      label: level.label,
      description: level.description,
      count,
      percentage: getSeverityPercentage(count, items.length)
    };
  });
}

function buildHeatMap(
  levels: RiskLevelDefinition[],
  statuses: RiskStatusDefinition[],
  items: RiskRegisterEntry[]
) {
  return {
    levels: levels.map((level) => ({
      key: level.key,
      label: level.label
    })),
    rows: statuses.map((status) => ({
      key: status.key,
      label: status.label,
      total: items.filter((item) => item.status.key === status.key).length,
      isThreat: status.is_threat,
      isClosed: status.is_closed,
      cells: levels.map((level) => ({
        levelKey: level.key,
        count: items.filter(
          (item) => item.status.key === status.key && item.level.key === level.key
        ).length
      }))
    }))
  };
}

function resolveLevels(
  rows: Array<
    Pick<RiskLevelRow, "id" | "organization_id" | "key" | "label" | "description" | "weight">
  >
) {
  const byKey = new Map<RiskSeverity, RiskLevelDefinition>();

  for (const row of rows) {
    const existing = byKey.get(row.key);

    if (!existing || row.organization_id !== null) {
      byKey.set(row.key, {
        id: row.id,
        key: row.key,
        label: row.label,
        description: row.description,
        weight: row.weight
      });
    }
  }

  return [...byKey.values()].sort((left, right) => right.weight - left.weight);
}

function resolveStatuses(
  rows: Array<
    Pick<
      RiskStatusRow,
      "id" | "organization_id" | "key" | "label" | "description" | "sort_order" | "is_threat" | "is_closed"
    >
  >
) {
  const byKey = new Map<RiskStatusKey, RiskStatusDefinition>();

  for (const row of rows) {
    const existing = byKey.get(row.key);

    if (!existing || row.organization_id !== null) {
      byKey.set(row.key, {
        id: row.id,
        key: row.key,
        label: row.label,
        description: row.description,
        sort_order: row.sort_order,
        is_threat: row.is_threat,
        is_closed: row.is_closed
      });
    }
  }

  return [...byKey.values()].sort((left, right) => {
    const statusDelta = STATUS_ORDER[right.key] - STATUS_ORDER[left.key];

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return right.sort_order - left.sort_order;
  });
}

export async function getRiskManagementSummary(
  organizationId: string
): Promise<{ data: RiskManagementSummary | null; error: PostgrestError | null }> {
  const supabase = getDatabaseClient();
  const [levelsResult, statusesResult, itemsResult] = await Promise.all([
    supabase
      .from("risk_levels")
      .select("id, organization_id, key, label, description, weight")
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`),
    supabase
      .from("risk_status")
      .select("id, organization_id, key, label, description, sort_order, is_threat, is_closed")
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`),
    supabase
      .from("risk_items")
      .select(
        "id, title, description, owner_name, source, identified_on, target_resolution_date, last_reviewed_at, level_id, status_id, updated_at"
      )
      .eq("organization_id", organizationId)
  ]);

  const normalizedLevelsResult = getOptionalRows<
    Pick<RiskLevelRow, "id" | "organization_id" | "key" | "label" | "description" | "weight">
  >(levelsResult);
  const normalizedStatusesResult = getOptionalRows<
    Pick<
      RiskStatusRow,
      "id" | "organization_id" | "key" | "label" | "description" | "sort_order" | "is_threat" | "is_closed"
    >
  >(statusesResult);
  const normalizedItemsResult = getOptionalRows<
    Pick<
      RiskItemRow,
      | "id"
      | "title"
      | "description"
      | "owner_name"
      | "source"
      | "identified_on"
      | "target_resolution_date"
      | "last_reviewed_at"
      | "level_id"
      | "status_id"
      | "updated_at"
    >
  >(itemsResult);

  if (normalizedLevelsResult.error) {
    return { data: null, error: normalizedLevelsResult.error };
  }

  if (normalizedStatusesResult.error) {
    return { data: null, error: normalizedStatusesResult.error };
  }

  if (normalizedItemsResult.error) {
    return { data: null, error: normalizedItemsResult.error };
  }

  const levels = resolveLevels(normalizedLevelsResult.data);
  const statuses = resolveStatuses(normalizedStatusesResult.data);
  const levelMap = new Map(levels.map((level) => [level.id, level]));
  const statusMap = new Map(statuses.map((status) => [status.id, status]));
  const items = normalizedItemsResult.data
    .map((item) => {
      const level = levelMap.get(item.level_id);
      const status = statusMap.get(item.status_id);

      if (!level || !status) {
        return null;
      }

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        owner_name: item.owner_name,
        source: item.source,
        identified_on: item.identified_on,
        target_resolution_date: item.target_resolution_date,
        last_reviewed_at: item.last_reviewed_at,
        updated_at: item.updated_at,
        level,
        status
      };
    })
    .filter((item): item is RiskRegisterEntry => item !== null)
    .sort((left, right) => {
      const threatDelta = Number(right.status.is_threat) - Number(left.status.is_threat);

      if (threatDelta !== 0) {
        return threatDelta;
      }

      const statusDelta = STATUS_ORDER[right.status.key] - STATUS_ORDER[left.status.key];

      if (statusDelta !== 0) {
        return statusDelta;
      }

      const severityDelta = SEVERITY_ORDER[right.level.key] - SEVERITY_ORDER[left.level.key];

      if (severityDelta !== 0) {
        return severityDelta;
      }

      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });
  const today = new Date().toISOString().slice(0, 10);
  const activeThreats = items.filter((item) => item.status.is_threat && !item.status.is_closed);
  const overdueItems = items.filter(
    (item) =>
      !item.status.is_closed &&
      item.target_resolution_date !== null &&
      item.target_resolution_date < today
  );
  const resolvedItems = items.filter((item) => item.status.is_closed);
  const elevatedRisks = items.filter(
    (item) => item.level.key === "high" || item.level.key === "critical"
  );

  return {
    data: {
      overview: {
        trackedRisks: items.length,
        elevatedRisks: elevatedRisks.length,
        activeThreats: activeThreats.length,
        overdueItems: overdueItems.length,
        resolvedItems: resolvedItems.length
      },
      severityIndicators: buildSeverityIndicators(levels, items),
      heatMap: buildHeatMap(levels, statuses, items),
      register: items.slice(0, 8),
      threatMonitoring: activeThreats.slice(0, 5)
    },
    error: null
  };
}
