"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Swords, Shield, Zap, Heart, Star, Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getStudentMonsterState,
    getNegamonSettings,
    getNextRankProgress,
    type LevelConfigInput,
} from "@/lib/classroom-utils";
import { findSpeciesById } from "@/lib/negamon-species";
import type { NegamonSettings, StudentMonsterState, MonsterMove } from "@/lib/types/negamon";
import {
    NEGAMON_MOVE_CATEGORY_BADGE,
    NEGAMON_MOVE_TYPE_BADGE,
    negamonMonsterTypeLabel,
    negamonMoveCategoryLabel,
    negamonMoveDisplayName,
    negamonTypeGlyph,
} from "@/lib/negamon-move-presenter";
import { useLanguage } from "@/components/providers/language-provider";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";
import { NegamonMoveInlineDescription } from "@/components/negamon/negamon-move-inline-description";
import { getMoveEnergyCost } from "@/lib/negamon-energy";
import { buildBasicAttackMove } from "@/lib/negamon-basic-move";
import { getFrameGoldRateMultiplierById } from "@/lib/shop-items";

interface MonsterCardProps {
    studentId: string;
    behaviorPoints: number;
    levelConfig: LevelConfigInput;
    gamifiedSettings: Record<string, unknown>;
    /** กรอบโปรไฟล์ที่สวมใส่ — ใช้คำนวณโบนัสทองต่อชั่วโมง */
    equippedFrame?: string | null;
    className?: string;
}

const STAT_CONFIG = [
    {
        key: "hp",
        labelKey: "playNegamonHpLabel",
        icon: Heart,
        iconColor: "text-rose-400",
        barFrom: "from-rose-400",
        barTo: "to-rose-500",
    },
    {
        key: "atk",
        labelKey: "hostStatAtk",
        icon: Swords,
        iconColor: "text-orange-400",
        barFrom: "from-orange-400",
        barTo: "to-orange-600",
    },
    {
        key: "def",
        labelKey: "hostStatDef",
        icon: Shield,
        iconColor: "text-sky-400",
        barFrom: "from-sky-400",
        barTo: "to-sky-600",
    },
    {
        key: "spd",
        labelKey: "monsterStatSpd",
        icon: Zap,
        iconColor: "text-yellow-400",
        barFrom: "from-yellow-400",
        barTo: "to-amber-500",
    },
] as const;

function MoveCircleGlyph({ move }: { move: MonsterMove }) {
    const g = negamonTypeGlyph(move.type);
    if (g && g !== "○") {
        return <span className="text-lg leading-none drop-shadow-sm">{g}</span>;
    }
    return <Swords className="h-5 w-5 text-amber-200/90" strokeWidth={2.25} />;
}

