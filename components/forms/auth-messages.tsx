"use client";

import { useEffect } from "react";

import { AUTH_FLASH_COOKIE } from "@/lib/auth/cookie-names";

type AuthMessagesProps = {
  error?: string;
  message?: string;
};

export function AuthMessages({ error, message }: AuthMessagesProps) {
  useEffect(() => {
    if (!error && !message) {
      return;
    }

    document.cookie = `${AUTH_FLASH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }, [error, message]);

  if (!error && !message) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
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
