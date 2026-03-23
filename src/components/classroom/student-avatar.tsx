"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getStudentRank } from "@/lib/classroom-utils";
import { useLanguage } from "@/components/providers/language-provider";

interface StudentAvatarProps {
    id: string;
    name: string;
    avatarSeed: string;
    points: number;
    behaviorPoints?: number;
    academicPoints?: number;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    className?: string;
    attendance?: string; // PRESENT, ABSENT, LATE, LEFT_EARLY
    levelConfig?: any;
    isSelected?: boolean;
    isAttendanceMode?: boolean;
}

import { Check, Star, BookOpen, History } from "lucide-react";

export function StudentAvatar({
    id,
    name,
    avatarSeed,
    points,
    behaviorPoints = 0,
    academicPoints = 0,
    onClick,
    onContextMenu,
    className,
    attendance = "PRESENT",
    levelConfig,
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

    return (
        <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                "flex flex-col items-center justify-center p-4 cursor-pointer relative transition-all rounded-[2.5rem] bg-white border border-slate-100 group hover:shadow-2xl hover:border-indigo-100 shadow-sm",
                isAbsent && "opacity-60 grayscale bg-slate-50",
                isSelected && "bg-indigo-50 ring-4 ring-indigo-500/30 shadow-xl",
                className
            )}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            {/* Top Right Score Badges (Side Stack) */}
            {!isAbsent && (
                <div className="absolute top-4 right-2 flex flex-col gap-1.5 z-20 items-end">
                    <div className="bg-emerald-500 text-white font-black px-2.5 py-1 rounded-lg flex items-center justify-center border border-white/20 shadow-lg transition-transform hover:scale-110 origin-right" title="พฤติกรรม">
                        <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                        <span className="text-[10px] leading-none mb-0.5">{behaviorPoints}</span>
                    </div>
                    <div className="bg-blue-600 text-white font-black px-2.5 py-1 rounded-lg flex items-center justify-center border border-white/20 shadow-lg transition-transform hover:scale-110 origin-right delay-75" title="คะแนนเก็บ">
                        <BookOpen className="w-3.5 h-3.5 mr-1 fill-current" />
                        <span className="text-[10px] leading-none mb-0.5">{academicPoints}</span>
                    </div>
                </div>
            )}

            {/* History persistent button */}
            {onContextMenu && !isAttendanceMode && (
                <button
                    onClick={(e) => { e.stopPropagation(); onContextMenu(e as any); }}
                    className="absolute top-3 left-3 bg-indigo-600 text-white rounded-xl p-1.5 shadow-lg border-2 border-white z-30 hover:bg-indigo-700 transition-all active:scale-90"
                    title="ดูประวัติคะแนน"
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

            {/* Avatar Image using DiceBear (Bottts or Monsters) */}
            <div className={cn(
                "w-28 h-28 bg-slate-50 rounded-[2rem] p-3 mb-4 shadow-inner border border-slate-100 overflow-hidden relative group-hover:bg-indigo-50/50 transition-colors",
                isLate && "ring-4 ring-yellow-400 ring-offset-2",
                isLeftEarly && "ring-4 ring-orange-400 ring-offset-2"
            )}>
                {isAbsent && <div className="absolute inset-0 bg-red-500/10 z-10" />}
                <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed || id}`}
                    alt={name}
                    className="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500"
                />
            </div>

            {/* Name Label & Rank */}
            <div className="flex flex-col items-center w-full">
                <div className={cn(
                    "text-[10px] uppercase font-black px-4 py-1 rounded-full mb-2 border-2 border-white shadow-md bg-gradient-to-br tracking-wider",
                    rankStyle
                )}>
                    {rank}
                </div>
                <div className="bg-slate-800 text-white px-4 py-2 rounded-2xl border-2 border-white/10 shadow-xl text-xs font-bold w-full leading-tight text-center tracking-tight min-h-[40px] flex items-center justify-center">
                    {name}
                </div>
            </div>
        </motion.div>
    );
}
