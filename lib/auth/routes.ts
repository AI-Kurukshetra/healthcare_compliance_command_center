const protectedRoutePrefixes = [
  "/dashboard",
  "/profile",
  "/admin",
  "/users",
  "/compliance",
  "/incidents",
  "/reports",
  "/vendors",
  "/documents"
] as const;

const authRoutePrefixes = ["/login", "/register"] as const;

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedRoute(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => matchesRoutePrefix(pathname, prefix));
}

export function isAuthRoute(pathname: string) {
  return authRoutePrefixes.some((prefix) => matchesRoutePrefix(pathname, prefix));
}
