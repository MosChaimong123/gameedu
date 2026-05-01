"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { MonsterStats } from "@/lib/types/negamon";
import type { StatStages } from "@/lib/battle-engine";
import { effectiveStat } from "@/lib/battle-engine";
import { useLanguage } from "@/components/providers/language-provider";

export type HudCombatStatsSnapshot = {
    baseStats: MonsterStats;
    statStages: Pick<StatStages, "atk" | "def" | "spd">;
};

function HudCombatStatsRow({ snapshot }: { snapshot: HudCombatStatsSnapshot }) {
    const { t } = useLanguage();
    const { baseStats, statStages } = snapshot;
    const atk = effectiveStat(baseStats.atk, statStages.atk);
    const def = effectiveStat(baseStats.def, statStages.def);
    const spd = effectiveStat(baseStats.spd, statStages.spd);
    const boosted =
        statStages.atk !== 1 || statStages.def !== 1 || statStages.spd !== 1;

    return (
        <div
            className={cn(
                "mt-1.5 grid grid-cols-3 gap-x-1 border-t border-slate-200/70 pt-1.5 text-[9px] leading-tight",
                boosted && "border-amber-200/80"
            )}
            role="group"
            aria-label={`${t("battleHudAtk")} ${atk}, ${t("battleHudDef")} ${def}, ${t("battleHudSpd")} ${spd}`}
        >
            <div className="min-w-0 text-center">
                <p className="truncate text-[8px] font-black leading-tight text-slate-400">{t("battleHudAtk")}</p>
                <p className="font-black tabular-nums text-slate-800">{atk}</p>
            </div>
            <div className="min-w-0 border-x border-slate-200/60 px-0.5 text-center">
                <p className="truncate text-[8px] font-black leading-tight text-slate-400">{t("battleHudDef")}</p>
                <p className="font-black tabular-nums text-slate-800">{def}</p>
            </div>
            <div className="min-w-0 text-center">
                <p className="truncate text-[8px] font-black leading-tight text-slate-400">{t("battleHudSpd")}</p>
                <p className="font-black tabular-nums text-slate-800">{spd}</p>
            </div>
        </div>
    );
}

// ── HP bar color based on percentage ─────────────────────────

function hpBarColor(pct: number) {
    if (pct > 50) return { bar: "from-green-400 to-emerald-500", bg: "bg-emerald-100" };
    if (pct > 25) return { bar: "from-yellow-400 to-amber-500",  bg: "bg-amber-100"   };
    return              { bar: "from-red-400 to-rose-500",       bg: "bg-rose-100"    };
}

