"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, ScrollText } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { enUS, th } from "date-fns/locale";
import { useLanguage } from "@/components/providers/language-provider";
import { formatPointHistoryReason } from "@/lib/point-history-reason";
import type { HistoryRecord } from "@/components/student/StudentDashboardClient";

interface GameHistoryTabProps {
    history: HistoryRecord[];
}

export function GameHistoryTab({ history }: GameHistoryTabProps) {
    const { t, language } = useLanguage();
    const dateLocale = language === "th" ? th : enUS;

    const totalPositive = history.reduce((s, h) => (h.value > 0 ? s + h.value : s), 0);
    const totalNegative = history.reduce((s, h) => (h.value < 0 ? s + h.value : s), 0);

    const grouped = useMemo(() => {
        const groups: Record<string, HistoryRecord[]> = {};
        [...history]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .forEach((h) => {
                const date = new Date(h.timestamp);
                let key = format(date, "d MMMM yyyy", { locale: dateLocale });
                if (isToday(date)) key = t("dateLabelToday");
                else if (isYesterday(date)) key = t("dateLabelYesterday");
                if (!groups[key]) groups[key] = [];
                groups[key].push(h);
            });
        return groups;
    }, [history, t, dateLocale]);

    return (
        <div className="rounded-[2rem] border-4 border-sky-200 bg-gradient-to-b from-sky-50 to-blue-50 p-5 shadow-[0_6px_0_0_rgba(14,165,233,0.2)] space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <span className="text-2xl">📜</span>
                <h3 className="text-base font-black text-sky-900">{t("tabGameHistory")}</h3>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 rounded-2xl border-2 border-emerald-200 bg-white/80 px-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400">{t("historyTotalPositive")}</p>
                        <p className="text-lg font-black tabular-nums text-emerald-600">+{totalPositive}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl border-2 border-rose-200 bg-white/80 px-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100">
                        <TrendingDown className="h-4 w-4 text-rose-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400">{t("historyTotalNegative")}</p>
                        <p className="text-lg font-black tabular-nums text-rose-600">{totalNegative}</p>
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {history.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <ScrollText className="h-10 w-10 text-sky-200" />
                    <p className="text-sm font-black text-sky-400">{t("historyEmpty")}</p>
                </div>
            )}

            {/* Date groups */}
            {Object.entries(grouped).map(([dateLabel, entries], groupIdx) => (
                <div key={dateLabel} className="space-y-2">
                    {/* Date chip */}
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-sky-200/60" />
                        <span className="rounded-full border border-sky-200 bg-white px-3 py-0.5 text-[10px] font-black text-sky-600">
                            {dateLabel}
                        </span>
                        <div className="h-px flex-1 bg-sky-200/60" />
                    </div>

                    {/* Entry cards */}
                    <div className="space-y-2">
                        {entries.map((h, idx) => {
                            const isPositive = h.value > 0;
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: isPositive ? -10 : 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: groupIdx * 0.05 + idx * 0.03 }}
                                    className={`flex items-center gap-3 rounded-2xl border-2 bg-white/90 p-3 ${
                                        isPositive
                                            ? "border-emerald-100 shadow-[0_3px_0_0_rgba(16,185,129,0.15)]"
                                            : "border-rose-100 shadow-[0_3px_0_0_rgba(239,68,68,0.15)]"
                                    }`}
                                >
                                    {/* Icon pill */}
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                                        isPositive ? "bg-emerald-50" : "bg-rose-50"
                                    }`}>
                                        {isPositive ? "⭐" : "💢"}
                                    </div>

                                    {/* Reason */}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-slate-700 leading-tight line-clamp-2">
                                            {formatPointHistoryReason(h.reason, t)}
                                        </p>
                                        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(h.timestamp), "HH:mm", { locale: dateLocale })}
                                        </div>
                                    </div>

                                    {/* Value badge */}
                                    <div className={`shrink-0 rounded-xl border-b-2 px-2.5 py-1 text-sm font-black tabular-nums ${
                                        isPositive
                                            ? "border-emerald-400 bg-gradient-to-b from-emerald-400 to-emerald-500 text-white"
                                            : "border-rose-400 bg-gradient-to-b from-rose-400 to-rose-500 text-white"
                                    }`}>
                                        {isPositive ? `+${h.value}` : h.value}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
