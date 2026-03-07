"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StudentAvatarProps {
    id: string;
    name: string;
    avatarSeed: string;
    points: number;
    onClick?: () => void;
    className?: string;
    attendance?: string; // PRESENT, ABSENT, LATE, LEFT_EARLY
}

export function StudentAvatar({
    id,
    name,
    avatarSeed,
    points,
    onClick,
    className,
    attendance = "PRESENT"
}: StudentAvatarProps) {
    // Styles based on attendance
    const isAbsent = attendance === "ABSENT";
    const isLate = attendance === "LATE";
    const isLeftEarly = attendance === "LEFT_EARLY";

    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                "flex flex-col items-center justify-center p-4 cursor-pointer relative transition-all",
                isAbsent && "opacity-50 grayscale",
                className
            )}
            onClick={onClick}
        >
            {/* Point Bubble (Hide if absent?) */}
            {!isAbsent && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md z-10">
                    {points}
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
                    {attendance}
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

            {/* Name Label */}
            <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm text-sm font-semibold truncate max-w-[120px] text-center">
                {name}
            </div>
        </motion.div>
    );
}