export function MonsterCard({
    studentId,
    behaviorPoints,
    levelConfig,
    gamifiedSettings,
    equippedFrame = null,
    className,
}: MonsterCardProps) {
    const { t } = useLanguage();
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null);

    const negamon = useMemo(() => getNegamonSettings(gamifiedSettings), [gamifiedSettings]);

    const monster: StudentMonsterState | null = useMemo(() => {
        if (!negamon?.enabled) return null;
        return getStudentMonsterState(studentId, behaviorPoints, levelConfig, negamon);
    }, [negamon, studentId, behaviorPoints, levelConfig]);

    const rankProgress = useMemo(() => getNextRankProgress(behaviorPoints, levelConfig), [behaviorPoints, levelConfig]);

    const displayMoves = useMemo(() => {
        if (!monster) return [];
        return [buildBasicAttackMove(), ...monster.unlockedMoves];
    }, [monster]);

    if (!negamon?.enabled || !monster) return null;

    const maxStat = Math.max(monster.stats.hp, monster.stats.atk, monster.stats.def, monster.stats.spd);

    const species = findSpeciesById(monster.speciesId);
    const lockedMoves = species
        ? species.moves.filter((m) => m.learnRank > monster.rankIndex + 1)
        : [];

    const totalTp =
        monster.stats.hp + monster.stats.atk + monster.stats.def + monster.stats.spd;
    const starCount = Math.min(3, Math.max(1, monster.rankIndex + 1));
    const frameGoldMult = getFrameGoldRateMultiplierById(equippedFrame);
    const frameGoldPercent = Math.round((frameGoldMult - 1) * 100);

    const dialogMove = selectedMoveId
        ? displayMoves.find((m) => m.id === selectedMoveId) ??
          lockedMoves.find((m) => m.id === selectedMoveId) ??
          null
        : null;
    const isDialogLocked = Boolean(selectedMoveId && lockedMoves.some((m) => m.id === selectedMoveId));

    const heroGlow = `radial-gradient(ellipse 85% 55% at 50% 38%, ${monster.form.color}55, transparent 62%), radial-gradient(ellipse 70% 45% at 50% 72%, rgba(212,175,55,0.22), transparent 55%)`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn("mx-auto w-full max-w-md", className)}
        >
            <div className="rounded-[1.35rem] border-[3px] border-[#c9a227] bg-gradient-to-br from-[#a67c2d] via-[#4a3419] to-[#1c1209] p-[5px] shadow-[0_18px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,248,220,0.35),inset_0_-2px_6px_rgba(0,0,0,0.35)]">
                <div className="overflow-hidden rounded-[1.12rem] border border-[#2a1f14]/90 bg-[#140d0a] shadow-[inset_0_0_0_1px_rgba(212,175,55,0.12)]">
                    <div className="relative aspect-[5/6] w-full max-h-[min(78vw,22rem)] overflow-hidden sm:max-h-[24rem]">
                        <div
                            className="pointer-events-none absolute inset-0 z-0 bg-[#0a0705]"
                            style={{ backgroundImage: heroGlow }}
                            aria-hidden
                        />
                        <div
                            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.14]"
                            style={{
                                backgroundImage:
                                    "repeating-linear-gradient(-12deg, transparent, transparent 6px, rgba(212,175,55,0.08) 6px, rgba(212,175,55,0.08) 7px)",
                            }}
                            aria-hidden
                        />
                        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#140d0a] via-transparent to-black/40" />

                        <div className="absolute inset-x-0 bottom-0 z-[1] flex justify-center">
                            <div className="relative w-[min(92%,17.5rem)]">
                                <div className="h-[4.25rem] rounded-[50%_50%_0_0] border-x-2 border-t-2 border-[#7a5c28]/85 bg-gradient-to-b from-[#2d2118] via-[#1a120c] to-[#0a0604] shadow-[0_-12px_28px_rgba(212,175,55,0.12)]" />
                                <div className="absolute left-1/2 top-2.5 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#e8c547] bg-[#120c08] text-sm text-amber-200 shadow-[0_0_12px_rgba(212,175,55,0.35)]">
                                    ✦
                                </div>
                            </div>
                        </div>

                        <motion.div
                            animate={{ scale: [1, 1.02, 1] }}
                            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 z-[2] flex items-center justify-center pb-10"
                        >
                            <NegamonFormIcon
                                icon={monster.form.icon}
                                label={monster.form.name}
                                className="absolute inset-0 flex h-full w-full items-center justify-center pb-10"
                                emojiClassName="text-[clamp(3.5rem,32vw,7rem)] leading-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
                                width={512}
                                height={512}
                                imageClassName="h-full w-full object-contain object-bottom px-2 pt-6"
                            />
                        </motion.div>

                        <div className="absolute inset-x-0 top-0 z-[3] flex items-start justify-between gap-1.5 p-2.5 sm:gap-2 sm:p-3">
                            <div className="flex flex-col items-center">
                                <div className="flex h-11 w-11 flex-col items-center justify-center rounded-full border-2 border-[#e8c547]/90 bg-black/55 text-center shadow-lg backdrop-blur-[6px] sm:h-12 sm:w-12">
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
                                                    ? "fill-amber-400 text-amber-200 stroke-amber-800/50"
                                                    : "fill-white/10 text-white/15 stroke-white/25"
                                            )}
                                            strokeWidth={1.5}
                                        />
                                    ))}
                                </div>
                                <div className="h-1.5 w-[min(58%,11rem)] overflow-hidden rounded-full border border-amber-900/50 bg-black/55 shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${rankProgress.progress}%` }}
                                        transition={{ duration: 0.75, ease: "easeOut" }}
                                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-200 shadow-[0_0_8px_rgba(251,191,36,0.45)]"
                                    />
                                </div>
                            </div>
                            <div className="shrink-0 rounded-lg border border-[#c9a227]/55 bg-black/60 px-2 py-1 shadow-md backdrop-blur-[6px]">
                                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-amber-100 sm:text-[10px]">
                                    <Sparkles className="h-3 w-3 text-amber-400" />
                                    TP {totalTp}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-[4] -mt-7 mx-2.5 rounded-xl border-2 border-[#8b6914]/65 bg-gradient-to-b from-[#f8eccc] via-[#e8d5a8] to-[#d4bc7f] px-2.5 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.35)] sm:mx-3 sm:gap-3 sm:px-3 sm:py-2.5">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                            <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#5c3d9e]/40 bg-gradient-to-br from-violet-800 to-purple-950 text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] sm:h-11 sm:w-11"
                                aria-hidden
                            >
                                <span className="drop-shadow-sm">{negamonTypeGlyph(monster.type)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#5c4428]">
                                    {t("monsterCardBrand")}
                                </p>
                                <h3 className="font-serif text-lg font-black leading-tight tracking-tight text-stone-900 sm:text-xl">
                                    {monster.form.name}
                                </h3>
                                <p className="text-[11px] font-bold text-stone-700">{monster.speciesName}</p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end justify-center gap-1">
                                <Badge
                                    className={cn(
                                        "rounded-md border px-1.5 py-0 text-[9px] font-black",
                                        NEGAMON_MOVE_TYPE_BADGE[monster.type]
                                    )}
                                >
                                    {negamonMonsterTypeLabel(t, monster.type)}
                                </Badge>
                                {monster.type2 ? (
                                    <Badge
                                        className={cn(
                                            "rounded-md border px-1.5 py-0 text-[9px] font-black",
                                            NEGAMON_MOVE_TYPE_BADGE[monster.type2]
                                        )}
                                    >
                                        {negamonMonsterTypeLabel(t, monster.type2)}
                                    </Badge>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="relative -mt-0.5 space-y-3 bg-gradient-to-b from-[#1f160f] via-[#16100b] to-[#0c0805] px-3 pb-4 pt-5 sm:space-y-4 sm:px-4 sm:pb-5 sm:pt-6">
                        <div
                            className="pointer-events-none absolute inset-0 opacity-[0.07]"
                            style={{
                                backgroundImage:
                                    "radial-gradient(circle at 1px 1px, rgba(212,175,55,0.5) 1px, transparent 0)",
                                backgroundSize: "6px 6px",
                            }}
                            aria-hidden
                        />

                        <div className="relative z-[1] space-y-3 sm:space-y-4">
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative flex w-[88%] max-w-[16rem] justify-center">
                                    <div className="absolute -left-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[6px] border-r-8 border-y-transparent border-r-red-950 opacity-90" />
                                    <div className="absolute -right-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[6px] border-l-8 border-y-transparent border-l-red-950 opacity-90" />
                                    <div className="w-full rounded-sm border border-red-950/60 bg-gradient-to-b from-[#b91c1c] to-[#7f1d1d] px-5 py-1.5 text-center shadow-[0_4px_14px_rgba(0,0,0,0.45)]">
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
                                            {t("monsterCardCombatStatsRibbon")}
                                        </p>
                                    </div>
                                </div>
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/45 bg-emerald-950/55 px-3 py-1 shadow-inner">
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-[10px] font-bold text-emerald-200/95">
                                        {t("shopFrameGoldRateBonus", { percent: frameGoldPercent })}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {STAT_CONFIG.map(({ key, labelKey, icon: Icon, iconColor, barFrom, barTo }) => {
                                    const val = monster.stats[key as keyof typeof monster.stats];
                                    const pct = Math.round((val / (maxStat * 1.1)) * 100);
                                    return (
                                        <div
                                            key={key}
                                            className="rounded-xl border border-[#5c4a2e]/55 bg-[#2a2118]/92 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                                        >
                                            <div className="mb-1.5 flex items-center justify-between gap-1">
                                                <div className="flex min-w-0 items-center gap-1">
                                                    <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
                                                    <span className="truncate text-[9px] font-black uppercase tracking-wide text-amber-200/75">
                                                        {t(labelKey)}
                                                    </span>
                                                </div>
                                                <span className="text-base font-black tabular-nums leading-none text-amber-50">
                                                    {val}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full border border-black/40 bg-black/45 shadow-inner">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                                    className={cn(
                                                        "h-full rounded-full bg-gradient-to-r",
                                                        barFrom,
                                                        barTo
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="rounded-xl border border-amber-700/35 bg-[#261c14]/95 p-2.5 shadow-[inset_0_1px_0_rgba(255,220,150,0.06)]">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Star className="h-3.5 w-3.5 text-amber-400" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-100/90">
                                            {rankProgress.currentRank}
                                        </span>
                                    </div>
                                    {rankProgress.nextRank ? (
                                        <span className="text-[9px] font-bold text-amber-200/65">
                                            {t("monsterRankProgressMore", {
                                                points: rankProgress.pointsNeeded,
                                                rank: rankProgress.nextRank,
                                            })}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-300">
                                            <Sparkles className="h-3 w-3" />
                                            {t("monsterRankMax")}
                                        </span>
                                    )}
                                </div>
                                <Progress
                                    value={rankProgress.progress}
                                    className="h-2 rounded-full border border-amber-900/40 bg-black/40 [&>div]:rounded-full [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-yellow-400"
                                />
                            </div>

                            {monster.ability ? (
                                <div className="rounded-xl border border-violet-500/35 bg-gradient-to-br from-[#1e1628]/98 to-[#120e1a]/98 p-3 shadow-[inset_0_1px_0_rgba(196,181,253,0.08)]">
                                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-violet-300">
                                        <Sparkles className="h-3 w-3 text-violet-400" />
                                        {t("monsterAbilityHeading")}
                                    </p>
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg shrink-0 opacity-90">✨</span>
                                        <div>
                                            <p className="text-xs font-black text-violet-100">
                                                {monster.ability.name}
                                            </p>
                                            <p className="text-[10px] leading-snug text-violet-200/85">
                                                {monster.ability.desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {displayMoves.length > 0 ? (
                                <div>
                                    <p className="mb-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/80">
                                        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/50" />
                                        <Swords className="h-3.5 w-3.5 text-amber-500" />
                                        {t("monsterMovesHeading")}
                                        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/50" />
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
                                        {displayMoves.map((move) => {
                                            const moveName = negamonMoveDisplayName(t, move);
                                            return (
                                                <button
                                                    key={move.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedMoveId(move.id);
                                                        setMoveDialogOpen(true);
                                                    }}
                                                    className="group relative flex h-[3.35rem] w-[3.35rem] shrink-0 items-center justify-center rounded-full border-2 border-[#d4af37]/70 bg-gradient-to-br from-[#3d2e18] to-[#120c08] text-amber-100 shadow-[0_6px_16px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,220,150,0.2)] transition-transform hover:scale-[1.05] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80"
                                                    aria-label={t("monsterMoveDetailAriaLabel", {
                                                        move: moveName,
                                                    })}
                                                >
                                                    <span className="absolute inset-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-hover:shadow-[0_0_18px_rgba(212,175,55,0.35)]" />
                                                    <MoveCircleGlyph move={move} />
                                                    {(move.priority ?? 0) > 0 ? (
                                                        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[8px] font-black text-white shadow">
                                                            ⚡
                                                        </span>
                                                    ) : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}

                            {lockedMoves.length > 0 ? (
                                <div>
                                    <p className="mb-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/45">
                                        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-600/40" />
                                        <Lock className="h-3.5 w-3.5" />
                                        {t("monsterLockedMovesHeading")}
                                        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-600/40" />
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
                                        {lockedMoves.map((move) => {
                                            const moveName = negamonMoveDisplayName(t, move);
                                            return (
                                                <button
                                                    key={move.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedMoveId(move.id);
                                                        setMoveDialogOpen(true);
                                                    }}
                                                    className="relative flex h-[3.35rem] w-[3.35rem] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-stone-600/70 bg-stone-900/50 text-stone-500 opacity-90 transition-transform hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                                                    aria-label={t("monsterMoveDetailAriaLabel", {
                                                        move: moveName,
                                                    })}
                                                >
                                                    <MoveCircleGlyph move={move} />
                                                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
                                                        <Lock className="h-4 w-4 text-amber-200/90" />
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog
                open={moveDialogOpen}
                onOpenChange={(open) => {
                    setMoveDialogOpen(open);
                    if (!open) setSelectedMoveId(null);
                }}
            >
                {dialogMove ? (
                    <DialogContent className="max-h-[85vh] overflow-y-auto border-amber-900/40 bg-[#1a1410] text-amber-50">
                        <DialogHeader>
                            <DialogTitle className="font-black text-amber-100">
                                {negamonMoveDisplayName(t, dialogMove)}
                            </DialogTitle>
                        </DialogHeader>
                        {isDialogLocked ? (
                            <div className="space-y-3 text-sm">
                                <p className="flex items-center gap-2 text-amber-200/80">
                                    <Lock className="h-4 w-4 shrink-0" />
                                    {t("monsterLockedMoveRank", {
                                        rank: String(dialogMove.learnRank),
                                    })}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    <span
                                        className={cn(
                                            "rounded-md border px-1.5 py-0.5 text-[9px] font-black",
                                            NEGAMON_MOVE_TYPE_BADGE[dialogMove.type] ??
                                                "bg-slate-800 text-slate-300 border-slate-600"
                                        )}
                                    >
                                        {negamonMonsterTypeLabel(t, dialogMove.type)}
                                    </span>
                                    <span
                                        className={cn(
                                            "rounded-md border px-1.5 py-0.5 text-[9px] font-bold",
                                            NEGAMON_MOVE_CATEGORY_BADGE[dialogMove.category] ??
                                                "bg-slate-800 text-slate-400 border-slate-600"
                                        )}
                                    >
                                        {negamonMoveCategoryLabel(t, dialogMove.category)}
                                    </span>
                                </div>
                                <NegamonMoveInlineDescription
                                    t={t}
                                    move={dialogMove}
                                    className="border-stone-600/50 text-stone-300"
                                />
                            </div>
                        ) : (
                            <div className="space-y-3 text-sm">
                                <div className="flex flex-wrap gap-1">
                                    <span
                                        className={cn(
                                            "rounded-md border px-1.5 py-0.5 text-[9px] font-black",
                                            NEGAMON_MOVE_TYPE_BADGE[dialogMove.type] ??
                                                "bg-slate-800 text-slate-300 border-slate-600"
                                        )}
                                    >
                                        {negamonMonsterTypeLabel(t, dialogMove.type)}
                                    </span>
                                    <span
                                        className={cn(
                                            "rounded-md border px-1.5 py-0.5 text-[9px] font-bold",
                                            NEGAMON_MOVE_CATEGORY_BADGE[dialogMove.category] ??
                                                "bg-slate-800 text-slate-400 border-slate-600"
                                        )}
                                    >
                                        {negamonMoveCategoryLabel(t, dialogMove.category)}
                                    </span>
                                    {(dialogMove.critBonus ?? 0) >= 15 ? (
                                        <span className="rounded-md border border-red-800 bg-red-950/60 px-1.5 py-0.5 text-[9px] font-black text-red-300">
                                            CRIT+
                                        </span>
                                    ) : null}
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-amber-200/70">
                                    <span>
                                        {t("monsterMovePowerShort")}{" "}
                                        <span className="text-amber-50">
                                            {dialogMove.power > 0 ? dialogMove.power : "—"}
                                        </span>
                                    </span>
                                    <span>
                                        EN{" "}
                                        <span className="text-cyan-300">
                                            {dialogMove.energyCost ??
                                                getMoveEnergyCost(dialogMove, monster.speciesId)}
                                        </span>
                                    </span>
                                </div>
                                {(dialogMove.priority ?? 0) > 0 ? (
                                    <p className="text-[10px] text-sky-300">{t("monsterMoveDetailPriority")}</p>
                                ) : null}
                                <NegamonMoveInlineDescription t={t} move={dialogMove} />
                            </div>
                        )}
                    </DialogContent>
                ) : null}
            </Dialog>
        </motion.div>
    );
}

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
                <p className="text-[10px] text-slate-400 font-semibold">
                    {negamonMonsterTypeLabel(t, monster.type)}
                </p>
            </div>
        </div>
    );
}
