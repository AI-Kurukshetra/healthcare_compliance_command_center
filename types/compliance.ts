export type AppRole = "owner" | "admin" | "compliance_officer" | "staff" | "auditor";

export type AssessmentStatus = "draft" | "in_progress" | "completed";

export type AssessmentAnswerValue = "yes" | "partial" | "no";

export type AssessmentResponseStatus = "completed";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export type RiskStatusKey = "identified" | "monitoring" | "mitigating" | "escalated" | "resolved";

export type IncidentStatus = "open" | "investigating" | "resolved" | "closed";

export type PolicyStatus = "draft" | "active" | "archived";

export type TrainingProgressStatus = "not_started" | "in_progress" | "completed";
