"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Backpack, Bolt, Footprints, ShieldAlert, Sparkles, Swords, Users } from "lucide-react";
import { RewardResultModal } from "@/components/game/negamon/RewardResultModal";
import { summarizeNegamonBattleEvent } from "@/components/game/negamon/ui-content";
import type { BattleFinalRewardPayload } from "@/components/negamon/battle-tab.types";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import type {
    NegamonBattleChoiceDiagnosticsV4,
    NegamonBattleChoiceV4,
    NegamonBattleCombatantV4,
    NegamonBattleEventV4,
    NegamonBattleSideV4,
    NegamonBattleStateV4,
} from "@/lib/game-negamon";

type ArenaChoiceResponseV4 = {
    mode?: "negamon_battle_v4";
    engineVersion?: string;
    choiceRequestId?: string;
    state?: NegamonBattleStateV4;
    validChoices?: NegamonBattleChoiceV4[];
    diagnostics?: NegamonBattleChoiceDiagnosticsV4 | null;
    final?: {
        winnerId?: string;
        loserId?: string;
        requestedGoldReward?: number;
        goldReward?: number;
        rewardBlockedReason?: "daily_cap" | "pair_cooldown" | null;
        rewardIdempotencyKey?: string;
        reward?: BattleFinalRewardPayload["reward"];
        progression?: BattleFinalRewardPayload["progression"];
    } | null;
    error?: string;
    reason?: string;
};

type ArenaSessionResponseV4 = {
    mode?: "negamon_battle_v4";
    engineVersion?: string;
    sessionId?: string;
    choiceRequestId?: string;
    state?: NegamonBattleStateV4;
    validChoices?: NegamonBattleChoiceV4[];
    diagnostics?: NegamonBattleChoiceDiagnosticsV4 | null;
    final?: {
        winnerId?: string;
        loserId?: string;
        requestedGoldReward?: number;
        goldReward?: number;
        rewardBlockedReason?: "daily_cap" | "pair_cooldown" | null;
        rewardIdempotencyKey?: string;
        reward?: BattleFinalRewardPayload["reward"];
        progression?: BattleFinalRewardPayload["progression"];
    } | null;
    error?: string;
};

interface NegamonBattleArenaV4Props {
    classId: string;
    challengerId: string;
    defenderId: string;
    studentCode: string;
    sessionId: string;
    initialChoiceRequestId: string;
    initialState: NegamonBattleStateV4;
    initialValidChoices: NegamonBattleChoiceV4[];
    onFinish?: (final: BattleFinalRewardPayload) => void;
    onReset: () => void;
}

function createFinalRewardPayload(final: NonNullable<ArenaChoiceResponseV4["final"] | ArenaSessionResponseV4["final"]>): BattleFinalRewardPayload {
    return {
        winnerId: final.winnerId ?? "",
        requestedGoldReward: final.requestedGoldReward ?? final.goldReward ?? 0,
        goldReward: final.goldReward ?? 0,
        rewardBlockedReason: final.rewardBlockedReason ?? null,
        rewardIdempotencyKey: final.rewardIdempotencyKey,
        reward: final.reward,
        progression: final.progression ?? null,
    };
}

function getCombatantMaxHp(fighter: NegamonBattleCombatantV4) {
    return fighter.maxHp;
}

function hpPercent(fighter: NegamonBattleCombatantV4) {
    return Math.max(0, Math.min(100, (fighter.hp / Math.max(1, getCombatantMaxHp(fighter))) * 100));
}

function hpTone(percent: number) {
    if (percent > 50) return "from-emerald-300 via-lime-300 to-green-500";
    if (percent > 25) return "from-amber-200 via-yellow-300 to-orange-400";
    return "from-rose-300 via-red-400 to-red-600";
}

function typeBadge(type: string) {
    const tone: Record<string, string> = {
        WATER: "bg-cyan-400/15 text-cyan-200 ring-cyan-300/30",
        FIRE: "bg-orange-400/15 text-orange-200 ring-orange-300/30",
        EARTH: "bg-stone-400/15 text-stone-100 ring-stone-300/30",
        WIND: "bg-teal-400/15 text-teal-100 ring-teal-300/30",
        THUNDER: "bg-yellow-300/15 text-yellow-100 ring-yellow-300/30",
        LIGHT: "bg-sky-200/15 text-sky-100 ring-sky-200/30",
        DARK: "bg-violet-400/15 text-violet-100 ring-violet-300/30",
        NORMAL: "bg-slate-300/15 text-slate-100 ring-slate-200/30",
    };
    return tone[type] ?? tone.NORMAL;
}

