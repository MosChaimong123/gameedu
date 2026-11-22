"use client";

import Link from "next/link";
import { ChevronRight, Gamepad2 } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import type { TeacherDashboardRecentGame } from "@/lib/services/teacher/get-teacher-dashboard-summary";

export function DashboardRecentActivity({ games }: { games: TeacherDashboardRecentGame[] }) {
    const { t, language } = useLanguage();
    const locale = language === "th" ? "th-TH" : "en-US";

    return (
        <section className="rounded-[1.75rem] border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-black tracking-tight text-slate-900">
                    {t("recentActivityTitle")}
                </h3>
                <Link
                    href="/dashboard/history"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900"
                >
                    {t("viewAll")}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
            </div>

            {games.length === 0 ? (
                <p className="text-sm font-medium text-slate-500">{t("recentActivityEmpty")}</p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {games.map((game) => (
                        <li key={game.id} className="flex items-center gap-3 py-2.5">
                            <Gamepad2 className="h-5 w-5 shrink-0 text-nav-teach" aria-hidden />
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
                                {game.gameMode}
                            </span>
                            <span className="shrink-0 text-xs font-medium text-slate-500">
                                {game.playerCount.toLocaleString(locale)} {t("recentActivityPlayers")}
                            </span>
                            <span className="hidden shrink-0 text-xs font-medium text-slate-400 sm:block">
                                {new Date(game.endedAt).toLocaleDateString(locale, { dateStyle: "medium" })}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
