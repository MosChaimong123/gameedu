"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { useLanguage } from "@/components/providers/language-provider";
import type { BattleSessionEntry } from "@/components/negamon/battle-tab.types";
import type { GameHistorySummary } from "@/lib/game-core";
import { cn } from "@/lib/utils";

interface BattleHistoryPanelProps {
    classId: string;
    myStudentId: string;
    myStudentCode: string;
    refreshKey?: number;
}

function timeAgo(iso: string, t: (key: string, params?: Record<string, string | number>) => string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("battleHistoryJustNow");
    if (minutes < 60) return t("battleHistoryMinutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("battleHistoryHoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    return t("battleHistoryDaysAgo", { count: days });
}

export function BattleHistoryPanel({
    classId,
    myStudentId,
    myStudentCode,
    refreshKey = 0,
}: BattleHistoryPanelProps) {
    const { t } = useLanguage();
    const [history, setHistory] = useState<GameHistorySummary[]>([]);
    const [names, setNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = window.setTimeout(() => setLoading(true), 0);
        const params = new URLSearchParams({
            studentId: myStudentId,
            studentCode: myStudentCode,
        });

        void fetch(`/api/classrooms/${classId}/battle?${params.toString()}`)
            .then((r) => r.json())
            .then((d: {
                gameHistory?: GameHistorySummary[];
                sessions?: BattleSessionEntry[];
                studentNames?: Record<string, string>;
            }) => {
                if (Array.isArray(d.gameHistory)) {
                    setHistory(d.gameHistory);
                } else {
                    setHistory(
                        (Array.isArray(d.sessions) ? d.sessions : []).map((s) => {
                            const isChallenger = s.challengerId === myStudentId;
                            const opponentId = isChallenger ? s.defenderId : s.challengerId;
                            const won = s.winnerId === myStudentId;
                            return {
                                id: `legacy:${s.id}`,
                                kind: "battle_finished",
                                gameKind: "negamon",
                                studentId: myStudentId,
                                opponentId,
                                winnerId: s.winnerId,
                                outcome: won ? "win" : "loss",
                                goldDelta: won ? s.goldReward : 0,
                                expDelta: 0,
                                itemDelta: 0,
                                createdAt: s.createdAt,
                                sourceRefId: s.id,
                                titleKey: "battleHistoryTitle",
                            } satisfies GameHistorySummary;
                        })
                    );
                }
                setNames(d.studentNames ?? {});
            })
            .catch(() => setHistory([]))
            .finally(() => setLoading(false));

        return () => window.clearTimeout(timer);
    }, [classId, myStudentCode, myStudentId, refreshKey]);

    if (loading) {
        return (
            <div className="space-y-2 pt-1">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-2xl bg-rose-100" />
                ))}
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-rose-100 bg-white text-3xl shadow">
                    ⚔️
                </div>
                <p className="text-sm font-black text-rose-400">{t("battleHistoryEmpty")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            {history.map((entry) => {
                const opponentId = entry.opponentId ?? "";
                const opponentName = names[opponentId] ?? "?";
                const won = entry.outcome === "win";

                return (
                    <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "flex items-center gap-3 rounded-2xl border-2 px-4 py-3",
                            won
                                ? "border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50"
                                : "border-slate-200 bg-gradient-to-r from-slate-50 to-gray-50"
                        )}
                    >
                        <div
                            className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-xl",
                                won ? "border-yellow-300 bg-yellow-100" : "border-slate-200 bg-slate-100"
                            )}
                        >
                            {won ? "🏆" : "💀"}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-black text-slate-800">{opponentName}</span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400">{timeAgo(entry.createdAt, t)}</p>
                        </div>

                        <div className={cn("shrink-0 tabular-nums text-sm font-black", won ? "text-yellow-600" : "text-slate-400")}>
                            {won ? `+${entry.goldDelta}G` : t("battleResultLoserBadge")}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
