"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
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
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";

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

const TYPE_GLYPH: Record<string, string> = {
    FIRE: "🔥",
    WATER: "💧",
    EARTH: "🌿",
    WIND: "🌪️",
    THUNDER: "⚡",
    LIGHT: "✨",
    DARK: "🌑",
    PSYCHIC: "🔮",
};

function typeGlyph(type: MonsterType | string): string {
    return TYPE_GLYPH[type] ?? "◆";
}

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

    const totalTp =
        monster.stats.hp + monster.stats.atk + monster.stats.def + monster.stats.spd;
    const starCount = Math.min(3, Math.max(1, monster.rankIndex + 1));
    const frameGradient = `linear-gradient(145deg, ${monster.form.color} 0%, #7c3aed 42%, #4c1d95 100%)`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn("mx-auto w-full max-w-md", className)}
        >
            {/* กรอบนอกแบบการ์ดเกม — ไล่สีจากสีฟอร์ม + ม่วง */}
            <div
                className="rounded-[1.35rem] p-[5px] shadow-[0_14px_42px_rgba(15,23,42,0.32),inset_0_2px_0_rgba(255,255,255,0.28)]"
                style={{ background: frameGradient }}
            >
                <div className="overflow-hidden rounded-[1.05rem] bg-[#1a1228] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                    {/* พอร์ตเทรตเต็มกรอบ + HUD บนภาพ */}
                    <div className="relative aspect-[5/6] w-full max-h-[min(78vw,22rem)] overflow-hidden bg-[#120c1c] sm:max-h-[24rem]">
                        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1a1228] via-transparent to-black/35" />
                        <motion.div
                            animate={{ scale: [1, 1.02, 1] }}
                            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 z-0 flex items-center justify-center"
                        >
                            <NegamonFormIcon
                                icon={monster.form.icon}
                                label={monster.form.name}
                                className="absolute inset-0 flex h-full w-full items-center justify-center"
                                emojiClassName="text-[clamp(3.5rem,32vw,7rem)] leading-none drop-shadow-lg"
                                width={512}
                                height={512}
                                imageClassName="h-full w-full object-cover"
                            />
                        </motion.div>

                        <div className="absolute inset-x-0 top-0 z-[2] flex items-start justify-between gap-1.5 p-2.5 sm:gap-2 sm:p-3">
                            <div className="flex flex-col items-center">
                                <div className="flex h-11 w-11 flex-col items-center justify-center rounded-full border-2 border-amber-200/80 bg-black/50 text-center shadow-lg backdrop-blur-[6px] sm:h-12 sm:w-12">
                                    <span className="text-[7px] font-black uppercase tracking-wider text-amber-100/90">
                                        Lv
                                    </span>
                                    <span className="text-sm font-black tabular-nums leading-none text-white sm:text-base">
                                        {monster.rankIndex + 1}
                                    </span>
                                </div>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col items-center gap-1 pt-0.5">
                                <div className="flex gap-0.5">
                                    {[0, 1, 2].map((i) => (
                                        <Star
                                            key={i}
                                            className={cn(
                                                "h-4 w-4 shrink-0 drop-shadow-md sm:h-[1.15rem] sm:w-[1.15rem]",
                                                i < starCount
                                                    ? "fill-amber-400 text-amber-200 stroke-amber-700/40"
                                                    : "fill-white/15 text-white/20 stroke-white/35"
                                            )}
                                            strokeWidth={1.5}
                                        />
                                    ))}
                                </div>
                                <div className="h-1.5 w-[min(58%,11rem)] overflow-hidden rounded-full border border-white/25 bg-black/45 shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${rankProgress.progress}%` }}
                                        transition={{ duration: 0.75, ease: "easeOut" }}
                                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                    />
                                </div>
                            </div>
                            <div className="shrink-0 rounded-lg border border-amber-300/45 bg-black/55 px-2 py-1 shadow-md backdrop-blur-[6px]">
                                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-amber-100 sm:text-[10px]">
                                    <Sparkles className="h-3 w-3 text-amber-400" />
                                    TP {totalTp}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* แถบชื่อแบบแพร์ชเมนต์ — ทับขอบภาพ */}
                    <div className="relative z-[3] -mt-7 mx-2.5 flex items-center gap-2.5 rounded-lg border-2 border-[#7a5c20]/35 bg-gradient-to-b from-[#f7ecd4] to-[#e2cf9e] px-2.5 py-2 shadow-[0_5px_16px_rgba(0,0,0,0.22)] sm:mx-3 sm:gap-3 sm:px-3 sm:py-2.5">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#4c1d6e]/35 bg-gradient-to-br from-violet-700 to-purple-950 text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] sm:h-11 sm:w-11"
                            aria-hidden
                        >
                            <span className="drop-shadow-sm">{typeGlyph(monster.type)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6b5344]">
                                {t("monsterCardBrand")}
                            </p>
                            <h3 className="font-serif text-lg font-black leading-tight tracking-tight text-stone-900 sm:text-xl">
                                {monster.form.name}
                            </h3>
                            <p className="text-[11px] font-bold text-stone-600">{monster.speciesName}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end justify-center gap-1">
                            <Badge
                                className={cn(
                                    "rounded-md border px-1.5 py-0 text-[9px] font-black",
                                    TYPE_COLORS[monster.type]
                                )}
                            >
                                {monsterTypeLabel(t, monster.type)}
                            </Badge>
                            {monster.type2 ? (
                                <Badge
                                    className={cn(
                                        "rounded-md border px-1.5 py-0 text-[9px] font-black",
                                        TYPE_COLORS[monster.type2]
                                    )}
                                >
                                    {monsterTypeLabel(t, monster.type2)}
                                </Badge>
                            ) : null}
                        </div>
                    </div>

                    {/* พื้นหลังกระดาษเก่า — สถานะ / สกิล */}
                    <div className="relative -mt-0.5 space-y-3 bg-gradient-to-b from-[#faf3e8] via-[#f3e9d4] to-[#e8dcc4] px-3 pb-4 pt-4 shadow-[inset_0_4px_14px_rgba(101,67,33,0.07)] sm:space-y-4 sm:px-4 sm:pb-5 sm:pt-5">
                        <div
                            className="pointer-events-none absolute inset-0 opacity-[0.06]"
                            style={{
                                backgroundImage:
                                    "radial-gradient(circle at 1px 1px, rgba(60,40,20,0.45) 1px, transparent 0)",
                                backgroundSize: "5px 5px",
                            }}
                            aria-hidden
                        />
                        <div className="relative z-[1] space-y-3 sm:space-y-4">
                            <div>
                                <p className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#5c4d3d]">
                                    <Star className="h-3 w-3 text-amber-600" />
                                    {t("monsterStatsHeading")}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {STAT_CONFIG.map(
                                        ({
                                            key,
                                            labelKey,
                                            icon: Icon,
                                            iconColor,
                                            barFrom,
                                            barTo,
                                        }) => {
                                            const val =
                                                monster.stats[key as keyof typeof monster.stats];
                                            const pct = Math.round(
                                                (val / (maxStat * 1.1)) * 100
                                            );
                                            return (
                                                <div
                                                    key={key}
                                                    className="rounded-xl border-2 border-[#c4a574]/40 bg-[#fffdf8]/90 p-2.5 shadow-sm"
                                                >
                                                    <div className="mb-1.5 flex items-center justify-between">
                                                        <div className="flex items-center gap-1">
                                                            <Icon
                                                                className={cn(
                                                                    "h-3.5 w-3.5 shrink-0",
                                                                    iconColor
                                                                )}
                                                            />
                                                            <span className="text-[9px] font-black uppercase tracking-wide text-stone-600">
                                                                {t(labelKey)}
                                                            </span>
                                                        </div>
                                                        <span className="text-base font-black tabular-nums leading-none text-stone-800">
                                                            {val}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden rounded-full border border-[#d4c4a8]/60 bg-[#f0e8dc] shadow-inner">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${pct}%` }}
                                                            transition={{
                                                                duration: 0.6,
                                                                ease: "easeOut",
                                                            }}
                                                            className={cn(
                                                                "h-full rounded-full bg-gradient-to-r",
                                                                barFrom,
                                                                barTo
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border-2 border-[#c4a574]/35 bg-[#fffdf6]/85 p-2.5">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Star className="h-3.5 w-3.5 text-amber-600" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-stone-600">
                                            {rankProgress.currentRank}
                                        </span>
                                    </div>
                                    {rankProgress.nextRank ? (
                                        <span className="text-[9px] font-bold text-stone-500">
                                            {t("monsterRankProgressMore", {
                                                points: rankProgress.pointsNeeded,
                                                rank: rankProgress.nextRank,
                                            })}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-700">
                                            <Sparkles className="h-3 w-3" />
                                            {t("monsterRankMax")}
                                        </span>
                                    )}
                                </div>
                                <Progress
                                    value={rankProgress.progress}
                                    className="h-2 rounded-full border border-[#d4c4a8]/50 bg-[#ebe3d6] [&>div]:rounded-full [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-600"
                                />
                            </div>

                            {monster.ability ? (
                                <div className="rounded-xl border-2 border-violet-400/35 bg-gradient-to-br from-violet-50/95 to-purple-50/90 p-3 shadow-sm">
                                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-violet-700">
                                        <Sparkles className="h-3 w-3" />
                                        {t("monsterAbilityHeading")}
                                    </p>
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg shrink-0">✨</span>
                                        <div>
                                            <p className="text-xs font-black text-violet-950">
                                                {monster.ability.name}
                                            </p>
                                            <p className="text-[10px] leading-snug text-violet-800/90">
                                                {monster.ability.desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {monster.unlockedMoves.length > 0 ? (
                                <div>
                                    <p className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#5c4d3d]">
                                        <Swords className="h-3 w-3" />
                                        {t("monsterMovesHeading")}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {monster.unlockedMoves.map((move) => {
                                            const typeStyle =
                                                TYPE_COLORS[move.type] ??
                                                "bg-slate-50 text-slate-500 border-slate-200";
                                            const catStyle =
                                                MOVE_CAT_COLORS[move.category] ??
                                                "bg-slate-50 text-slate-400 border-slate-200";
                                            const moveName =
                                                t(
                                                    `move_${move.id.replace(/-/g, "_")}` as Parameters<
                                                        typeof t
                                                    >[0]
                                                ) || move.name;
                                            return (
                                                <div
                                                    key={move.id}
                                                    className="rounded-xl border-2 border-[#bfa67a]/45 bg-[#fffdf8]/95 p-2.5 shadow-sm"
                                                >
                                                    <div className="mb-1.5 flex items-start justify-between gap-1">
                                                        <p className="line-clamp-2 flex-1 text-[11px] font-black leading-tight text-stone-900">
                                                            {moveName}
                                                        </p>
                                                        {(move.priority ?? 0) > 0 ? (
                                                            <span className="shrink-0 rounded-full bg-sky-100 px-1.5 py-0.5 text-[8px] font-black text-sky-700">
                                                                ⚡ก่อน
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <span
                                                            className={cn(
                                                                "rounded-md border px-1.5 py-0.5 text-[9px] font-black",
                                                                typeStyle
                                                            )}
                                                        >
                                                            {monsterTypeLabel(t, move.type)}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                "rounded-md border px-1.5 py-0.5 text-[9px] font-bold",
                                                                catStyle
                                                            )}
                                                        >
                                                            {moveCategoryLabel(t, move.category)}
                                                        </span>
                                                        {(move.critBonus ?? 0) >= 15 ? (
                                                            <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-black text-red-600">
                                                                ⚡CRIT+
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-1.5 flex items-center justify-between text-[9px] font-bold text-stone-500">
                                                        <span>
                                                            {t("monsterMovePowerShort")}{" "}
                                                            <span className="text-stone-800">
                                                                {move.power > 0 ? move.power : "—"}
                                                            </span>
                                                        </span>
                                                        <span>
                                                            {t("monsterMoveAccuracyShort")}{" "}
                                                            <span className="text-stone-800">
                                                                {move.accuracy}%
                                                            </span>
                                                        </span>
                                                    </div>
                                                    {move.effect && move.power > 0 ? (
                                                        <p className="mt-1 text-[9px] font-bold text-stone-500">
                                                            {move.effectChance &&
                                                            move.effectChance < 100
                                                                ? `${move.effectChance}% `
                                                                : ""}
                                                            {move.effect
                                                                .replace(/_/g, " ")
                                                                .toLowerCase()}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}

                            {lockedMoves.length > 0 ? (
                                <div>
                                    <p className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-stone-400">
                                        <Lock className="h-3 w-3" />
                                        {t("monsterLockedMovesHeading")}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {lockedMoves.map((move) => (
                                            <div
                                                key={move.id}
                                                className="rounded-xl border-2 border-dashed border-stone-300/70 bg-stone-100/50 p-2.5 opacity-75"
                                            >
                                                <div className="mb-1 flex items-center gap-1.5">
                                                    <Lock className="h-3 w-3 shrink-0 text-stone-400" />
                                                    <p className="line-clamp-1 text-[11px] font-black text-stone-500">
                                                        {t(
                                                            `move_${move.id.replace(/-/g, "_")}` as Parameters<
                                                                typeof t
                                                            >[0]
                                                        ) || move.name}
                                                    </p>
                                                </div>
                                                <p className="text-[9px] font-bold text-stone-400">
                                                    {t("monsterLockedMoveRank", {
                                                        rank: String(move.learnRank),
                                                    })}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {loginCode ? (
                                <PassiveSkillsPanel
                                    loginCode={loginCode}
                                    gold={gold}
                                    negamonSkills={negamonSkills}
                                    onSkillUnlocked={onSkillUnlocked}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
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
            <p className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#5c4d3d]">
                <Sparkles className="h-3 w-3 text-violet-600" /> {t("monsterPassiveHeading")}
            </p>

            {toast && (
                <div className="mb-2 rounded-xl border-2 border-violet-300/60 bg-violet-50/95 px-3 py-1.5 text-center text-xs font-bold text-violet-800 animate-in fade-in slide-in-from-top-1">
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
                                "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 transition-all",
                                owned
                                    ? "border-[#9b7cb8]/50 bg-violet-50/80"
                                    : "border-[#c4a574]/35 bg-[#fffdf8]/80"
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
            <NegamonFormIcon
                icon={monster.form.icon}
                label={monster.form.name}
                emojiClassName="text-xl"
                width={28}
                height={28}
                imageClassName="max-h-7 max-w-7"
            />
            <div>
                <p className="text-xs font-black text-slate-700 leading-none">{monster.form.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{monsterTypeLabel(t, monster.type)}</p>
            </div>
        </div>
    );
}
