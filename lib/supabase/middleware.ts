import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getRouteRequiredPermission, roleHasPermission } from "@/lib/auth/rbac-config";
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

  const requiredPermission = getRouteRequiredPermission(pathname);

  if (user && requiredPermission) {
    const { data } = await supabase
      .from("organization_members")
      .select("role, roles!inner(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const membershipRecord = data as {
      role?: Database["public"]["Tables"]["organization_members"]["Row"]["role"];
      roles?: { name?: Database["public"]["Tables"]["roles"]["Row"]["name"] } | Array<{
        name?: Database["public"]["Tables"]["roles"]["Row"]["name"];
      }>;
    } | null;
    const rawRole = membershipRecord?.roles;
    const resolvedRole = Array.isArray(rawRole) ? rawRole[0]?.name : rawRole?.name;
    const membershipRole = resolvedRole ?? membershipRecord?.role;

    if (!membershipRole || !roleHasPermission(membershipRole, requiredPermission)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/unauthorized";
      redirectUrl.search = "";

      const redirectResponse = NextResponse.redirect(redirectUrl);
      applyResponseCookies(response, redirectResponse);

      return redirectResponse;
    }
  }

  return response;
}