// ── Status effect pill ────────────────────────────────────────

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
    BOOST_ATK:    { label: "🗡️ ATK+", cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    BOOST_DEF:    { label: "🛡️ DEF+", cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    BOOST_SPD:    { label: "💨 SPD+", cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    BOOST_WATER_DMG: { label: "💧 WTR+", cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    BURN:         { label: "🔥 BRN", cls: "bg-orange-100 text-orange-700 border-orange-300" },
    POISON:       { label: "☠️ PSN", cls: "bg-purple-100 text-purple-700 border-purple-300" },
    BADLY_POISON: { label: "☠️☠️ TOX", cls: "bg-purple-200 text-purple-800 border-purple-400" },
    PARALYZE:     { label: "⚡ PAR", cls: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    SLEEP:        { label: "💤 SLP", cls: "bg-indigo-100 text-indigo-700 border-indigo-300" },
    FREEZE:       { label: "❄️ FRZ", cls: "bg-sky-100 text-sky-700 border-sky-300"         },
    CONFUSE:      { label: "😵 CNF", cls: "bg-pink-100 text-pink-700 border-pink-300"       },
};

const STATUS_KIND_CLASS: Record<string, string> = {
    // debuffs
    BURN: "ring-1 ring-orange-300/80",
    POISON: "ring-1 ring-purple-300/80",
    BADLY_POISON: "ring-1 ring-purple-400/90",
    PARALYZE: "ring-1 ring-yellow-300/80",
    SLEEP: "ring-1 ring-indigo-300/80",
    FREEZE: "ring-1 ring-sky-300/80",
    CONFUSE: "ring-1 ring-pink-300/80",
    // buffs (reserved if later added to HUD list)
    BOOST_ATK: "ring-1 ring-emerald-300/80",
    BOOST_DEF: "ring-1 ring-emerald-300/80",
    BOOST_SPD: "ring-1 ring-emerald-300/80",
    BOOST_WATER_DMG: "ring-1 ring-emerald-300/80",
};

export type ActiveStatusView = {
    effect: string;
    turnsLeft: number;
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
    activeStatuses?: ActiveStatusView[];
    abilityName?: string;
    /** Effective combat stats (base × in-battle stage multipliers). */
    combatStats?: HudCombatStatsSnapshot;
    currentEnergy?: number;
    maxEnergy?: number;
}

export function OpponentHud({
    name,
    formName,
    rankIndex,
    currentHp,
    maxHp,
    activeStatuses = [],
    abilityName,
    combatStats,
    currentEnergy,
    maxEnergy,
}: OpponentHudProps) {
    const pct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
    const hpPercent = Math.round(pct);
    const { bar, bg } = hpBarColor(pct);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-[min(44vw,238px)] rounded-2xl border-2 border-white/60 bg-white/88 backdrop-blur-sm shadow-lg px-3 py-2.5 sm:px-4 sm:py-3"
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
                <div className="mb-1.5">
                    <div className="mb-1 flex flex-wrap gap-1">
                        {activeStatuses.map((s) => {
                            const pill = STATUS_PILL[s.effect];
                            if (!pill) return null;
                            const turnsLabel =
                                s.turnsLeft < 0 ? "∞" : `${Math.max(0, s.turnsLeft)}T`;
                            return (
                                <span
                                    key={`${s.effect}-${s.turnsLeft}`}
                                    className={cn(
                                        "rounded border px-1 py-0.5 text-[8px] font-black",
                                        pill.cls,
                                        STATUS_KIND_CLASS[s.effect]
                                    )}
                                >
                                    {pill.label} {turnsLabel}
                                </span>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 text-[8px] font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            เขียว=บัฟ
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                            สีเตือน=ดีบัฟ
                        </span>
                    </div>
                </div>
            )}

            {/* HP label */}
            <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">HP</span>
                <span className="text-[10px] font-black tabular-nums text-slate-700">
                    {currentHp}/{maxHp} <span className="text-slate-400">({hpPercent}%)</span>
                </span>
            </div>

            {/* HP bar — no number (Pokémon style) */}
            <div className={cn("h-3 w-full rounded-full overflow-hidden shadow-inner", bg)}>
                <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn("h-full rounded-full bg-gradient-to-r", bar)}
                />
            </div>

            {combatStats ? <HudCombatStatsRow snapshot={combatStats} /> : null}

            {typeof currentEnergy === "number" && typeof maxEnergy === "number" ? (
                <div className="mt-1.5">
                    <div className="mb-0.5 flex items-center justify-between text-[8px] font-black text-cyan-700">
                        <span>EN</span>
                        <span>{currentEnergy}/{maxEnergy}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-cyan-100">
                        <motion.div
                            animate={{ width: `${Math.min(100, Math.max(0, (currentEnergy / Math.max(maxEnergy, 1)) * 100))}%` }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-500"
                        />
                    </div>
                </div>
            ) : null}
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
    activeStatuses?: ActiveStatusView[];
    abilityName?: string;
    activeItemIcons?: string[];
    combatStats?: HudCombatStatsSnapshot;
    currentEnergy?: number;
    maxEnergy?: number;
}

export function PlayerHud({
    name,
    formName,
    rankIndex,
    currentHp,
    maxHp,
    activeStatuses = [],
    abilityName,
    activeItemIcons = [],
    combatStats,
    currentEnergy,
    maxEnergy,
}: PlayerHudProps) {
    const pct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
    const hpPercent = Math.round(pct);
    const { bar, bg } = hpBarColor(pct);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-[min(46vw,248px)] rounded-2xl border-2 border-white/60 bg-white/88 backdrop-blur-sm shadow-lg px-3 py-2.5 sm:px-4 sm:py-3"
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
                        const pill = STATUS_PILL[s.effect];
                        if (!pill) return null;
                        const turnsLabel =
                            s.turnsLeft < 0 ? "∞" : `${Math.max(0, s.turnsLeft)}T`;
                        return (
                            <span
                                key={`${s.effect}-${s.turnsLeft}`}
                                className={cn(
                                    "rounded border px-1 py-0.5 text-[8px] font-black",
                                    pill.cls,
                                    STATUS_KIND_CLASS[s.effect]
                                )}
                            >
                                {pill.label} {turnsLabel}
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
            {activeStatuses.length > 0 && (
                <div className="mb-1.5 flex items-center gap-2 text-[8px] font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        เขียว=บัฟ
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        สีเตือน=ดีบัฟ
                    </span>
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
                    <span className="text-slate-400"> ({hpPercent}%)</span>
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

            {combatStats ? <HudCombatStatsRow snapshot={combatStats} /> : null}

            {typeof currentEnergy === "number" && typeof maxEnergy === "number" ? (
                <div className="mt-1.5">
                    <div className="mb-0.5 flex items-center justify-between text-[8px] font-black text-cyan-700">
                        <span>EN</span>
                        <span>{currentEnergy}/{maxEnergy}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-cyan-100">
                        <motion.div
                            animate={{ width: `${Math.min(100, Math.max(0, (currentEnergy / Math.max(maxEnergy, 1)) * 100))}%` }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-500"
                        />
                    </div>
                </div>
            ) : null}
            {/* Ability */}
            {abilityName && (
                <p className="mt-1.5 text-[9px] font-bold text-violet-500 truncate">✨ {abilityName}</p>
            )}
        </motion.div>
    );
}
