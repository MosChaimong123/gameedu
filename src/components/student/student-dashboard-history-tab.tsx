"use client";

import { Award, Clock, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { formatPointHistoryReason } from "@/lib/point-history-reason";
import type {
    HistoryRecord,
    StudentDashboardTranslateFn,
} from "@/lib/services/student-dashboard/student-dashboard.types";

interface StudentDashboardHistoryTabProps {
    t: StudentDashboardTranslateFn;
    history: HistoryRecord[];
    groupedHistory: Record<string, HistoryRecord[]>;
    totalPositive: number;
    totalNegative: number;
    dateLocale: Locale;
}

export function StudentDashboardHistoryTab({
    t,
    history,
    groupedHistory,
    totalPositive,
    totalNegative,
    dateLocale,
}: StudentDashboardHistoryTabProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    {t("studentDashScoreHistoryTitle")}
                </h3>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-xl border border-green-100 bg-green-50 px-3 py-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-black text-green-700">
                            +{totalPositive.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5">
                        <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                        <span className="text-xs font-black text-red-600">
                            {totalNegative.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto rounded-[2rem] border border-white/60 bg-white/40 shadow-sm backdrop-blur-md scroll-smooth">
                {history.length === 0 ? (
                    <div className="bg-white/40 p-12 text-center font-bold text-slate-400">
                        {t("studentDashNoScoreHistory")}
                    </div>
                ) : (
                    Object.entries(groupedHistory).map(([dateLabel, entries]) => (
                        <div
                            key={dateLabel}
                            className="overflow-hidden first:rounded-t-[2rem] last:rounded-b-[2rem]"
                        >
                            <div className="sticky top-0 z-10 flex items-center justify-between border-y border-slate-100/50 bg-slate-50/80 px-5 py-2.5 shadow-sm backdrop-blur-md">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {dateLabel}
                                </span>
                                <span className="rounded-full bg-white/50 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                    {t("studentDashHistoryEntryCount", { count: entries.length })}
                                </span>
                            </div>
                            <div className="divide-y divide-slate-100/30">
                                {entries.map((entry, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between bg-white/20 p-4 px-5 transition-colors hover:bg-white/60"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                                                    entry.value > 0
                                                        ? "bg-green-50 text-green-600"
                                                        : "bg-red-50 text-red-600"
                                                }`}
                                            >
                                                <Award className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="mb-1 whitespace-pre-wrap text-sm font-black leading-tight text-slate-800">
                                                    {formatPointHistoryReason(entry.reason, t)}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(entry.timestamp), "HH:mm", {
                                                        locale: dateLocale,
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <span
                                            className={`ml-4 shrink-0 text-lg font-black ${
                                                entry.value > 0 ? "text-green-600" : "text-red-600"
                                            }`}
                                        >
                                            {entry.value > 0 ? `+${entry.value}` : entry.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
