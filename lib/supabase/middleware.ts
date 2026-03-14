import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getAuthRedirectTarget, setAuthRedirectTarget } from "@/lib/auth/state";
import { isAuthRoute, isProtectedRoute } from "@/lib/auth/routes";
import { serverEnv } from "@/lib/env/server";
import type { Database } from "@/types/database";

function applyResponseCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient<Database>(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request
          });
          response.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl);
    setAuthRedirectTarget(`${pathname}${request.nextUrl.search}`, redirectResponse.cookies);
    applyResponseCookies(response, redirectResponse);

    return redirectResponse;
  }

  if (user && isAuthRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getAuthRedirectTarget(request.cookies);
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl);
    applyResponseCookies(response, redirectResponse);

    return redirectResponse;
  }

  return response;
}
