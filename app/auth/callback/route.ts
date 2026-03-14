import { NextResponse, type NextRequest } from "next/server";

import {
  ensureAuthAccountRecords,
  recordLoginEvent,
  safelyRunAuthSideEffect,
  sanitizeRedirectTo
} from "@/lib/auth/service";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeRedirectTo(requestUrl.searchParams.get("next"));

  if (!code) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "Missing authentication code.");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(loginUrl);
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

  return NextResponse.redirect(new URL(next, request.url));
}
