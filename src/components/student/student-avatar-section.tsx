"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import {
    Camera, Zap, TrendingUp, TrendingDown, BookOpen,
    ShoppingBag, CalendarCheck,
} from "lucide-react";
import { AvatarPickerModal } from "./avatar-picker-modal";
import { ShopDialog } from "./ShopDialog";
import { type RankEntry, type LevelConfigInput, getNextRankProgress, formatAmount } from "@/lib/classroom-utils";
import { getItemById, type FramePreview } from "@/lib/shop-items";
import { FrameCardChrome, FrameRing } from "@/components/ui/frame-visual";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";

interface StudentAvatarSectionProps {
    studentId: string;
    classId: string;
    loginCode: string;
    initialAvatar: string;
    name: string;
    nickname?: string | null;
    points: number;
    behaviorPoints: number;
    initialGold: number;
    goldRate: number;
    totalPositive?: number;
    totalNegative?: number;
    rankEntry: RankEntry;
    themeClass: string;
    themeStyle: React.CSSProperties;
    levelConfig?: LevelConfigInput;
    // Shop
    initialInventory: string[];
    initialEquippedFrame: string | null;
    // Check-in
    initialStreak: number;
    lastCheckIn: string | null;
    // Mode
    mode?: "learn" | "game";
    // External gold override (e.g. from quest claims)
    externalGold?: number;
    /** โหมดเกม: แสดงมอน Negamon แทนอวาตาร์ DiceBear */
    gameProfileMonster?: { icon: string; color: string; formName: string } | null;
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function streakReward(streak: number): number {
    if (streak >= 7) return 20;
    if (streak >= 2) return 10;
    return 5;
}

function GameProfileCardBezel({
    preview,
    fallbackStyle,
    children,
}: {
    preview?: FramePreview;
    fallbackStyle: React.CSSProperties;
    children: React.ReactNode;
}) {
    if (preview) {
        return (
            <FrameCardChrome
                preview={preview}
                outerClassName="overflow-hidden rounded-[24px] shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]"
                innerRoundedClassName="rounded-[22px]"
                innerClassName="overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/80"
            >
                {children}
            </FrameCardChrome>
        );
    }
    return (
        <div
            className="overflow-hidden rounded-[24px] bg-gradient-to-b from-white via-white to-slate-50/80 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]"
            style={fallbackStyle}
        >
            {children}
        </div>
    );
}

export function StudentAvatarSection({
    studentId, classId, loginCode, initialAvatar, name, nickname,
    points, behaviorPoints, initialGold, goldRate,
    totalPositive, totalNegative, rankEntry,
    themeClass, themeStyle, levelConfig,
    initialInventory, initialEquippedFrame,
    initialStreak, lastCheckIn,
    mode = "learn",
    externalGold,
    gameProfileMonster,
}: StudentAvatarSectionProps) {
    const { t } = useLanguage();
    const [avatar, setAvatar] = useState(initialAvatar);
    const [showPicker, setShowPicker] = useState(false);
    const [showShop, setShowShop] = useState(false);

    // Gold state (shared: shop deducts, check-in adds)
    const [gold, setGold] = useState(initialGold);

    // Sync external gold updates (e.g. quest claims from sibling components)
    useEffect(() => {
        if (externalGold !== undefined) setGold(externalGold);
    }, [externalGold]);

    // Shop state
    const [inventory, setInventory] = useState<string[]>(initialInventory);
    const [equippedFrame, setEquippedFrame] = useState<string | null>(initialEquippedFrame);

    useEffect(() => {
        setInventory(initialInventory);
    }, [initialInventory]);

    useEffect(() => {
        setEquippedFrame(initialEquippedFrame);
    }, [initialEquippedFrame]);

    // Check-in state
    const [streak, setStreak] = useState(initialStreak);
    const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(() => {
        if (!lastCheckIn) return false;
        return isSameDay(new Date(lastCheckIn), new Date());
    });
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkInFlash, setCheckInFlash] = useState<number | null>(null); // gold earned
    const [passiveGoldFlash, setPassiveGoldFlash] = useState<number | null>(null);
    const passiveClaimRequested = useRef(false);

    const rankProgress = getNextRankProgress(points, levelConfig);

