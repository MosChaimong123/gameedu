import legacyThaiTranslations from "@/lib/translations-th-legacy.json";
import { thaiPack, translations, type Language } from "@/lib/translations";

type TranslationDictionary = Record<string, string>;

const thaiFallback = legacyThaiTranslations as TranslationDictionary;
const thaiPrimary = thaiPack as TranslationDictionary;

export function getTranslationText(language: Language, key: string): string {
  const english = (translations.en as TranslationDictionary)[key];

  if (language === "th") {
    return thaiPrimary[key] ?? thaiFallback[key] ?? english ?? key;
  }

  return english ?? (translations[language] as TranslationDictionary)[key] ?? key;
}
