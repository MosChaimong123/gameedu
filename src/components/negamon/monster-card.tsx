"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Swords, Shield, Zap, Heart, Star, Sparkles, Lock, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getStudentMonsterState,
    getNegamonSettings,
    getNextRankProgress,
    type LevelConfigInput,
} from "@/lib/classroom-utils";
import { findSpeciesById } from "@/lib/negamon-species";
import type { MonsterType, MoveCategory, NegamonSettings, StudentMonsterState } from "@/lib/types/negamon";
import { useLanguage } from "@/components/providers/language-provider";
import {
    NEGAMON_PASSIVES,
    negamonPassiveDescKey,
    negamonPassiveNameKey,
    type NegamonPassive,
} from "@/lib/negamon-passives";
import { getLocalizedMessageFromApiErrorBody } from "@/lib/ui-error-messages";

interface MonsterCardProps {
    studentId: string;
    behaviorPoints: number;
    levelConfig: LevelConfigInput;
    gamifiedSettings: Record<string, unknown>;
    className?: string;
    // passive skills
    loginCode?: string;
    gold?: number;
    negamonSkills?: string[];
    onSkillUnlocked?: (skillId: string, newGold: number, newSkills: string[]) => void;
}

const STAT_CONFIG = [
    { key: "hp",  labelKey: "playNegamonHpLabel", icon: Heart,  iconColor: "text-rose-500",    barFrom: "from-rose-400",    barTo: "to-rose-500",    bg: "bg-rose-50",    border: "border-rose-100"   },
    { key: "atk", labelKey: "hostStatAtk",        icon: Swords, iconColor: "text-orange-500",  barFrom: "from-orange-400",  barTo: "to-orange-500",  bg: "bg-orange-50",  border: "border-orange-100" },
    { key: "def", labelKey: "hostStatDef",        icon: Shield, iconColor: "text-sky-500",     barFrom: "from-sky-400",     barTo: "to-sky-500",     bg: "bg-sky-50",     border: "border-sky-100"    },
    { key: "spd", labelKey: "monsterStatSpd",     icon: Zap,    iconColor: "text-yellow-500",  barFrom: "from-yellow-400",  barTo: "to-yellow-500",  bg: "bg-yellow-50",  border: "border-yellow-100" },
] as const;

const TYPE_COLORS: Record<string, string> = {
    FIRE:    "bg-orange-100 text-orange-700 border-orange-200",
    WATER:   "bg-sky-100 text-sky-700 border-sky-200",
    EARTH:   "bg-green-100 text-green-700 border-green-200",
    WIND:    "bg-cyan-100 text-cyan-700 border-cyan-200",
    THUNDER: "bg-yellow-100 text-yellow-700 border-yellow-200",
    LIGHT:   "bg-amber-100 text-amber-700 border-amber-200",
    DARK:    "bg-purple-100 text-purple-700 border-purple-200",
    PSYCHIC: "bg-pink-100 text-pink-700 border-pink-200",
};

function monsterTypeLabel(
    t: (key: string, params?: Record<string, string | number>) => string,
    type: MonsterType | string
): string {
    const key = `monsterType_${type}`;
    const out = t(key);
    if (out !== key) return out;
    return String(type);
}

function moveCategoryLabel(
    t: (key: string, params?: Record<string, string | number>) => string,
    category: MoveCategory
): string {
    return t(`monsterMoveCat_${category}`);
}

const MOVE_CAT_COLORS: Record<string, string> = {
    PHYSICAL: "bg-orange-50 text-orange-600 border-orange-100",
    SPECIAL:  "bg-purple-50 text-purple-600 border-purple-100",
    STATUS:   "bg-slate-50 text-slate-500 border-slate-200",
    HEAL:     "bg-green-50 text-green-600 border-green-100",
};

