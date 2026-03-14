import { registerAction } from "@/lib/auth/actions";

import { AuthMessages } from "@/components/forms/auth-messages";
import { SubmitButton } from "@/components/forms/submit-button";

type RegisterFormProps = {
  error?: string;
  message?: string;
};

export function RegisterForm({ error, message }: RegisterFormProps) {
  return (
    <form action={registerAction} className="space-y-5">
      <AuthMessages error={error} message={message} />

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="organization-name">
          Organization name
        </label>
        <input
          id="organization-name"
          name="organizationName"
          type="text"
          autoComplete="organization"
          required
          className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
          placeholder="Northwind Health"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="full-name">
          Full name
        </label>
        <input
          id="full-name"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
          placeholder="Jordan Lee"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="register-email">
          Work email
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
          placeholder="compliance@northwindhealth.org"
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2 md:gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="register-password">
            Password
          </label>
          <input
            id="register-password"
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
          <label className="text-sm font-semibold text-ink" htmlFor="confirm-password">
            Confirm password
          </label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ocean focus:ring-2 focus:ring-ocean/10"
            placeholder="Repeat password"
          />
        </div>
      </div>

      <SubmitButton
        pendingLabel="Creating account..."
        className="min-h-[48px] w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
      >
        Create Account
      </SubmitButton>
    </form>
  );
}
