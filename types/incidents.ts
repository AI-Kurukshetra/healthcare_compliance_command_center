import type { IncidentStatus, RiskSeverity } from "@/types/compliance";

export type IncidentSummary = {
  id: string;
  organizationId: string;
  severity: RiskSeverity;
  status: IncidentStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
};
