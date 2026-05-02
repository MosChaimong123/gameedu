import { type Language } from "@/lib/translations";
import { getTranslationText } from "@/lib/translation-lookup";

/** Server-safe `t()` using the shared dictionary (defaults to English for DB fallback text). */
export function formatTranslation(
  language: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  let text = getTranslationText(language, key);
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{${paramKey}}`, String(value));
    });
  }
  return text;
}
