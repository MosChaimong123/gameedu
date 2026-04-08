"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { MonsterMove, MonsterType } from "@/lib/types/negamon";
import type { BattleFighter } from "@/lib/battle-engine";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";

// ── Type badge colors ─────────────────────────────────────────

const TYPE_BADGE: Record<MonsterType, string> = {
    FIRE:    "bg-orange-500 text-white",
    WATER:   "bg-sky-500 text-white",
    EARTH:   "bg-lime-600 text-white",
    WIND:    "bg-teal-500 text-white",
    THUNDER: "bg-yellow-400 text-slate-900",
    LIGHT:   "bg-amber-300 text-amber-900",
    DARK:    "bg-slate-700 text-white",
    PSYCHIC: "bg-pink-500 text-white",
};

const TYPE_BUTTON_BG: Record<MonsterType, string> = {
    FIRE:    "from-orange-400 to-red-500 border-red-700 hover:from-orange-300",
    WATER:   "from-sky-400 to-blue-500 border-blue-700 hover:from-sky-300",
    EARTH:   "from-lime-500 to-green-600 border-green-800 hover:from-lime-400",
    WIND:    "from-teal-400 to-cyan-500 border-cyan-700 hover:from-teal-300",
    THUNDER: "from-yellow-300 to-amber-400 border-amber-600 hover:from-yellow-200",
    LIGHT:   "from-amber-300 to-yellow-400 border-yellow-600 hover:from-amber-200",
    DARK:    "from-slate-600 to-purple-800 border-purple-900 hover:from-slate-500",
    PSYCHIC: "from-pink-400 to-fuchsia-500 border-fuchsia-700 hover:from-pink-300",
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
    disabled,
    onClick,
}: {
    move: MonsterMove;
    disabled: boolean;
    onClick: () => void;
}) {
    const bg    = TYPE_BUTTON_BG[move.type] ?? "from-slate-400 to-slate-500 border-slate-700";
    const badge = TYPE_BADGE[move.type]     ?? "bg-slate-500 text-white";
    const textColor = ["THUNDER", "LIGHT"].includes(move.type) ? "text-slate-900" : "text-white";

    return (
        <motion.button
            type="button"
            whileTap={{ scale: 0.94, y: 2 }}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "relative flex flex-col items-start gap-0.5 rounded-2xl border-b-[3px] bg-gradient-to-b px-3 py-2 text-left shadow-md",
                "transition-colors active:border-b-0 active:translate-y-[3px] disabled:opacity-40 disabled:cursor-not-allowed",
                bg
            )}
        >
            {/* Move name */}
            <span className={cn("text-[13px] font-black leading-tight truncate max-w-full", textColor)}>
                {move.name}
            </span>

            {/* Type badge + stats row */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn("rounded-full px-1.5 py-px text-[9px] font-black leading-none", badge)}>
                    {move.type}
                </span>
                <span className={cn("text-[9px] font-bold opacity-80", textColor)}>
                    {CATEGORY_LABEL[move.category] ?? move.category}
                </span>
                {move.power > 0 && (
                    <span className={cn("text-[9px] font-black opacity-90", textColor)}>
                        PWR {move.power}
                    </span>
                )}
                {move.critBonus && move.critBonus > 0 && (
                    <span className="rounded-full bg-white/30 px-1 text-[8px] font-black text-white">
                        CRIT+
                    </span>
                )}
                {(move.priority ?? 0) > 0 && (
                    <span className="rounded-full bg-white/30 px-1 text-[8px] font-black text-white">
                        ⚡ก่อน
                    </span>
                )}
            </div>
        </motion.button>
    );
}

// ── Main ActionMenu ───────────────────────────────────────────

interface ActionMenuProps {
    player: BattleFighter;
    turnIndex: number;
    maxTurns?: number;
    disabled: boolean;
    onMoveSelect: (moveId: string) => void;
}

export function ActionMenu({
    player,
    turnIndex,
    maxTurns = 20,
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
                    ตาที่ {turnIndex + 1} / {maxTurns}
                </span>
                <div className="flex items-center gap-1">
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
                            className="grid grid-cols-2 gap-2"
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
                            <div className="grid grid-cols-2 gap-2">
                                {moves.map((move) => (
                                    <MoveButton
                                        key={move.id}
                                        move={move}
                                        disabled={disabled}
                                        onClick={() => onMoveSelect(move.id)}
                                    />
                                ))}
                                {/* Pad to 4 if fewer moves */}
                                {Array.from({ length: Math.max(0, 4 - moves.length) }).map((_, i) => (
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
