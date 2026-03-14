Goal

Implement authentication system.

Technology

Supabase Auth

Features

- email/password login
- magic link login
- logout
- session persistence

Database

users
organizations

Backend Logic

Create helper in:

lib/auth

UI

Pages

/login
/register

Security

Do not expose service role key.
Require authentication for dashboard routes.

Audit Logging

Log login and logout events.

Acceptance Criteria

Users can create account and log in.