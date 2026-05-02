"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getStudentRank } from "@/lib/classroom-utils";
import { getItemById } from "@/lib/shop-items";
import { useLanguage } from "@/components/providers/language-provider";
import { FrameCardChrome, FrameRing } from "@/components/ui/frame-visual";

type LevelConfigInput = Record<string, number> | Array<{ name: string; minScore: number }> | null | undefined;

interface StudentAvatarProps {
    id: string;
    name: string;
    avatarSeed: string;
    behaviorPoints: number;
    academicPoints?: number;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    className?: string;
    attendance?: string; // PRESENT, ABSENT, LATE, LEFT_EARLY
    levelConfig?: LevelConfigInput;
    equippedFrame?: string | null;
    isSelected?: boolean;
    isAttendanceMode?: boolean;
}

import { Check, Star, BookOpen, History } from "lucide-react";

export function StudentAvatar({
    id,
    name,
    avatarSeed,
    behaviorPoints,
    academicPoints = 0,
    onClick,
    onContextMenu,
    className,
    attendance = "PRESENT",
    levelConfig,
    equippedFrame = null,
    isSelected = false,
    isAttendanceMode = false
}: StudentAvatarProps) {
    const { t } = useLanguage();

    // Styles based on attendance
    const isAbsent = attendance === "ABSENT";
    const isLate = attendance === "LATE";
    const isLeftEarly = attendance === "LEFT_EARLY";

    const rank = getStudentRank(academicPoints, levelConfig);
    
    // Rank-specific premium colors
    const getRankStyle = (rankText: string) => {
        const r = rankText.toLowerCase();
        if (r.includes('mythic')) return "from-red-500 to-amber-600 text-white shadow-red-200";
        if (r.includes('legendary')) return "from-amber-400 to-orange-600 text-white shadow-orange-100";
        if (r.includes('epic')) return "from-purple-500 to-indigo-600 text-white shadow-purple-100";
        if (r.includes('rare')) return "from-blue-400 to-indigo-500 text-white shadow-blue-100";
        if (r.includes('uncommon')) return "from-emerald-400 to-teal-500 text-white shadow-emerald-100";
        return "from-slate-400 to-slate-500 text-white shadow-slate-100";
    };

    const rankStyle = getRankStyle(rank);
    const frameItem = equippedFrame ? getItemById(equippedFrame) : undefined;
    const framePreview = frameItem?.type === "frame" ? frameItem.preview : undefined;

    const cardInner = (
        <>
            {/* Top Right Score Badges (Side Stack) */}
            {!isAbsent && (
                <div className="absolute right-2 top-3 z-20 flex flex-col items-end gap-1.5 sm:right-3 sm:top-4">
                    <div className="flex items-center justify-center rounded-lg border border-white/20 bg-emerald-500 px-2.5 py-1 font-black text-white shadow-lg origin-right transition-transform hover:scale-110" title={t("tooltipBehaviorPointsBadge")}>
                        <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                        <span className="mb-0.5 text-xs leading-none">{behaviorPoints}</span>
                    </div>
                    <div className="delay-75 flex items-center justify-center rounded-lg border border-white/20 bg-blue-600 px-2.5 py-1 font-black text-white shadow-lg origin-right transition-transform hover:scale-110" title={t("tooltipAcademicPointsBadge")}>
                        <BookOpen className="w-3.5 h-3.5 mr-1 fill-current" />
                        <span className="mb-0.5 text-xs leading-none">{academicPoints}</span>
                    </div>
                </div>
            )}

            {/* History persistent button */}
            {onContextMenu && !isAttendanceMode && (
                <button
                    onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
                    className="absolute left-3 top-3 z-30 rounded-xl border-2 border-white bg-indigo-600 p-1.5 text-white shadow-lg transition-all hover:bg-indigo-700 active:scale-90"
                    title={t("tooltipOpenBehaviorHistory")}
                >
                    <History className="w-4 h-4" />
                </button>
            )}

            {/* Selected Checkmark */}
            {isSelected && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-xl z-30 animate-in zoom-in-50">
                    <Check className="w-6 h-6 stroke-[3px]" />
                </div>
            )}

            {/* Status Badge */}
            {attendance !== "PRESENT" && (
                <div className={cn(
                    "absolute top-4 left-4 text-[10px] font-black px-2.5 py-1 rounded-full border-2 border-white shadow-lg z-30 text-white uppercase tracking-tighter",
                    isAbsent && "bg-red-500",
                    isLate && "bg-yellow-500",
                    isLeftEarly && "bg-orange-500"
                )}>
                    {isAbsent ? t("absent") : isLate ? t("late") : isLeftEarly ? t("leftEarly") : attendance}
                </div>
            )}

            {/* Avatar — tier ring when a shop frame is equipped */}
            {framePreview ? (
                <FrameRing
                    preview={framePreview}
                    size="lg"
                    rounded="avatar"
                    className={cn(
                        "mb-4 shadow-inner transition-colors group-hover:bg-indigo-50/50",
                        isLate && "ring-4 ring-yellow-400 ring-offset-2",
                        isLeftEarly && "ring-4 ring-orange-400 ring-offset-2"
                    )}
                >
                    {isAbsent && <div className="absolute inset-0 z-10 rounded-[inherit] bg-red-500/10" />}
                    <Image
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed || id}`}
                        alt={name}
                        fill
                        sizes="(max-width: 640px) 96px, 112px"
                        unoptimized
                        className="object-contain p-3 drop-shadow-md transition-transform duration-500 group-hover:scale-110"
                    />
                </FrameRing>
            ) : (
                <div
                    className={cn(
                        "relative mb-4 h-24 w-24 overflow-hidden rounded-[1.75rem] border border-slate-100 bg-slate-50 p-3 shadow-inner transition-colors group-hover:bg-indigo-50/50 sm:h-28 sm:w-28",
                        isLate && "ring-4 ring-yellow-400 ring-offset-2",
                        isLeftEarly && "ring-4 ring-orange-400 ring-offset-2"
                    )}
                >
                    {isAbsent && <div className="absolute inset-0 z-10 bg-red-500/10" />}
                    <Image
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed || id}`}
                        alt={name}
                        fill
                        sizes="(max-width: 640px) 96px, 112px"
                        unoptimized
                        className="object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-110"
                    />
                </div>
            )}

            {/* Name Label & Rank */}
            <div className="flex flex-col items-center w-full">
                <div className={cn(
                    "mb-2 rounded-full border-2 border-white bg-gradient-to-br px-4 py-1 text-xs font-black uppercase tracking-wide shadow-md",
                    rankStyle
                )}>
                    {rank}
                </div>
                <div className="flex min-h-[44px] w-full items-center justify-center rounded-2xl border-2 border-white/10 bg-slate-800 px-4 py-2 text-center text-sm font-bold leading-snug tracking-tight text-white shadow-xl">
                    {name}
                </div>
            </div>
        </>
    );

    return (
        <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                "relative flex flex-col items-center justify-center rounded-[2rem] transition-all cursor-pointer group",
                !framePreview &&
                    "border border-slate-100 bg-white p-4 shadow-sm hover:border-indigo-100 hover:shadow-2xl sm:p-5",
                framePreview && "p-0 shadow-none",
                isAbsent && "opacity-60 grayscale bg-slate-50",
                isSelected && "bg-indigo-50 ring-4 ring-indigo-500/30 shadow-xl",
                className
            )}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            {framePreview ? (
                <FrameCardChrome
                    preview={framePreview}
                    outerClassName={cn(
                        "rounded-[2rem] flex w-full flex-col items-center justify-center",
                        isAbsent && "opacity-60 grayscale"
                    )}
                    innerRoundedClassName="rounded-[1.85rem]"
                    innerClassName="relative flex flex-col items-center justify-center p-4 sm:p-5"
                >
                    {cardInner}
                </FrameCardChrome>
            ) : (
                cardInner
            )}
        </motion.div>
    );
}
