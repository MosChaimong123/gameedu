"use client";

import Link from "next/link";
import { BarChart3, BookOpen, Users, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import type { TeacherDashboardSummary } from "@/lib/services/teacher/get-teacher-dashboard-summary";

type KpiDef = {
    key: keyof TeacherDashboardSummary;
    labelKey: string;
    href: string;
    icon: LucideIcon;
};

const KPIS: KpiDef[] = [
    { key: "questionSetCount", labelKey: "kpiQuestionSets", href: "/dashboard/my-sets", icon: BookOpen },
    { key: "classroomCount", labelKey: "kpiClassrooms", href: "/dashboard/classrooms", icon: BarChart3 },
    { key: "studentCount", labelKey: "kpiStudents", href: "/dashboard/classrooms", icon: Users },
    { key: "gamesThisWeek", labelKey: "kpiGamesThisWeek", href: "/dashboard/history", icon: History },
];

export function DashboardKpiRow({ summary }: { summary: TeacherDashboardSummary }) {
    const { t, language } = useLanguage();
    const locale = language === "th" ? "th-TH" : "en-US";

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KPIS.map((kpi) => {
                const Icon = kpi.icon;
                return (
                    <Link
                        key={kpi.key}
                        href={kpi.href}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-slate-500">
                                {t(kpi.labelKey)}
                            </span>
                            <span className="block text-2xl font-black leading-tight text-slate-900">
                                {summary[kpi.key].toLocaleString(locale)}
                            </span>
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}
