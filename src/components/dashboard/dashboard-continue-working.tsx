"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, GraduationCap } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { NAV_GROUP_ICON_CLASSES } from "@/lib/navigation/dashboard-nav-styles";
import type { TeacherDashboardPendingItem } from "@/lib/services/teacher/get-teacher-dashboard-summary";

const KIND_META = {
    questionSet: { icon: BookOpen, labelKey: "pendingKindQuestionSet" },
    lessonDraft: { icon: GraduationCap, labelKey: "pendingKindLessonDraft" },
} as const;

export function DashboardContinueWorking({ items }: { items: TeacherDashboardPendingItem[] }) {
    const { t, language } = useLanguage();
    const locale = language === "th" ? "th-TH" : "en-US";

    return (
        <section className="rounded-[1.75rem] border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-3 text-lg font-black tracking-tight text-slate-900">
                {t("continueWorkingTitle")}
            </h3>

            {items.length === 0 ? (
                <p className="text-sm font-medium text-slate-500">{t("continueWorkingEmpty")}</p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {items.map((item) => {
                        const meta = KIND_META[item.kind];
                        const Icon = meta.icon;
                        return (
                            <li key={`${item.kind}-${item.id}`}>
                                <Link
                                    href={item.href}
                                    className="group flex items-center gap-3 py-2.5 transition-colors hover:text-slate-900"
                                >
                                    <Icon
                                        className={`h-5 w-5 shrink-0 ${NAV_GROUP_ICON_CLASSES.create}`}
                                        aria-hidden
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-bold text-slate-800">
                                            {item.title}
                                        </span>
                                        <span className="block text-xs font-medium text-slate-500">
                                            {t(meta.labelKey)} ·{" "}
                                            {new Date(item.updatedAt).toLocaleDateString(locale, {
                                                dateStyle: "medium",
                                            })}
                                        </span>
                                    </span>
                                    <ChevronRight
                                        className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5"
                                        aria-hidden
                                    />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
