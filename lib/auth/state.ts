import { AUTH_FLASH_COOKIE, AUTH_REDIRECT_COOKIE } from "@/lib/auth/cookie-names";
import { sanitizeRedirectTo } from "@/lib/auth/service";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type CookieWriter = CookieReader & {
  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      maxAge?: number;
      path?: string;
      sameSite?: "lax" | "strict" | "none";
      secure?: boolean;
    }
  ): unknown;
};

type AuthFlashPayload =
  | { kind: "error"; text: string }
  | { kind: "message"; text: string };

const baseCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production"
};

const flashCookieOptions = {
  ...baseCookieOptions,
  maxAge: 60
};

const redirectCookieOptions = {
  ...baseCookieOptions,
  httpOnly: true,
  maxAge: 60 * 30
};

function parseFlash(value?: string) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Partial<AuthFlashPayload>;

    if (parsed.kind === "error" && typeof parsed.text === "string") {
      return { error: parsed.text };
    }

    if (parsed.kind === "message" && typeof parsed.text === "string") {
      return { message: parsed.text };
    }
  } catch {
    return {};
  }

  return {};
}

export function getAuthFlash(store: CookieReader) {
  return parseFlash(store.get(AUTH_FLASH_COOKIE)?.value);
}

export function setAuthFlash(
  kind: AuthFlashPayload["kind"],
  text: string,
  store: CookieWriter
) {
  store.set(AUTH_FLASH_COOKIE, JSON.stringify({ kind, text } satisfies AuthFlashPayload), flashCookieOptions);
}

export function clearAuthFlash(store: CookieWriter) {
  store.set(AUTH_FLASH_COOKIE, "", { ...flashCookieOptions, maxAge: 0 });
}

export function getAuthRedirectTarget(store: CookieReader) {
  return sanitizeRedirectTo(store.get(AUTH_REDIRECT_COOKIE)?.value);
}

export function setAuthRedirectTarget(redirectTo: string, store: CookieWriter) {
  store.set(AUTH_REDIRECT_COOKIE, sanitizeRedirectTo(redirectTo), redirectCookieOptions);
}

export function clearAuthRedirectTarget(store: CookieWriter) {
  store.set(AUTH_REDIRECT_COOKIE, "", { ...redirectCookieOptions, maxAge: 0 });
}
