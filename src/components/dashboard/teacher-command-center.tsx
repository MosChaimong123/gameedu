"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    AlertCircle,
    ArrowRight,
    BookOpen,
    CalendarX,
    ClipboardList,
    LayoutGrid,
    RefreshCw,
    Users,
} from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import type { TeacherOverviewPayload } from "@/lib/services/teacher/get-teacher-overview";
import {
    buildAttendanceTabHref,
    buildClassroomAssignmentsHref,
    buildAssignmentClassroomHref,
} from "./assignment-command-center.helpers";

function StatChip({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof Users;
    label: string;
    value: number | string;
    tone: "indigo" | "amber" | "rose";
}) {
    const ring =
        tone === "indigo"
            ? "from-indigo-500/20 to-violet-500/10 border-indigo-200/60"
            : tone === "amber"
              ? "from-amber-500/20 to-orange-500/10 border-amber-200/60"
              : "from-rose-500/20 to-pink-500/10 border-rose-200/60";
    const iconBg =
        tone === "indigo" ? "bg-indigo-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-500";

    return (
        <div
            className={`flex items-center gap-3 rounded-2xl border bg-gradient-to-br px-4 py-3 shadow-sm ${ring}`}
        >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${iconBg}`}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="truncate text-xl font-black text-slate-900">{value}</p>
            </div>
        </div>
    );
}

export function TeacherCommandCenter() {
    const { t } = useLanguage();
    const [data, setData] = useState<TeacherOverviewPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/teacher/overview", { cache: "no-store" });
            const json = (await res.json()) as TeacherOverviewPayload | { error?: { message?: string } };
            if (!res.ok) {
                const msg =
                    "error" in json && json.error?.message
                        ? json.error.message
                        : t("teacherCommandLoadError");
                setError(msg);
                setData(null);
                return;
            }
            setData(json as TeacherOverviewPayload);
        } catch {
            setError(t("teacherCommandLoadError"));
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading && !data) {
        return (
            <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm"
            >
                <div className="mb-6 h-6 w-48 animate-pulse rounded-lg bg-slate-200" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                </div>
                <div className="mt-6 space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                    ))}
                </div>
            </motion.section>
        );
    }

    if (error) {
        return (
            <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-rose-200/80 bg-rose-50/60 p-10 text-center"
            >
                <AlertCircle className="h-10 w-10 text-rose-500" />
                <p className="max-w-md text-sm font-medium text-rose-900">{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {t("teacherCommandRetry")}
                </Button>
            </motion.section>
        );
    }

    if (!data) return null;

    if (data.classrooms.length === 0) {
        return (
            <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50/80 p-10 text-center"
            >
                <LayoutGrid className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">{t("teacherCommandNoClassrooms")}</p>
                <Button asChild className="mt-4" variant="default">
                    <Link href="/dashboard/classrooms">{t("classroomOverview")}</Link>
                </Button>
            </motion.section>
        );
    }

    return (
        <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm"
        >
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900">{t("teacherCommandCenterTitle")}</h2>
                    <p className="mt-1 text-sm text-slate-500">{t("teacherCommandCenterSubtitle")}</p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void load()}
                    disabled={loading}
                    className="gap-2 text-slate-600"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    {t("teacherCommandRefresh")}
                </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatChip
                    icon={LayoutGrid}
                    label={t("teacherCommandTotalClassrooms")}
                    value={data.totals.classroomCount}
                    tone="indigo"
                />
                <StatChip
                    icon={Users}
                    label={t("teacherCommandTotalStudents")}
                    value={data.totals.studentCount}
                    tone="indigo"
                />
                <StatChip
                    icon={CalendarX}
                    label={t("teacherCommandMissingAttendance")}
                    value={data.totals.classroomsMissingAttendanceToday}
                    tone="amber"
                />
                <StatChip
                    icon={ClipboardList}
                    label={t("teacherCommandMissingSubmissions")}
                    value={data.totals.missingSubmissionSlots}
                    tone="rose"
                />
            </div>

            <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                    <Users className="h-4 w-4" />
                    {t("teacherCommandByClassroom")}
                </h3>
                <ul className="space-y-2">
                    {data.classrooms.map((c) => (
                        <li
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="text-2xl" aria-hidden>
                                    {c.emoji ?? "📚"}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-bold text-slate-900">{c.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {t("studentsCount").replace("{count}", String(c.studentCount))}
                                        {c.grade ? ` · ${c.grade}` : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {c.missingAttendanceToday ? (
                                    <Button asChild size="sm" variant="outline" className="h-8 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100">
                                        <Link href={buildAttendanceTabHref(c.id)}>
                                            {t("teacherCommandOpenAttendance")}
                                            <ArrowRight className="ml-1 h-3 w-3" />
                                        </Link>
                                    </Button>
                                ) : null}
                                {c.missingSubmissionSlots > 0 ? (
                                    <Button asChild size="sm" variant="outline" className="h-8 border-rose-200 bg-rose-50/80 text-rose-900 hover:bg-rose-100">
                                        <Link href={buildClassroomAssignmentsHref(c.id)}>
                                            {t("teacherCommandOpenAssignments")}
                                            <ArrowRight className="ml-1 h-3 w-3" />
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button asChild size="sm" variant="ghost" className="h-8 text-indigo-700">
                                        <Link href={buildClassroomAssignmentsHref(c.id)}>
                                            {t("teacherCommandOpenClass")}
                                            <ArrowRight className="ml-1 h-3 w-3" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {data.recentAssignments.length > 0 ? (
                <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                        <BookOpen className="h-4 w-4" />
                        {t("teacherCommandRecentAssignments")}
                    </h3>
                    <ul className="space-y-2">
                        {data.recentAssignments.map((a) => (
                            <li
                                key={a.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-bold text-slate-900">{a.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {a.classroomName}
                                        {a.deadline
                                            ? ` · ${t("teacherCommandDue")} ${new Date(a.deadline).toLocaleDateString()}`
                                            : ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {a.missingSubmissions > 0 ? (
                                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                                            {t("teacherCommandMissingSlotsBadge").replace("{count}", String(a.missingSubmissions))}
                                        </span>
                                    ) : null}
                                    <Button asChild size="sm" variant="secondary" className="h-8">
                                        <Link href={buildAssignmentClassroomHref(a.classId, a.id)}>
                                            {t("teacherCommandOpenClass")}
                                        </Link>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </motion.section>
    );
}
