"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, RotateCcw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import type { BattleFighter } from "@/lib/battle-engine";
import { OpponentPicker } from "@/components/negamon/OpponentPicker";
import { BattleHistoryPanel } from "@/components/negamon/BattleHistoryPanel";
import { BattleItemBagPanel, BattlePrepDialog } from "@/components/negamon/battle-inventory-ui";
import type { BattleTabProps, Opponent } from "@/components/negamon/battle-tab.types";
import { NegamonLiteBattleArena } from "@/components/negamon/NegamonLiteBattleArena";
import { LegacyInteractiveBattle } from "@/components/negamon/legacy/LegacyInteractiveBattle";
import { sanitizeLoadoutAgainstInventory, validateBattleLoadout } from "@/lib/battle-loadout";
import type { NegamonLiteBattleState, NegamonLiteValidChoice } from "@/lib/negamon-lite";
import { isNegamonLiteBattleEnabled } from "@/lib/negamon-lite/feature-flag";

type BattleView = "fight" | "history";

function battleStartErrorMessage(
    error: string | undefined,
    t: (key: string, params?: Record<string, string | number>) => string,
    retryAfterSeconds?: number
) {
    if (error === "NO_MONSTER") return t("battleErrNoMonster");
    if (error === "NO_MOVES") return t("battleErrNoMoves");
    if (error === "NEGAMON_DISABLED") return t("battleErrDisabled");
    if (error === "INVALID_LOADOUT") return t("battleErrInvalidLoadout");
    if (error === "BATTLE_RATE_LIMITED") {
        return t("battleErrRateLimited", { seconds: retryAfterSeconds ?? 60 });
    }
    if (error === "INTERACTIVE_SESSION_LIMIT") return t("battleErrSessionLimit");
    if (error === "INVENTORY_MISMATCH") return t("battleErrInventoryChanged");
    return t("battleErrGeneric");
}

