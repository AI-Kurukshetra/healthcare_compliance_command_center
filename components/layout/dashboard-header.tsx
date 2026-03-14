export function DashboardHeader() {
  return (
    <header className="flex flex-col justify-between gap-6 rounded-[2rem] border border-ink/10 bg-ink px-6 py-5 text-white md:flex-row md:items-center">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-white/60">Control Surface</p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
          Compliance operations overview
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-white/10 px-4 py-2 text-white/80">HIPAA monitoring</span>
        <span className="rounded-full bg-white/10 px-4 py-2 text-white/80">Audit queue</span>
        <span className="rounded-full bg-white/10 px-4 py-2 text-white/80">Vendor reviews</span>
      </div>
    </header>
  );
}
