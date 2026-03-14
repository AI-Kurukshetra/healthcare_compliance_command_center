# Security Checklist

Before implementing a feature ensure:

1 Does it expose PHI?
2 Does it require authentication?
3 Does it need role restrictions?
4 Does it need audit logging?
5 Does it require encryption?

Never allow:

public PHI access
unlogged data access
cross-organization data leakage

---

# URL and Session Security

Sensitive information must never be exposed in URLs.

Do NOT place the following in query parameters:

- authentication tokens
- user identifiers
- roles or permissions
- system status flags
- internal application state
- compliance information
- error or success messages

Reasons:

- URLs can appear in browser history
- URLs may be logged by servers
- URLs can be cached
- URLs may be shared unintentionally

Incorrect example:

/dashboard?role=admin&loginSuccess=true

Correct approach:

The server must determine:

- authenticated user
- user role
- permissions
- application state

by reading:

- Supabase session
- secure cookies
- backend database state