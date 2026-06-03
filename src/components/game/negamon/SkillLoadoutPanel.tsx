"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BatteryCharging, Check, Lock, Save, Sparkles, Swords, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import type { NegamonMonsterSnapshot, NegamonSkillDefinition } from "@/lib/game-negamon";
import { NEGAMON_SKILL_LOADOUT_MAX } from "@/lib/game-negamon";
import { cn } from "@/lib/utils";
import {
    formatNegamonElementType,
    formatNegamonSkillCategory,
    formatNegamonSkillEffect,
    formatNegamonSkillFamily,
    formatNegamonSkillPriority,
    formatNegamonSkillRequirement,
    formatNegamonSkillRoleTag,
    formatNegamonSkillTarget,
} from "./ui-content";

export function SkillLoadoutPanel({
    monster,
    code,
    className,
}: {
    monster: NegamonMonsterSnapshot;
    code?: string;
    className?: string;
}) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [selectedSkillIds, setSelectedSkillIds] = useState(monster.equippedSkillIds);
    const [isSaving, setIsSaving] = useState(false);
    const equipped = useMemo(() => new Set(selectedSkillIds), [selectedSkillIds]);
    const canEdit = Boolean(code);
    const isDirty = selectedSkillIds.join("|") !== monster.equippedSkillIds.join("|");

    function toggleSkill(skillId: string) {
        if (!canEdit) return;
        setSelectedSkillIds((current) => {
            if (current.includes(skillId)) return current.filter((id) => id !== skillId);
            if (current.length >= NEGAMON_SKILL_LOADOUT_MAX) return current;
            return [...current, skillId];
        });
    }

    async function saveLoadout() {
        if (!code || !isDirty) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/student/${code}/negamon/skill-loadout`, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ skillIds: selectedSkillIds }),
            });
            const data = (await res.json()) as { negamonSkillLoadout?: string[]; error?: string };
            if (!res.ok || !Array.isArray(data.negamonSkillLoadout)) {
                throw new Error(data.error ?? "Invalid skill loadout");
            }
            setSelectedSkillIds(data.negamonSkillLoadout);
            toast({ title: t("battleLoadoutSaved") });
        } catch (error) {
            toast({
                title: "Skill loadout failed",
                description: error instanceof Error ? error.message : "Unable to save skill loadout",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        {t("negamonSkillsEyebrow")}
                    </p>
                    <h3 className="text-lg font-black text-slate-950">{t("negamonSkillsTitle")}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                        {monster.nextSkillUnlock
                            ? t("negamonMonsterNextSkillHint", {
                                  level: monster.nextSkillUnlock.level,
                              })
                            : t("negamonMonsterNextSkillMax")}
                    </p>
                </div>
                <Badge className="rounded-lg bg-slate-950 text-white">
                    {selectedSkillIds.length}/{NEGAMON_SKILL_LOADOUT_MAX}
                </Badge>
            </div>
            {canEdit ? (
                <div className="mb-3 flex justify-end">
                    <Button
                        type="button"
                        size="sm"
                        disabled={!isDirty || isSaving}
                        onClick={saveLoadout}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        Save
                    </Button>
                </div>
            ) : null}

            <div className="grid gap-2">
                {monster.skillCatalog.map((skill: NegamonSkillDefinition, index: number) => {
                    const isEquipped = equipped.has(skill.id);
                    const blockedByFullSlots = canEdit && !isEquipped && selectedSkillIds.length >= NEGAMON_SKILL_LOADOUT_MAX;
                    return (
                        <motion.div
                            key={skill.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.035 }}
                            role={canEdit ? "button" : undefined}
                            tabIndex={canEdit ? 0 : undefined}
                            onClick={() => toggleSkill(skill.id)}
                            onKeyDown={(event) => {
                                if (!canEdit) return;
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    toggleSkill(skill.id);
                                }
                            }}
                            className={cn(
                                "rounded-xl border p-3 transition",
                                canEdit && "cursor-pointer",
                                blockedByFullSlots && "opacity-60",
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
                                            {formatNegamonElementType(skill.elementType, t)}
                                        </Badge>
                                        <Badge variant="outline" className="rounded-md text-[9px] font-black">
                                            {formatNegamonSkillCategory(skill.category, t)}
                                        </Badge>
                                        <Badge className="rounded-md bg-slate-900 text-[9px] font-black text-white">
                                            {formatNegamonSkillRoleTag(skill.roleTag, t)}
                                        </Badge>
                                        {skill.priority > 0 ? (
                                            <Badge className="rounded-md bg-sky-100 text-[9px] font-black text-sky-800">
                                                {formatNegamonSkillPriority(skill.priority, t)}
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                                        {formatNegamonSkillEffect(skill, t)}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black">
                                        <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                                            <Target className="h-3 w-3 text-slate-400" />
                                            {formatNegamonSkillTarget(skill.target, t)}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                                            <Sparkles className="h-3 w-3 text-violet-500" />
                                            {formatNegamonSkillFamily(skill.effectFamily, t)}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black text-slate-500">
                                        <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1">
                                            <Lock className="h-3 w-3 text-slate-400" />
                                            {formatNegamonSkillRequirement(skill, t)}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1">
                                            <BatteryCharging className="h-3 w-3 text-cyan-500" />
                                            {t("negamonSkillEn", { cost: skill.energyCost })}
                                        </span>
                                        <span className="rounded-md bg-white px-2 py-1">
                                            {t("negamonSkillAcc", { pct: skill.accuracy })}
                                        </span>
                                        {skill.cooldownTurns > 0 ? (
                                            <span className="rounded-md bg-white px-2 py-1">
                                                {t("negamonSkillCd", { turns: skill.cooldownTurns })}
                                            </span>
                                        ) : null}
                                        {skill.priority > 0 ? (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1">
                                                <Zap className="h-3 w-3 text-sky-500" />
                                                {formatNegamonSkillPriority(skill.priority, t)}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                {isEquipped ? (
                                    <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                                ) : null}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}
