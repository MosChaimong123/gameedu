"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import type { BattleSessionEntry } from "@/components/negamon/battle-tab.types";

interface BattleHistoryPanelProps {
    classId: string;
    myStudentId: string;
    myStudentCode: string;
    refreshKey?: number;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "เมื่อกี้";
    if (m < 60) return `${m} นาทีที่แล้ว`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
    const d = Math.floor(h / 24);
    return `${d} วันที่แล้ว`;
}

export function BattleHistoryPanel({
    classId,
    myStudentId,
    myStudentCode,
    refreshKey = 0,
}: BattleHistoryPanelProps) {
    const { t } = useLanguage();
    const [sessions, setSessions] = useState<BattleSessionEntry[]>([]);
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
            .then((d: { sessions?: BattleSessionEntry[]; studentNames?: Record<string, string> }) => {
                setSessions(Array.isArray(d.sessions) ? d.sessions : []);
                setNames(d.studentNames ?? {});
            })
            .catch(() => setSessions([]))
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

    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-rose-100 bg-white text-3xl shadow">⚔️</div>
                <p className="text-sm font-black text-rose-400">{t("battleHistoryEmpty")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            {sessions.map((s) => {
                const isChallenger = s.challengerId === myStudentId;
                const opponentId = isChallenger ? s.defenderId : s.challengerId;
                const opponentName = names[opponentId] ?? "?";
                const won = s.winnerId === myStudentId;

                return (
                    <motion.div
                        key={s.id}
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
                                <span className="truncate text-sm font-black text-slate-800">
                                    {opponentName}
                                </span>
                                <span
                                    className={cn(
                                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black",
                                        isChallenger
                                            ? "bg-rose-100 text-rose-600"
                                            : "bg-sky-100 text-sky-600"
                                    )}
                                >
                                    {isChallenger ? t("battleRoleChallenger") : t("battleRoleDefender")}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400">{timeAgo(s.createdAt)}</p>
                        </div>

                        <div
                            className={cn(
                                "shrink-0 text-sm font-black tabular-nums",
                                won ? "text-yellow-600" : "text-slate-400"
                            )}
                        >
                            {won ? `+${s.goldReward}G` : "แพ้"}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
