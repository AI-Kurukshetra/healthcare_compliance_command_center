import type { AppRole } from "@/types/compliance";

export type PermissionName =
  | "manage_users"
  | "view_reports"
  | "manage_assessments"
  | "view_incidents"
  | "manage_incidents"
  | "upload_documents"
  | "view_audit_logs"
  | "configure_security_settings"
  | "complete_training"
  | "participate_assessments"
  | "view_assigned_tasks";

export const PERMISSION_DEFINITIONS: ReadonlyArray<{
  name: PermissionName;
  description: string;
}> = [
  { name: "manage_users", description: "Manage organization users and role assignments." },
  { name: "view_reports", description: "View compliance and audit reporting surfaces." },
  { name: "manage_assessments", description: "Manage compliance assessments and policy workflows." },
  { name: "view_incidents", description: "View incident records and triage status." },
  { name: "manage_incidents", description: "Manage incidents and remediation workflows." },
  { name: "upload_documents", description: "Manage and upload compliance documents." },
  { name: "view_audit_logs", description: "View audit log exports and evidence trails." },
  { name: "configure_security_settings", description: "Configure organization security settings." },
  { name: "complete_training", description: "Complete assigned training activities." },
  { name: "participate_assessments", description: "Participate in organization assessments." },
  { name: "view_assigned_tasks", description: "View assigned compliance tasks." }
];

export const ROLE_DEFINITIONS: ReadonlyArray<{
  name: AppRole;
  description: string;
}> = [
  {
    name: "owner",
    description: "Full access to organization administration, membership, and billing controls."
  },
  {
    name: "admin",
    description: "Full access to organization administration, incidents, and security settings."
  },
  {
    name: "compliance_officer",
    description: "Manages compliance workflows, reports, and policy documents."
  },
  {
    name: "staff",
    description: "Completes assigned training and participates in compliance tasks."
  },
  {
    name: "auditor",
    description: "Read-only access to reports and audit evidence."
  }
];

export const ROLE_PERMISSION_MAP: Record<AppRole, PermissionName[]> = {
  owner: [
    "manage_users",
    "view_reports",
    "manage_assessments",
    "view_incidents",
    "manage_incidents",
    "upload_documents",
    "view_audit_logs",
    "configure_security_settings",
    "complete_training",
    "participate_assessments",
    "view_assigned_tasks"
  ],
  admin: [
    "manage_users",
    "view_reports",
    "manage_assessments",
    "view_incidents",
    "manage_incidents",
    "upload_documents",
    "view_audit_logs",
    "configure_security_settings",
    "complete_training",
    "participate_assessments",
    "view_assigned_tasks"
  ],
  compliance_officer: [
    "manage_assessments",
    "view_incidents",
    "manage_incidents",
    "view_reports",
    "upload_documents",
    "complete_training"
  ],
  staff: ["complete_training", "participate_assessments", "view_assigned_tasks"],
  auditor: ["view_reports", "view_audit_logs"]
};

export const ROUTE_PERMISSION_MAP: ReadonlyArray<{
  pathname: string;
  permission: PermissionName;
}> = [
  { pathname: "/admin", permission: "configure_security_settings" },
  { pathname: "/users", permission: "manage_users" },
  { pathname: "/compliance", permission: "view_reports" },
  { pathname: "/documents", permission: "view_reports" },
  { pathname: "/risks", permission: "view_reports" },
  { pathname: "/incidents/manage", permission: "manage_incidents" },
  { pathname: "/reports", permission: "view_reports" }
];

export function getRouteRequiredPermission(pathname: string): PermissionName | null {
  const route = ROUTE_PERMISSION_MAP.find(
    (entry) => pathname === entry.pathname || pathname.startsWith(`${entry.pathname}/`)
  );

  return route?.permission ?? null;
}

export function roleHasPermission(role: AppRole, permission: PermissionName) {
  const permissions = ROLE_PERMISSION_MAP[role];
  if (!permissions) {
    return false;
  }
  return permissions.includes(permission);
}

export function formatRoleLabel(role: AppRole) {
  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
