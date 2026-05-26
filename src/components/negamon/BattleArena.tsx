"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, RotateCcw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { OpponentPicker } from "@/components/negamon/OpponentPicker";
import { BattleHistoryPanel } from "@/components/negamon/BattleHistoryPanel";
import { BattlePrepDialog } from "@/components/negamon/battle-inventory-ui";
import type { BattleFinalRewardPayload, BattleTabProps, Opponent } from "@/components/negamon/battle-tab.types";
import { BattleV2Arena } from "@/components/game/negamon/BattleV2Arena";
import type { NegamonBattleChoiceV4, NegamonBattleStateV4 } from "@/lib/game-negamon";
import { sanitizeLoadoutAgainstInventory, validateBattleLoadout } from "@/lib/battle-loadout";

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
    onBattleFinalized,
}: BattleTabProps) {
    const { t } = useLanguage();
    const [view, setView] = useState<BattleView>("fight");
    const [opponents, setOpponents] = useState<Opponent[]>([]);
    const [loadingOpponents, setLoadingOpponents] = useState(true);
    const [challenging, setChallenging] = useState<string | null>(null);
    const [battleSession, setBattleSession] = useState<{
        mode?: "negamon_battle_v4";
        engineVersion?: string;
        defenderId: string;
        sessionId: string;
        choiceRequestId: string;
        state: NegamonBattleStateV4;
        validChoices: NegamonBattleChoiceV4[];
    } | null>(null);
    const [prepOpen, setPrepOpen] = useState(false);
    const [prepTargetId, setPrepTargetId] = useState<string | null>(null);
    const [lastAttackLoadout, setLastAttackLoadout] = useState<string[]>([]);
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
            const res = await fetch(`/api/classrooms/${classId}/battle/v4/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    challengerId: myStudentId,
                    defenderId,
                    studentCode: myStudentCode,
                }),
            });
            const data = (await res.json()) as {
                mode?: "negamon_battle_v4";
                engineVersion?: string;
                sessionId?: string;
                choiceRequestId?: string;
                state?: NegamonBattleStateV4;
                validChoices?: NegamonBattleChoiceV4[];
                error?: string;
                code?: string;
                retryAfterSeconds?: number;
            };
            if (!res.ok || !data.sessionId) {
                setError(battleStartErrorMessage(data.error, t, data.retryAfterSeconds));
                return;
            }
            setLastAttackLoadout(challengerLoadout);
            if (!data.state || !data.choiceRequestId) {
                setError(battleStartErrorMessage(data.error, t, data.retryAfterSeconds));
                return;
            }
            setBattleSession({
                mode: data.mode,
                engineVersion: data.engineVersion,
                defenderId,
                sessionId: data.sessionId,
                choiceRequestId: data.choiceRequestId,
                state: data.state,
                validChoices: data.validChoices ?? [],
            });
            setPrepOpen(false);
            setPrepTargetId(null);
        } finally {
            setChallenging(null);
        }
    }

    function handleReset() {
        setBattleSession(null);
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
                        {battleSession ? (
                            <BattleV2Arena
                                classId={classId}
                                challengerId={myStudentId}
                                defenderId={battleSession.defenderId}
                                studentCode={myStudentCode}
                                sessionId={battleSession.sessionId}
                                initialChoiceRequestId={battleSession.choiceRequestId}
                                initialState={battleSession.state}
                                initialValidChoices={battleSession.validChoices}
                                onFinish={(final: BattleFinalRewardPayload) => {
                                    setHistoryRefreshKey((k) => k + 1);
                                    if (lastAttackLoadout.length) {
                                        onBattleConsumablesSpent?.(lastAttackLoadout);
                                    }
                                    if (final.winnerId === myStudentId) {
                                        onGoldChange?.(currentGold + (final.reward?.gold ?? final.goldReward));
                                    }
                                    onBattleFinalized?.(final);
                                }}
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
