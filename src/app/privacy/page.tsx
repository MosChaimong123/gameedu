import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";

import { LegalParagraphs } from "@/components/legal/legal-paragraphs";
import { LANGUAGE_COOKIE_NAME } from "@/lib/language-cookie";
import type { Language } from "@/lib/translations";
import { privacyContent } from "../../../content/public-pages";

export async function generateMetadata(): Promise<Metadata> {
    const cookieStore = await cookies();
    const language: Language = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value === "th" ? "th" : "en";
    const copy = privacyContent[language];
    return {
        title: `${copy.title} · GameEdu`,
        description: copy.intro.slice(0, 155),
    };
}

export default async function PrivacyPage() {
    const cookieStore = await cookies();
    const language: Language = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value === "th" ? "th" : "en";
    const copy = privacyContent[language];

    return (
        <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
            <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                {copy.back}
            </Link>
            <div className="mt-6 space-y-6">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                        {copy.updated}: {copy.updatedAt}
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        {copy.title}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{copy.intro}</p>
                </div>

                {copy.sections.map(([title, body]) => (
                    <section key={title} className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
                        <LegalParagraphs text={body} />
                    </section>
                ))}

                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                    {copy.note}
                </p>
            </div>
        </main>
    );
}
