import { NextResponse, type NextRequest } from "next/server";

import { AUTH_REDIRECT_COOKIE } from "@/lib/auth/cookie-names";
import {
  ensureAuthAccountRecords,
  recordLoginEvent,
  safelyRunAuthSideEffect,
  sanitizeRedirectTo
} from "@/lib/auth/service";
import {
  clearAuthFlash,
  clearAuthRedirectTarget,
  setAuthFlash
} from "@/lib/auth/state";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeRedirectTo(
    request.cookies.get(AUTH_REDIRECT_COOKIE)?.value ?? requestUrl.searchParams.get("next")
  );

  if (!code) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    setAuthFlash("error", "Missing authentication code.", response.cookies);
    return response;
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    setAuthFlash("error", error.message, response.cookies);
    return response;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    await safelyRunAuthSideEffect(async () => {
      await ensureAuthAccountRecords(user);
      await recordLoginEvent(user, "magic_link");
    });
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  clearAuthFlash(response.cookies);
  clearAuthRedirectTarget(response.cookies);
  return response;
}
