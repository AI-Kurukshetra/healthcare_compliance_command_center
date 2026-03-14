export default function ComplianceLoading() {
  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel animate-pulse overflow-hidden p-8 md:p-10">
          <div className="h-3 w-28 rounded-full bg-ocean/20" />
          <div className="mt-5 h-12 w-full max-w-2xl rounded-3xl bg-ink/10" />
          <div className="mt-4 h-5 w-full max-w-3xl rounded-2xl bg-ink/10" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="h-40 rounded-[28px] border border-white/70 bg-white/70" />
            <div className="h-40 rounded-[28px] border border-white/70 bg-white/70" />
            <div className="h-40 rounded-[28px] border border-white/70 bg-white/70" />
            <div className="h-40 rounded-[28px] border border-white/70 bg-white/70" />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="glass-panel animate-pulse p-6 md:p-8">
            <div className="h-3 w-32 rounded-full bg-ocean/20" />
            <div className="mt-5 h-10 w-full max-w-md rounded-3xl bg-ink/10" />
            <div className="mt-8 h-24 rounded-[28px] border border-white/70 bg-white/70" />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="h-64 rounded-[28px] border border-white/70 bg-white/70" />
              <div className="h-64 rounded-[28px] border border-white/70 bg-white/70" />
            </div>
          </section>

          <section className="glass-panel animate-pulse p-6 md:p-8">
            <div className="h-3 w-28 rounded-full bg-ocean/20" />
            <div className="mt-5 h-10 w-full max-w-sm rounded-3xl bg-ink/10" />
            <div className="mt-8 space-y-4">
              <div className="h-28 rounded-2xl bg-white/70" />
              <div className="h-28 rounded-2xl bg-white/70" />
              <div className="h-28 rounded-2xl bg-white/70" />
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-panel animate-pulse p-6 md:p-8">
            <div className="h-3 w-44 rounded-full bg-ocean/20" />
            <div className="mt-5 h-10 w-full max-w-lg rounded-3xl bg-ink/10" />
            <div className="mt-8 space-y-4">
              <div className="h-40 rounded-[28px] border border-white/70 bg-white/70" />
              <div className="h-40 rounded-[28px] border border-white/70 bg-white/70" />
              <div className="h-40 rounded-[28px] border border-white/70 bg-white/70" />
            </div>
          </section>

          <section className="glass-panel animate-pulse p-6 md:p-8">
            <div className="h-3 w-40 rounded-full bg-ocean/20" />
            <div className="mt-5 h-10 w-full max-w-sm rounded-3xl bg-ink/10" />
            <div className="mt-8 space-y-4">
              <div className="h-24 rounded-2xl bg-white/70" />
              <div className="h-24 rounded-2xl bg-white/70" />
              <div className="h-24 rounded-2xl bg-white/70" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