export function MonsterCard({
    studentId, behaviorPoints, levelConfig, gamifiedSettings, className,
    loginCode, gold = 0, negamonSkills = [], onSkillUnlocked,
}: MonsterCardProps) {
    const { t } = useLanguage();
    const negamon = useMemo(() => getNegamonSettings(gamifiedSettings), [gamifiedSettings]);

    const monster: StudentMonsterState | null = useMemo(() => {
        if (!negamon?.enabled) return null;
        return getStudentMonsterState(studentId, behaviorPoints, levelConfig, negamon);
    }, [negamon, studentId, behaviorPoints, levelConfig]);

    const rankProgress = useMemo(() => getNextRankProgress(behaviorPoints, levelConfig), [behaviorPoints, levelConfig]);

    if (!negamon?.enabled || !monster) return null;

    const maxStat = Math.max(monster.stats.hp, monster.stats.atk, monster.stats.def, monster.stats.spd);

    const species = findSpeciesById(monster.speciesId);
    const lockedMoves = species
        ? species.moves.filter((m) => m.learnRank > monster.rankIndex + 1)
        : [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={className}
        >
            <Card className="rounded-[1.5rem] border-white/60 bg-white/70 backdrop-blur-md shadow-lg overflow-hidden">
                {/* Header */}
                <div
                    className="p-4 flex items-center justify-between"
                    style={{ background: `linear-gradient(135deg, ${monster.form.color}22, ${monster.form.color}11)`, borderBottom: `2px solid ${monster.form.color}33` }}
                >
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md border-2 border-white/60 bg-white/50"
                        >
                            {monster.form.icon}
                        </motion.div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t("monsterCardBrand")}</p>
                            <h3 className="text-lg font-black text-slate-800 leading-tight">{monster.form.name}</h3>
                            <p className="text-xs text-slate-500 font-semibold">{monster.speciesName}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <Badge
                            className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg border", TYPE_COLORS[monster.type])}
                        >
                            {monsterTypeLabel(t, monster.type)}
                        </Badge>
                        {monster.type2 && (
                            <Badge
                                className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg border", TYPE_COLORS[monster.type2])}
                            >
                                {monsterTypeLabel(t, monster.type2)}
                            </Badge>
                        )}
                    </div>
                </div>

                <CardContent className="p-4 space-y-4">
                    {/* Stats */}
                    <div>
                        {/* TP header */}
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400" /> {t("monsterStatsHeading")}
                            </p>
                            <div className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span className="text-[10px] font-black text-amber-700">
                                    TP {monster.stats.hp + monster.stats.atk + monster.stats.def + monster.stats.spd}
                                </span>
                            </div>
                        </div>
                        {/* Stat bars */}
                        <div className="grid grid-cols-2 gap-2">
                            {STAT_CONFIG.map(({ key, labelKey, icon: Icon, iconColor, barFrom, barTo, bg, border }) => {
                                const val = monster.stats[key as keyof typeof monster.stats];
                                const pct = Math.round((val / (maxStat * 1.1)) * 100);
                                return (
                                    <div key={key} className={cn("rounded-2xl border p-3", bg, border)}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <Icon className={cn("w-3.5 h-3.5 shrink-0", iconColor)} />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{t(labelKey)}</span>
                                            </div>
                                            <span className="text-base font-black text-slate-700 tabular-nums leading-none">{val}</span>
                                        </div>
                                        <div className="h-2.5 w-full rounded-full bg-white/70 overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                                className={cn("h-full rounded-full bg-gradient-to-r", barFrom, barTo)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* EXP Progress */}
                    <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                    {rankProgress.currentRank}
                                </span>
                            </div>
                            {rankProgress.nextRank ? (
                                <span className="text-[10px] font-bold text-slate-400">
                                    {t("monsterRankProgressMore", {
                                        points: rankProgress.pointsNeeded,
                                        rank: rankProgress.nextRank,
                                    })}
                                </span>
                            ) : (
                                <span className="text-[10px] font-black text-amber-500 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> {t("monsterRankMax")}
                                </span>
                            )}
                        </div>
                        <Progress
                            value={rankProgress.progress}
                            className="h-2.5 bg-slate-200 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-amber-400 [&>div]:to-orange-500 [&>div]:rounded-full"
                        />
                    </div>

                    {/* Passive Ability */}
                    {monster.ability && (
                        <div className="rounded-2xl border-2 border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-3">
                            <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> {t("monsterAbilityHeading")}
                            </p>
                            <div className="flex items-start gap-2">
                                <span className="text-lg shrink-0">✨</span>
                                <div>
                                    <p className="text-xs font-black text-violet-900">{monster.ability.name}</p>
                                    <p className="text-[10px] text-violet-500 leading-snug">{monster.ability.desc}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Moves */}
                    {monster.unlockedMoves.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Swords className="w-3 h-3" /> {t("monsterMovesHeading")}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {monster.unlockedMoves.map((move) => {
                                    const typeStyle = TYPE_COLORS[move.type] ?? "bg-slate-50 text-slate-500 border-slate-200";
                                    const catStyle = MOVE_CAT_COLORS[move.category] ?? "bg-slate-50 text-slate-400 border-slate-200";
                                    const moveName = t(`move_${move.id.replace(/-/g, "_")}` as Parameters<typeof t>[0]) || move.name;
                                    return (
                                        <div key={move.id} className="rounded-2xl border-2 border-slate-100 bg-white/80 p-2.5 shadow-sm">
                                            <div className="flex items-start justify-between gap-1 mb-1.5">
                                                <p className="text-[11px] font-black text-slate-800 leading-tight line-clamp-1 flex-1">{moveName}</p>
                                                {/* Priority badge */}
                                                {(move.priority ?? 0) > 0 && (
                                                    <span className="shrink-0 rounded-full bg-sky-100 px-1.5 py-0.5 text-[8px] font-black text-sky-600">⚡ก่อน</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                <span className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-black", typeStyle)}>
                                                    {monsterTypeLabel(t, move.type)}
                                                </span>
                                                <span className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-bold", catStyle)}>
                                                    {moveCategoryLabel(t, move.category)}
                                                </span>
                                                {/* High crit badge */}
                                                {(move.critBonus ?? 0) >= 15 && (
                                                    <span className="rounded-md border border-red-100 bg-red-50 px-1.5 py-0.5 text-[9px] font-black text-red-500">⚡CRIT+</span>
                                                )}
                                            </div>
                                            <div className="mt-1.5 flex items-center justify-between text-[9px] font-bold text-slate-400">
                                                <span>{t("monsterMovePowerShort")} <span className="text-slate-600">{move.power > 0 ? move.power : "—"}</span></span>
                                                <span>{t("monsterMoveAccuracyShort")} <span className="text-slate-600">{move.accuracy}%</span></span>
                                            </div>
                                            {/* Effect on hit */}
                                            {move.effect && move.power > 0 && (
                                                <p className="mt-1 text-[9px] font-bold text-slate-400">
                                                    {move.effectChance && move.effectChance < 100
                                                        ? `${move.effectChance}% `
                                                        : ""}
                                                    {move.effect.replace(/_/g, " ").toLowerCase()}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Locked moves preview */}
                    {lockedMoves.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> {t("monsterLockedMovesHeading")}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {lockedMoves.map((move) => (
                                    <div key={move.id} className="rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/60 p-2.5 opacity-60">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Lock className="w-3 h-3 shrink-0 text-slate-300" />
                                            <p className="text-[11px] font-black text-slate-400 leading-tight line-clamp-1">
                                                {t(`move_${move.id.replace(/-/g, "_")}` as Parameters<typeof t>[0]) || move.name}
                                            </p>
                                        </div>
                                        <p className="text-[9px] text-slate-300 font-bold">{t("monsterLockedMoveRank", { rank: String(move.learnRank) })}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Passive Skills */}
                    {loginCode && (
                        <PassiveSkillsPanel
                            loginCode={loginCode}
                            gold={gold}
                            negamonSkills={negamonSkills}
                            onSkillUnlocked={onSkillUnlocked}
                        />
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

// ── Passive Skills Panel ──────────────────────────────────────
interface PassiveSkillsPanelProps {
    loginCode: string;
    gold: number;
    negamonSkills: string[];
    onSkillUnlocked?: (skillId: string, newGold: number, newSkills: string[]) => void;
}

function PassiveSkillsPanel({ loginCode, gold, negamonSkills, onSkillUnlocked }: PassiveSkillsPanelProps) {
    const { t } = useLanguage();
    const [unlocking, setUnlocking] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [localSkills, setLocalSkills] = useState<string[]>(negamonSkills);
    const [localGold, setLocalGold] = useState<number>(gold);

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    }

    async function handleUnlock(passive: NegamonPassive) {
        if (unlocking || localSkills.includes(passive.id)) return;
        setUnlocking(passive.id);
        try {
            const res = await fetch(`/api/student/${loginCode}/negamon/unlock-skill`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ skillId: passive.id }),
            });
            const data = (await res.json()) as unknown;
            if (!res.ok) {
                showToast(getLocalizedMessageFromApiErrorBody(data, t));
            } else {
                const body = data as {
                    negamonSkills: string[];
                    newGold: number;
                };
                const newSkills = body.negamonSkills;
                setLocalSkills(newSkills);
                setLocalGold(body.newGold);
                onSkillUnlocked?.(passive.id, body.newGold, newSkills);
                const nameKey = negamonPassiveNameKey(passive.id);
                showToast(t("negamonPassiveUnlockToast", { name: t(nameKey) }));
            }
        } finally {
            setUnlocking(null);
        }
    }

    return (
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-violet-400" /> {t("monsterPassiveHeading")}
            </p>

            {toast && (
                <div className="mb-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-center text-xs font-bold text-violet-700 animate-in fade-in slide-in-from-top-1">
                    {toast}
                </div>
            )}

            <div className="space-y-1.5">
                {NEGAMON_PASSIVES.map((passive) => {
                    const owned = localSkills.includes(passive.id);
                    const canAfford = localGold >= passive.cost;
                    const passiveName = t(negamonPassiveNameKey(passive.id));
                    const passiveDesc = t(negamonPassiveDescKey(passive.id));
                    return (
                        <div
                            key={passive.id}
                            className={cn(
                                "flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all",
                                owned
                                    ? "border-violet-200 bg-violet-50/60"
                                    : "border-slate-100 bg-slate-50/60"
                            )}
                        >
                            <span className="text-base shrink-0">{passive.icon}</span>
                            <div className="min-w-0 flex-1">
                                <p className={cn("text-[11px] font-black leading-tight", owned ? "text-violet-900" : "text-slate-700")}>
                                    {passiveName}
                                </p>
                                <p className="text-[10px] text-slate-400 leading-snug line-clamp-1">{passiveDesc}</p>
                            </div>
                            <div className="shrink-0">
                                {owned ? (
                                    <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-600">✓</span>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={!canAfford || unlocking === passive.id}
                                        onClick={() => handleUnlock(passive)}
                                        className={cn(
                                            "flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[10px] font-black transition",
                                            canAfford
                                                ? "bg-yellow-400 hover:bg-yellow-500 text-yellow-900"
                                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                        )}
                                    >
                                        {!canAfford && <Lock className="w-2.5 h-2.5" />}
                                        <Coins className="w-2.5 h-2.5" />
                                        {passive.cost}G
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Mini version สำหรับใช้ใน Classroom Table ──────────────────
interface MonsterMiniProps {
    studentId: string;
    behaviorPoints: number;
    levelConfig: LevelConfigInput;
    negamon: NegamonSettings;
}

export function MonsterMini({ studentId, behaviorPoints, levelConfig, negamon }: MonsterMiniProps) {
    const { t } = useLanguage();
    const monster = useMemo(
        () => getStudentMonsterState(studentId, behaviorPoints, levelConfig, negamon),
        [studentId, behaviorPoints, levelConfig, negamon]
    );

    if (!monster) return <span className="text-slate-300 text-sm">—</span>;

    return (
        <div className="flex items-center gap-2">
            <span className="text-xl">{monster.form.icon}</span>
            <div>
                <p className="text-xs font-black text-slate-700 leading-none">{monster.form.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{monsterTypeLabel(t, monster.type)}</p>
            </div>
        </div>
    );
}
