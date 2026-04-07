"use client";

import { LayoutDashboard, MessageSquare, Trophy } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
    StudentDashboardMode,
    StudentDashboardTranslateFn,
} from "./StudentDashboardClient";

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
            <TabsList className="mb-6 grid w-full grid-cols-3 gap-1 rounded-3xl border border-slate-200 bg-white p-1.5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)] sm:gap-1.5">
                {[
                    {
                        value: "assignments",
                        icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
                        label: t("tabStudentAssignments"),
                        color:
                            "data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600",
                    },
                    {
                        value: "board",
                        icon: <MessageSquare className="h-4 w-4 shrink-0" />,
                        label: t("tabStudentBoard"),
                        color:
                            "data-[state=active]:border-purple-200 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-600",
                    },
                    {
                        value: "history",
                        icon: <Trophy className="h-4 w-4 shrink-0" />,
                        label: t("tabStudentHistory"),
                        color:
                            "data-[state=active]:border-amber-200 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600",
                    },
                ].map(({ value, icon, label, color }) => (
                    <TabsTrigger
                        key={value}
                        value={value}
                        className={`flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-transparent px-1 py-2.5 text-xs font-black text-slate-500 transition-all duration-200 data-[state=active]:shadow-sm sm:px-4 sm:text-sm ${color}`}
                    >
                        {icon}
                        <span className="hidden sm:inline">{label}</span>
                    </TabsTrigger>
                ))}
            </TabsList>
        );
    }

    return (
        <TabsList className="mb-6 grid w-full grid-cols-6 gap-0.5 rounded-[2rem] border-4 border-amber-300 bg-amber-50 p-1.5 shadow-[0_6px_0_0_rgba(217,119,6,0.35),0_10px_24px_-8px_rgba(217,119,6,0.25)]">
            {[
                {
                    value: "leaderboard",
                    icon: "🏆",
                    label: t("tabStudentLeaderboard"),
                    active:
                        "data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900 data-[state=active]:shadow-[0_4px_0_0_rgba(161,98,7,0.4)]",
                },
                {
                    value: "quests",
                    icon: "📝",
                    label: t("tabStudentQuests"),
                    active:
                        "data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_0_0_rgba(180,83,9,0.4)]",
                },
                {
                    value: "monster",
                    icon: "🐣",
                    label: t("tabStudentMonster"),
                    active:
                        "data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_0_0_rgba(4,120,87,0.4)]",
                },
                {
                    value: "battle",
                    icon: "⚔️",
                    label: t("battleTabTitle"),
                    active:
                        "data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_0_0_rgba(190,18,60,0.4)]",
                },
                {
                    value: "gamehistory",
                    icon: "📜",
                    label: t("tabGameHistory"),
                    active:
                        "data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_0_0_rgba(14,165,233,0.4)]",
                },
            ].map(({ value, icon, label, active }) => (
                <TabsTrigger
                    key={value}
                    value={value}
                    className={`flex h-12 items-center justify-center gap-1 rounded-[1.25rem] border-0 px-0.5 py-2 text-[10px] font-black text-amber-700 transition-all duration-150 active:scale-95 sm:px-2 sm:text-xs ${active}`}
                >
                    <span className="text-base leading-none">{icon}</span>
                    <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
            ))}
        </TabsList>
    );
}
