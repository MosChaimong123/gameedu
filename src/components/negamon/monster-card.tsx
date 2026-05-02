"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
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
import { getFrameGoldRateMultiplierById, getItemById, type FramePreview } from "@/lib/shop-items";
import { FrameCardChrome } from "@/components/ui/frame-visual";

function MonsterCardBezel({
    framePreview,
    fallbackStyle,
    children,
}: {
    framePreview?: FramePreview;
    fallbackStyle: CSSProperties;
    children: ReactNode;
}) {
    if (framePreview) {
        return (
            <FrameCardChrome
                preview={framePreview}
                outerClassName="rounded-[1.35rem]"
                innerRoundedClassName="rounded-[1.12rem]"
                innerClassName="overflow-hidden border border-slate-100 bg-white"
            >
                {children}
            </FrameCardChrome>
        );
    }
    return (
        <div className="rounded-[1.35rem] border bg-white p-[5px]" style={fallbackStyle}>
            <div className="overflow-hidden rounded-[1.12rem] border border-slate-100 bg-white">{children}</div>
        </div>
    );
}

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

type MonsterCardTheme = {
    primary: string;
    secondary: string;
    soft: string;
    softBorder: string;
    deep: string;
};

const MONSTER_CARD_THEME: Record<string, MonsterCardTheme> = {
    naga: { primary: "#1658a1", secondary: "#5d9fdf", soft: "#eff6ff", softBorder: "#bfdbfe", deep: "#0f2f64" },
    garuda: { primary: "#e66214", secondary: "#f39c1e", soft: "#fff7ed", softBorder: "#fed7aa", deep: "#7c2d12" },
    singha: { primary: "#9d1e06", secondary: "#f29a1d", soft: "#fff7ed", softBorder: "#fdba74", deep: "#7f1d1d" },
    kinnaree: { primary: "#a49463", secondary: "#e6dea7", soft: "#fffbeb", softBorder: "#fef08a", deep: "#57534e" },
    thotsakan: { primary: "#5b209b", secondary: "#4f285f", soft: "#f5f3ff", softBorder: "#ddd6fe", deep: "#2e1065" },
    hanuman: { primary: "#a1591e", secondary: "#e6a45b", soft: "#fff7ed", softBorder: "#fed7aa", deep: "#7c2d12" },
    mekkala: { primary: "#946de4", secondary: "#ab9ce0", soft: "#f5f3ff", softBorder: "#ddd6fe", deep: "#4c1d95" },
    suvannamaccha: { primary: "#d9a55c", secondary: "#a3daef", soft: "#fffbeb", softBorder: "#fde68a", deep: "#92400e" },
};

