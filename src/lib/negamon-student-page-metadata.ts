import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE_NAME } from "@/lib/language-cookie";
import { translations, type Language } from "@/lib/translations";

async function negamonLang(): Promise<Language> {
    const cookieStore = await cookies();
    return cookieStore.get(LANGUAGE_COOKIE_NAME)?.value === "th" ? "th" : "en";
}

export async function negamonProfileMetadata(): Promise<Metadata> {
    const lang = await negamonLang();
    const pack = translations[lang];
    return {
        title: pack.negamonMetaProfileTitle,
        description: pack.negamonMetaProfileDescription,
    };
}

export async function negamonCodexMetadata(): Promise<Metadata> {
    const lang = await negamonLang();
    const pack = translations[lang];
    return {
        title: pack.negamonMetaCodexTitle,
        description: pack.negamonMetaCodexDescription,
    };
}
