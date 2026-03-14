import Link from "next/link";
import { cookies } from "next/headers";

import { RbacMessages } from "@/components/forms/rbac-messages";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatRoleLabel, requirePermission } from "@/lib/auth/rbac";
import { listOrganizationUsersWithRoles, listRoleCatalogForOrganization } from "@/lib/db/rbac";
import { getRbacFlash } from "@/lib/rbac/state";
import {
  assignUserRoleAction,
  createOrganizationMemberAction,
  removeOrganizationMemberAction
} from "@/lib/rbac/actions";

export default async function UsersPage() {
  const access = await requirePermission("manage_users");
  const flash = getRbacFlash(cookies());
  const [users, roles] = await Promise.all([
    listOrganizationUsersWithRoles(access.organizationId),
    listRoleCatalogForOrganization(access.organizationId)
  ]);
  const ownerCount = users.error
    ? 0
    : users.data.filter((user) => user.role === "owner").length;

  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="glass-panel p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
                Member Access
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">
                Manage members across your organization.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-ink/75">
                Add members who already have an account, adjust their access, and keep ownership
                assignments protected.
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
            <RbacMessages error={flash.error} message={flash.message} />
          </div>

          <div className="mt-8 rounded-[28px] border border-ink/10 bg-white/70 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ocean">
              Add member
            </p>
            <p className="mt-3 text-sm text-ink/70">
              Members must already have an account. Ask them to sign in once and share their user
              ID before adding them here.
            </p>
            <form action={createOrganizationMemberAction} className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-ink" htmlFor="member-user-id">
                    User ID
                  </label>
                  <input
                    id="member-user-id"
                    name="userId"
                    type="text"
                    required
                    placeholder="UUID from the member profile"
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-ink" htmlFor="member-email">
                    Email
                  </label>
                  <input
                    id="member-email"
                    name="email"
                    type="email"
                    required
                    placeholder="member@organization.com"
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-ink" htmlFor="member-first-name">
                    First name
                  </label>
                  <input
                    id="member-first-name"
                    name="firstName"
                    type="text"
                    placeholder="Jordan"
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-ink" htmlFor="member-last-name">
                    Last name
                  </label>
                  <input
                    id="member-last-name"
                    name="lastName"
                    type="text"
                    placeholder="Lee"
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-ink" htmlFor="member-role">
                    Role
                  </label>
                  <select
                    id="member-role"
                    name="role"
                    defaultValue="staff"
                    className="min-h-[48px] rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                  >
                    {(roles.data ?? []).map((role) => (
                      <option key={role.id} value={role.name}>
                        {formatRoleLabel(role.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex">
                <SubmitButton
                  pendingLabel="Adding..."
                  className="min-h-[48px] rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                >
                  Add member
                </SubmitButton>
              </div>
            </form>
          </div>

          {users.error ? (
            <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              Unable to load organization users. {users.error.message}
              {roles.error ? ` Roles error: ${roles.error.message}` : ""}
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {users.data.map((user) => (
                <div
                  key={user.id}
                  className="rounded-[28px] border border-ink/10 bg-white/75 p-5"
                >
                  <form action={assignUserRoleAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-base font-semibold text-ink">
                          {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                        </p>
                        <p className="mt-1 text-sm text-ink/65">{user.email}</p>
                        <p className="mt-1 text-xs text-ink/50">User ID: {user.id}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-ocean">
                          Current role: {formatRoleLabel(user.role)}
                        </p>
                      </div>

                      <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                        <label className="sr-only" htmlFor={`role-${user.id}`}>
                          Role
                        </label>
                        <select
                          id={`role-${user.id}`}
                          name="role"
                          defaultValue={user.role}
                          className="min-h-[48px] rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                        >
                          {(roles.data ?? []).map((role) => (
                            <option key={role.id} value={role.name}>
                              {formatRoleLabel(role.name)}
                            </option>
                          ))}
                        </select>

                        <SubmitButton
                          pendingLabel="Updating..."
                          className="min-h-[48px] rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                        >
                          Save role
                        </SubmitButton>
                      </div>
                    </div>
                  </form>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <form action={removeOrganizationMemberAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <SubmitButton
                        pendingLabel="Removing..."
                        disabled={
                          user.id === access.userId || (user.role === "owner" && ownerCount <= 1)
                        }
                        className="min-h-[44px] rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Remove member
                      </SubmitButton>
                    </form>
                    {user.id === access.userId ? (
                      <span className="text-xs text-ink/60">You cannot remove yourself.</span>
                    ) : user.role === "owner" && ownerCount <= 1 ? (
                      <span className="text-xs text-ink/60">At least one owner is required.</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
