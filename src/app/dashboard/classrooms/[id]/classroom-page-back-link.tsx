"use client";

import { PageBackLink } from "@/components/ui/page-back-link";
import { useLanguage } from "@/components/providers/language-provider";

export function ClassroomPageBackLink({ className }: { className?: string }) {
    const { t } = useLanguage();
    return (
        <PageBackLink
            href="/dashboard/classrooms"
            label={t("dashboardClassroomPageBack")}
            className={className}
        />
    );
}
