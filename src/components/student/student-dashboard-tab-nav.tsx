"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, MessageSquare, Trophy, GraduationCap, Layers3 } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { brandPurpleTabActiveCn } from "@/components/classroom/gamification-toolbar-styles";
import { isCoursesUiEnabled } from "@/lib/courses-ui-enabled";
import type { StudentDashboardTranslateFn } from "@/lib/services/student-dashboard/student-dashboard.types";

const learnTabs = [
    {
        value: "assignments",
        icon: LayoutDashboard,
        labelKey: "tabStudentAssignments" as const,
    },
    {
        value: "lessons",
        icon: GraduationCap,
        labelKey: "tabStudentLessons" as const,
    },
    {
        value: "courses",
        icon: Layers3,
        labelKey: "tabStudentCourses" as const,
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

interface StudentDashboardTabNavProps {
    t: StudentDashboardTranslateFn;
}

export function StudentDashboardTabNav({ t }: StudentDashboardTabNavProps) {
    const visibleLearnTabs = isCoursesUiEnabled()
        ? learnTabs
        : learnTabs.filter((tab) => tab.value !== "courses");

    return (
            <motion.div
                className="mb-6 w-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
                <TabsList
                    className={cn(
                        "grid h-auto w-full gap-1 rounded-[22px] border border-[#e5e7eb] bg-white/95 p-1.5",
                        visibleLearnTabs.length === 5 ? "grid-cols-5" : "grid-cols-4",
                        "shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm",
                        "sm:gap-1.5"
                    )}
                >
                    {visibleLearnTabs.map(({ value, icon: Icon, labelKey }) => (
                        <TabsTrigger
                            key={value}
                            value={value}
                            data-testid={`student-dashboard-tab-${value}`}
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
