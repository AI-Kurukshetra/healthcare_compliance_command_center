import { DashboardHeader } from "@/components/layout/dashboard-header";
import { StatusCard } from "@/components/ui/status-card";

const complianceSignals = [
  {
    title: "Policies nearing review",
    value: "12",
    detail: "Three require legal approval this week."
  },
  {
    title: "Open incident escalations",
    value: "4",
    detail: "Two are already routed to privacy leadership."
  },
  {
    title: "Training completion",
    value: "94%",
    detail: "Cardiology and Imaging teams are below threshold."
  }
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <DashboardHeader />

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="glass-panel relative overflow-hidden p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-signal via-tide to-ocean" />
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
              Healthcare Compliance Command Center
            </p>
            <h1 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight md:text-6xl">
              Watch policy risk, incident response, and audit readiness from one operating view.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink/70">
              This starter gives you a clean Next.js foundation with Supabase session handling and a
              dashboard-ready Tailwind design system.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-success/10 px-4 py-2 text-sm font-semibold text-success">
                Supabase auth ready
              </span>
              <span className="rounded-full bg-ocean/10 px-4 py-2 text-sm font-semibold text-ocean">
                Tailwind configured
              </span>
              <span className="rounded-full bg-signal/10 px-4 py-2 text-sm font-semibold text-signal">
                App Router structure
              </span>
            </div>
          </div>

          <aside className="glass-panel p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
              Launch Checklist
            </p>
            <ul className="mt-4 space-y-4 text-sm text-ink/75">
              <li>Connect a Supabase project and copy the URL and anon key into `.env.local`.</li>
              <li>Swap the sample metrics with live compliance, audit, and workforce data.</li>
              <li>Gate dashboard routes with role-aware Supabase auth.</li>
            </ul>
          </aside>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {complianceSignals.map((signal) => (
            <StatusCard key={signal.title} {...signal} />
          ))}
        </section>
      </div>
    </main>
  );
}
