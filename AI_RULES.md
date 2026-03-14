# AI Development Rules

This project is a Healthcare Compliance Management Platform.

Stack:
- Next.js (App Router)
- Supabase (Postgres, Auth, Storage, Edge Functions)
- Vercel deployment
- Tailwind CSS
- TypeScript

Before implementing any feature you MUST read:

SYSTEM_CONTEXT.md
docs/PRODUCT_SPEC.md
docs/DATABASE_SCHEMA.md
docs/SECURITY_ARCHITECTURE.md
docs/SUPABASE_RULES.md
docs/UI_UX_GUIDELINES.md
SECURITY_CHECKLIST.md

General Coding Rules

1. Use TypeScript only
2. Use Next.js Server Components by default
3. Use Server Actions for mutations
4. Use Zod for validation
5. No direct database queries in UI components
6. All database access must go through /lib/db
7. All features must support multi-tenancy
8. All mutations must create audit logs

Security Rules

1. Never expose PHI without authorization
2. Every table must implement Row Level Security
3. Use organization_id for tenant isolation
4. All sensitive operations require authentication
5. Log all access to PHI
6. Do not expose Supabase service role key

Database Rules

1. All schema changes must use migrations
2. Every table must contain:
   - id
   - organization_id
   - created_at
   - updated_at

Feature Development Rules

Every feature must include:

- authentication
- authorization
- audit logging
- validation
- error handling

Project Structure

/app → routes and pages  
/components → UI components  
/lib → backend logic  
/types → shared types  
/docs → documentation  

Always explain architecture decisions before generating code.