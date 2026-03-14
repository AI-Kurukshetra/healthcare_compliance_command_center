import { cookies } from "next/headers";

import { LoginForm } from "@/components/forms/login-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { getAuthFlash } from "@/lib/auth/state";

export default function LoginPage() {
  const flash = getAuthFlash(cookies());

  return (
    <AuthShell
      badge="Login"
      title="Access your healthcare compliance workspace."
      description="Sign in to review policy attestations, incident escalations, vendor oversight, and audit evidence from one secure platform."
      alternateHref="/register"
      alternateLabel="Create Account"
    >
      <LoginForm error={flash.error} message={flash.message} />
    </AuthShell>
  );
}
