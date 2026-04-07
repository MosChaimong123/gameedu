"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import {
    Camera, Zap, TrendingUp, TrendingDown, BookOpen, Shield,
    ShoppingBag, Flame, CalendarCheck,
} from "lucide-react";
import { AvatarPickerModal } from "./avatar-picker-modal";
import { ShopDialog } from "./ShopDialog";
import { type RankEntry, type LevelConfigInput, getNextRankProgress, formatAmount } from "@/lib/classroom-utils";
import { getItemById } from "@/lib/shop-items";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

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

export function StudentAvatarSection({
    studentId, classId, loginCode, initialAvatar, name, nickname,
    points, behaviorPoints, initialGold, goldRate,
    totalPositive, totalNegative, rankEntry,
    themeClass, themeStyle, levelConfig,
    initialInventory, initialEquippedFrame,
    initialStreak, lastCheckIn,
    mode = "learn",
    externalGold,
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
            const data = await res.json();
            if (data.alreadyDone) {
                setAlreadyCheckedIn(true);
            } else if (data.success) {
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

    if (mode === "game") {
        return (
            <div className="flex flex-col gap-3">
                {/* ── Profile card ── */}
                <div className="overflow-hidden rounded-[2rem] border-4 border-indigo-200 bg-white shadow-[0_6px_0_0_rgba(99,102,241,0.3)]">
                    {/* Avatar strip */}
                    <div className="relative flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-4">
                        <div className="group relative shrink-0">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="relative h-14 w-14 overflow-hidden rounded-2xl border-3 border-white bg-white/20 shadow-lg"
                                style={frameItem ? avatarBorderStyle : { borderColor: "white" }}
                            >
                                <Image
                                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar}&backgroundColor=transparent`}
                                    alt={name}
                                    width={56}
                                    height={56}
                                    className="relative z-10 p-1 drop-shadow-md"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPicker(true)}
                                    className="absolute inset-0 z-20 flex items-center justify-center bg-indigo-900/70 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100"
                                >
                                    <Camera className="h-4 w-4 text-white drop-shadow" />
                                </button>
                            </motion.div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-black text-white leading-tight">{name}</p>
                            {nickname && (
                                <p className="truncate text-xs font-bold text-indigo-200">&quot;{nickname}&quot;</p>
                            )}
                            <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-white" style={{ backgroundColor: rankEntry.color || "#10b981" }} />
                                <span className="text-[10px] font-black uppercase tracking-wide text-white">{rankEntry.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Gold + Streak HUD row */}
                    <div className="grid grid-cols-2 divide-x divide-slate-100">
                        {/* Gold */}
                        <div className="flex flex-col items-center gap-0.5 px-3 py-3">
                            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-2xl border-2 border-yellow-200 bg-yellow-50 text-xl shadow-sm">
                                🪙
                            </div>
                            <p className="text-lg font-black tabular-nums text-yellow-600">{gold.toLocaleString()}<span className="ml-0.5 text-xs font-bold text-yellow-500">G</span></p>
                            <p className="text-[10px] font-bold text-slate-400">+{goldRate}/hr</p>
                        </div>
                        {/* Streak */}
                        <div className="flex flex-col items-center gap-0.5 px-3 py-3">
                            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-2xl border-2 border-orange-200 bg-orange-50 text-xl shadow-sm">
                                {streak > 0 ? "🔥" : "💧"}
                            </div>
                            <p className="text-lg font-black tabular-nums text-orange-600">{streak}<span className="ml-0.5 text-xs font-bold text-orange-400">{t("studentStreakDayUnit")}</span></p>
                            {!alreadyCheckedIn ? (
                                <p className="text-[10px] font-bold text-emerald-500">+{nextStreakReward}G {t("studentCheckInPendingGold", { amount: "" }).replace(/\+?\d+G?\s*/, "")}</p>
                            ) : (
                                <p className="text-[10px] font-bold text-slate-400">{t("studentCheckInDone")}</p>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 border-t border-slate-100 px-3 py-3">
                        <button
                            type="button"
                            onClick={() => setShowShop(true)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-[1rem] border-b-4 border-yellow-600 bg-gradient-to-b from-yellow-400 to-yellow-500 px-3 py-2.5 text-xs font-black text-yellow-900 transition active:translate-y-0.5 active:border-b-2 hover:from-yellow-300 hover:to-yellow-400"
                        >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            {t("studentAvatarShop")}
                        </button>
                        {alreadyCheckedIn ? (
                            <div className="flex flex-1 items-center justify-center gap-1 rounded-[1rem] border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-500 px-3 py-2.5 text-xs font-black text-white opacity-70">
                                <CalendarCheck className="h-3.5 w-3.5" />
                                {t("studentCheckInDone")}
                            </div>
                        ) : (
                            <button
                                type="button"
                                disabled={checkingIn}
                                onClick={handleCheckIn}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-[1rem] border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-500 px-3 py-2.5 text-xs font-black text-white transition active:translate-y-0.5 active:border-b-2 hover:from-emerald-300 hover:to-emerald-400 disabled:opacity-60"
                            >
                                <CalendarCheck className="h-3.5 w-3.5" />
                                {t("studentCheckInCta")}
                            </button>
                        )}
                    </div>

                    {/* Flash toasts */}
                    {checkInFlash !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mx-3 mb-3 rounded-2xl border-2 border-yellow-300 bg-yellow-50 px-3 py-2 text-center text-sm font-black text-yellow-700"
                        >
                            🪙 {t("studentCheckInGoldToast", { amount: String(checkInFlash) })}
                        </motion.div>
                    )}
                    {passiveGoldFlash !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mx-3 mb-3 rounded-2xl border-2 border-violet-200 bg-violet-50 px-3 py-2 text-center text-sm font-black text-violet-700"
                        >
                            ✨ {t("studentPassiveGoldToast", { amount: passiveGoldFlash.toLocaleString() })}
                        </motion.div>
                    )}
                </div>

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
                            <div
                                className="absolute -inset-3 rounded-full border-2 border-dashed"
                                style={{ borderColor: `${rankEntry.color || "#6366f1"}55` }}
                            />
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
                        <section className="rounded-2xl border border-indigo-200/80 bg-indigo-50/80 p-4 sm:p-5" aria-label={t("avatarAcademicSectionAria")}>
                            <div className="mb-4 flex items-center gap-2 border-b border-indigo-200/50 pb-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                                    <BookOpen className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 text-left">
                                    <h2 className="text-sm font-black text-indigo-900">{t("avatarAcademicTitle")}</h2>
                                    <p className="text-xs font-medium leading-snug text-indigo-700/80">{t("avatarAcademicSubtitle")}</p>
                                </div>
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
                        <section className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 sm:p-5" aria-label={t("avatarBehaviorSectionAria")}>
                            <div className="mb-4 flex items-center gap-2 border-b border-amber-200/50 pb-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm">
                                    <Zap className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 text-left">
                                    <h2 className="text-sm font-black text-amber-950">{t("avatarBehaviorTitle")}</h2>
                                    <p className="text-xs font-medium leading-snug text-amber-900/75">{t("avatarBehaviorSubtitle")}</p>
                                </div>
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
