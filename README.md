# Healthcare Compliance Command Center

Healthcare Compliance Command Center is a Next.js application for small and mid-sized healthcare organizations that need a centralized workspace for HIPAA-oriented compliance operations. The product targets clinics, medical labs, dental practices, and telehealth companies that need visibility into compliance posture, incident response, audit evidence, vendor risk, and operational readiness without maintaining a large in-house compliance team.

This repository currently provides the application foundation: authenticated access with Supabase, multi-tenant-ready domain types, audit logging hooks for auth activity, and protected route scaffolding for the main compliance modules.

## Product Scope

The product specification defines these core areas:

- HIPAA compliance assessments
- Risk management dashboard
- Policy and document repository
- Employee training management
- Incident response workflows
- Audit trail generation
- Vendor risk assessment
- Compliance calendar and reporting
- Regulatory update notifications
- Access control management

Primary roles:

- Admin
- Compliance Officer
- Employee
- Auditor

Primary entities:

- organizations
- users
- assessments
- risks
- incidents
- vendors
- documents
- audit_logs
- training_courses
- questionnaires
- reports

## Current Implementation Status

Implemented in this repo:

- Next.js 14 App Router application shell
- TypeScript and Tailwind CSS setup
- Supabase SSR integration for browser, server, and middleware contexts
- Email/password login
- Magic link login
- Registration flow with organization bootstrap metadata
- Auth callback route for code exchange
- Middleware-based route protection and session refresh
- User and organization upsert helpers
- Audit log entries for login and logout events
- Shared domain and database TypeScript types
- Dashboard landing experience and protected module routes

Scaffolded but not yet fully implemented:

- Compliance module
- Incidents module
- Reports module
- Vendors module
- Documents module
- Live compliance metrics and reporting data
- Full database migrations and RLS policies
- Role-based authorization beyond route-level authentication

## Tech Stack

- Next.js 14 with App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase Auth
- `@supabase/ssr` for server and middleware session handling
- Zod for environment and auth input validation
- ESLint for linting

## Application Routes

Public routes:

- `/` marketing-style landing page for the product shell
- `/login` sign in with password or magic link
- `/register` create an account and seed organization metadata
- `/auth/callback` complete the Supabase auth code exchange

Protected routes:

- `/dashboard`
- `/compliance`
- `/incidents`
- `/reports`
- `/vendors`
- `/documents`

Protected routes redirect unauthenticated users to `/login`, and authenticated users are redirected away from `/login` and `/register` to `/dashboard`.

## Architecture Notes

- Supabase is the auth and data access boundary.
- Middleware refreshes auth state and enforces protected-route access.
- Server-side data access is routed through `lib/db`.
- Auth flows create or reconcile `organizations` and `users` records after sign-up or sign-in.
- Login and logout actions write audit log events.
- The typed database model is prepared for multi-tenant data using `organization_id`.

## Expected Data Model

The current typed schema includes:

- organizations
- users
- assessments
- risks
- incidents
- audit_logs
- vendors
- documents
- training_courses
- questionnaires
- responses

Security and platform assumptions from the project docs:

- HIPAA and HITECH alignment
- encryption in transit and at rest
- row-level security for tenant isolation
- `organization_id` on tenant-bound records
- audit log retention expectations
- PHI access controls and logging

## Local Development

1. Install dependencies.

```bash
npm install
```

2. Create the local environment file.

```bash
cp .env.local.example .env.local
```

3. Populate the Supabase values in `.env.local`.

4. Start the development server.

```bash
npm run dev
```

5. Open `http://localhost:3000`.

Useful scripts:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`

## Environment Variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Recommended:

- `NEXT_PUBLIC_SITE_URL`

Optional:

- `SUPABASE_SERVICE_ROLE_KEY`

Example values are provided in [`.env.local.example`](/Users/apple/StudioProjects/healthcare-compliance-command-center/.env.local.example).

## Project Structure

```text
app/                  App Router pages, layouts, and auth callback route
components/           Auth, layout, and UI building blocks
docs/                 Product, schema, security, and implementation notes
lib/auth/             Auth actions, validation, redirects, and side effects
lib/db/               Server-side data access helpers
lib/env/              Zod-validated environment loaders
lib/supabase/         Browser, server, and middleware Supabase clients
types/                Shared domain and database typings
middleware.ts         Session refresh and route protection
```

## Supabase Setup Expectations

This codebase assumes a Supabase project with:

- email/password auth enabled
- magic link auth enabled
- redirect URLs configured for local and deployed environments
- tables matching the types in [`types/database.ts`](/Users/apple/StudioProjects/healthcare-compliance-command-center/types/database.ts)
- row-level security policies enforcing organization isolation

Schema migrations are not included in this repository yet, so the database must be provisioned separately or added next.

## Additional Documentation

- [`docs/PRODUCT_SPEC.md`](/Users/apple/StudioProjects/healthcare-compliance-command-center/docs/PRODUCT_SPEC.md)
- [`docs/FEATURES.md`](/Users/apple/StudioProjects/healthcare-compliance-command-center/docs/FEATURES.md)
- [`docs/DATABASE_SCHEMA.md`](/Users/apple/StudioProjects/healthcare-compliance-command-center/docs/DATABASE_SCHEMA.md)
- [`docs/SECURITY_ARCHITECTURE.md`](/Users/apple/StudioProjects/healthcare-compliance-command-center/docs/SECURITY_ARCHITECTURE.md)
- [`docs/SUPABASE_RULES.md`](/Users/apple/StudioProjects/healthcare-compliance-command-center/docs/SUPABASE_RULES.md)
- [`docs/UI_UX_GUIDELINES.md`](/Users/apple/StudioProjects/healthcare-compliance-command-center/docs/UI_UX_GUIDELINES.md)
