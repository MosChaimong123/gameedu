"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { TabsTrigger } from "@/components/ui/tabs";

export function TranslatedTabsTriggers() {
    const { t } = useLanguage();
    return (
        <>
            <TabsTrigger value="classroom" suppressHydrationWarning>{t("classroomOverview") || "Classroom"}</TabsTrigger>
            <TabsTrigger value="attendance" suppressHydrationWarning>{t("attendanceHistory") || "Attendance"}</TabsTrigger>
            <TabsTrigger value="board" suppressHydrationWarning>{t("ideaBoard") || "Idea Board"}</TabsTrigger>
            <TabsTrigger value="reports" suppressHydrationWarning>{t("reports") || "Reports"}</TabsTrigger>
        </>
    );
}