function normalizeHex(hex: string): string {
    const raw = hex.trim().replace("#", "");
    if (raw.length === 3) return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
    if (raw.length === 6) return `#${raw}`.toLowerCase();
    return "#8b5cf6";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const norm = normalizeHex(hex);
    const n = parseInt(norm.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(a: string, b: string, ratio: number): string {
    const x = hexToRgb(a);
    const y = hexToRgb(b);
    const t = Math.max(0, Math.min(1, ratio));
    return rgbToHex(
        x.r + (y.r - x.r) * t,
        x.g + (y.g - x.g) * t,
        x.b + (y.b - x.b) * t
    );
}

function buildFallbackTheme(baseColor: string): MonsterCardTheme {
    const base = normalizeHex(baseColor);
    return {
        primary: mixHex(base, "#111827", 0.08),
        secondary: mixHex(base, "#ffffff", 0.3),
        soft: mixHex(base, "#ffffff", 0.92),
        softBorder: mixHex(base, "#ffffff", 0.75),
        deep: mixHex(base, "#0f172a", 0.45),
    };
}

function withRankIntensity(theme: MonsterCardTheme, rankIndex: number): MonsterCardTheme {
    const intensity = Math.max(0, Math.min(1, rankIndex / 5));
    return {
        primary: mixHex(theme.primary, "#111827", 0.08 + intensity * 0.18),
        secondary: mixHex(theme.secondary, "#111827", 0.03 + intensity * 0.12),
        soft: mixHex(theme.soft, theme.primary, 0.02 + intensity * 0.08),
        softBorder: mixHex(theme.softBorder, theme.primary, 0.1 + intensity * 0.2),
        deep: mixHex(theme.deep, "#020617", 0.06 + intensity * 0.16),
    };
}

function MoveCircleGlyph({ move }: { move: MonsterMove }) {
    const g = negamonTypeGlyph(move.type);
    if (g && g !== "○") {
        return <span className="text-lg leading-none drop-shadow-sm">{g}</span>;
    }
    return <Swords className="h-5 w-5 text-slate-500" strokeWidth={2.25} />;
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

    const equippedFrameItem = useMemo(
        () => (equippedFrame ? getItemById(equippedFrame) : undefined),
        [equippedFrame]
    );

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

    const baseTheme = MONSTER_CARD_THEME[monster.speciesId] ?? buildFallbackTheme(monster.form.color);
    const theme = withRankIntensity(baseTheme, monster.rankIndex);
    const heroGlow = `radial-gradient(ellipse 85% 55% at 50% 38%, ${theme.secondary}44, transparent 62%), radial-gradient(ellipse 70% 45% at 50% 72%, ${theme.primary}26, transparent 55%)`;
    const framePreview = equippedFrameItem?.type === "frame" ? equippedFrameItem.preview : undefined;
    const cardFrameColor = framePreview?.borderColor ?? theme.softBorder;
    const cardFrameBackground = framePreview?.gradient ?? "#ffffff";
    const cardFrameShadow =
        framePreview?.shadow ?? "0 18px 40px -28px rgba(15,23,42,0.45)";

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn("mx-auto w-full max-w-md", className)}
        >
            <MonsterCardBezel
                framePreview={framePreview}
                fallbackStyle={{
                    borderColor: cardFrameColor,
                    background: cardFrameBackground,
                    boxShadow: cardFrameShadow,
                }}
            >
                    <div className="relative aspect-[5/6] w-full max-h-[min(78vw,22rem)] overflow-hidden sm:max-h-[24rem]">
                        <div
                            className="pointer-events-none absolute inset-0 z-0 bg-[#fafafa]"
                            style={{ backgroundImage: heroGlow }}
                            aria-hidden
                        />
                        <div
                            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04]"
                            style={{
                                backgroundImage:
                                    "repeating-linear-gradient(-12deg, transparent, transparent 6px, rgba(148,163,184,0.18) 6px, rgba(148,163,184,0.18) 7px)",
                            }}
                            aria-hidden
                        />
                        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-white/90 via-transparent to-white/20" />

                        <div className="absolute inset-x-0 bottom-0 z-[1] flex justify-center">
                            <div className="relative w-[min(92%,17.5rem)]">
                                <div className="h-[4.25rem] rounded-[50%_50%_0_0] border-x border-t border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-100 shadow-[0_-10px_24px_rgba(15,23,42,0.08)]" />
                                <div className="absolute left-1/2 top-2.5 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-sm text-slate-600 shadow-sm">
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
                                <div
                                    className="flex h-11 w-11 flex-col items-center justify-center rounded-full border bg-white/90 text-center shadow-sm backdrop-blur-[6px] sm:h-12 sm:w-12"
                                    style={{ borderColor: theme.softBorder }}
                                >
                                    <span className="text-[7px] font-black uppercase tracking-wider text-slate-500">
                                        Lv
                                    </span>
                                    <span className="text-sm font-black tabular-nums leading-none text-slate-900 sm:text-base">
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
                                                    ? "fill-amber-300 text-amber-400 stroke-amber-600/60"
                                                    : "fill-slate-100 text-slate-200 stroke-slate-300"
                                            )}
                                            strokeWidth={1.5}
                                        />
                                    ))}
                                </div>
                                <div className="h-1.5 w-[min(58%,11rem)] overflow-hidden rounded-full border border-slate-200 bg-white shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${rankProgress.progress}%` }}
                                        transition={{ duration: 0.75, ease: "easeOut" }}
                                        className="h-full rounded-full"
                                        style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}
                                    />
                                </div>
                            </div>
                            <div
                                className="shrink-0 rounded-lg border bg-white/95 px-2 py-1 shadow-sm backdrop-blur-[6px]"
                                style={{ borderColor: theme.softBorder }}
                            >
                                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-600 sm:text-[10px]">
                                    <Sparkles className="h-3 w-3" style={{ color: theme.primary }} />
                                    TP {totalTp}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className="relative z-[4] -mt-7 mx-2.5 rounded-xl border bg-white px-2.5 py-2 shadow-[0_12px_20px_-14px_rgba(15,23,42,0.45)] sm:mx-3 sm:gap-3 sm:px-3 sm:py-2.5"
                        style={{ borderColor: cardFrameColor }}
                    >
                        <div className="flex items-center gap-2.5 sm:gap-3">
                            <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg shadow-sm sm:h-11 sm:w-11"
                                style={{ borderColor: theme.softBorder, backgroundColor: theme.soft, color: theme.deep }}
                                aria-hidden
                            >
                                <span className="drop-shadow-sm">{negamonTypeGlyph(monster.type)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
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

                    <div className="relative -mt-0.5 space-y-3 bg-white px-3 pb-4 pt-5 sm:space-y-4 sm:px-4 sm:pb-5 sm:pt-6">

                        <div className="relative z-[1] space-y-3 sm:space-y-4">
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative flex w-[88%] max-w-[16rem] justify-center">
                                    <div
                                        className="w-full rounded-lg border px-5 py-1.5 text-center"
                                        style={{ borderColor: theme.softBorder, backgroundColor: theme.soft }}
                                    >
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: theme.deep }}>
                                            {t("monsterCardCombatStatsRibbon")}
                                        </p>
                                    </div>
                                </div>
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 shadow-inner">
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-[10px] font-bold text-emerald-700">
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
                                            className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.35)]"
                                        >
                                            <div className="mb-1.5 flex items-center justify-between gap-1">
                                                <div className="flex min-w-0 items-center gap-1">
                                                    <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
                                                    <span className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
                                                        {t(labelKey)}
                                                    </span>
                                                </div>
                                                <span className="text-base font-black tabular-nums leading-none text-slate-900">
                                                    {val}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner">
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

                            <div
                                className="rounded-xl border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                                style={{ borderColor: theme.softBorder, backgroundColor: theme.soft }}
                            >
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Star className="h-3.5 w-3.5" style={{ color: theme.primary }} />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                                            {rankProgress.currentRank}
                                        </span>
                                    </div>
                                    {rankProgress.nextRank ? (
                                        <span className="text-[9px] font-bold text-slate-500">
                                            {t("monsterRankProgressMore", {
                                                points: rankProgress.pointsNeeded,
                                                rank: rankProgress.nextRank,
                                            })}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[9px] font-black text-slate-600">
                                            <Sparkles className="h-3 w-3" style={{ color: theme.primary }} />
                                            {t("monsterRankMax")}
                                        </span>
                                    )}
                                </div>
                                <div className="h-2 rounded-full border border-slate-200 bg-white p-0.5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${rankProgress.progress}%` }}
                                        transition={{ duration: 0.75, ease: "easeOut" }}
                                        className="h-full rounded-full"
                                        style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}
                                    />
                                </div>
                            </div>

                            {monster.ability ? (
                                <div
                                    className="rounded-xl border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                                    style={{ borderColor: theme.softBorder, backgroundColor: theme.soft }}
                                >
                                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest" style={{ color: theme.deep }}>
                                        <Sparkles className="h-3 w-3" style={{ color: theme.primary }} />
                                        {t("monsterAbilityHeading")}
                                    </p>
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg shrink-0 opacity-90">✨</span>
                                        <div>
                                            <p className="text-xs font-black" style={{ color: theme.deep }}>
                                                {monster.ability.name}
                                            </p>
                                            <p className="text-[10px] leading-snug" style={{ color: theme.deep }}>
                                                {monster.ability.desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {displayMoves.length > 0 ? (
                                <div>
                                    <p className="mb-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: theme.deep }}>
                                        <span
                                            className="h-px flex-1"
                                            style={{ backgroundImage: `linear-gradient(to right, transparent, ${theme.softBorder})` }}
                                        />
                                        <Swords className="h-3.5 w-3.5" style={{ color: theme.primary }} />
                                        {t("monsterMovesHeading")}
                                        <span
                                            className="h-px flex-1"
                                            style={{ backgroundImage: `linear-gradient(to left, transparent, ${theme.softBorder})` }}
                                        />
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
                                                    className="group relative flex h-[3.35rem] w-[3.35rem] shrink-0 items-center justify-center rounded-full border-2 shadow-[0_8px_16px_-10px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.95)] transition-transform hover:scale-[1.05] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80"
                                                    style={{
                                                        borderColor: theme.softBorder,
                                                        background: `linear-gradient(to bottom right, ${theme.soft}, #ffffff)`,
                                                        color: theme.deep,
                                                    }}
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
                                    <p className="mb-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
                                        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-300" />
                                        <Lock className="h-3.5 w-3.5" />
                                        {t("monsterLockedMovesHeading")}
                                        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-300" />
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
                                                    className="relative flex h-[3.35rem] w-[3.35rem] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-stone-300 bg-stone-100 text-stone-500 opacity-90 transition-transform hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                                                    aria-label={t("monsterMoveDetailAriaLabel", {
                                                        move: moveName,
                                                    })}
                                                >
                                                    <MoveCircleGlyph move={move} />
                                                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/50">
                                                        <Lock className="h-4 w-4 text-stone-600" />
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
            </MonsterCardBezel>

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
                                    tone="dark"
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
                                            {t("battleBadgeCrit")}
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
                                <NegamonMoveInlineDescription t={t} move={dialogMove} tone="dark" />
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