function FighterPanel({
    fighter,
    side,
    active,
}: {
    fighter: NegamonBattleCombatantV4;
    side: NegamonBattleSideV4;
    active?: boolean;
}) {
    const percent = hpPercent(fighter);
    const isPlayer = side === "player";
    const activeStatuses = fighter.activeStatusIds.length > 0 ? fighter.activeStatusIds : [...new Set(fighter.statusIds.filter(Boolean))];
    const activeStatChanges = (Object.entries(fighter.statStages) as [string, number][]).filter(([, v]) => v !== 0);

    return (
        <motion.section
            layout
            initial={{ opacity: 0, y: isPlayer ? 18 : -18 }}
            animate={{ opacity: 1, y: 0, scale: active ? 1.01 : 1 }}
            className={cn(
                "relative overflow-hidden rounded-[2rem] border p-4 text-white shadow-2xl",
                isPlayer ? "border-cyan-300/30 bg-cyan-950/70" : "border-rose-300/30 bg-slate-950/75"
            )}
        >
            <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(34,211,238,.35),transparent_28%),linear-gradient(135deg,rgba(255,255,255,.12),transparent_40%)]" />
            <div className="relative flex items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                        {isPlayer ? "YOUR NEGAMON" : "OPPONENT"}
                    </p>
                    <h3 className="mt-1 text-2xl font-black tracking-tight">{fighter.name}</h3>
                    <p className="mt-1 text-xs font-bold text-white/55">{fighter.speciesName}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {fighter.types.filter(Boolean).map((type) => (
                            <span
                                key={type}
                                className={cn("rounded-full px-2 py-0.5 text-[10px] font-black ring-1", typeBadge(type))}
                            >
                                {type}
                            </span>
                        ))}
                    </div>
                </div>
                <motion.div
                    animate={{ y: [0, -5, 0], rotate: isPlayer ? [0, -1, 0] : [0, 1, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.5rem] border border-white/15 bg-white/10 text-4xl shadow-inner"
                >
                    {isPlayer ? "🐉" : "🔥"}
                </motion.div>
            </div>
            <div className="relative mt-4">
                <div className="mb-1 flex items-center justify-between text-[11px] font-black text-white/70">
                    <span>HP</span>
                    <span className="tabular-nums">
                        {fighter.hp}/{getCombatantMaxHp(fighter)}
                    </span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-black/35 ring-1 ring-white/10">
                    <motion.div
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className={cn("h-full rounded-full bg-gradient-to-r", hpTone(percent))}
                    />
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-white/50">
                    <Bolt className="h-3.5 w-3.5 text-yellow-200" />
                    EN {fighter.energy}/{fighter.maxEnergy}
                    <Activity className="ml-2 h-3.5 w-3.5 text-cyan-200" />
                    SPD {fighter.speed}
                </div>
                {(activeStatuses.length > 0 || activeStatChanges.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {activeStatuses.map((status) => (
                            <span
                                key={status}
                                className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-black text-amber-100"
                            >
                                {status}
                            </span>
                        ))}
                        {activeStatChanges.map(([stat, stages]) => {
                            const sign = stages > 0 ? "+" : "";
                            return (
                                <span
                                    key={stat}
                                    className={cn(
                                        "rounded-full border px-2 py-0.5 text-[10px] font-black",
                                        stages > 0
                                            ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
                                            : "border-rose-200/25 bg-rose-300/10 text-rose-100"
                                    )}
                                >
                                    {stat} {sign}{stages}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        </motion.section>
    );
}

function lastBattleLine(state: NegamonBattleStateV4) {
    const last = state.events.at(-1);
    if (!last) return "Choose a move to begin the turn.";
    return summarizeNegamonBattleEvent(last);
}

function effectivenessTextClass(effectiveness: NegamonBattleEventV4["effectiveness"]): string {
    if (effectiveness === "effective") return "text-yellow-300";
    if (effectiveness === "resisted") return "text-white/35";
    if (effectiveness === "immune") return "text-slate-400";
    return "text-white/60";
}

function recentBattleLines(state: NegamonBattleStateV4) {
    return state.events.slice(-6).reverse().map((event) => ({
        id: event.id,
        text: summarizeNegamonBattleEvent(event),
        turn: event.turn,
        effectiveness: event.kind === "damage_applied" ? event.effectiveness : undefined,
    }));
}


function choiceResource(state: NegamonBattleStateV4, choice: NegamonBattleChoiceV4) {
    const moveId = choice.moveId ?? "";
    const resources = state.metadata.resources.player;
    return {
        pp: resources.ppByMoveId[moveId] ?? 0,
        maxPp: resources.maxPpByMoveId[moveId] ?? 0,
        cooldown: resources.cooldownByMoveId[moveId] ?? 0,
    };
}

function disabledCopy(reason?: string) {
    if (reason === "NO_PP") return "PP หมด";
    if (reason === "NO_ENERGY") return "พลังงานไม่พอ";
    if (reason === "FAINTED") return "หมดสภาพ";
    if (reason === "NOT_CHOOSING") return "ยังไม่ใช่จังหวะเลือก";
    if (reason === "BATTLE_ENDED") return "จบแล้ว";
    if (reason === "INVALID_TARGET") return "เป้าหมายใช้ไม่ได้";
    if (reason === "ON_COOLDOWN") return "ติดคูลดาวน์";
    if (reason === "LOCKED") return "ถูกล็อกท่า";
    return "ใช้ไม่ได้";
}

function battleErrorCopy(input: {
    error?: string;
    reason?: string;
    diagnostics?: NegamonBattleChoiceDiagnosticsV4 | null;
}) {
    if (input.error === "STALE_CHOICE") {
        return "สถานะการต่อสู้เปลี่ยนแล้ว กำลังซิงก์ข้อมูลล่าสุดให้";
    }
    if (input.diagnostics?.requestMissing) {
        return "ระบบกำลังกู้สถานะการต่อสู้จากข้อมูลล่าสุด";
    }
    if (input.diagnostics?.usedFallbackBasicChoice) {
        return "ท่าบางส่วนใช้ไม่ได้ชั่วคราว ระบบเปิดท่าพื้นฐานให้เดินเทิร์นต่อได้";
    }
    if (input.diagnostics?.allChoicesUnavailable) {
        return "รอบนี้ยังไม่พบท่าที่ใช้ได้ กำลังพยายามกู้สถานะให้";
    }
    if (input.reason) {
        return disabledCopy(input.reason);
    }
    if (input.error === "CHOICE_REJECTED") {
        return "คำสั่งนี้ใช้ไม่ได้กับสถานะการต่อสู้ปัจจุบัน";
    }
    return input.error ?? "เลือกท่าไม่สำเร็จ";
}

export function NegamonBattleArenaV4({
    classId,
    challengerId,
    defenderId,
    studentCode,
    sessionId,
    initialChoiceRequestId,
    initialState,
    initialValidChoices,
    onFinish,
    onReset,
}: NegamonBattleArenaV4Props) {
    const { t } = useLanguage();
    const normalizedInitialChoices = initialState.choices.player.length > 0 ? initialState.choices.player : initialValidChoices;
    const [state, setState] = useState<NegamonBattleStateV4>(initialState);
    const [choiceRequestId, setChoiceRequestId] = useState(initialChoiceRequestId);
    const [validChoices, setValidChoices] = useState<NegamonBattleChoiceV4[]>(normalizedInitialChoices);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [finalReward, setFinalReward] = useState<BattleFinalRewardPayload | null>(null);
    const [rewardModalOpen, setRewardModalOpen] = useState(false);

    const player = state.sides.player;
    const opponent = state.sides.opponent;
    const ended = state.phase === "ended";
    const winnerName = useMemo(() => {
        if (state.winner === "player") return player.name;
        if (state.winner === "opponent") return opponent.name;
        return null;
    }, [opponent.name, player.name, state.winner]);

    function shouldOpenRewardModal(payload: BattleFinalRewardPayload) {
        return (
            payload.requestedGoldReward > 0 ||
            payload.goldReward > 0 ||
            Boolean(payload.rewardBlockedReason) ||
            (payload.reward?.exp ?? 0) > 0 ||
            (payload.reward?.grantedItemIds.length ?? 0) > 0 ||
            (payload.reward?.levelUps.length ?? 0) > 0 ||
            (payload.reward?.unlockedSkillIds.length ?? 0) > 0 ||
            (payload.progression?.expDelta ?? 0) > 0 ||
            (payload.progression?.behaviorPointDelta ?? 0) > 0
        );
    }

    function rewardStatusCopy(payload: BattleFinalRewardPayload) {
        if (payload.rewardBlockedReason === "pair_cooldown") {
            return `ชนะแล้ว แต่ทองรอบนี้ยังไม่เข้า เพราะคู่นี้ยังอยู่ในช่วงพักรางวัล (${payload.requestedGoldReward}G -> ${payload.goldReward}G)`;
        }
        if (payload.rewardBlockedReason === "daily_cap") {
            return `ชนะแล้ว แต่ทองรอบนี้ไม่เข้าเพิ่ม เพราะถึงโควตารางวัลประจำวันแล้ว (${payload.requestedGoldReward}G -> ${payload.goldReward}G)`;
        }
        return `ได้รับ ${payload.goldReward}G`;
    }

    async function resyncBattleSession() {
        const response = await fetch(
            `/api/classrooms/${classId}/battle/v4/session?sessionId=${encodeURIComponent(sessionId)}&studentCode=${encodeURIComponent(studentCode)}`
        );
        const data = (await response.json()) as ArenaSessionResponseV4;
        if (!response.ok || !data.state || !data.choiceRequestId) {
            throw new Error(data.error ?? "SESSION_RESYNC_FAILED");
        }
        setState(data.state);
        setChoiceRequestId(data.choiceRequestId);
        setValidChoices(data.validChoices ?? (data.state.phase === "ended" ? [] : data.state.choices.player));
        if (data.final?.winnerId) {
            const payload = createFinalRewardPayload(data.final);
            setFinalReward(payload);
            setRewardModalOpen(shouldOpenRewardModal(payload));
            onFinish?.(payload);
        }
        return data;
    }

    async function chooseMove(choice: NegamonBattleChoiceV4) {
        if (busyKey || ended) return;
        setBusyKey(choice.actionId);
        setError(null);
        try {
            const response = await fetch(`/api/classrooms/${classId}/battle/v4/choice`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    challengerId,
                    defenderId,
                    studentCode,
                    sessionId,
                    choiceRequestId,
                    moveId: choice.moveId,
                    moveSlot: choice.moveSlot,
                }),
            });
            const data = (await response.json()) as ArenaChoiceResponseV4;
            if (!response.ok && (data.error === "STALE_CHOICE" || data.diagnostics?.requestMissing || data.diagnostics?.allChoicesUnavailable)) {
                setError(battleErrorCopy({ error: data.error, reason: data.reason, diagnostics: data.diagnostics }));
                if (data.state && data.choiceRequestId) {
                    setState(data.state);
                    setChoiceRequestId(data.choiceRequestId);
                    setValidChoices(data.validChoices ?? data.state.choices.player);
                } else {
                    if (data.choiceRequestId) setChoiceRequestId(data.choiceRequestId);
                    try {
                        await resyncBattleSession();
                    } catch {
                        setError("ซิงก์สถานะการต่อสู้ล่าสุดไม่สำเร็จ ลองกดอีกครั้ง");
                    }
                }
                return;
            }
            if (!response.ok || !data.state || !data.choiceRequestId) {
                setError(data.reason ? disabledCopy(data.reason) : data.error ?? "เลือกท่าไม่สำเร็จ");
                if (data.choiceRequestId) {
                    setChoiceRequestId(data.choiceRequestId);
                }
                if (data.state) {
                    setState(data.state);
                    setValidChoices(data.validChoices ?? (data.state.phase === "ended" ? [] : data.state.choices.player));
                } else if (data.validChoices) {
                    setValidChoices(data.validChoices);
                }
                return;
            }
            setState(data.state);
            setChoiceRequestId(data.choiceRequestId);
            setValidChoices(data.validChoices ?? (data.state.phase === "ended" ? [] : data.state.choices.player));
            if (data.final?.winnerId) {
                const payload = createFinalRewardPayload(data.final);
                setFinalReward(payload);
                setRewardModalOpen(shouldOpenRewardModal(payload));
                onFinish?.(payload);
            }
        } catch {
            setError("เชื่อมต่อการต่อสู้ไม่สำเร็จ ลองอีกครั้ง");
        } finally {
            setBusyKey(null);
        }
    }

    return (
        <div className="relative overflow-hidden rounded-[2.25rem] bg-[#07111f] p-4 text-white shadow-[0_22px_80px_rgba(8,47,73,.35)]">
            <RewardResultModal
                open={rewardModalOpen}
                reward={finalReward?.reward ?? null}
                requestedGoldReward={finalReward?.requestedGoldReward ?? 0}
                goldReward={finalReward?.goldReward ?? 0}
                rewardBlockedReason={finalReward?.rewardBlockedReason ?? null}
                onClose={() => setRewardModalOpen(false)}
            />
            <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px),radial-gradient(circle_at_50%_45%,rgba(56,189,248,.22),transparent_38%)] [background-size:26px_26px,26px_26px,100%_100%]" />
            <div className="relative space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.36em] text-cyan-200/60">
                                Negamon Battle
                            </p>
                            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-black text-cyan-100">
                                V4
                            </span>
                        </div>
                        <h2 className="text-xl font-black tracking-tight">Negamon Duel</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onReset}
                        className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-black text-white/70 transition hover:bg-white/14"
                    >
                        ออก
                    </button>
                </div>

                <FighterPanel fighter={opponent} side="opponent" active={!ended} />

                <motion.div
                    key={state.events.length}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[1.5rem] border border-cyan-200/20 bg-black/30 p-3"
                >
                    <div className="flex items-start gap-2">
                        {ended ? (
                            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-yellow-200" />
                        ) : (
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                        )}
                        <div>
                            <p className="text-sm font-black">
                                {ended ? `${winnerName ?? "ผู้ชนะ"} ชนะ!` : lastBattleLine(state)}
                            </p>
                            <p className="mt-0.5 text-[11px] font-bold text-white/45">
                                Turn {state.turn} · Request {choiceRequestId.split(":").slice(-2).join(":")} · State {state.stateVersion}
                            </p>
                            {ended && finalReward && (
                                <p className="mt-2 rounded-xl bg-yellow-300/10 px-2 py-1 text-[11px] font-black text-yellow-100">
                                    {rewardStatusCopy(finalReward)}
                                </p>
                            )}
                            <div className="mt-3 grid gap-1.5">
                                {recentBattleLines(state).map((line) => (
                                    <div
                                        key={line.id}
                                        className={`rounded-lg bg-white/6 px-2 py-1 text-[11px] font-bold ${effectivenessTextClass(line.effectiveness)}`}
                                    >
                                        <span className="mr-1 text-white/35">T{line.turn}</span>
                                        {line.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                <FighterPanel fighter={player} side="player" active={!ended} />

                {error && (
                    <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-xs font-black">
                    <button
                        type="button"
                        disabled
                        className="flex items-center justify-center gap-1 rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-white/30"
                    >
                        <Backpack className="h-3.5 w-3.5" />
                        Bag
                    </button>
                    <button
                        type="button"
                        disabled
                        className="flex items-center justify-center gap-1 rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-white/30"
                    >
                        <Users className="h-3.5 w-3.5" />
                        Monster
                    </button>
                    <button
                        type="button"
                        onClick={onReset}
                        className="flex items-center justify-center gap-1 rounded-2xl border border-rose-300/25 bg-rose-400/15 px-3 py-2 text-rose-100 transition hover:bg-rose-400/25"
                    >
                        <Footprints className="h-3.5 w-3.5" />
                        Run
                    </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                    <AnimatePresence>
                        {validChoices.map((choice, index) => {
                            const resource = choiceResource(state, choice);
                            return (
                            <motion.button
                                key={choice.actionId}
                                type="button"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ delay: index * 0.035 }}
                                disabled={!choice.enabled || !!busyKey || ended}
                                onClick={() => void chooseMove(choice)}
                                className={cn(
                                    "group min-h-24 rounded-[1.35rem] border p-3 text-left transition",
                                    choice.enabled && !ended
                                        ? "border-cyan-200/25 bg-white/10 hover:-translate-y-0.5 hover:border-cyan-200/60 hover:bg-cyan-300/15"
                                        : "border-white/8 bg-white/5 opacity-50"
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-black">{choice.label}</span>
                                    <Swords className="h-4 w-4 text-cyan-200 opacity-70 transition group-hover:rotate-12" />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black">
                                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/60">
                                        Slot {(choice.moveSlot ?? 0) + 1}
                                    </span>
                                    <span className="rounded-full bg-yellow-300/10 px-2 py-0.5 text-yellow-100">
                                        EN {choice.cost?.energy ?? 0}
                                    </span>
                                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/60">
                                        PP {resource.pp}/{resource.maxPp}
                                    </span>
                                    {resource.cooldown > 0 && (
                                        <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-cyan-100">
                                            CD {resource.cooldown}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-2 text-[11px] font-bold text-white/40">Ready when resources allow</p>
                                {!choice.enabled && (
                                    <p className="mt-2 text-[11px] font-bold text-rose-100/80">
                                        {disabledCopy(choice.reason)}
                                    </p>
                                )}
                                {busyKey === choice.actionId && (
                                    <p className="mt-2 text-[11px] font-black text-cyan-100">กำลังออกท่า...</p>
                                )}
                            </motion.button>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
