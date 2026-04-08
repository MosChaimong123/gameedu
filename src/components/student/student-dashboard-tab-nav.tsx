"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, MessageSquare, Trophy } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { brandPurpleTabActiveCn } from "@/components/classroom/gamification-toolbar-styles";
import type {
    StudentDashboardMode,
    StudentDashboardTranslateFn,
} from "@/lib/services/student-dashboard/student-dashboard.types";

const learnTabs = [
    {
        value: "assignments",
        icon: LayoutDashboard,
        labelKey: "tabStudentAssignments" as const,
    },
    {
        value: "board",
        icon: MessageSquare,
        labelKey: "tabStudentBoard" as const,
    },
    {
        value: "history",
        icon: Trophy,
        labelKey: "tabStudentHistory" as const,
    },
] as const;

/** โหมดเกม: ภารกิจ → มอนสเตอร์ → ต่อสู้ → อันดับ → ประวัติ */
const gameTabs = [
    { value: "quests", emoji: "📝", labelKey: "tabStudentQuests" as const },
    { value: "monster", emoji: "🐣", labelKey: "tabStudentMonster" as const },
    { value: "battle", emoji: "⚔️", labelKey: "battleTabTitle" as const },
    { value: "leaderboard", emoji: "🏆", labelKey: "tabStudentLeaderboard" as const },
    { value: "gamehistory", emoji: "📜", labelKey: "tabGameHistory" as const },
] as const;

interface StudentDashboardTabNavProps {
    t: StudentDashboardTranslateFn;
    mode: StudentDashboardMode;
}

export function StudentDashboardTabNav({
    t,
    mode,
}: StudentDashboardTabNavProps) {
    if (mode === "learn") {
        return (
            <motion.div
                className="mb-6 w-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
                <TabsList
                    className={cn(
                        "grid h-auto w-full grid-cols-3 gap-1 rounded-[22px] border border-[#e5e7eb] bg-white/95 p-1.5",
                        "shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm",
                        "sm:gap-1.5"
                    )}
                >
                    {learnTabs.map(({ value, icon: Icon, labelKey }) => (
                        <TabsTrigger
                            key={value}
                            value={value}
                            className={cn(
                                "relative flex h-11 min-h-[44px] items-center justify-center gap-1.5 rounded-[18px] border border-transparent",
                                "px-1 py-2.5 text-xs font-semibold leading-normal text-slate-500",
                                "transition-all duration-300 ease-out",
                                "hover:bg-slate-50 hover:text-slate-800",
                                "focus-visible:ring-2 focus-visible:ring-purple-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                                "data-[state=active]:[&_svg]:scale-[1.06]",
                                brandPurpleTabActiveCn,
                                "sm:px-4 sm:text-sm"
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0 transition-transform duration-300" strokeWidth={2.25} />
                            <span className="hidden sm:inline">{t(labelKey)}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="mb-6 w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
        >
            <TabsList
                className={cn(
                    "grid h-auto w-full grid-cols-5 gap-1 rounded-[22px] border border-[#e5e7eb] bg-white/95 p-1.5",
                    "shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm",
                    "sm:gap-1.5"
                )}
            >
                {gameTabs.map(({ value, emoji, labelKey }) => (
                    <TabsTrigger
                        key={value}
                        value={value}
                        title={t(labelKey)}
                        className={cn(
                            "relative flex h-11 min-h-[44px] min-w-0 items-center justify-center gap-1 rounded-[18px] border border-transparent",
                            "px-0.5 py-2.5 text-[10px] font-semibold leading-none text-slate-500",
                            "transition-all duration-300 ease-out",
                            "hover:bg-slate-50 hover:text-slate-800",
                            "focus-visible:ring-2 focus-visible:ring-purple-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                            "data-[state=active]:[&_.tab-game-emoji]:scale-[1.06]",
                            brandPurpleTabActiveCn,
                            "sm:gap-1.5 sm:px-2 sm:text-xs sm:leading-normal"
                        )}
                    >
                        <span className="tab-game-emoji text-base leading-none transition-transform duration-300 sm:text-[1.05rem]">
                            {emoji}
                        </span>
                        <span className="hidden whitespace-nowrap sm:inline sm:text-[11px] md:text-xs">
                            {t(labelKey)}
                        </span>
                    </TabsTrigger>
                ))}
            </TabsList>
        </motion.div>
    );
}
