import Link from "next/link";

import { requirePermission } from "@/lib/auth/rbac";

export default async function ManageIncidentsPage() {
  await requirePermission("manage_incidents");

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
            Incident Operations
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
            Manage security incidents and remediation.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink/75">
            Only roles with incident management permission can reach this route. Use it for triage,
            escalation, and coordinated response workflows that may involve sensitive security data.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
          >
            Back to Dashboard
          </Link>
        </section>
      </div>
    </main>
  );
}