    useEffect(() => {
        if (mode !== "game" || goldRate <= 0 || passiveClaimRequested.current) return;

        passiveClaimRequested.current = true;
        let cancelled = false;

        void fetch(`/api/student/${loginCode}/claim-passive-gold`, { method: "POST" })
            .then(async (res) => {
                if (!res.ok) return null;
                return res.json() as Promise<{
                    ok: boolean;
                    alreadyClaimed: boolean;
                    goldEarned: number;
                    newGold: number;
                }>;
            })
            .then((data) => {
                if (cancelled || !data?.ok) return;
                setGold(data.newGold);
                if (!data.alreadyClaimed && data.goldEarned > 0) {
                    setPassiveGoldFlash(data.goldEarned);
                    window.setTimeout(() => setPassiveGoldFlash(null), 2500);
                }
            })
            .catch(() => {
                // Non-blocking enhancement: keep using server-rendered gold if claim fails.
            });

        return () => {
            cancelled = true;
        };
    }, [goldRate, loginCode, mode]);

    // Frame styling
    const frameItem = useMemo(() => equippedFrame ? getItemById(equippedFrame) : null, [equippedFrame]);
    const avatarBorderStyle: React.CSSProperties = frameItem
        ? {
            borderColor: frameItem.preview?.borderColor,
            boxShadow: frameItem.preview?.shadow,
        }
        : {};

    async function handleCheckIn() {
        if (checkingIn || alreadyCheckedIn) return;
        setCheckingIn(true);
        try {
            const res = await fetch(`/api/student/${loginCode}/checkin`, { method: "POST" });
            type CheckInResponse = {
                alreadyDone?: boolean;
                success?: boolean;
                streak?: number;
                newGold?: number;
                goldEarned?: number;
                error?: { message?: string };
            };
            let data: CheckInResponse | null = null;
            try {
                data = (await res.json()) as CheckInResponse;
            } catch {
                data = null;
            }
            if (!res.ok || !data) {
                return;
            }
            if (data.alreadyDone) {
                setAlreadyCheckedIn(true);
            } else if (
                data.success &&
                typeof data.streak === "number" &&
                typeof data.newGold === "number" &&
                typeof data.goldEarned === "number"
            ) {
                setAlreadyCheckedIn(true);
                setStreak(data.streak);
                setGold(data.newGold);
                setCheckInFlash(data.goldEarned);
                setTimeout(() => setCheckInFlash(null), 2500);
            }
        } finally {
            setCheckingIn(false);
        }
    }

    const nextStreakReward = streakReward(streak + 1);

    /** กรอบการ์ดโหมดเกม = กรอบที่สวมจากร้านค้า (ไม่สวม = ม่วงเริ่มต้น) */
    const gameCardFrameStyle = useMemo((): React.CSSProperties => {
        const preview = frameItem?.preview;
        const defaultBorder = "#a855f7";
        const defaultShadow =
            "0 4px 6px -1px rgba(168, 85, 247, 0.18), 0 2px 4px -2px rgba(168, 85, 247, 0.12)";
        return {
            borderWidth: 3,
            borderStyle: "solid",
            borderColor: preview?.borderColor ?? defaultBorder,
            boxShadow: preview?.shadow ?? defaultShadow,
        };
    }, [frameItem]);
    const gameFramePreview = frameItem?.type === "frame" ? frameItem.preview : undefined;

