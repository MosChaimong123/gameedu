import { cookies } from "next/headers";
import type { Language } from "@/lib/translations";
import { LANGUAGE_COOKIE_NAME, resolveLanguageFromCookie } from "@/lib/language-cookie";

/** Server-only: language from the preference cookie (defaults to Thai). */
export async function getRequestLanguage(): Promise<Language> {
    const jar = await cookies();
    const raw = jar.get(LANGUAGE_COOKIE_NAME)?.value;
    return resolveLanguageFromCookie(raw);
}
