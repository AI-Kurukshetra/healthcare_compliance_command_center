Follow AI_RULES.md strictly.
Follow SECURITY_CHECKLIST.md before implementing anything.

Goal

Implement Role-Based Access Control (RBAC) for the Healthcare Compliance Platform.

This system must control access to application resources and ensure only authorized
users can perform sensitive operations involving compliance data or PHI.

Reference

AI_RULES.md
docs/DATABASE_SCHEMA.md
docs/SECURITY_ARCHITECTURE.md
docs/SUPABASE_RULES.md

Roles

The system must support the following roles:

Admin
Compliance Officer
Employee
Auditor

Role Permissions Overview

Admin
- Full access to organization
- Manage users
- Configure security settings
- View and manage incidents

Compliance Officer
- Manage compliance assessments
- View incidents
- Generate compliance reports
- Manage policy documents

Employee
- Complete training
- Participate in risk assessments
- View assigned compliance tasks

Auditor
- Read-only access
- View compliance reports
- View audit logs

Database

Create tables for RBAC.

roles
- id (uuid)
- name
- description
- created_at

permissions
- id (uuid)
- name
- description

role_permissions
- id (uuid)
- role_id
- permission_id

user_roles
- id (uuid)
- user_id
- organization_id
- role_id

Permissions Examples

manage_users
view_reports
manage_assessments
view_incidents
manage_incidents
upload_documents
view_audit_logs

Supabase Row Level Security

RLS must enforce organization isolation.

Example policy concept:

Users can only access records where
organization_id matches their membership.

Example logic:

auth.uid() must belong to organization_id.

Backend Logic

Create RBAC utilities inside:

lib/auth/rbac.ts

Functions

getUserRole(userId)
hasPermission(userId, permission)
requirePermission(permission)

Example usage

Before performing sensitive operations:

requirePermission("manage_incidents")

Frontend Authorization

Create role guards for UI components.

Example helpers:

components/auth/RoleGuard.tsx

Features

Hide UI elements when user lacks permission.
Prevent restricted pages from loading.

Protected Routes

Protect the following routes:

/admin
/incidents/manage
/reports
/users

Next.js Middleware

Create middleware to enforce authentication
and role checks before loading protected routes.

Audit Logging

Every role assignment or role change must be logged.

Log entries must contain:

user_id
action
target_user
role_assigned
timestamp

Use audit_logs table.

Security Requirements

- Never trust client role checks
- Always validate permissions on the server
- Restrict access using Supabase RLS
- Prevent cross-organization data access
- Ensure PHI access requires explicit permissions

Acceptance Criteria

1 Users can be assigned roles within an organization.
2 Roles control what features users can access.
3 Unauthorized users cannot access restricted pages.
4 Role changes are recorded in audit logs.
5 RLS policies prevent cross-organization data access.
6 UI correctly hides restricted features.

Nice to Have (Optional)

Add permission caching to reduce database lookups.

Example

Cache user role in session.