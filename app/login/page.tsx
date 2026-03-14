import { LoginForm } from "@/components/forms/login-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { sanitizeRedirectTo } from "@/lib/auth/service";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    message?: string;
    redirectTo?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const redirectTo = sanitizeRedirectTo(searchParams?.redirectTo);

  return (
    <AuthShell
      badge="Login"
      title="Sign in to the compliance workspace."
      description="Use your password for direct access or request a magic link when you need a passwordless sign-in flow. Protected routes redirect here automatically."
      alternateHref="/register"
      alternateLabel="Create account"
    >
      <LoginForm
        error={searchParams?.error}
        message={searchParams?.message}
        redirectTo={redirectTo}
      />
    </AuthShell>
  );
}
