export default function DocumentsLoading() {
  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel overflow-hidden p-8 md:p-10">
          <div className="h-4 w-28 animate-pulse rounded-full bg-ocean/15" />
          <div className="mt-5 h-12 w-full max-w-2xl animate-pulse rounded-3xl bg-ink/10" />
          <div className="mt-4 h-5 w-full max-w-3xl animate-pulse rounded-full bg-ink/10" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-[28px] border border-ink/10 bg-white/70"
              />
            ))}
          </div>
          <div className="mt-8 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="min-h-[520px] animate-pulse rounded-[28px] border border-ink/10 bg-white/75" />
            <div className="min-h-[520px] animate-pulse rounded-[28px] border border-ink/10 bg-white/75" />
          </div>
        </section>
      </div>
    </main>
  );
}
