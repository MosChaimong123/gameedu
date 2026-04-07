import { translations, type Language } from "@/lib/translations";

type TranslationDictionary = Record<string, string>;

/** Server-safe `t()` using the shared dictionary (defaults to English for DB fallback text). */
export function formatTranslation(
  language: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  let text = (translations[language] as TranslationDictionary)[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{${paramKey}}`, String(value));
    });
  }
  return text;
}
