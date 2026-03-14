import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ProfileMessages } from "@/components/forms/profile-messages";
import { SubmitButton } from "@/components/forms/submit-button";
import { getOrganizationWorkspaceByUserId } from "@/lib/db/organizations";
import { getUserRecordById } from "@/lib/db/users";
import { getProfileFlash } from "@/lib/profile/state";
import { updatePasswordAction, updateProfileAction } from "@/lib/profile/actions";
import { createClient } from "@/lib/supabase/server";

function formatRole(role: string) {
  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export default async function ProfilePage() {
  const flash = getProfileFlash(cookies());
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, workspace] = await Promise.all([
    getUserRecordById(user.id),
    getOrganizationWorkspaceByUserId(user.id)
  ]);

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">Profile</p>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
                Manage your account details.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-ink/75">
                Update your name, rotate your password, and review the organization context attached
                to your secure workspace.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-ink/5"
            >
              Back to Dashboard
            </Link>
          </div>

          <div className="mt-8">
            <ProfileMessages error={flash.error} message={flash.message} />
          </div>

          {profile.error || !profile.data ? (
            <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              Your profile record is unavailable. Sign out and back in after applying the latest
              migrations.
            </div>
          ) : (
            <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[28px] border border-ink/10 bg-white/75 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                  Personal details
                </p>
                <form action={updateProfileAction} className="mt-5 space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold text-ink" htmlFor="first-name">
                        First name
                      </label>
                      <input
                        id="first-name"
                        name="firstName"
                        type="text"
                        defaultValue={profile.data.first_name ?? ""}
                        autoComplete="given-name"
                        required
                        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                        placeholder="Jordan"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-semibold text-ink" htmlFor="last-name">
                        Last name
                      </label>
                      <input
                        id="last-name"
                        name="lastName"
                        type="text"
                        defaultValue={profile.data.last_name ?? ""}
                        autoComplete="family-name"
                        required
                        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                        placeholder="Lee"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-ink" htmlFor="profile-email">
                      Work email
                    </label>
                    <input
                      id="profile-email"
                      type="email"
                      value={profile.data.email}
                      disabled
                      readOnly
                      className="rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm text-ink/70"
                    />
                  </div>

                  <SubmitButton
                    pendingLabel="Saving profile..."
                    className="min-h-[48px] rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                  >
                    Save profile
                  </SubmitButton>
                </form>
              </section>

              <div className="grid gap-4">
                <section className="rounded-[28px] border border-ink/10 bg-white/75 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                    Password
                  </p>
                  <form action={updatePasswordAction} className="mt-5 space-y-5">
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold text-ink" htmlFor="new-password">
                        New password
                      </label>
                      <input
                        id="new-password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                        placeholder="Minimum 8 characters"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-semibold text-ink" htmlFor="confirm-new-password">
                        Confirm new password
                      </label>
                      <input
                        id="confirm-new-password"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                        placeholder="Repeat password"
                      />
                    </div>

                    <SubmitButton
                      pendingLabel="Updating password..."
                      className="min-h-[48px] rounded-2xl border border-ocean/20 bg-ocean/5 px-4 py-3 text-sm font-semibold text-ocean transition hover:bg-ocean/10"
                    >
                      Update password
                    </SubmitButton>
                  </form>
                </section>

                <section className="rounded-[28px] border border-ocean/15 bg-ocean/5 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
                    Organization
                  </p>
                  {workspace.error || !workspace.data ? (
                    <p className="mt-4 text-sm text-ink/75">
                      Organization details are unavailable until the organization management migration
                      has been applied.
                    </p>
                  ) : (
                    <dl className="mt-5 grid gap-4">
                      <div>
                        <dt className="text-sm text-ink/55">Organization</dt>
                        <dd className="mt-2 text-base font-semibold text-ink">
                          {workspace.data.organization.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-ink/55">Role</dt>
                        <dd className="mt-2 text-base font-semibold text-ink">
                          {formatRole(workspace.data.membership.role)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-ink/55">Plan</dt>
                        <dd className="mt-2 text-base font-semibold text-ink">
                          {workspace.data.organization.plan ?? "Starter"}
                        </dd>
                      </div>
                    </dl>
                  )}
                </section>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
