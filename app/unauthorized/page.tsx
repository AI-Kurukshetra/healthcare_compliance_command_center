import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
            Access Restricted
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
            You do not have permission to open this workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink/75">
            Role-based access control blocked this request before any sensitive compliance data was
            loaded. If this access is required, ask an administrator to update your role.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Return to Dashboard
            </Link>
            <Link
              href="/profile"
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
            >
              Review My Role
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
