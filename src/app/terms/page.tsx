import { cookies } from "next/headers";
import Link from "next/link";

import { LANGUAGE_COOKIE_NAME } from "@/lib/language-cookie";
import type { Language } from "@/lib/translations";
import { termsContent } from "../../../content/public-pages";

export default async function TermsPage() {
    const cookieStore = await cookies();
    const language: Language = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value === "th" ? "th" : "en";
    const copy = termsContent[language];

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
                        <p>{body}</p>
                    </section>
                ))}

                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                    {copy.note}
                </p>
            </div>
        </main>
    );
}
