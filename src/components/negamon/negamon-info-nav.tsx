"use client";

import Link from "next/link";
import { ChevronLeft, User, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

type NegamonInfoNavProps = {
    code: string;
    current: "profile" | "codex";
    className?: string;
};

export function NegamonInfoNav({ code, current, className }: NegamonInfoNavProps) {
    const { t } = useLanguage();
    const base = `/student/${encodeURIComponent(code)}/negamon`;

    return (
        <nav
            className={cn(
                "mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between",
                className
            )}
        >
            <Link
                href={`/student/${encodeURIComponent(code)}`}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-700 transition-colors hover:text-violet-900"
            >
                <ChevronLeft className="h-4 w-4" />
                {t("negamonInfoNavBack")}
            </Link>
            <div className="flex flex-wrap gap-2">
                <Link
                    href={base}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-all sm:text-sm",
                        current === "profile"
                            ? "border-violet-400 bg-violet-50 text-violet-900"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-200 hover:bg-violet-50/60"
                    )}
                >
                    <User className="h-3.5 w-3.5" />
                    {t("negamonInfoNavMyMonster")}
                </Link>
                <Link
                    href={`${base}/codex`}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-all sm:text-sm",
                        current === "codex"
                            ? "border-amber-400 bg-amber-50 text-amber-950"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-200 hover:bg-amber-50/60"
                    )}
                >
                    <Library className="h-3.5 w-3.5" />
                    {t("negamonInfoNavCodex")}
                </Link>
            </div>
        </nav>
    );
}
