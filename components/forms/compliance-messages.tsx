"use client";

import { useEffect } from "react";

import { COMPLIANCE_FLASH_COOKIE } from "@/lib/compliance/cookie-names";

type ComplianceMessagesProps = {
  error?: string;
  message?: string;
};

export function ComplianceMessages({ error, message }: ComplianceMessagesProps) {
  useEffect(() => {
    if (!error && !message) {
      return;
    }

    document.cookie = `${COMPLIANCE_FLASH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }, [error, message]);

  if (!error && !message) {
    return null;
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
    </div>
  );
}
