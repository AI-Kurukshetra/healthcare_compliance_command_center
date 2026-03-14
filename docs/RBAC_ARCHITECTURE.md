# Role Based Access Control (RBAC) Architecture

This platform uses an organization based RBAC system.

Users do not have a global role.

Users have a role inside an organization.

Example:

User A
- Owner in Organization A
- Auditor in Organization B

User B
- Compliance Officer in Organization A

Therefore roles must always be stored per organization.

---

# Core Principles

1. A user can belong to multiple organizations.
2. A user can have different roles in different organizations.
3. Authorization must always be validated server-side.
4. Frontend must never be trusted for permission checks.

---

# Database Structure

The system uses the following structure.

auth.users
    ↓
profiles
    ↓
organization_members
    ↓
roles

---

# Tables

## profiles

Extends Supabase auth users.

Fields:

id (uuid) → matches auth.users.id  
email (text)  
full_name (text)  
created_at (timestamp)

Roles must NOT be stored here.

---

## organizations

Represents a healthcare organization.

Fields:

id (uuid)  
name (text)  
created_by (uuid)  
created_at (timestamp)

---

## roles

Defines available roles.

Example roles:

owner  
admin  
compliance_officer  
auditor  
staff  

These roles determine system permissions.

---

## organization_members

This table connects users, organizations, and roles.

Fields:

id (uuid)  
user_id (uuid)  
organization_id (uuid)  
role_id (uuid)  
invited_by (uuid)  
created_at (timestamp)

This table defines the user's role inside the organization.

Example:

user_id → Alice  
organization_id → Hospital A  
role_id → Compliance Officer

---

# Role Assignment Rules

Roles are assigned through organization membership.

Roles are NOT selected during login.

Roles are NOT stored in the profiles table.

---

# Organization Creation

When a user creates an organization:

1. Create organization record
2. Create organization_members record
3. Assign role = owner

Example:

User creates organization → role automatically becomes Owner.

---

# Member Invitation Flow

Admins can invite members.

Flow:

Admin opens Organization Members page  
Admin clicks "Invite Member"

Input:

Email  
Role  

System performs:

1. Send invitation email
2. When user accepts invitation
3. Create organization_members record
4. Assign selected role

---

# Access Control Flow

When a user accesses a protected feature:

1. Verify authentication using Supabase session
2. Determine current organization
3. Query organization_members table
4. Retrieve role
5. Validate permission

Example query:

select role_id
from organization_members
where user_id = auth.uid()
and organization_id = current_organization_id

---

# Authorization Rules

Permissions are enforced in:

- server actions
- API routes
- Supabase RLS policies

Frontend permission checks are only for UI convenience.

Security must always be enforced server-side.

---

# Supabase Row Level Security

All organization data must be protected by RLS.

Example rule:

Users can only access records belonging to their organization.

Example condition:

organization_id IN (
    select organization_id
    from organization_members
    where user_id = auth.uid()
)

---

# Role Permissions Example

Owner
- Full system access
- Manage organization
- Manage billing
- Manage members

Admin
- Manage members
- Manage compliance tools
- Manage documents

Compliance Officer
- Manage risk assessments
- Manage incidents
- Manage policies

Auditor
- View compliance reports
- View audit trails

Staff
- Limited access
- View assigned tasks

---

# UI Requirements

Organization Members Page must include:

Member list

Columns:

Name  
Email  
Role  
Status  

Actions:

Invite Member  
Change Role  
Remove Member  

---

# Security Rules

Never expose:

user role  
user permissions  
organization membership

through URL parameters.

Authorization must always rely on session and database queries.

---

# AI Implementation Rules

When implementing authentication or organization features:

AI must read this document before generating code.

AI must never:

- store roles in profiles
- allow role selection during login
- bypass organization_members table

All role logic must come from organization membership.