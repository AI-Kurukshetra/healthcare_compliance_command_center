import Link from "next/link";

import { requirePermission } from "@/lib/auth/rbac";

export default async function AdminPage() {
  await requirePermission("configure_security_settings");

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
            Security Administration
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
            Govern security settings and access posture.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink/75">
            This route is reserved for administrators responsible for access control, audit
            readiness, and configuration decisions that affect protected compliance data.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-ink/10 bg-white/75 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ocean">
                Access Control
              </p>
              <p className="mt-3 text-sm text-ink/75">
                Review and delegate user permissions without exposing any cross-organization data.
              </p>
            </div>
            <div className="rounded-3xl border border-ink/10 bg-white/75 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ocean">
                Audit Readiness
              </p>
              <p className="mt-3 text-sm text-ink/75">
                Role assignment changes are logged so investigators and auditors can trace access.
              </p>
            </div>
            <div className="rounded-3xl border border-ink/10 bg-white/75 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ocean">
                Security Settings
              </p>
              <p className="mt-3 text-sm text-ink/75">
                Future controls for retention, MFA posture, and incident escalation can live here.
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/users"
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Manage Members
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
