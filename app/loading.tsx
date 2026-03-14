export default function Loading() {
  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-6 sm:px-6 sm:py-10 md:px-10">
        <section className="glass-panel flex w-full max-w-xl flex-col items-center gap-4 px-8 py-12 text-center">
          <span
            className="h-10 w-10 animate-spin rounded-full border-[3px] border-ocean/30 border-t-ocean"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">Loading</p>
            <p className="mt-2 text-sm text-ink/70">
              Preparing the next compliance workspace view.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
