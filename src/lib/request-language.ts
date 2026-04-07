import { cookies } from "next/headers";
import type { Language } from "@/lib/translations";
import { LANGUAGE_COOKIE_NAME } from "@/lib/language-cookie";

/** Server-only: language from the preference cookie (defaults to English). */
export async function getRequestLanguage(): Promise<Language> {
    const jar = await cookies();
    const raw = jar.get(LANGUAGE_COOKIE_NAME)?.value;
    return raw === "th" ? "th" : "en";
}
