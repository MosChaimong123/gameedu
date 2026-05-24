"use client";

import { motion } from "framer-motion";
import { Activity, GitBranch, Heart, Shield, Sparkles, Sword, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";
import type { NegamonMonsterSnapshot } from "@/lib/game-negamon";
import { cn } from "@/lib/utils";

const STAT_ROWS = [
    { key: "maxHp", label: "HP", icon: Heart, color: "text-rose-500", bar: "bg-rose-500" },
    { key: "atk", label: "ATK", icon: Sword, color: "text-orange-500", bar: "bg-orange-500" },
    { key: "def", label: "DEF", icon: Shield, color: "text-sky-500", bar: "bg-sky-500" },
    { key: "spd", label: "SPD", icon: Zap, color: "text-amber-500", bar: "bg-amber-500" },
] as const;

export function MonsterProfilePanel({
    monster,
    className,
}: {
    monster: NegamonMonsterSnapshot;
    className?: string;
}) {
    const maxStat = Math.max(
        monster.derivedStats.maxHp,
        monster.derivedStats.atk,
        monster.derivedStats.def,
        monster.derivedStats.spd,
        1
    );
    const expProgress =
        monster.expToNextLevel <= 0
            ? 100
            : Math.max(0, Math.min(100, (monster.exp / (monster.exp + monster.expToNextLevel)) * 100));

    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className={cn(
                "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
                className
            )}
        >
            <div className="grid gap-0 md:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1fr)]">
                <div
                    className="relative min-h-[20rem] overflow-hidden border-b border-slate-100 bg-slate-950 md:border-b-0 md:border-r"
                    style={{
                        background:
                            "radial-gradient(circle at 50% 36%, rgba(255,255,255,0.26), transparent 30%), linear-gradient(145deg, #0f172a, #1f2937 48%, #111827)",
                    }}
                >
                    <div
                        className="absolute inset-x-10 bottom-8 h-16 rounded-[50%] bg-white/12 blur-sm"
                        aria-hidden
                    />
                    <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 flex items-center justify-center px-6 pb-10 pt-6"
                    >
                        <NegamonFormIcon
                            icon={monster.formIcon}
                            label={monster.formName}
                            emojiClassName="text-[7rem] drop-shadow-[0_16px_34px_rgba(0,0,0,0.55)]"
                            imageClassName="h-full w-full object-contain drop-shadow-[0_16px_34px_rgba(0,0,0,0.55)]"
                            width={420}
                            height={420}
                        />
                    </motion.div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-4 text-white">
                        <div className="mb-2 flex flex-wrap gap-1.5">
                            {monster.elementTypes.map((type) => (
                                <Badge key={type} className="rounded-md bg-white/14 text-[10px] font-black text-white">
                                    {type}
                                </Badge>
                            ))}
                        </div>
                        <h3 className="text-xl font-black leading-tight">{monster.formName}</h3>
                        <p className="text-xs font-bold text-white/70">{monster.speciesName}</p>
                    </div>
                </div>

                <div className="space-y-5 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                Monster V2
                            </p>
                            <h4 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                {monster.displayName}
                            </h4>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                            <p className="text-[10px] font-black uppercase text-slate-400">Level</p>
                            <p className="text-2xl font-black tabular-nums text-slate-950">{monster.level}</p>
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                            <span>EXP {monster.exp.toLocaleString()}</span>
                            <span>{monster.expToNextLevel <= 0 ? "MAX" : `${monster.expToNextLevel.toLocaleString()} to next`}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${expProgress}%` }}
                                transition={{ duration: 0.45, ease: "easeOut" }}
                                className="h-full rounded-full bg-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                        {STAT_ROWS.map(({ key, label, icon: Icon, color, bar }) => {
                            const value = monster.derivedStats[key];
                            const pct = Math.max(8, Math.min(100, (value / maxStat) * 100));
                            return (
                                <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1.5 text-xs font-black text-slate-600">
                                            <Icon className={cn("h-3.5 w-3.5", color)} />
                                            {label}
                                        </span>
                                        <span className="font-black tabular-nums text-slate-950">{value}</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-white">
                                        <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {monster.trait ? (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-black text-emerald-900">
                                <Sparkles className="h-3.5 w-3.5" />
                                {monster.trait.name}
                            </p>
                            <p className="text-xs font-medium leading-relaxed text-emerald-800">
                                {monster.trait.description}
                            </p>
                            <p className="mt-2 text-[10px] font-black uppercase text-emerald-700">
                                Trait applies: {monster.trait.appliesAt.replace("_", " ")}
                            </p>
                        </div>
                    ) : null}

                    <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="flex items-center gap-1.5 text-xs font-black text-violet-950">
                                <GitBranch className="h-3.5 w-3.5" />
                                Evolution
                            </p>
                            <span className="text-xs font-black tabular-nums text-violet-800">
                                {monster.evolution.progressPercent}%
                            </span>
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-violet-800">
                            {monster.evolution.next
                                ? `Next form: ${monster.evolution.next.formName} at level ${monster.evolution.next.requiredLevel}`
                                : "Max form unlocked"}
                        </p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                            <div
                                className="h-full rounded-full bg-violet-500"
                                style={{ width: `${monster.evolution.progressPercent}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
                            <Activity className="h-3.5 w-3.5" />
                            Energy {monster.derivedStats.maxEnergy}
                        </span>
                        <span className="rounded-lg bg-slate-100 px-2 py-1">
                            Regen {monster.derivedStats.energyRegen}/turn
                        </span>
                    </div>
                </div>
            </div>
        </motion.section>
    );
}
