"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { CreateClassroomDialog } from "@/app/dashboard/classrooms/create-classroom-dialog";

export function ClassroomDashboardHeader() {
    const { t } = useLanguage();

    return (
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("activeClasses")}</h1>
                <p className="text-slate-500 mt-2">{t("manageClassesDesc")}</p>
            </div>
            <CreateClassroomDialog />
        </div>
    );
}
