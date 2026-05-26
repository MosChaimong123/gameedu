"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Backpack, Bolt, Footprints, ShieldAlert, Sparkles, Swords, Users } from "lucide-react";
import { RewardResultModal } from "@/components/game/negamon/RewardResultModal";
import type { BattleFinalRewardPayload } from "@/components/negamon/battle-tab.types";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import type { NegamonBattleChoiceV4, NegamonBattleCombatantV4, NegamonBattleStateV4 } from "@/lib/game-negamon";

type ArenaChoiceResponseV4 = {
    mode?: "negamon_battle_v4";
    engineVersion?: string;
    choiceRequestId?: string;
    state?: NegamonBattleStateV4;
    validChoices?: NegamonBattleChoiceV4[];
    final?: {
        winnerId?: string;
        goldReward?: number;
    } | null;
    error?: string;
    reason?: string;
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
    side: "player" | "opponent";
    active?: boolean;
}) {
    const percent = hpPercent(fighter);
    const isPlayer = side === "player";

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
            </div>
        </motion.section>
    );
}

function lastBattleLine(state: NegamonBattleStateV4) {
    const last = state.events.at(-1);
    if (!last) return "Choose a move to begin the turn.";
    return last.message;
}

function recentBattleLines(state: NegamonBattleStateV4) {
    return state.events.slice(-4).reverse().map((event) => ({
        id: event.id,
        text: event.message,
        turn: event.turn,
    }));
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
    const [state, setState] = useState<NegamonBattleStateV4>(initialState);
    const [choiceRequestId, setChoiceRequestId] = useState(initialChoiceRequestId);
    const [validChoices, setValidChoices] = useState<NegamonBattleChoiceV4[]>(initialValidChoices);
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
            if (!response.ok || !data.state || !data.choiceRequestId) {
                setError(data.reason ? disabledCopy(data.reason) : data.error ?? "เลือกท่าไม่สำเร็จ");
                if (data.validChoices) setValidChoices(data.validChoices);
                return;
            }
            setState(data.state);
            setChoiceRequestId(data.choiceRequestId);
            setValidChoices(data.validChoices ?? []);
            if (data.final?.winnerId) {
                const payload: BattleFinalRewardPayload = {
                    winnerId: data.final.winnerId,
                    requestedGoldReward: data.final.goldReward ?? 0,
                    goldReward: data.final.goldReward ?? 0,
                    rewardBlockedReason: null,
                };
                setFinalReward(payload);
                setRewardModalOpen(payload.goldReward > 0);
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
                onClose={() => setRewardModalOpen(false)}
            />
            <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px),radial-gradient(circle_at_50%_45%,rgba(56,189,248,.22),transparent_38%)] [background-size:26px_26px,26px_26px,100%_100%]" />
            <div className="relative space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.36em] text-cyan-200/60">
                                Pokemon Showdown Runtime
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
                                    ได้รับ {finalReward.goldReward}G
                                </p>
                            )}
                            <div className="mt-3 grid gap-1.5">
                                {recentBattleLines(state).map((line) => (
                                    <div
                                        key={line.id}
                                        className="rounded-lg bg-white/6 px-2 py-1 text-[11px] font-bold text-white/60"
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
                        {validChoices.map((choice, index) => (
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
                                        PP {choice.cost?.pp ?? 0}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] font-bold text-white/40">Server-authoritative V4 choice</p>
                                {!choice.enabled && (
                                    <p className="mt-2 text-[11px] font-bold text-rose-100/80">
                                        {disabledCopy(choice.reason)}
                                    </p>
                                )}
                                {busyKey === choice.actionId && (
                                    <p className="mt-2 text-[11px] font-black text-cyan-100">กำลังออกท่า...</p>
                                )}
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
