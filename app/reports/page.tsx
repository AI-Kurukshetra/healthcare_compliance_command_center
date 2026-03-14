import { requirePermission } from "@/lib/auth/rbac";

export default async function ReportsPage() {
  await requirePermission("view_reports");

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">Reports</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
            Reporting workspace reserved for authorized roles.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink/75">
            Access to compliance scorecards, audit exports, and executive reporting is restricted to
            roles with explicit report-view permissions.
          </p>
        </section>
      </div>
    </main>
  );
}
