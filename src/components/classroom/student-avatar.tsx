"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Star, BookOpen, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import {
    attendanceAvatarContentDimClass,
    attendanceAvatarRingClass,
    attendanceBadgeClass,
    attendanceCardShellClass,
    attendanceDimmed,
    attendanceLabelKey,
    attendanceOverlayClass,
    normalizeAttendanceStatus,
} from "@/lib/attendance-status";

interface StudentAvatarProps {
    id: string;
    name: string;
    avatarSeed: string;
    behaviorPoints: number;
    academicPoints?: number;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    className?: string;
    attendance?: string;
    isSelected?: boolean;
    isAttendanceMode?: boolean;
    isOnline?: boolean;
}

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
    isSelected = false,
    isAttendanceMode = false,
    isOnline = false,
}: StudentAvatarProps) {
    const { t } = useLanguage();

    const attendanceStatus = normalizeAttendanceStatus(attendance);
    const dimmed = attendanceDimmed(attendanceStatus);
    const ringClass = attendanceAvatarRingClass(attendanceStatus);
    const shellBorderClass = attendanceCardShellClass(attendanceStatus);
    const avatarDimClass = attendanceAvatarContentDimClass(attendanceStatus);
    const overlayClass = attendanceOverlayClass(attendanceStatus);

    const cardInner = (
        <>
            {!dimmed && (
                <div className="absolute right-2 top-3 z-20 flex flex-col items-end gap-1.5 sm:right-3 sm:top-4">
                    <div
                        className="flex items-center justify-center rounded-lg border border-white/20 bg-emerald-500 px-2.5 py-1 font-black text-white shadow-lg origin-right transition-transform hover:scale-110"
                        title={t("tooltipBehaviorPointsBadge")}
                    >
                        <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                        <span className="mb-0.5 text-xs leading-none">{behaviorPoints}</span>
                    </div>
                    <div
                        className="delay-75 flex items-center justify-center rounded-lg border border-white/20 bg-blue-600 px-2.5 py-1 font-black text-white shadow-lg origin-right transition-transform hover:scale-110"
                        title={t("tooltipAcademicPointsBadge")}
                    >
                        <BookOpen className="w-3.5 h-3.5 mr-1 fill-current" />
                        <span className="mb-0.5 text-xs leading-none">{academicPoints.toFixed(2)}</span>
                    </div>
                </div>
            )}

            {onContextMenu && !isAttendanceMode && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(e);
                    }}
                    className="absolute left-3 top-3 z-30 rounded-xl border-2 border-white bg-indigo-600 p-1.5 text-white shadow-lg transition-all hover:bg-indigo-700 active:scale-90"
                    title={t("tooltipOpenBehaviorHistory")}
                >
                    <History className="w-4 h-4" />
                </button>
            )}

            {isSelected && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-xl z-30 animate-in zoom-in-50">
                    <Check className="w-6 h-6 stroke-[3px]" />
                </div>
            )}

            {attendanceStatus !== "PRESENT" && (
                <div
                    className={cn(
                        "absolute top-4 left-4 text-[10px] font-black px-2.5 py-1 rounded-full border-2 border-white shadow-lg z-30 text-white uppercase tracking-tighter",
                        attendanceBadgeClass(attendanceStatus)
                    )}
                >
                    {t(attendanceLabelKey(attendanceStatus))}
                </div>
            )}

            <div className="relative mb-4">
                <div
                    className={cn(
                        "relative h-24 w-24 overflow-hidden rounded-[1.75rem] border border-slate-100 bg-slate-50 p-3 shadow-inner transition-colors group-hover:bg-indigo-50/50 sm:h-28 sm:w-28",
                        ringClass,
                        avatarDimClass
                    )}
                >
                    {overlayClass && <div className={cn("absolute inset-0 z-10", overlayClass)} />}
                    <Image
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed || id}`}
                        alt={name}
                        fill
                        sizes="(max-width: 640px) 96px, 112px"
                        unoptimized
                        className="object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-110"
                    />
                </div>
                <span
                    className={cn(
                        "absolute bottom-1 right-1 z-40 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm",
                        isOnline ? "bg-emerald-500" : "bg-slate-300"
                    )}
                    title={isOnline ? t("classroomStudentOnlineStatus") : t("classroomStudentOfflineStatus")}
                />
            </div>

            <div className="flex flex-col items-center w-full">
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
                "bg-white p-4 shadow-sm hover:shadow-2xl sm:p-5",
                attendanceStatus === "PRESENT" ? "hover:border-indigo-100" : shellBorderClass,
                dimmed && "bg-slate-50/80",
                isSelected && "bg-indigo-50 ring-4 ring-indigo-500/30 shadow-xl",
                className
            )}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            {cardInner}
        </motion.div>
    );
}
