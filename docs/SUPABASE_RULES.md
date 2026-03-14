# Supabase Usage Rules

Database:

Use migrations for schema changes.

Never modify production schema manually.

Row Level Security:

Every table must have RLS.

Example policy:

organization_id must match user organization.

Storage:

Buckets:

compliance-documents
audit-reports
training-materials

Edge Functions:

Used for:

- compliance scoring
- sending notifications
- generating reports