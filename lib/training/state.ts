import { TRAINING_FLASH_COOKIE } from "@/lib/training/cookie-names";

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

type TrainingFlashPayload =
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
    const parsed = JSON.parse(value) as Partial<TrainingFlashPayload>;

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

export function getTrainingFlash(store: CookieReader) {
  return parseFlash(store.get(TRAINING_FLASH_COOKIE)?.value);
}

export function setTrainingFlash(
  kind: TrainingFlashPayload["kind"],
  text: string,
  store: CookieWriter
) {
  store.set(
    TRAINING_FLASH_COOKIE,
    JSON.stringify({ kind, text } satisfies TrainingFlashPayload),
    flashCookieOptions
  );
}
