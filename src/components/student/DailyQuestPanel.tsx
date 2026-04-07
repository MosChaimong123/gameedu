"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { msUntilWeekReset } from "@/lib/quest-system";
import type { QuestStatus, QuestId } from "@/lib/daily-quests";

type QuestType = "daily" | "weekly" | "challenge";

interface AllQuestData {
    daily: QuestStatus[];
    weekly: QuestStatus[];
    challenge: QuestStatus[];
    gold: number;
}

interface DailyQuestPanelProps {
    loginCode: string;
    onGoldChange?: (newGold: number) => void;
}

export function DailyQuestPanel({ loginCode, onGoldChange }: DailyQuestPanelProps) {
    const { t } = useLanguage();
    const [data, setData] = useState<AllQuestData | null>(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; gold: number } | null>(null);
    const [activeTab, setActiveTab] = useState<QuestType>("daily");

    // Countdown to weekly reset
    const [weekCountdown, setWeekCountdown] = useState("");
    useEffect(() => {
        function tick() {
            const ms = msUntilWeekReset();
            const d = Math.floor(ms / 86400000);
            const h = Math.floor((ms % 86400000) / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            setWeekCountdown(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
        }
        tick();
        const id = window.setInterval(tick, 60_000);
        return () => clearInterval(id);
    }, []);

    const fetchQuests = useCallback(async () => {
        try {
            const res = await fetch(`/api/student/${loginCode}/daily-quests`);
            if (!res.ok) return;
            const d = (await res.json()) as AllQuestData;
            setData(d);
        } finally {
            setLoading(false);
        }
    }, [loginCode]);

    useEffect(() => { void fetchQuests(); }, [fetchQuests]);

    async function handleClaim(questId: string, questType: QuestType, goldReward: number) {
        if (claiming) return;
        setClaiming(questId);
        try {
            const res = await fetch(`/api/student/${loginCode}/daily-quests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questId, questType }),
            });
            if (!res.ok) return;
            const result = (await res.json()) as { ok: boolean; newGold: number };
            if (result.ok) {
                setData((prev) => {
                    if (!prev) return prev;
                    const update = (list: QuestStatus[]) =>
                        list.map((q) => (q.id === questId ? { ...q, claimed: true } : q));
                    return {
                        ...prev,
                        daily: questType === "daily" ? update(prev.daily) : prev.daily,
                        weekly: questType === "weekly" ? update(prev.weekly) : prev.weekly,
                        challenge: questType === "challenge" ? update(prev.challenge) : prev.challenge,
                        gold: result.newGold,
                    };
                });
                onGoldChange?.(result.newGold);
                setToast({ msg: t("questClaimToast", { amount: String(goldReward) }), gold: goldReward });
                setTimeout(() => setToast(null), 2500);
            }
        } finally {
            setClaiming(null);
        }
    }

    const quests = data ? data[activeTab] : [];
    const allDone = quests.length > 0 && quests.every((q) => q.claimed);
    const claimedCount = quests.filter((q) => q.claimed).length;
    const claimedGold = quests.filter((q) => q.claimed).reduce((s, q) => s + q.goldReward, 0);
    const totalGold = quests.reduce((s, q) => s + q.goldReward, 0);

    const TABS: { type: QuestType; icon: string; labelKey: string; color: string; activeClass: string }[] = [
        { type: "daily",     icon: "📋", labelKey: "questTabDaily",     color: "text-amber-700",  activeClass: "bg-amber-500 text-white shadow-[0_3px_0_0_rgba(180,83,9,0.4)]" },
        { type: "weekly",    icon: "📅", labelKey: "questTabWeekly",    color: "text-indigo-700", activeClass: "bg-indigo-500 text-white shadow-[0_3px_0_0_rgba(67,56,202,0.4)]" },
        { type: "challenge", icon: "🏆", labelKey: "questTabChallenge", color: "text-rose-700",   activeClass: "bg-rose-500 text-white shadow-[0_3px_0_0_rgba(190,18,60,0.4)]" },
    ];

    return (
        <div className="rounded-[2rem] border-4 border-amber-200 bg-gradient-to-b from-amber-50 to-yellow-50 p-5 shadow-[0_6px_0_0_rgba(217,119,6,0.2)] space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    <div>
                        <h3 className="text-sm font-black text-amber-900">{t("questPanelTitle")}</h3>
                        <p className="text-[10px] font-bold text-amber-600">
                            {activeTab === "weekly"
                                ? t("questPanelWeeklyResetHint", { time: weekCountdown })
                                : activeTab === "challenge"
                                    ? t("questPanelChallengeHint")
                                    : t("questPanelResetHint")}
                        </p>
                    </div>
                </div>
                {/* Progress badge */}
                <div className="flex flex-col items-end gap-0.5">
                    <span className="rounded-full border-2 border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                        {claimedCount}/{quests.length}
                    </span>
                    <p className="text-[10px] font-bold text-amber-500">🪙 {claimedGold}/{totalGold}G</p>
                </div>
            </div>

            {/* Tab selector */}
            <div className="grid grid-cols-3 gap-1 rounded-2xl border-2 border-amber-200 bg-amber-100/60 p-1">
                {TABS.map(({ type, icon, labelKey, color, activeClass }) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setActiveTab(type)}
                        className={cn(
                            "flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-black transition-all",
                            activeTab === type ? activeClass : `${color} hover:bg-white/50`
                        )}
                    >
                        <span>{icon}</span>
                        <span>{t(labelKey as Parameters<typeof t>[0])}</span>
                    </button>
                ))}
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-amber-100">
                <motion.div
                    key={activeTab}
                    initial={{ width: 0 }}
                    animate={{ width: quests.length ? `${(claimedCount / quests.length) * 100}%` : "0%" }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn("h-full rounded-full bg-gradient-to-r", {
                        "from-amber-400 to-yellow-500": activeTab === "daily",
                        "from-indigo-400 to-violet-500": activeTab === "weekly",
                        "from-rose-400 to-pink-500": activeTab === "challenge",
                    })}
                />
            </div>

            {/* All done banner */}
            <AnimatePresence>
                {allDone && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl border-2 border-yellow-300 bg-yellow-100 px-4 py-2.5 text-center"
                    >
                        <p className="text-sm font-black text-yellow-800">🎉 {t("questAllDone")}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 px-3 py-2 text-center text-sm font-black text-yellow-700"
                    >
                        🪙 {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quest list */}
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 animate-pulse rounded-2xl bg-amber-100" />
                    ))}
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-2"
                    >
                        {quests.map((q) => (
                            <QuestRow
                                key={q.id}
                                quest={q}
                                questType={activeTab}
                                claiming={claiming === q.id}
                                onClaim={() => handleClaim(q.id, activeTab, q.goldReward)}
                                t={t}
                            />
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
}

function QuestRow({
    quest,
    questType,
    claiming,
    onClaim,
    t,
}: {
    quest: QuestStatus;
    questType: QuestType;
    claiming: boolean;
    onClaim: () => void;
    t: (key: string, params?: Record<string, string>) => string;
}) {
    const canClaim = quest.completed && !quest.claimed;

    const claimBtnClass = {
        daily:     "border-amber-600 bg-gradient-to-b from-amber-400 to-amber-500 text-amber-900",
        weekly:    "border-indigo-600 bg-gradient-to-b from-indigo-400 to-indigo-500 text-white",
        challenge: "border-rose-600 bg-gradient-to-b from-rose-400 to-rose-500 text-white",
    }[questType];

    return (
        <motion.div
            layout
            className={cn(
                "flex items-center gap-3 rounded-2xl border-2 p-3 transition-all",
                quest.claimed
                    ? "border-emerald-200 bg-emerald-50"
                    : quest.completed
                        ? "border-amber-300 bg-white shadow-sm"
                        : "border-slate-100 bg-white/50"
            )}
        >
            {/* Icon */}
            <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-xl",
                quest.claimed   ? "border-emerald-200 bg-emerald-100" :
                quest.completed ? "border-amber-200 bg-amber-50"      :
                                  "border-slate-100 bg-slate-50"
            )}>
                {quest.claimed ? "✅" : quest.icon}
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
                <p className={cn(
                    "text-xs font-black leading-tight",
                    quest.claimed   ? "text-emerald-700 line-through opacity-60" :
                    quest.completed ? "text-slate-800" : "text-slate-500"
                )}>
                    {t(quest.nameKey as Parameters<typeof t>[0])}
                </p>
                <p className="text-[10px] text-slate-400 leading-snug">
                    {t(quest.descKey as Parameters<typeof t>[0])}
                </p>
            </div>

            {/* Reward + action */}
            <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-[10px] font-black text-yellow-600">+{quest.goldReward}🪙</span>
                {quest.claimed ? (
                    <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-600">
                        {t("questClaimed")}
                    </span>
                ) : canClaim ? (
                    <button
                        type="button"
                        disabled={claiming}
                        onClick={onClaim}
                        className={cn(
                            "rounded-xl border-b-2 px-2.5 py-1 text-[10px] font-black transition active:translate-y-px active:border-b-0 disabled:opacity-60",
                            claimBtnClass
                        )}
                    >
                        {claiming ? "..." : t("questClaim")}
                    </button>
                ) : (
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        {t("questLocked")}
                    </span>
                )}
            </div>
        </motion.div>
    );
}
