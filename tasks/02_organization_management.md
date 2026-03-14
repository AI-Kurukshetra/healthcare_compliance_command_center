Goal

Support multi-tenant organizations.

Database

organizations
organization_members

Fields

organization_id
user_id
role

Backend Logic

Users must belong to an organization.

Security

All queries must filter by organization_id.

Acceptance Criteria

User can create organization.
Users belong to only one organization.