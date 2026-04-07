"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ── HP bar color based on percentage ─────────────────────────

function hpBarColor(pct: number) {
    if (pct > 50) return { bar: "from-green-400 to-emerald-500", bg: "bg-emerald-100" };
    if (pct > 25) return { bar: "from-yellow-400 to-amber-500",  bg: "bg-amber-100"   };
    return              { bar: "from-red-400 to-rose-500",       bg: "bg-rose-100"    };
}

// ── Status effect pill ────────────────────────────────────────

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
    BURN:         { label: "🔥 BRN", cls: "bg-orange-100 text-orange-700 border-orange-300" },
    POISON:       { label: "☠️ PSN", cls: "bg-purple-100 text-purple-700 border-purple-300" },
    BADLY_POISON: { label: "☠️☠️ TOX", cls: "bg-purple-200 text-purple-800 border-purple-400" },
    PARALYZE:     { label: "⚡ PAR", cls: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    SLEEP:        { label: "💤 SLP", cls: "bg-indigo-100 text-indigo-700 border-indigo-300" },
    FREEZE:       { label: "❄️ FRZ", cls: "bg-sky-100 text-sky-700 border-sky-300"         },
    CONFUSE:      { label: "😵 CNF", cls: "bg-pink-100 text-pink-700 border-pink-300"       },
};

// ── Opponent HUD (top-right style) ────────────────────────────
// ชื่อ | Type | Rank
// ████████░░ HP
//
// ไม่แสดงตัวเลข HP (แบบ Pokémon main series)

interface OpponentHudProps {
    name: string;
    formName: string;
    rankIndex: number;
    currentHp: number;
    maxHp: number;
    activeStatuses?: string[];
    abilityName?: string;
}

export function OpponentHud({
    name, formName, rankIndex, currentHp, maxHp, activeStatuses = [], abilityName,
}: OpponentHudProps) {
    const pct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
    const { bar, bg } = hpBarColor(pct);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border-2 border-white/60 bg-white/85 backdrop-blur-sm shadow-lg px-4 py-3 min-w-[180px] max-w-[220px]"
        >
            {/* Name + Rank */}
            <div className="flex items-center justify-between mb-1">
                <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-800 leading-none truncate">{formName}</p>
                    <p className="text-[9px] text-slate-400 font-semibold truncate">{name}</p>
                </div>
                <span className="shrink-0 ml-2 rounded-lg bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-600">
                    Lv.{rankIndex + 1}
                </span>
            </div>

            {/* Status pills */}
            {activeStatuses.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                    {activeStatuses.map((s) => {
                        const pill = STATUS_PILL[s];
                        if (!pill) return null;
                        return (
                            <span key={s} className={cn("rounded border px-1 py-0.5 text-[8px] font-black", pill.cls)}>
                                {pill.label}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* HP label */}
            <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">HP</span>
            </div>

            {/* HP bar — no number (Pokémon style) */}
            <div className={cn("h-3 w-full rounded-full overflow-hidden shadow-inner", bg)}>
                <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn("h-full rounded-full bg-gradient-to-r", bar)}
                />
            </div>

            {/* Ability */}
            {abilityName && (
                <p className="mt-1.5 text-[9px] font-bold text-violet-500 truncate">✨ {abilityName}</p>
            )}
        </motion.div>
    );
}

// ── Player HUD (bottom-left style) ───────────────────────────
// แสดงตัวเลข HP จริง (แบบ Pokémon GBA/DS)

interface PlayerHudProps {
    name: string;
    formName: string;
    rankIndex: number;
    currentHp: number;
    maxHp: number;
    activeStatuses?: string[];
    abilityName?: string;
    activeItemIcons?: string[];
}

export function PlayerHud({
    name, formName, rankIndex, currentHp, maxHp, activeStatuses = [], abilityName, activeItemIcons = [],
}: PlayerHudProps) {
    const pct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
    const { bar, bg } = hpBarColor(pct);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border-2 border-white/60 bg-white/85 backdrop-blur-sm shadow-lg px-4 py-3 min-w-[190px] max-w-[230px]"
        >
            {/* Name + Rank */}
            <div className="flex items-center justify-between mb-1">
                <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-800 leading-none truncate">{formName}</p>
                    <p className="text-[9px] text-slate-400 font-semibold truncate">{name}</p>
                </div>
                <span className="shrink-0 ml-2 rounded-lg bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-600">
                    Lv.{rankIndex + 1}
                </span>
            </div>

            {/* Status pills + held items */}
            {(activeStatuses.length > 0 || activeItemIcons.length > 0) && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                    {activeStatuses.map((s) => {
                        const pill = STATUS_PILL[s];
                        if (!pill) return null;
                        return (
                            <span key={s} className={cn("rounded border px-1 py-0.5 text-[8px] font-black", pill.cls)}>
                                {pill.label}
                            </span>
                        );
                    })}
                    {activeItemIcons.map((icon, i) => (
                        <span key={i} className="rounded border border-indigo-200 bg-indigo-50 px-1 py-0.5 text-[8px] font-black text-indigo-600">
                            {icon}
                        </span>
                    ))}
                </div>
            )}

            {/* HP label + number */}
            <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">HP</span>
                <span className="text-[10px] font-black tabular-nums text-slate-700">
                    <motion.span
                        key={currentHp}
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {currentHp}
                    </motion.span>
                    <span className="text-slate-400">/{maxHp}</span>
                </span>
            </div>

            {/* HP bar with number */}
            <div className={cn("h-3.5 w-full rounded-full overflow-hidden shadow-inner", bg)}>
                <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn("h-full rounded-full bg-gradient-to-r", bar)}
                />
            </div>

            {/* Ability */}
            {abilityName && (
                <p className="mt-1.5 text-[9px] font-bold text-violet-500 truncate">✨ {abilityName}</p>
            )}
        </motion.div>
    );
}
