"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { TabsTrigger } from "@/components/ui/tabs";

export function TranslatedTabsTriggers() {
    const { t } = useLanguage();
    const triggerClassName =
        "min-h-10 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm";
    return (
        <>
            <TabsTrigger className={triggerClassName} value="classroom" suppressHydrationWarning>{t("dashboardTabClassroom")}</TabsTrigger>
            <TabsTrigger className={triggerClassName} value="attendance" suppressHydrationWarning>{t("dashboardTabAttendance")}</TabsTrigger>
            <TabsTrigger className={triggerClassName} value="board" suppressHydrationWarning>{t("ideaBoard")}</TabsTrigger>
            <TabsTrigger className={triggerClassName} value="analytics" suppressHydrationWarning>{t("dashboardTabAnalytics")}</TabsTrigger>
            <TabsTrigger className={triggerClassName} value="economy" suppressHydrationWarning>{t("dashboardTabEconomy")}</TabsTrigger>
        </>
    );
}
