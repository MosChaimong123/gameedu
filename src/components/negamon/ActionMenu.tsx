"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { MonsterMove, MonsterType } from "@/lib/types/negamon";
import type { BattleFighter } from "@/lib/battle-engine";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";
import { getMoveEnergyCost } from "@/lib/negamon-energy";

// ── Type badge colors ─────────────────────────────────────────

const TYPE_BADGE: Record<MonsterType, string> = {
    NORMAL:  "bg-slate-400 text-white",
    FIRE:    "bg-orange-500 text-white",
    WATER:   "bg-sky-500 text-white",
    EARTH:   "bg-lime-600 text-white",
    WIND:    "bg-teal-500 text-white",
    THUNDER: "bg-yellow-400 text-slate-900",
    LIGHT:   "bg-amber-300 text-amber-900",
    DARK:    "bg-slate-700 text-white",
};

const TYPE_BUTTON_BG: Record<MonsterType, string> = {
    NORMAL:  "from-slate-400 to-slate-500 border-slate-700 hover:from-slate-300",
    FIRE:    "from-orange-400 to-red-500 border-red-700 hover:from-orange-300",
    WATER:   "from-sky-400 to-blue-500 border-blue-700 hover:from-sky-300",
    EARTH:   "from-lime-500 to-green-600 border-green-800 hover:from-lime-400",
    WIND:    "from-teal-400 to-cyan-500 border-cyan-700 hover:from-teal-300",
    THUNDER: "from-yellow-300 to-amber-400 border-amber-600 hover:from-yellow-200",
    LIGHT:   "from-amber-300 to-yellow-400 border-yellow-600 hover:from-amber-200",
    DARK:    "from-slate-600 to-purple-800 border-purple-900 hover:from-slate-500",
};

const CATEGORY_LABEL: Record<string, string> = {
    PHYSICAL: "กาย",
    SPECIAL:  "พิเศษ",
    STATUS:   "สถานะ",
    HEAL:     "ฟื้น",
};

// ── Sub-components ────────────────────────────────────────────

