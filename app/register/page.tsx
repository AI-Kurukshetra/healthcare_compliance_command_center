import { cookies } from "next/headers";

import { RegisterForm } from "@/components/forms/register-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { getAuthFlash } from "@/lib/auth/state";

export default function RegisterPage() {
  const flash = getAuthFlash(cookies());

  return (
    <AuthShell
      badge="Registration"
      title="Set up your healthcare compliance command center."
      description="Create the first admin account for your organization and start centralizing policy management, audit readiness, and incident response workflows."
      alternateHref="/login"
      alternateLabel="Back to Login"
    >
      <RegisterForm error={flash.error} message={flash.message} />
    </AuthShell>
  );
}
