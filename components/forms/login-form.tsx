import { loginWithPasswordAction, sendMagicLinkAction } from "@/lib/auth/actions";

import { AuthMessages } from "@/components/forms/auth-messages";

type LoginFormProps = {
  error?: string;
  message?: string;
  redirectTo?: string;
};

export function LoginForm({ error, message, redirectTo = "/dashboard" }: LoginFormProps) {
  return (
    <div className="space-y-8">
      <AuthMessages error={error} message={message} />

      <form action={loginWithPasswordAction} className="space-y-5">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="login-email">
            Work email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
            placeholder="compliance@hospital.org"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
        >
          Sign in with password
        </button>
      </form>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-ink/10" />
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/40">or</span>
        <div className="h-px flex-1 bg-ink/10" />
      </div>

      <form action={sendMagicLinkAction} className="space-y-5">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="magic-link-email">
            Passwordless sign-in email
          </label>
          <input
            id="magic-link-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
            placeholder="security@clinic.org"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl border border-ocean/20 bg-ocean/5 px-4 py-3 text-sm font-semibold text-ocean transition hover:bg-ocean/10"
        >
          Email me a magic link
        </button>
      </form>
    </div>
  );
}
