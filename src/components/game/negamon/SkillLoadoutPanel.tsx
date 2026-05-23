"use client";

import { motion } from "framer-motion";
import { BatteryCharging, Lock, Sparkles, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { NegamonMonsterSnapshot, NegamonSkillDefinition } from "@/lib/game-negamon";
import { cn } from "@/lib/utils";

function effectText(skill: NegamonSkillDefinition): string {
    const parts = skill.effects
        .filter((effect) => effect.kind !== "energy_cost")
        .map((effect) => {
            if (effect.kind === "damage") return `Power ${effect.power}`;
            if (effect.kind === "heal") return `Heal ${effect.percent}%`;
            if (effect.kind === "status") return `${effect.effect} ${effect.chance}%`;
            if (effect.kind === "self_status") return `Self ${effect.effect}`;
            if (effect.kind === "drain") return `Drain ${effect.percent}%`;
            if (effect.kind === "critical_bonus") return `Crit +${effect.percent}%`;
            return "";
        })
        .filter(Boolean);
    return parts.join(" / ") || skill.description;
}

export function SkillLoadoutPanel({
    monster,
    className,
}: {
    monster: NegamonMonsterSnapshot;
    className?: string;
}) {
    const equipped = new Set(monster.equippedSkillIds);

    return (
        <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Skill Catalog
                    </p>
                    <h3 className="text-lg font-black text-slate-950">Loadout V2</h3>
                </div>
                <Badge className="rounded-lg bg-slate-950 text-white">
                    {monster.equippedSkillIds.length}/{Math.max(1, monster.skillCatalog.length)}
                </Badge>
            </div>

            <div className="grid gap-2">
                {monster.skillCatalog.map((skill, index) => {
                    const isEquipped = equipped.has(skill.id);
                    return (
                        <motion.div
                            key={skill.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.035 }}
                            className={cn(
                                "rounded-xl border p-3 transition",
                                isEquipped
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-slate-100 bg-slate-50"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className={cn(
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                                        isEquipped
                                            ? "border-emerald-200 bg-white text-emerald-700"
                                            : "border-slate-200 bg-white text-slate-500"
                                    )}
                                >
                                    {isEquipped ? <Swords className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="text-sm font-black leading-tight text-slate-950">{skill.name}</p>
                                        <Badge variant="outline" className="rounded-md text-[9px] font-black">
                                            {skill.elementType}
                                        </Badge>
                                        <Badge variant="outline" className="rounded-md text-[9px] font-black">
                                            {skill.category}
                                        </Badge>
                                    </div>
                                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                                        {effectText(skill)}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black text-slate-500">
                                        <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1">
                                            <BatteryCharging className="h-3 w-3 text-cyan-500" />
                                            EN {skill.energyCost}
                                        </span>
                                        <span className="rounded-md bg-white px-2 py-1">
                                            ACC {skill.accuracy}%
                                        </span>
                                        {skill.cooldownTurns > 0 ? (
                                            <span className="rounded-md bg-white px-2 py-1">
                                                CD {skill.cooldownTurns}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                {isEquipped ? (
                                    <Sparkles className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                                ) : null}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}
