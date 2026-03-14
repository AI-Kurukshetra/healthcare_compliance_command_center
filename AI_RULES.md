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

---

# Application Behavior Standards

These rules exist to prevent unstable behavior caused by AI generated code.

## Clean URL Policy

Application URLs must remain clean and minimal.

Rules:

- URLs must only contain the domain, path, and minimal identifiers.
- Do NOT place UI messages, redirect information, or application state inside query parameters.
- Do NOT pass status flags through URLs.

Incorrect examples:

/login?redirect=/dashboard&message=success  
/dashboard?status=created&error=false  
/incidents?created=true  

Correct approach:

URLs should represent navigation only.

Examples:

/login  
/dashboard  
/incidents  
/risk-assessment/123  

Application state must be handled using:

- Supabase authentication session
- Secure cookies
- Server session
- Database state

Messages such as:

- login success
- error messages
- action results

must come from API responses or UI state — not URLs.

---

## Session and Authentication Handling

User identity and application state must always be retrieved from session or cookies.

Never rely on URL parameters for authentication or authorization.

Required sources:

- Supabase authentication session
- HTTP-only secure cookies
- Server-side session validation

Never pass:

- userId
- role
- permissions
- auth tokens

through URLs.

---

## Network Request UX

Every network request must have visible user feedback.

Rules:

- show loading indicators during async operations
- disable buttons during requests
- prevent duplicate submissions
- show success or error messages

Examples:

Form submit:
- show spinner in button
- disable submit button while processing

Data loading:
- show skeleton loaders
- show loading indicator
- handle empty state

No network request should run silently without UI feedback.

## UI Quality Check

Before completing any UI feature the AI must verify:

- responsive layout works on mobile
- loading states exist
- error states exist
- URLs remain clean
- no application state is passed through URLs