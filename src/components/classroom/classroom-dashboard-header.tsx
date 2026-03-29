"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { CreateClassroomDialog } from "@/app/dashboard/classrooms/create-classroom-dialog";
import { PageBackLink } from "@/components/ui/page-back-link";

export function ClassroomDashboardHeader() {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
            <div className="space-y-3">
                <PageBackLink href="/dashboard" label="แดชบอร์ด" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("activeClasses")}</h1>
                    <p className="text-slate-500 mt-2">{t("manageClassesDesc")}</p>
                </div>
            </div>
            <CreateClassroomDialog />
        </div>
    );
}