    if (mode === "game") {
        return (
            <div className="flex flex-col gap-3">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className={cn(gameFramePreview ? "rounded-[24px]" : undefined)}
                    style={gameFramePreview ? undefined : gameCardFrameStyle}
                >
                    <GameProfileCardBezel preview={gameFramePreview} fallbackStyle={gameCardFrameStyle}>
                    {/* รูปเต็มความกว้างการ์ด — กรอบนอกตามกรอบที่เลือกในร้าน */}
                    <div className="relative aspect-square max-h-[min(92vw,22rem)] w-full overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),rgba(241,245,249,0.85)_40%,rgba(226,232,240,0.9)_100%)]">
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.995 }}
                            className="group absolute inset-0 flex items-center justify-center overflow-hidden bg-white/70"
                        >
                            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-black/10 to-transparent" />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black/15 to-transparent" />
                            {gameProfileMonster ? (
                                <NegamonFormIcon
                                    icon={gameProfileMonster.icon}
                                    label={gameProfileMonster.formName}
                                    className="absolute inset-0 flex h-full w-full items-center justify-center"
                                    emojiClassName="text-[clamp(3.25rem,28vw,6.5rem)] leading-none"
                                    width={512}
                                    height={512}
                                    imageClassName="h-full w-full object-cover"
                                />
                            ) : (
                                <>
                                    <Image
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar}&backgroundColor=transparent`}
                                        alt={name}
                                        width={320}
                                        height={320}
                                        className="h-full w-full object-contain"
                                        priority={false}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPicker(true)}
                                        className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100"
                                    >
                                        <Camera className="h-6 w-6 text-white" strokeWidth={2.25} />
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </div>

                    <div className="space-y-3.5 px-3 pb-3.5 pt-3.5 sm:px-4 sm:pb-4">
                        <div className="w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white/90 px-2.5 py-3 shadow-sm backdrop-blur text-center">
                            <h2 className="truncate px-1 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                                {name}
                                {nickname ? (
                                    <span className="font-semibold text-slate-500">
                                        {" "}
                                        &middot; &quot;{nickname}&quot;
                                    </span>
                                ) : null}
                            </h2>
                            <div className="mt-2 flex w-full justify-center px-1">
                                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3.5 py-2 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.7)]">
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full ring-2 ring-slate-200"
                                        style={{ backgroundColor: rankEntry.color || "#34d399" }}
                                    />
                                    <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-800 sm:text-sm">
                                        {rankEntry.name}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-amber-100/80 bg-gradient-to-b from-amber-50/90 to-white px-2 py-3 text-center shadow-sm sm:py-3.5">
                                <span className="text-xl leading-none" aria-hidden>
                                    🪙
                                </span>
                                <p className="text-base font-bold tabular-nums text-amber-700 sm:text-lg">
                                    {gold.toLocaleString()}
                                    <span className="ml-0.5 text-xs font-semibold text-amber-600/90">G</span>
                                </p>
                                <p className="text-[10px] font-medium text-slate-500">+{goldRate}/hr</p>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-orange-100/80 bg-gradient-to-b from-orange-50/85 to-white px-2 py-3 text-center shadow-sm sm:py-3.5">
                                <span className="text-xl leading-none" aria-hidden>
                                    {streak > 0 ? "🔥" : "💧"}
                                </span>
                                <p className="text-base font-bold tabular-nums text-orange-700 sm:text-lg">
                                    {streak}
                                    <span className="ml-0.5 text-xs font-semibold text-orange-600/90">
                                        {t("studentStreakDayUnit")}
                                    </span>
                                </p>
                                {!alreadyCheckedIn ? (
                                    <p className="line-clamp-2 text-[10px] font-medium leading-tight text-emerald-600">
                                        +{nextStreakReward}G{" "}
                                        {t("studentCheckInPendingGold", { amount: "" }).replace(/\+?\d+G?\s*/, "")}
                                    </p>
                                ) : (
                                    <p className="text-[10px] font-medium text-slate-500">{t("studentCheckInDone")}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2.5 sm:gap-3">
                            <button
                                type="button"
                                onClick={() => setShowShop(true)}
                                className="flex flex-1 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50 via-amber-50 to-amber-100/90 px-3 py-2.5 text-xs font-semibold text-amber-950 shadow-sm transition hover:border-amber-300 hover:shadow-md active:scale-[0.98] sm:text-sm"
                            >
                                <ShoppingBag className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2.25} />
                                {t("studentAvatarShop")}
                            </button>
                            {alreadyCheckedIn ? (
                                <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-2.5 text-xs font-semibold text-emerald-800 opacity-90 sm:text-sm">
                                    <CalendarCheck className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                                    {t("studentCheckInDone")}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    disabled={checkingIn}
                                    onClick={handleCheckIn}
                                    className="flex flex-1 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60 sm:text-sm"
                                >
                                    <CalendarCheck className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                                    {t("studentCheckInCta")}
                                </button>
                            )}
                        </div>

                        {checkInFlash !== null && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2.5 text-center text-sm font-semibold text-amber-900"
                            >
                                🪙 {t("studentCheckInGoldToast", { amount: String(checkInFlash) })}
                            </motion.div>
                        )}
                        {passiveGoldFlash !== null && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-violet-200 bg-violet-50/95 px-3 py-2.5 text-center text-sm font-semibold text-violet-900"
                            >
                                ✨ {t("studentPassiveGoldToast", { amount: passiveGoldFlash.toLocaleString() })}
                            </motion.div>
                        )}
                    </div>
                    </GameProfileCardBezel>
                </motion.div>

                {/* Modals */}
                <AvatarPickerModal
                    open={showPicker}
                    onOpenChange={setShowPicker}
                    classId={classId}
                    studentId={studentId}
                    loginCode={loginCode}
                    currentAvatar={avatar}
                    onSaved={setAvatar}
                />
                <ShopDialog
                    open={showShop}
                    onOpenChange={setShowShop}
                    loginCode={loginCode}
                    gold={gold}
                    inventory={inventory}
                    equippedFrame={equippedFrame}
                    onBuy={(itemId, newGold, newInventory) => {
                        setGold(newGold);
                        setInventory(newInventory);
                    }}
                    onEquip={(itemId) => setEquippedFrame(itemId)}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* ── Main card ── */}
            <GlassCard className="overflow-hidden border-0 shadow-xl bg-white/50 backdrop-blur-xl" hover={false}>
                {/* Avatar header */}
                <div className="relative px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10">
                    <div
                        className={cn("pointer-events-none absolute inset-0 -z-10", themeClass || "bg-slate-900")}
                        style={themeStyle}
                    />
                    <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_55%)]" />

                    <div className="relative z-10 mx-auto flex w-full max-w-[260px] flex-col items-center gap-5">
                        <div className="group relative">
                            {/* Rank halo — เมื่อสวมกรอบร้านค้าให้โชว์ DNA ของ tier แทนเส้นประที่ทับกรอบ */}
                            {!(frameItem?.type === "frame" && frameItem.preview) ? (
                                <div
                                    className="absolute -inset-3 rounded-full border-2 border-dashed"
                                    style={{ borderColor: `${rankEntry.color || "#6366f1"}55` }}
                                    aria-hidden
                                />
                            ) : null}
                            {frameItem?.type === "frame" && frameItem.preview ? (
                                <motion.div whileHover={{ scale: 1.03 }} className="relative z-10">
                                    <FrameRing
                                        preview={frameItem.preview}
                                        size="xl"
                                        rounded="full"
                                        className="shadow-lg ring-2 ring-white/25 drop-shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
                                    >
                                        <div className="pointer-events-none absolute inset-0 z-0 rounded-full bg-gradient-to-tr from-slate-50 via-white to-blue-50/40" />
                                        <Image
                                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar}&backgroundColor=transparent`}
                                            alt={name}
                                            fill
                                            sizes="144px"
                                            className="relative z-10 object-contain p-3 drop-shadow-md"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPicker(true)}
                                            className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-indigo-600/75 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100"
                                        >
                                            <Camera className="h-9 w-9 text-white drop-shadow" />
                                        </button>
                                    </FrameRing>
                                </motion.div>
                            ) : (
                                <motion.div
                                    whileHover={{ scale: 1.03 }}
                                    className="relative z-10 h-[132px] w-[132px] overflow-hidden rounded-full border-4 bg-white shadow-lg sm:h-[144px] sm:w-[144px]"
                                    style={frameItem ? avatarBorderStyle : { borderColor: "white" }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 via-white to-blue-50/40" />
                                    <Image
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar}&backgroundColor=transparent`}
                                        alt={name}
                                        width={144}
                                        height={144}
                                        className="relative z-10 p-3 drop-shadow-md"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPicker(true)}
                                        className="absolute inset-0 z-20 flex items-center justify-center bg-indigo-600/75 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100"
                                    >
                                        <Camera className="h-9 w-9 text-white drop-shadow" />
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Rank badge */}
                        <div className="flex w-full max-w-[280px] flex-col items-center gap-1 rounded-2xl border border-white/90 bg-white/95 px-4 py-2.5 text-center shadow-md">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("avatarCurrentRankLabel")}</p>
                            <div className="flex items-center justify-center gap-2">
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: rankEntry.color || "#10b981", boxShadow: `0 0 10px ${rankEntry.color || "#10b981"}99` }}
                                />
                                <span className="text-sm font-black uppercase tracking-tight text-slate-900">{rankEntry.name}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats body */}
                <div className="space-y-5 border-t border-slate-100/80 bg-gradient-to-b from-slate-50/90 to-white px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8">
                    <header className="text-center">
                        <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl">{name}</h1>
                        {nickname ? (
                            <p className="mt-2 inline-block max-w-full rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1 text-sm font-bold text-indigo-700">
                                &quot;{nickname}&quot;
                            </p>
                        ) : null}
                    </header>

                    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
                        {/* Academic points — Learn mode only */}
                        {mode === "learn" && (
                        <section
                            className="rounded-[22px] border border-indigo-200/80 bg-indigo-50/80 p-4 sm:p-5"
                            aria-label={t("avatarAcademicSectionAria")}
                        >
                            <div className="mb-4 border-b border-indigo-200/50 pb-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                                        <BookOpen className="h-4 w-4" />
                                    </span>
                                    <h2 className="min-w-0 text-sm font-black leading-tight text-indigo-900">{t("avatarAcademicTitle")}</h2>
                                </div>
                                <p
                                    className={cn(
                                        "mt-1.5 w-full text-left text-[11px] font-medium leading-tight tracking-tight text-indigo-700/85 sm:ml-12 sm:mt-2 sm:text-xs",
                                        "whitespace-nowrap overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                    )}
                                >
                                    {t("avatarAcademicSubtitle")}
                                </p>
                            </div>
                            {rankProgress.nextRank ? (
                                <p className="mb-3 text-sm leading-relaxed text-slate-700">
                                    {t("avatarRankProgressLine", {
                                        points: rankProgress.pointsNeeded,
                                        rank: rankProgress.nextRank,
                                    })}
                                </p>
                            ) : (
                                <p className="mb-3 text-sm font-bold text-amber-800">{t("avatarRankMaxed")}</p>
                            )}
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${rankProgress.nextRank ? rankProgress.progress : 100}%` }}
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                />
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold tabular-nums text-slate-600">
                                <span className="text-indigo-700">{t("avatarPointsWithUnit", { amount: formatAmount(points) })}</span>
                                {rankProgress.nextRank ? (
                                    <span className="text-slate-500">
                                        {t("avatarNextTarget", { amount: formatAmount(points + rankProgress.pointsNeeded) })}
                                    </span>
                                ) : null}
                            </div>
                        </section>
                        )}

                        {/* Behavior points — Learn mode only */}
                        {mode === "learn" && (
                        <section
                            className="rounded-[22px] border border-amber-200/80 bg-amber-50/80 p-4 sm:p-5"
                            aria-label={t("avatarBehaviorSectionAria")}
                        >
                            <div className="mb-4 border-b border-amber-200/50 pb-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                                        <Zap className="h-4 w-4" />
                                    </span>
                                    <h2 className="min-w-0 text-sm font-black leading-tight text-amber-950">{t("avatarBehaviorTitle")}</h2>
                                </div>
                                <p
                                    className={cn(
                                        "mt-1.5 w-full text-left text-[11px] font-medium leading-tight tracking-tight text-amber-900/80 sm:ml-12 sm:mt-2 sm:text-xs",
                                        "whitespace-nowrap overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                    )}
                                >
                                    {t("avatarBehaviorSubtitle")}
                                </p>
                            </div>
                            <p className="text-3xl font-black tabular-nums text-amber-900 sm:text-4xl">
                                {formatAmount(behaviorPoints)}
                                <span className="ml-1.5 text-base font-bold text-amber-600 sm:text-lg">{t("avatarBehaviorPtsUnit")}</span>
                            </p>
                            {(totalPositive ?? 0) > 0 || (totalNegative ?? 0) > 0 ? (
                                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-100 bg-white/70 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                                        <TrendingUp className="h-4 w-4 shrink-0" />
                                        {t("avatarBehaviorTotalPositive", { amount: formatAmount(totalPositive ?? 0) })}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600">
                                        <TrendingDown className="h-4 w-4 shrink-0" />
                                        {t("avatarBehaviorTotalNegative", { amount: formatAmount(totalNegative ?? 0) })}
                                    </span>
                                </div>
                            ) : (
                                <p className="mt-3 text-xs leading-relaxed text-amber-900/65">{t("avatarBehaviorNoHistory")}</p>
                            )}
                        </section>
                        )}

                    </div>
                </div>
            </GlassCard>

            {/* Modals */}
            <AvatarPickerModal
                open={showPicker}
                onOpenChange={setShowPicker}
                classId={classId}
                studentId={studentId}
                loginCode={loginCode}
                currentAvatar={avatar}
                onSaved={setAvatar}
            />
            <ShopDialog
                open={showShop}
                onOpenChange={setShowShop}
                loginCode={loginCode}
                gold={gold}
                inventory={inventory}
                equippedFrame={equippedFrame}
                onBuy={(itemId, newGold, newInventory) => {
                    setGold(newGold);
                    setInventory(newInventory);
                }}
                onEquip={(itemId) => setEquippedFrame(itemId)}
            />
        </div>
    );
}
