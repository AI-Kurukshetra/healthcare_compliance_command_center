Goal

Introduce organization-based RBAC into the existing system.

Important:

Authentication is already implemented.

Do NOT modify the authentication system.

Instead implement RBAC using these new tables:

roles
organizations
organization_members

Requirements:

1. Create RBAC tables
2. Create default organization
3. Add existing users to organization_members
4. Assign role owner
5. Implement role fetch logic
6. Update API authorization checks