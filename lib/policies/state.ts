import { POLICY_FLASH_COOKIE } from "@/lib/policies/cookie-names";

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

type PolicyFlashPayload =
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

function parseFlash(value?: string) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Partial<PolicyFlashPayload>;

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

export function getPolicyFlash(store: CookieReader) {
  return parseFlash(store.get(POLICY_FLASH_COOKIE)?.value);
}

export function setPolicyFlash(
  kind: PolicyFlashPayload["kind"],
  text: string,
  store: CookieWriter
) {
  store.set(
    POLICY_FLASH_COOKIE,
    JSON.stringify({ kind, text } satisfies PolicyFlashPayload),
    flashCookieOptions
  );
}
