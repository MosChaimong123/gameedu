import type { Language } from "@/lib/translations";

/** Cookie used so the server can render the same locale as the client preference. */
export const LANGUAGE_COOKIE_NAME = "gamedu-language" as const;

export const LANGUAGE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/** Default locale for new visitors (no cookie / invalid cookie). */
export const DEFAULT_LANGUAGE: Language = "th";

/** Explicit "en" cookie → English; missing, "th", or other values → Thai. */
export function resolveLanguageFromCookie(raw?: string | null): Language {
    return raw === "en" ? "en" : "th";
}
