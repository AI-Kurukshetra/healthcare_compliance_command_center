import Link from "next/link";

type AuthShellProps = {
  badge: string;
  title: string;
  description: string;
  alternateHref: string;
  alternateLabel: string;
  children: React.ReactNode;
};

export function AuthShell({
  badge,
  title,
  description,
  alternateHref,
  alternateLabel,
  children
}: AuthShellProps) {
  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-6 py-10 md:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="rounded-[2rem] border border-ink/10 bg-ink px-8 py-10 text-white shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/65">{badge}</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/75">{description}</p>

          <div className="mt-8 grid gap-3 text-sm text-white/75">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              Multi-tenant session handling through Supabase SSR.
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              Protected routes redirect through middleware before any PHI loads.
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              Login and logout actions write audit events when organization context is available.
            </div>
          </div>
        </section>

        <section className="glass-panel p-8 md:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
                Access Control
              </p>
              <p className="mt-2 text-sm text-ink/70">Email/password and passwordless magic link.</p>
            </div>
            <Link
              href={alternateHref}
              className="rounded-full border border-ocean/15 bg-ocean/5 px-4 py-2 text-sm font-semibold text-ocean transition hover:bg-ocean/10"
            >
              {alternateLabel}
            </Link>
          </div>

          <div className="mt-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