function MoveButton({
    move,
    currentEnergy,
    energyCost,
    disabled,
    onClick,
}: {
    move: MonsterMove;
    currentEnergy: number;
    energyCost: number;
    disabled: boolean;
    onClick: () => void;
}) {
    const bg    = TYPE_BUTTON_BG[move.type] ?? "from-slate-400 to-slate-500 border-slate-700";
    const badge = TYPE_BADGE[move.type]     ?? "bg-slate-500 text-white";
    const textColor = ["THUNDER", "LIGHT", "NORMAL"].includes(move.type) ? "text-slate-900" : "text-white";

    const outOfEnergy = currentEnergy < energyCost;
    const estimatedDamage = move.power > 0 ? Math.max(1, Math.round(move.power * 0.9)) : 0;
    const damageTone =
        move.power <= 0
            ? "text-violet-50"
            : estimatedDamage >= 50
            ? "text-red-50"
            : estimatedDamage >= 30
            ? "text-amber-50"
            : "text-cyan-50";
    return (
        <motion.button
            type="button"
            whileTap={{ scale: 0.94, y: 2 }}
            disabled={disabled || outOfEnergy}
            onClick={onClick}
            className={cn(
                "relative grid grid-cols-[minmax(0,1fr)_84px] items-center gap-2 overflow-hidden rounded-2xl border-b-[3px] bg-gradient-to-b px-2.5 py-2 text-left shadow-md sm:grid-cols-[minmax(0,1fr)_110px] sm:px-3",
                "transition-colors active:border-b-0 active:translate-y-[3px] disabled:opacity-40 disabled:cursor-not-allowed",
                bg
            )}
        >
            {/* Left: move identity in one main row */}
            <div className="min-w-0">
                <div className="min-w-0">
                    <span className={cn("block truncate text-[12px] font-black leading-tight sm:text-[13px]", textColor)}>
                        {move.name}
                    </span>
                    <div className="mt-1 flex min-w-0 items-center gap-1 whitespace-nowrap overflow-hidden">
                        <span className={cn("shrink-0 rounded-full px-1.5 py-px text-[8px] font-black leading-none sm:text-[9px]", badge)}>
                            {move.type}
                        </span>
                        <span className={cn("shrink-0 text-[8px] font-bold opacity-80 sm:text-[9px]", textColor)}>
                            {CATEGORY_LABEL[move.category] ?? move.category}
                        </span>
                        {move.critBonus && move.critBonus > 0 && (
                            <span className="shrink-0 rounded-full bg-white/30 px-1 text-[8px] font-black text-white">
                                CRIT+
                            </span>
                        )}
                        {(move.priority ?? 0) > 0 && (
                            <span className="shrink-0 rounded-full bg-white/30 px-1 text-[8px] font-black text-white">
                                ⚡ก่อน
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: damage/resource in dedicated panel */}
            <div className="shrink-0 rounded-lg border border-white/20 bg-black/20 px-1.5 py-1 text-right sm:px-2">
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    <span className={cn("text-[9px] font-black leading-none sm:text-[10px]", move.power > 0 ? damageTone : "text-violet-50")}>
                        {move.power > 0 ? `D${estimatedDamage}` : "STS"}
                    </span>
                    <span className={cn("text-[9px] font-black leading-none sm:text-[10px]", textColor)}>
                        P{move.power > 0 ? move.power : "-"}
                    </span>
                    <span className={cn("text-[9px] font-black leading-none sm:text-[10px]", textColor)}>
                        E{energyCost}
                    </span>
                </div>
            </div>
            {outOfEnergy ? (
                <span className="absolute bottom-1.5 right-2 rounded-full bg-red-500/80 px-1.5 py-0.5 text-[8px] font-black text-red-50">EN ไม่พอ</span>
            ) : null}
        </motion.button>
    );
}

// ── Main ActionMenu ───────────────────────────────────────────

interface ActionMenuProps {
    player: BattleFighter;
    turnIndex: number;
    subStep?: number;
    maxTurns?: number;
    playerQueue?: number;
    disabled: boolean;
    onMoveSelect: (moveId: string) => void;
}

export function ActionMenu({
    player,
    turnIndex,
    subStep = 1,
    maxTurns = 20,
    playerQueue,
    disabled,
    onMoveSelect,
}: ActionMenuProps) {
    const [panel, setPanel] = useState<"main" | "fight">("fight");

    // Reset to fight panel when a new turn starts
    // (disabled → false transition means a new pick phase started)
    const moves = player.moves;

    return (
        <div className="rounded-2xl border-[3px] border-slate-800 bg-white shadow-[3px_3px_0px_0px_rgba(15,23,42,0.35)] overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between bg-slate-800 px-3 py-1.5">
                <span className="text-[10px] font-black text-white/70 uppercase tracking-wider">
                    รอบที่ {turnIndex + 1} / {maxTurns} • ย่อย {subStep}
                    {typeof playerQueue === "number" ? ` • คิวคุณ ${playerQueue}` : ""}
                </span>
                <div className="flex items-center gap-1">
                    <span className="rounded-md bg-cyan-100/90 px-1.5 py-0.5 text-[9px] font-black text-cyan-900">
                        EN {player.currentEnergy}/{player.maxEnergy}
                    </span>
                    <NegamonFormIcon
                        icon={player.formIcon}
                        label={player.studentName}
                        className="h-4 w-4"
                        emojiClassName="text-sm leading-none"
                        width={16}
                        height={16}
                        imageClassName="h-full w-full object-contain"
                    />
                    <span className="text-[10px] font-black text-white/80">{player.studentName}</span>
                </div>
            </div>

            {/* Panel body */}
            <div className="p-3">
                <AnimatePresence mode="popLayout" initial={false}>
                    {panel === "main" && (
                        <motion.div
                            key="main"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.12 }}
                            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                        >
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.95 }}
                                disabled={disabled}
                                onClick={() => setPanel("fight")}
                                className="flex items-center justify-center gap-2 rounded-2xl border-b-[3px] border-red-700 bg-gradient-to-b from-red-400 to-rose-500 py-3 text-sm font-black text-white shadow-md active:translate-y-[3px] active:border-b-0 disabled:opacity-40"
                            >
                                ⚔️ ต่อสู้
                            </motion.button>

                            {/* Equipped item info (passive — already applied) */}
                            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-100 bg-slate-50 py-3 text-center opacity-60">
                                <span className="text-base">🎒</span>
                                <span className="text-[9px] font-black text-slate-400">
                                    {player.activeItems.length > 0
                                        ? `${player.activeItems.length} ไอเทม (ใช้แล้ว)`
                                        : "ไม่มีไอเทม"}
                                </span>
                            </div>
                        </motion.div>
                    )}

                    {panel === "fight" && (
                        <motion.div
                            key="fight"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.12 }}
                            className="space-y-2"
                        >
                            {/* Back button shown only when main panel exists */}
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {moves.map((move) => {
                                    const energyCost = move.energyCost ?? getMoveEnergyCost(move, player.speciesId);
                                    return (
                                    <MoveButton
                                        key={move.id}
                                        move={move}
                                        currentEnergy={player.currentEnergy}
                                        energyCost={energyCost}
                                        disabled={disabled}
                                        onClick={() => onMoveSelect(move.id)}
                                    />
                                    );
                                })}
                                {/* Pad to 4 if fewer moves */}
                                {Array.from({ length: Math.max(0, 6 - moves.length) }).map((_, i) => (
                                    <div
                                        key={`empty-${i}`}
                                        className="rounded-2xl border-2 border-dashed border-slate-200 h-[56px]"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
