export default function UsersLoading() {
  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel animate-pulse p-8 md:p-10">
          <div className="h-3 w-20 rounded-full bg-ocean/20" />
          <div className="mt-5 h-10 w-full max-w-xl rounded-2xl bg-ink/10" />
          <div className="mt-4 h-5 w-full max-w-2xl rounded-2xl bg-ink/10" />
          <div className="mt-8 h-96 rounded-3xl border border-white/70 bg-white/70" />
        </section>
      </div>
    </main>
  );
}
