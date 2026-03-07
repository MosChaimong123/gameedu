"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { TabsTrigger } from "@/components/ui/tabs";

export function TranslatedTabsTriggers() {
    const { t } = useLanguage();
    return (
        <>
            <TabsTrigger value="classroom">{t("classroomOverview") || "Classroom"}</TabsTrigger>
            <TabsTrigger value="attendance">{t("attendanceHistory") || "Attendance"}</TabsTrigger>
            <TabsTrigger value="reports">{t("reports") || "Reports"}</TabsTrigger>
        </>
    );
}
