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
    className?: string;
    attendance?: string; // PRESENT, ABSENT, LATE, LEFT_EARLY
    levelConfig?: any;
    isSelected?: boolean;
}

import { Check, Star, BookOpen } from "lucide-react";

export function StudentAvatar({
    id,
    name,
    avatarSeed,
    points,
    behaviorPoints = 0,
    academicPoints = 0,
    onClick,
    className,
    attendance = "PRESENT",
    levelConfig,
    isSelected = false
}: StudentAvatarProps) {
    const { t } = useLanguage();

    // Styles based on attendance
    const isAbsent = attendance === "ABSENT";
    const isLate = attendance === "LATE";
    const isLeftEarly = attendance === "LEFT_EARLY";

    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                "flex flex-col items-center justify-center p-4 cursor-pointer relative transition-all rounded-3xl",
                isAbsent && "opacity-50 grayscale",
                isSelected && "bg-indigo-50/80 ring-2 ring-indigo-500 shadow-md",
                className
            )}
            onClick={onClick}
        >
            {/* Point Bubbles (Hide if absent?) */}
            {!isAbsent && !isSelected && (
                <div className="absolute -top-1 -right-1 flex flex-col gap-1 z-10">
                    <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center border-2 border-white shadow-md" title="คะแนนพฤติกรรม (Behavior)">
                        <Star className="w-3 h-3 mr-0.5 fill-current" />
                        {behaviorPoints}
                    </div>
                    <div className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center border-2 border-white shadow-md" title="คะแนนเก็บ (Academic)">
                        <BookOpen className="w-3 h-3 mr-0.5 fill-current" />
                        {academicPoints}
                    </div>
                </div>
            )}

            {/* Selected Checkmark */}
            {isSelected && (
                <div className="absolute top-2 right-2 bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md z-10 animate-in zoom-in-50">
                    <Check className="w-5 h-5" />
                </div>
            )}

            {/* Status Badge */}
            {attendance !== "PRESENT" && (
                <div className={cn(
                    "absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white shadow-sm z-20 text-white",
                    isAbsent && "bg-red-500",
                    isLate && "bg-yellow-500",
                    isLeftEarly && "bg-orange-400"
                )}>
                    {isAbsent ? t("absent") : isLate ? t("late") : isLeftEarly ? t("leftEarly") : attendance}
                </div>
            )}

            {/* Avatar Image using DiceBear (Bottts or Monsters) */}
            <div className={cn(
                "w-24 h-24 bg-slate-100 rounded-2xl p-2 mb-2 shadow-sm border border-slate-200 overflow-hidden relative",
                isLate && "border-4 border-yellow-400",
                isLeftEarly && "border-4 border-orange-400"
            )}>
                {isAbsent && <div className="absolute inset-0 bg-red-500/10 z-10" />}
                <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed || id}`}
                    alt={name}
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Name Label & Rank */}
            <div className="flex flex-col items-center mt-1">
                <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full mb-1 border border-orange-200 shadow-sm">
                    {getStudentRank(academicPoints, levelConfig)}
                </span>
                <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm text-sm font-semibold truncate max-w-[120px] text-center">
                    {name}
                </div>
            </div>
        </motion.div>
    );
}
