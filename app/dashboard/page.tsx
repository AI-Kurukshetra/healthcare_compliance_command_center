import { redirect } from "next/navigation";

import { SubmitButton } from "@/components/forms/submit-button";
import { logoutAction } from "@/lib/auth/actions";
import { getDatabaseClient } from "@/lib/db";

export default async function DashboardPage() {
  const supabase = getDatabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">Dashboard</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
            Authenticated workspace ready for compliance modules.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink/75">
            Your Supabase session is available on the server, and all future data access should be
            routed through `lib/db`.
          </p>
          <dl className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-ink/10 bg-white/70 p-5">
              <dt className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                Signed in user
              </dt>
              <dd className="mt-3 text-base text-ink">{user.email ?? user.id}</dd>
            </div>
            <div className="rounded-3xl border border-ink/10 bg-white/70 p-5">
              <dt className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                Next milestone
              </dt>
              <dd className="mt-3 text-base text-ink">Implement the full authentication flow.</dd>
            </div>
          </dl>
          <form action={logoutAction} className="mt-8">
            <SubmitButton
              pendingLabel="Signing out..."
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
            >
              Sign out
            </SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
