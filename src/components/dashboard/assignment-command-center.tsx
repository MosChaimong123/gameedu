"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CalendarClock, ClipboardList, RefreshCw, TimerOff } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import {
    buildAssignmentClassroomHref,
    formatAssignmentClassSummary,
} from "./assignment-command-center.helpers";
import { useTeacherAssignmentOverview } from "./use-teacher-assignment-overview";

function StatChip({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof ClipboardList;
    label: string;
    value: number | string;
    tone: "rose" | "amber" | "slate";
}) {
    const ring =
        tone === "rose"
            ? "from-rose-500/15 to-pink-500/10 border-rose-200/70"
            : tone === "amber"
              ? "from-amber-500/15 to-orange-500/10 border-amber-200/70"
              : "from-slate-500/10 to-slate-400/5 border-slate-200/80";
    const iconBg = tone === "rose" ? "bg-rose-500" : tone === "amber" ? "bg-amber-500" : "bg-slate-600";

    return (
        <div className={`flex items-center gap-3 rounded-2xl border bg-gradient-to-br px-4 py-3 shadow-sm ${ring}`}>
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

export function AssignmentCommandCenter() {
    const { t } = useLanguage();
    const { rangeDays, setRangeDays, data, loading, error, load } = useTeacherAssignmentOverview(
        t("assignmentCommandLoadError")
    );

    if (loading && !data) {
        return (
            <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm"
            >
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="h-6 w-56 animate-pulse rounded-lg bg-slate-200" />
                    <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-100" />
                </div>
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
                    {t("assignmentCommandRetry")}
                </Button>
            </motion.section>
        );
    }

    if (!data) return null;

    return (
        <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm"
        >
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900">{t("assignmentCommandCenterTitle")}</h2>
                    <p className="mt-1 text-sm text-slate-500">{t("assignmentCommandCenterSubtitle")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {([7, 14, 30] as const).map((d) => (
                        <Button
                            key={d}
                            type="button"
                            size="sm"
                            variant={rangeDays === d ? "default" : "outline"}
                            className="h-8 rounded-full px-3 text-xs font-bold"
                            onClick={() => setRangeDays(d)}
                        >
                            {t("assignmentCommandRangeDays").replace("{days}", String(d))}
                        </Button>
                    ))}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void load()}
                        disabled={loading}
                        className="gap-2 text-slate-600"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        {t("assignmentCommandRefresh")}
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatChip
                    icon={TimerOff}
                    label={t("assignmentCommandOverdue")}
                    value={data.totals.overdueAssignmentCount}
                    tone="rose"
                />
                <StatChip
                    icon={CalendarClock}
                    label={t("assignmentCommandDueInRange")}
                    value={data.totals.dueWithinRangeCount}
                    tone="amber"
                />
                <StatChip
                    icon={ClipboardList}
                    label={t("assignmentCommandMissingSlots")}
                    value={data.totals.missingSubmissionSlots}
                    tone="slate"
                />
                <StatChip
                    icon={ClipboardList}
                    label={t("assignmentCommandVisibleTotal")}
                    value={data.totals.visibleAssignmentCount}
                    tone="slate"
                />
            </div>

            {data.classrooms.length > 0 ? (
                <div>
                    <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">
                        {t("assignmentCommandByClassroom")}
                    </h3>
                    <ul className="space-y-2">
                        {data.classrooms.map((c) => (
                            <li
                                key={c.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="text-xl" aria-hidden>
                                        {c.emoji ?? "📚"}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate font-bold text-slate-900">{c.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {formatAssignmentClassSummary(t("assignmentCommandClassSummary"), {
                                                overdueCount: c.overdueCount,
                                                dueWithinRangeCount: c.dueWithinRangeCount,
                                                missingSubmissionSlots: c.missingSubmissionSlots,
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <Button asChild size="sm" variant="secondary" className="h-8 gap-1">
                                    <Link href={buildAssignmentClassroomHref(c.id)}>
                                        {t("assignmentCommandOpenTable")}
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {data.items.length > 0 ? (
                <div>
                    <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">
                        {t("assignmentCommandPriorityList")}
                    </h3>
                    <ul className="space-y-2">
                        {data.items.map((item) => (
                            <li
                                key={item.assignmentId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-bold text-slate-900">{item.name}</p>
                                    <p className="text-xs text-slate-500">{item.classroomName}</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {item.overdue ? (
                                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                                {t("assignmentCommandBadgeOverdue")}
                                            </span>
                                        ) : null}
                                        {item.dueWithinRange && !item.overdue ? (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                                {t("assignmentCommandBadgeDueSoon")}
                                            </span>
                                        ) : null}
                                        {item.missingSubmissions > 0 ? (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                {t("assignmentCommandMissingSlotsBadge").replace(
                                                    "{count}",
                                                    String(item.missingSubmissions)
                                                )}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                <Button asChild size="sm" className="h-8">
                                    <Link href={buildAssignmentClassroomHref(item.classId, item.assignmentId)}>
                                        {t("assignmentCommandHighlight")}
                                    </Link>
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center text-sm text-slate-600">
                    {t("assignmentCommandNoHotspots")}
                </p>
            )}
        </motion.section>
    );
}