export function BattleTab({
    classId,
    myStudentId,
    myStudentCode,
    myMonster,
    currentGold = 0,
    inventory,
    onGoldChange,
    onBattleConsumablesSpent,
}: BattleTabProps) {
    const { t } = useLanguage();
    const [view, setView] = useState<BattleView>("fight");
    const [opponents, setOpponents] = useState<Opponent[]>([]);
    const [loadingOpponents, setLoadingOpponents] = useState(true);
    const [challenging, setChallenging] = useState<string | null>(null);
    const [interactiveFighters, setInteractiveFighters] = useState<{
        player: BattleFighter;
        opponent: BattleFighter;
        defenderId: string;
        sessionId: string;
        challengerLoadout: string[];
    } | null>(null);
    const [liteSession, setLiteSession] = useState<{
        defenderId: string;
        sessionId: string;
        choiceRequestId: string;
        state: NegamonLiteBattleState;
        validChoices: NegamonLiteValidChoice[];
    } | null>(null);
    const [prepOpen, setPrepOpen] = useState(false);
    const [prepTargetId, setPrepTargetId] = useState<string | null>(null);
    const [lastAttackLoadout, setLastAttackLoadout] = useState<string[]>([]);
    const interactiveRef = useRef(interactiveFighters);
    interactiveRef.current = interactiveFighters;
    const [error, setError] = useState<string | null>(null);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    useEffect(() => {
        const params = new URLSearchParams({
            studentId: myStudentId,
            studentCode: myStudentCode,
        });
        void fetch(`/api/classrooms/${classId}/battle/opponents?${params.toString()}`)
            .then((r) => r.json())
            .then((d) => setOpponents(Array.isArray(d) ? d as Opponent[] : []))
            .catch(() => setOpponents([]))
            .finally(() => setLoadingOpponents(false));
    }, [classId, myStudentCode, myStudentId]);

    function handlePickOpponent(defenderId: string) {
        setPrepTargetId(defenderId);
        setPrepOpen(true);
    }

    async function beginFight(challengerLoadout: string[]) {
        const defenderId = prepTargetId;
        if (!defenderId) return;
        setChallenging(defenderId);
        setError(null);
        try {
            const useLiteBattle = isNegamonLiteBattleEnabled();
            const res = await fetch(
                useLiteBattle
                    ? `/api/classrooms/${classId}/battle/lite/start`
                    : `/api/classrooms/${classId}/battle`,
                {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    challengerId: myStudentId,
                    defenderId,
                    studentCode: myStudentCode,
                    ...(useLiteBattle
                        ? {}
                        : {
                              mode: "beginInteractive",
                              challengerLoadout,
                          }),
                }),
                }
            );
            const data = (await res.json()) as {
                sessionId?: string;
                choiceRequestId?: string;
                state?: NegamonLiteBattleState;
                validChoices?: NegamonLiteValidChoice[];
                player?: BattleFighter;
                opponent?: BattleFighter;
                error?: string;
                code?: string;
                retryAfterSeconds?: number;
            };
            if (!res.ok || !data.sessionId) {
                setError(battleStartErrorMessage(data.error, t, data.retryAfterSeconds));
                return;
            }
            setLastAttackLoadout(challengerLoadout);
            if (useLiteBattle) {
                if (!data.state || !data.choiceRequestId) {
                    setError(battleStartErrorMessage(data.error, t, data.retryAfterSeconds));
                    return;
                }
                setLiteSession({
                    defenderId,
                    sessionId: data.sessionId,
                    choiceRequestId: data.choiceRequestId,
                    state: data.state,
                    validChoices: data.validChoices ?? [],
                });
                setInteractiveFighters(null);
            } else {
                if (!data.player || !data.opponent) {
                    setError(battleStartErrorMessage(data.error, t, data.retryAfterSeconds));
                    return;
                }
                setInteractiveFighters({
                    player: data.player,
                    opponent: data.opponent,
                    defenderId,
                    sessionId: data.sessionId,
                    challengerLoadout,
                });
                setLiteSession(null);
            }
            setPrepOpen(false);
            setPrepTargetId(null);
        } finally {
            setChallenging(null);
        }
    }

    function handleInteractiveFinish(winnerId: string, goldReward: number) {
        setHistoryRefreshKey((k) => k + 1);
        const lo = interactiveRef.current?.challengerLoadout ?? [];
        if (lo.length) {
            onBattleConsumablesSpent?.(lo);
        }
        if (winnerId === myStudentId) {
            onGoldChange?.(currentGold + goldReward);
        }
    }

    function handleReset() {
        setInteractiveFighters(null);
        setLiteSession(null);
        setView("fight");
    }

    if (!myMonster) {
        return (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border-4 border-rose-200 bg-white text-4xl shadow-md">🥚</div>
                <p className="text-sm font-black text-rose-600">{t("battleNeedMonster")}</p>
            </div>
        );
    }

    return (
        <div className="rounded-[2rem] border-4 border-rose-200 bg-gradient-to-b from-rose-50 to-pink-50 p-5 shadow-[0_6px_0_0_rgba(244,63,94,0.2)] space-y-4">
            {/* Header + view toggle */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">⚔️</span>
                    <div>
                        <h3 className="text-sm font-black text-rose-900">{t("battleTabTitle")}</h3>
                        <p className="text-[10px] font-bold text-rose-500">{t("battleTabHint")}</p>
                    </div>
                </div>
                {/* Toggle buttons */}
                <div className="flex overflow-hidden rounded-xl border-2 border-rose-200 bg-white text-xs font-black">
                    <button
                        type="button"
                        onClick={() => { setView("fight"); setError(null); }}
                        className={cn(
                            "px-3 py-1.5 transition-colors",
                            view === "fight"
                                ? "bg-rose-500 text-white"
                                : "text-rose-400 hover:bg-rose-50"
                        )}
                    >
                        {t("battleViewFight")}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setView("history"); }}
                        className={cn(
                            "px-3 py-1.5 transition-colors",
                            view === "history"
                                ? "bg-rose-500 text-white"
                                : "text-rose-400 hover:bg-rose-50"
                        )}
                    >
                        {t("battleViewHistory")}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && view === "fight" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600">
                    ⚠️ {error}
                </div>
            )}

            <AnimatePresence mode="wait">
                {view === "fight" ? (
                    <motion.div
                        key="fight"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                    >
                        {liteSession ? (
                            <NegamonLiteBattleArena
                                classId={classId}
                                challengerId={myStudentId}
                                defenderId={liteSession.defenderId}
                                studentCode={myStudentCode}
                                sessionId={liteSession.sessionId}
                                initialChoiceRequestId={liteSession.choiceRequestId}
                                initialState={liteSession.state}
                                initialValidChoices={liteSession.validChoices}
                                onFinish={(final) => {
                                    setHistoryRefreshKey((k) => k + 1);
                                    if (final.winnerId === myStudentId) {
                                        onGoldChange?.(currentGold + final.goldReward);
                                    }
                                }}
                                onReset={handleReset}
                            />
                        ) : interactiveFighters ? (
                            <LegacyInteractiveBattle
                                initialPlayer={interactiveFighters.player}
                                initialOpponent={interactiveFighters.opponent}
                                myId={myStudentId}
                                classId={classId}
                                challengerId={myStudentId}
                                defenderId={interactiveFighters.defenderId}
                                studentCode={myStudentCode}
                                sessionId={interactiveFighters.sessionId}
                                onFinish={handleInteractiveFinish}
                                onReset={handleReset}
                            />
                        ) : loadingOpponents ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-14 animate-pulse rounded-2xl bg-rose-100" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <BattleItemBagPanel inventory={inventory} />
                                <OpponentPicker
                                    opponents={opponents}
                                    onChallenge={handlePickOpponent}
                                    challenging={challenging}
                                />
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                    >
                        <BattleHistoryPanel
                            classId={classId}
                            myStudentId={myStudentId}
                            myStudentCode={myStudentCode}
                            refreshKey={historyRefreshKey}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <BattlePrepDialog
                open={prepOpen}
                onOpenChange={(v) => {
                    setPrepOpen(v);
                    if (!v) setPrepTargetId(null);
                }}
                inventory={inventory}
                initialSelection={lastAttackLoadout.length > 0 ? lastAttackLoadout : []}
                onConfirm={(ids) => {
                    const sanitized = sanitizeLoadoutAgainstInventory(ids, inventory);
                    const valid = validateBattleLoadout(sanitized, inventory);
                    if (!valid.ok) {
                        setError(t("battleErrInvalidLoadout"));
                        return;
                    }
                    void beginFight(valid.normalizedIds);
                }}
            />
        </div>
    );
}



