import { RegisterForm } from "@/components/forms/register-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { sanitizeRedirectTo } from "@/lib/auth/service";

type RegisterPageProps = {
  searchParams?: {
    error?: string;
    message?: string;
    redirectTo?: string;
  };
};

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const redirectTo = sanitizeRedirectTo(searchParams?.redirectTo);

  return (
    <AuthShell
      badge="Registration"
      title="Create your compliance management account."
      description="The first registered user is stored as the initial admin for the organization context captured during sign-up. Email confirmation remains compatible with Supabase Auth settings."
      alternateHref="/login"
      alternateLabel="Back to login"
    >
      <RegisterForm
        error={searchParams?.error}
        message={searchParams?.message}
        redirectTo={redirectTo}
      />
    </AuthShell>
  );
}
