# Security Architecture

Regulations Supported:

HIPAA
HITECH

Security Requirements:

1 Encryption

All data must be encrypted:
- in transit
- at rest

Use HTTPS only.

2 Access Control

Use role-based access control.

Roles:
Admin
Compliance Officer
Employee
Auditor

3 PHI Protection

Protected Health Information must:

- never be publicly accessible
- be logged when accessed
- be restricted using RLS

4 Audit Logging

All system actions must be logged:

login
document access
policy updates
incident updates

5 Multi-Tenancy

Each organization must be isolated.

Use organization_id in every table.

6 Data Retention

Audit logs must be stored for minimum 6 years.

7 Incident Tracking

All security incidents must be recorded and tracked.

8 Authentication

Use Supabase Auth.

Allowed login methods:
- email/password
- magic link

MFA recommended.