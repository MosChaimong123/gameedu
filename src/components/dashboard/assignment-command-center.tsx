"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CalendarClock, Check, Clipboard, ClipboardList, Download, RefreshCw, TimerOff } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import {
    buildAssignmentReminderMessage,
    buildAssignmentClassroomHref,
    formatAssignmentClassSummary,
    getReminderCandidates,
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
    const [copiedAssignmentId, setCopiedAssignmentId] = useState<string | null>(null);
    const [sendingAssignmentId, setSendingAssignmentId] = useState<string | null>(null);
    const [sendingLineAssignmentId, setSendingLineAssignmentId] = useState<string | null>(null);
    const [sentReminder, setSentReminder] = useState<{ assignmentId: string; targetCount: number } | null>(null);
    const [sentLineReminder, setSentLineReminder] = useState<{ assignmentId: string; targetCount: number } | null>(null);
    const [reminderError, setReminderError] = useState<string | null>(null);
    const { rangeDays, setRangeDays, data, loading, error, load } = useTeacherAssignmentOverview(
        t("assignmentCommandLoadError")
    );
    const reminderCandidates = useMemo(() => (data ? getReminderCandidates(data.items, 3) : []), [data]);

    async function copyReminder(item: (typeof reminderCandidates)[number]) {
        const message = buildAssignmentReminderMessage(item);
        await navigator.clipboard.writeText(message);
        setCopiedAssignmentId(item.assignmentId);
        window.setTimeout(() => setCopiedAssignmentId(null), 1800);
    }

    async function sendReminder(item: (typeof reminderCandidates)[number]) {
        setSendingAssignmentId(item.assignmentId);
        setReminderError(null);
        try {
            const res = await fetch(
                `/api/classrooms/${item.classId}/assignments/${item.assignmentId}/reminders`,
                { method: "POST" }
            );
            const payload = (await res.json()) as { targetCount?: number };
            if (!res.ok) {
                throw new Error("send_failed");
            }
            setSentReminder({
                assignmentId: item.assignmentId,
                targetCount: payload.targetCount ?? 0,
            });
        } catch {
            setReminderError(t("assignmentReminderSendFailed"));
        } finally {
            setSendingAssignmentId(null);
        }
    }

    async function sendLineReminder(item: (typeof reminderCandidates)[number]) {
        setSendingLineAssignmentId(item.assignmentId);
        setReminderError(null);
        try {
            const res = await fetch(
                `/api/classrooms/${item.classId}/assignments/${item.assignmentId}/line-reminders`,
                { method: "POST" }
            );
            const payload = (await res.json()) as { targetCount?: number; sentCount?: number };
            if (!res.ok || (payload.sentCount ?? 0) <= 0) {
                throw new Error("line_send_failed");
            }
            setSentLineReminder({
                assignmentId: item.assignmentId,
                targetCount: payload.targetCount ?? 0,
            });
            void load();
        } catch {
            setReminderError("Could not send LINE reminder. Check that this classroom is linked to a LINE group.");
        } finally {
            setSendingLineAssignmentId(null);
        }
    }

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

            {reminderCandidates.length > 0 ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-indigo-900">
                                {t("assignmentReminderTitle")}
                            </h3>
                            <p className="mt-1 text-xs font-medium text-indigo-700">
                                {t("assignmentReminderSubtitle")}
                            </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-800 shadow-sm">
                            {t("assignmentReminderCandidateCount").replace(
                                "{count}",
                                String(reminderCandidates.length)
                            )}
                        </span>
                    </div>
                    <ul className="space-y-2">
                        {reminderCandidates.map((item) => (
                            <li
                                key={item.assignmentId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 shadow-sm"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-slate-900">{item.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {item.classroomName} -{" "}
                                        {t("assignmentCommandMissingSlotsBadge").replace(
                                            "{count}",
                                            String(item.missingSubmissions)
                                        )}
                                    </p>
                                    <p className="mt-1 text-[11px] font-semibold text-indigo-700">
                                        LINE sent {item.lineReminderCount}x
                                        {item.lastLineReminderSentAt
                                            ? `, last ${new Date(item.lastLineReminderSentAt).toLocaleString()}`
                                            : ", not sent yet"}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1"
                                        onClick={() => void copyReminder(item)}
                                    >
                                        {copiedAssignmentId === item.assignmentId ? (
                                            <Check className="h-3.5 w-3.5" />
                                        ) : (
                                            <Clipboard className="h-3.5 w-3.5" />
                                        )}
                                        {copiedAssignmentId === item.assignmentId
                                            ? t("assignmentReminderCopied")
                                            : t("assignmentReminderCopy")}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        className="h-8"
                                        disabled={sendingAssignmentId === item.assignmentId}
                                        onClick={() => void sendReminder(item)}
                                    >
                                        {sentReminder?.assignmentId === item.assignmentId
                                            ? t("assignmentReminderSent").replace(
                                                  "{count}",
                                                  String(sentReminder.targetCount)
                                              )
                                            : sendingAssignmentId === item.assignmentId
                                              ? t("assignmentReminderSending")
                                            : t("assignmentReminderSend")}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                        disabled={sendingLineAssignmentId === item.assignmentId}
                                        onClick={() => void sendLineReminder(item)}
                                    >
                                        {sentLineReminder?.assignmentId === item.assignmentId
                                            ? `LINE sent (${sentLineReminder.targetCount})`
                                            : sendingLineAssignmentId === item.assignmentId
                                              ? "Sending LINE..."
                                              : "Send LINE"}
                                    </Button>
                                    <Button asChild size="sm" className="h-8">
                                        <Link href={buildAssignmentClassroomHref(item.classId, item.assignmentId)}>
                                            {t("assignmentCommandHighlight")}
                                        </Link>
                                    </Button>
                                    <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-slate-600">
                                        <a href={`/api/classrooms/${item.classId}/assignments/${item.assignmentId}/export`}>
                                            <Download className="h-3.5 w-3.5" />
                                            Export
                                        </a>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {reminderError ? (
                        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">
                            {reminderError}
                        </p>
                    ) : null}
                </div>
            ) : null}

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
                                    {item.lineReminderCount > 0 ? (
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                            LINE {item.lineReminderCount}x
                                        </span>
                                    ) : null}
                                </div>
                                </div>
                                <Button asChild size="sm" className="h-8">
                                    <Link href={buildAssignmentClassroomHref(item.classId, item.assignmentId)}>
                                        {t("assignmentCommandHighlight")}
                                    </Link>
                                </Button>
                                <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-slate-600">
                                    <a href={`/api/classrooms/${item.classId}/assignments/${item.assignmentId}/export`}>
                                        <Download className="h-3.5 w-3.5" />
                                        Export
                                    </a>
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
