"use client";

import Link from "next/link";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clipboard, ExternalLink, Link2, MessageCircleMore, SendHorizonal, Settings, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatDeadlineDisplayTh, isAssignmentDeadlinePast } from "@/lib/datetime-local";
import { cn } from "@/lib/utils";
import {
    resetStudentLineLink,
    announceAssignmentToLine,
    sendAssignmentLineReminder,
    sendClassroomLineReminder,
    type AnnounceAssignmentLineKind,
    trackLineUpgradePromptClick,
    type SendClassroomLineReminderResult,
} from "@/lib/classroom-dashboard-actions";
import { canUseLineFeature } from "@/lib/line-bot/plan-access";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/classroom-dashboard.types";

type ClassroomLineAssignmentPanelProps = {
    classroom: ClassroomDashboardViewModel;
    onOpenAssignment: (assignmentId?: string | null) => void;
    onRefreshBindingStatus: () => Promise<void>;
};

type LineBindingCommandPayload = {
    classroomId: string;
    classroomName: string;
    command: string;
    expiresAt: string;
};

type AssignmentActionRow = {
    assignmentId: string;
    name: string;
    deadline: string | null;
    missingSubmissions: number;
    overdue: boolean;
    dueSoon: boolean;
};

type LineReminderSettingPayload = {
    classroomId: string;
    enabled: boolean;
    beforeDeadline1d: boolean;
    dueToday: boolean;
    overdue1d: boolean;
    weeklySummary: boolean;
    timezone: string;
};

type LineReminderDeliveryPayload = {
    id: string;
    assignmentName: string | null;
    reminderType: string;
    targetCount: number;
    status?: string;
    errorMessage?: string | null;
    sentAt: string;
};

type ReminderPresetKey = "recommended" | "light" | "intense" | "custom";

// ─── Test Run types ──────────────────────────────────────────────────────────

type TestRunCandidate = {
    assignmentId: string;
    assignmentName: string;
    deadline: string;
    reminderType: string;
    reminderTypeLabel: string;
    missingCount: number;
    alreadySentToday: boolean;
};

type TestRunResult = {
    asOf: string;
    wouldSendCount: number;
    alreadySentCount: number;
    blockedReason: string | null;
    lineGroupLinked: boolean;
    candidates: TestRunCandidate[];
};

type LineReminderReadinessCode =
    | "ready"
    | "auto_reminder_disabled"
    | "line_group_missing"
    | "no_linked_students"
    | "no_assignments_with_deadline"
    | "worker_unavailable";

type LineReminderReadinessPayload = {
    readiness: LineReminderReadinessCode;
    blockers: LineReminderReadinessCode[];
    lineGroupLinked: boolean;
    linkedStudentCount: number;
    totalStudentCount: number;
    eligibleAssignmentCount: number;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    lastErrorMessage: string | null;
    nextRunDescription: string;
    /** ISO timestamp of estimated next cron fire */
    nextRunAt?: string;
};
type ReminderPreviewType = "before_1d" | "due_today" | "overdue_1d" | "weekly_summary";

type ReminderPreviewItem = {
    assignmentId: string;
    assignmentName: string;
    deadline: string;
    reminderType: ReminderPreviewType;
    reminderLabel: string;
    targetCount: number;
    studentNames: string[];
};

const REMINDER_PRESETS: Array<{
    key: ReminderPresetKey;
    title: string;
    description: string;
    values: Pick<
        LineReminderSettingPayload,
        "beforeDeadline1d" | "dueToday" | "overdue1d" | "weeklySummary"
    >;
}> = [
    {
        key: "recommended",
        title: "แนะนำ",
        description: "เตือนก่อนครบกำหนด 1 วัน, วันครบกำหนด และหลังเลยกำหนด 1 วัน",
        values: {
            beforeDeadline1d: true,
            dueToday: true,
            overdue1d: true,
            weeklySummary: false,
        },
    },
    {
        key: "light",
        title: "เบา",
        description: "เตือนเฉพาะวันครบกำหนดและหลังเลยกำหนด",
        values: {
            beforeDeadline1d: false,
            dueToday: true,
            overdue1d: true,
            weeklySummary: false,
        },
    },
    {
        key: "intense",
        title: "เข้ม",
        description: "เตือนครบทุกช่วงและมีสรุปรายสัปดาห์",
        values: {
            beforeDeadline1d: true,
            dueToday: true,
            overdue1d: true,
            weeklySummary: true,
        },
    },
    {
        key: "custom",
        title: "กำหนดเอง",
        description: "เลือก trigger แต่ละช่วงเวลาเองทั้งหมด",
        values: {
            beforeDeadline1d: true,
            dueToday: true,
            overdue1d: true,
            weeklySummary: false,
        },
    },
];

const REMINDER_TRIGGER_OPTIONS: Array<{
    key: keyof Pick<
        LineReminderSettingPayload,
        "beforeDeadline1d" | "dueToday" | "overdue1d" | "weeklySummary"
    >;
    label: string;
    hint: string;
}> = [
    {
        key: "beforeDeadline1d",
        label: "ก่อนครบกำหนด 1 วัน",
        hint: "เหมาะกับงานที่ต้องการเตือนล่วงหน้า",
    },
    {
        key: "dueToday",
        label: "วันครบกำหนด",
        hint: "เตือนในวันส่งงานพอดี",
    },
    {
        key: "overdue1d",
        label: "เลยกำหนด 1 วัน",
        hint: "ติดตามงานค้างหลังครบกำหนด",
    },
    {
        key: "weeklySummary",
        label: "สรุปรายสัปดาห์",
        hint: "สรุปงานค้างทุกต้นสัปดาห์",
    },
];

function getReminderPresetKey(setting: LineReminderSettingPayload): ReminderPresetKey {
    const matchedPreset = REMINDER_PRESETS.find(
        (preset) =>
            preset.key !== "custom" &&
            preset.values.beforeDeadline1d === setting.beforeDeadline1d &&
            preset.values.dueToday === setting.dueToday &&
            preset.values.overdue1d === setting.overdue1d &&
            preset.values.weeklySummary === setting.weeklySummary
    );
    return matchedPreset?.key ?? "custom";
}

function summarizeAssignments(classroom: ClassroomDashboardViewModel): AssignmentActionRow[] {
    const now = new Date();
    const soonHorizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return classroom.assignments
        .filter((assignment) => assignment.visible)
        .map((assignment) => {
            const submittedStudentIds = new Set(
                classroom.students.flatMap((student) =>
                    (student.submissions ?? [])
                        .filter((submission) => submission.assignmentId === assignment.id)
                        .map((submission) => submission.studentId)
                )
            );
            const missingSubmissions = classroom.students.filter(
                (student) => !submittedStudentIds.has(student.id)
            ).length;
            const deadlineDate = assignment.deadline ? new Date(assignment.deadline) : null;
            const overdue = Boolean(deadlineDate && deadlineDate < now);
            const dueSoon = Boolean(deadlineDate && deadlineDate >= now && deadlineDate <= soonHorizon);

            return {
                assignmentId: assignment.id,
                name: assignment.name,
                deadline: assignment.deadline ? assignment.deadline.toISOString() : null,
                missingSubmissions,
                overdue,
                dueSoon,
            };
        })
        .sort((a, b) => {
            const aPriority = a.overdue ? 0 : a.dueSoon ? 1 : 2;
            const bPriority = b.overdue ? 0 : b.dueSoon ? 1 : 2;
            if (aPriority !== bPriority) return aPriority - bPriority;
            if (a.missingSubmissions !== b.missingSubmissions) {
                return b.missingSubmissions - a.missingSubmissions;
            }
            const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
            const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
            return aDeadline - bDeadline;
        });
}

function maskLineUserId(lineUserId: string | null | undefined) {
    if (!lineUserId) return null;
    if (lineUserId.length <= 10) return lineUserId;
    return `${lineUserId.slice(0, 4)}...${lineUserId.slice(-4)}`;
}

function getBangkokDateParts(date: Date): { year: number; month: number; day: number } {
    const bangkok = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return {
        year: bangkok.getUTCFullYear(),
        month: bangkok.getUTCMonth() + 1,
        day: bangkok.getUTCDate(),
    };
}

function diffBangkokCalendarDays(target: Date, base: Date): number {
    const targetParts = getBangkokDateParts(target);
    const baseParts = getBangkokDateParts(base);
    const targetDay = Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day);
    const baseDay = Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day);
    return Math.round((targetDay - baseDay) / (24 * 60 * 60 * 1000));
}

function isBangkokMonday(date: Date) {
    const parts = getBangkokDateParts(date);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay() === 1;
}

function getReminderPreviewLabel(reminderType: ReminderPreviewType) {
    if (reminderType === "before_1d") return "ก่อนครบกำหนด 1 วัน";
    if (reminderType === "due_today") return "วันครบกำหนด";
    if (reminderType === "overdue_1d") return "เลยกำหนด 1 วัน";
    return "สรุปรายสัปดาห์";
}

// ─── Test Run Result Panel ───────────────────────────────────────────────────

const BLOCKED_REASON_LABEL: Record<string, string> = {
    auto_reminder_disabled: "auto reminder ยังไม่เปิดใช้งาน",
    line_group_missing: "ยังไม่ผูกกลุ่ม LINE",
    no_linked_students: "ไม่มีนักเรียนเชื่อม LINE",
    no_assignments_with_deadline: "ไม่มีงานที่มีกำหนดส่ง",
    worker_unavailable: "ฟีเจอร์ต้องการแพ็กเกจ Plus หรือ School",
};

function TestRunResultPanel({ result }: { result: TestRunResult }) {
    const asOfLabel = new Date(result.asOf).toLocaleString("th-TH", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
    });

    if (result.blockedReason) {
        return (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-bold text-amber-900">ไม่สามารถส่งได้ตอนนี้</p>
                <p className="mt-1 text-xs text-amber-800">
                    {BLOCKED_REASON_LABEL[result.blockedReason] ?? result.blockedReason}
                </p>
                <p className="mt-1 text-[11px] text-amber-700">ตรวจสอบ ณ {asOfLabel}</p>
            </div>
        );
    }

    if (result.wouldSendCount === 0 && result.alreadySentCount === 0) {
        return (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <p className="text-sm font-bold text-slate-600">ไม่มีงานที่ต้องส่งเตือนตอนนี้</p>
                <p className="mt-1 text-xs text-slate-400">
                    งานทุกชิ้นอาจยังไม่ถึงช่วงเวลาเตือน หรือทุกคนส่งงานแล้ว
                </p>
                <p className="mt-1 text-[11px] text-slate-400">ตรวจสอบ ณ {asOfLabel}</p>
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
                <span className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold",
                    result.wouldSendCount > 0 ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"
                )}>
                    จะส่ง {result.wouldSendCount} งาน
                </span>
                {result.alreadySentCount > 0 && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
                        ส่งแล้ววันนี้ {result.alreadySentCount} งาน
                    </span>
                )}
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500">
                    ณ {asOfLabel}
                </span>
            </div>

            <div className="space-y-1.5">
                {result.candidates.map((c) => (
                    <div
                        key={`${c.assignmentId}-${c.reminderType}`}
                        className={cn(
                            "flex flex-wrap items-start justify-between gap-2 rounded-xl px-3 py-2.5 text-xs",
                            c.alreadySentToday
                                ? "border border-emerald-100 bg-emerald-50 opacity-70"
                                : "border border-indigo-100 bg-indigo-50"
                        )}
                    >
                        <div>
                            <p className={cn("font-bold", c.alreadySentToday ? "text-emerald-800" : "text-indigo-900")}>
                                {c.assignmentName}
                            </p>
                            <p className={cn("mt-0.5", c.alreadySentToday ? "text-emerald-700" : "text-indigo-700")}>
                                {c.reminderTypeLabel} · ขาด {c.missingCount} คน
                            </p>
                        </div>
                        {c.alreadySentToday ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200 px-2 py-0.5 font-bold text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" />
                                ส่งแล้ว
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-200 px-2 py-0.5 font-bold text-indigo-800">
                                <SendHorizonal className="h-3 w-3" />
                                จะส่ง
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <p className="text-[11px] text-slate-400">
                * ผลนี้ไม่ได้ส่งจริง — กด &quot;บันทึกและเปิดใช้งาน&quot; แล้วรอ cron หรือใช้ manual send
            </p>
        </div>
    );
}

// ─── Delivery History ───────────────────────────────────────────────────────

const REMINDER_TYPE_LABEL: Record<string, string> = {
    before_1d: "ก่อนครบกำหนด 1 วัน",
    due_today: "วันครบกำหนด",
    overdue_1d: "เลยกำหนด 1 วัน",
    weekly_summary: "สรุปรายสัปดาห์",
};

type DeliveryStatusFilter = "all" | "sent" | "failed" | "pending";

function DeliveryStatusBadge({ status }: { status: string }) {
    if (status === "sent") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                ส่งสำเร็จ
            </span>
        );
    }
    if (status === "failed") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                <XCircle className="h-3 w-3" />
                ส่งไม่สำเร็จ
            </span>
        );
    }
    if (status === "pending") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                <AlertCircle className="h-3 w-3" />
                รอส่ง
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
            {status}
        </span>
    );
}

function DeliveryHistorySection({ deliveries }: { deliveries: LineReminderDeliveryPayload[] }) {
    const [statusFilter, setStatusFilter] = useState<DeliveryStatusFilter>("all");
    const [showAll, setShowAll] = useState(false);

    const filtered = deliveries.filter(
        (d) => statusFilter === "all" || (d.status ?? "sent") === statusFilter
    );
    const visible = showAll ? filtered : filtered.slice(0, 6);

    const sentCount = deliveries.filter((d) => (d.status ?? "sent") === "sent").length;
    const failedCount = deliveries.filter((d) => d.status === "failed").length;
    const pendingCount = deliveries.filter((d) => d.status === "pending").length;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-900">ประวัติส่ง LINE</p>
                <div className="flex items-center gap-1.5">
                    {(
                        [
                            { key: "all", label: `ทั้งหมด (${deliveries.length})` },
                            { key: "sent", label: `สำเร็จ (${sentCount})` },
                            { key: "failed", label: `ล้มเหลว (${failedCount})` },
                            ...(pendingCount > 0 ? [{ key: "pending", label: `รอ (${pendingCount})` }] : []),
                        ] as Array<{ key: DeliveryStatusFilter; label: string }>
                    ).map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => { setStatusFilter(tab.key); setShowAll(false); }}
                            className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-bold transition",
                                statusFilter === tab.key
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="mt-3 space-y-2">
                {visible.length > 0 ? (
                    visible.map((delivery) => (
                        <div
                            key={delivery.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                {/* Assignment name + trigger */}
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-slate-900">
                                        {delivery.assignmentName ?? "(ไม่ทราบชื่องาน)"}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                        {REMINDER_TYPE_LABEL[delivery.reminderType] ?? delivery.reminderType}
                                        {" · "}
                                        {delivery.targetCount} คน
                                    </p>
                                </div>
                                {/* Status + time */}
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                    <DeliveryStatusBadge status={delivery.status ?? "sent"} />
                                    <span className="text-[11px] text-slate-400">
                                        {new Date(delivery.sentAt).toLocaleString("th-TH", {
                                            dateStyle: "short",
                                            timeStyle: "short",
                                            timeZone: "Asia/Bangkok",
                                        })}
                                    </span>
                                </div>
                            </div>
                            {/* Error message */}
                            {delivery.errorMessage ? (
                                <p className="mt-1.5 rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-700">
                                    {delivery.errorMessage}
                                </p>
                            ) : null}
                        </div>
                    ))
                ) : (
                    <div className="rounded-xl bg-slate-50 px-4 py-6 text-center">
                        <p className="text-sm font-medium text-slate-400">
                            {statusFilter === "all"
                                ? "ยังไม่มีประวัติส่ง LINE ของห้องนี้"
                                : `ไม่มีรายการที่มีสถานะ "${statusFilter}"`}
                        </p>
                    </div>
                )}
            </div>

            {/* Show more / less */}
            {filtered.length > 6 && (
                <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                    {showAll ? "แสดงน้อยลง" : `ดูทั้งหมด ${filtered.length} รายการ`}
                </button>
            )}
        </div>
    );
}

// ─── Auto Reminder Status Strip (inline, no dialog needed) ──────────────────

function AutoReminderStatusStrip({
    readiness,
    loading,
    onOpenSettings,
}: {
    readiness: LineReminderReadinessPayload | null;
    loading: boolean;
    onOpenSettings: () => void;
}) {
    if (loading && !readiness) {
        return (
            <button
                type="button"
                onClick={onOpenSettings}
                className="flex w-full items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-left text-xs text-slate-400 transition hover:bg-slate-100"
            >
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-300" />
                กำลังตรวจสอบ auto reminder...
            </button>
        );
    }

    if (!readiness) return null;

    const isReady = readiness.readiness === "ready";
    const isEnabled = readiness.readiness !== "auto_reminder_disabled" && readiness.readiness !== "worker_unavailable";
    const isWorkerBlocked = readiness.readiness === "worker_unavailable";

    const lastRunLabel = readiness.lastRunAt
        ? new Date(readiness.lastRunAt).toLocaleString("th-TH", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Asia/Bangkok",
          })
        : null;

    const nextRunLabel = readiness.nextRunAt
        ? new Date(readiness.nextRunAt).toLocaleString("th-TH", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Asia/Bangkok",
          })
        : null;

    return (
        <button
            type="button"
            onClick={onOpenSettings}
            className={cn(
                "flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border px-4 py-2.5 text-left text-xs transition hover:opacity-90 active:scale-[0.99]",
                isReady
                    ? "border-emerald-200 bg-emerald-50"
                    : isWorkerBlocked
                      ? "border-slate-200 bg-slate-50"
                      : "border-amber-100 bg-amber-50/60"
            )}
        >
            {/* Status pill */}
            <span
                className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-bold",
                    isReady
                        ? "bg-emerald-100 text-emerald-800"
                        : isWorkerBlocked
                          ? "bg-slate-200 text-slate-600"
                          : isEnabled
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-500"
                )}
            >
                <span
                    className={cn(
                        "h-2 w-2 rounded-full",
                        isReady ? "bg-emerald-500 animate-pulse" : isEnabled ? "bg-amber-400" : "bg-slate-400"
                    )}
                />
                {isReady
                    ? "Auto ON — พร้อมส่ง"
                    : isWorkerBlocked
                      ? "Auto — ต้องอัปเกรด"
                      : isEnabled
                        ? "Auto ON — ยังมี blocker"
                        : "Auto OFF"}
            </span>

            {/* Last run */}
            {lastRunLabel ? (
                <span className={cn("text-[11px]", isReady ? "text-emerald-700" : "text-slate-500")}>
                    รอบล่าสุด: {lastRunLabel}
                    {readiness.lastRunStatus === "failed" && (
                        <span className="ml-1 text-red-600">(ส่งไม่สำเร็จ)</span>
                    )}
                </span>
            ) : (
                <span className="text-[11px] text-slate-400">ยังไม่มีประวัติส่ง</span>
            )}

            {/* Next run */}
            {nextRunLabel && isReady ? (
                <span className="text-[11px] text-emerald-700">
                    รอบถัดไป: {nextRunLabel}
                </span>
            ) : null}

            {/* Shortcut hint */}
            <span className="ml-auto shrink-0 text-[11px] font-bold text-slate-400">
                ตั้งค่า →
            </span>
        </button>
    );
}

// ─── Readiness ──────────────────────────────────────────────────────────────

const READINESS_CONFIG: Record<
    LineReminderReadinessCode,
    { label: string; description: string; cta?: string }
> = {
    ready: {
        label: "พร้อมส่ง",
        description: "ระบบพร้อมส่งเตือนอัตโนมัติตามที่ตั้งค่าไว้",
    },
    auto_reminder_disabled: {
        label: "ยังไม่เปิดใช้งาน",
        description: "เปิด auto reminder ด้านล่างเพื่อเริ่มส่งเตือนอัตโนมัติ",
        cta: "เปิดใช้งานด้านล่าง",
    },
    line_group_missing: {
        label: "ยังไม่ผูกกลุ่ม LINE",
        description: "ต้องผูกกลุ่ม LINE ของห้องก่อน ระบบจึงจะส่งได้",
        cta: "ไปผูกกลุ่ม LINE",
    },
    no_linked_students: {
        label: "ไม่มีนักเรียนเชื่อม LINE",
        description: "นักเรียนในห้องยังไม่มีใครเชื่อมต่อ LINE กับระบบ",
        cta: "แชร์ลิงก์เชื่อม LINE ให้นักเรียน",
    },
    no_assignments_with_deadline: {
        label: "ไม่มีงานที่มีกำหนดส่ง",
        description: "ต้องมีงานที่ตั้งวันกำหนดส่งไว้ ระบบจึงจะส่งเตือนได้",
        cta: "สร้างหรือแก้ไขงาน",
    },
    worker_unavailable: {
        label: "ฟีเจอร์ไม่พร้อมใช้",
        description: "Auto reminder ต้องการแพ็กเกจ Plus หรือ School",
        cta: "อัปเกรดแพ็กเกจ",
    },
};

function ReadinessCard({
    readiness,
    loading,
}: {
    readiness: LineReminderReadinessPayload | null;
    loading: boolean;
}) {
    if (loading && !readiness) {
        return (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                กำลังตรวจสอบสถานะระบบ...
            </div>
        );
    }

    if (!readiness) return null;

    const isReady = readiness.readiness === "ready";
    const config = READINESS_CONFIG[readiness.readiness];
    const hardBlockers = readiness.blockers.filter((b) => b !== "auto_reminder_disabled");

    return (
        <div
            className={cn(
                "rounded-2xl border p-4",
                isReady
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2">
                {isReady ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
                <p className={cn("text-sm font-black", isReady ? "text-emerald-900" : "text-amber-900")}>
                    สถานะพร้อมใช้งาน: {config.label}
                </p>
            </div>
            <p className={cn("mt-1 text-xs", isReady ? "text-emerald-800" : "text-amber-800")}>
                {config.description}
            </p>

            {/* Stats row */}
            <div className="mt-3 flex flex-wrap gap-3">
                <StatChip
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    label="กลุ่ม LINE"
                    value={readiness.lineGroupLinked ? "ผูกแล้ว" : "ยังไม่ผูก"}
                    ok={readiness.lineGroupLinked}
                />
                <StatChip
                    icon={<Users className="h-3.5 w-3.5" />}
                    label="นักเรียนเชื่อม LINE"
                    value={`${readiness.linkedStudentCount}/${readiness.totalStudentCount} คน`}
                    ok={readiness.linkedStudentCount > 0}
                />
                <StatChip
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    label="งานมีกำหนดส่ง"
                    value={`${readiness.eligibleAssignmentCount} งาน`}
                    ok={readiness.eligibleAssignmentCount > 0}
                />
            </div>

            {/* Last run */}
            {readiness.lastRunAt ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">รอบล่าสุด:</span>
                    <span>
                        {new Date(readiness.lastRunAt).toLocaleString("th-TH", {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone: "Asia/Bangkok",
                        })}
                    </span>
                    {readiness.lastRunStatus === "sent" ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
                            ส่งสำเร็จ
                        </span>
                    ) : readiness.lastRunStatus === "failed" ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-700">
                            ส่งไม่สำเร็จ
                        </span>
                    ) : null}
                    {readiness.lastErrorMessage ? (
                        <span className="text-red-600">{readiness.lastErrorMessage}</span>
                    ) : null}
                </div>
            ) : (
                <p className="mt-2 text-xs text-slate-500">ยังไม่มีประวัติส่งของห้องนี้</p>
            )}

            {/* Next run */}
            <p className={cn("mt-2 text-xs font-medium", isReady ? "text-emerald-800" : "text-amber-700")}>
                {readiness.nextRunDescription}
            </p>

            {/* Blocker list */}
            {hardBlockers.length > 0 && (
                <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                        สิ่งที่ต้องแก้ไขก่อน
                    </p>
                    {hardBlockers.map((blocker) => {
                        const bc = READINESS_CONFIG[blocker];
                        return (
                            <div
                                key={blocker}
                                className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2"
                            >
                                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                <div>
                                    <p className="text-xs font-bold text-amber-900">{bc.label}</p>
                                    <p className="text-xs text-amber-800">{bc.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function StatChip({
    icon,
    label,
    value,
    ok,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    ok: boolean;
}) {
    return (
        <div
            className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold",
                ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
            )}
        >
            {icon}
            <span className="font-normal text-inherit opacity-80">{label}:</span>
            {value}
        </div>
    );
}

/** Numbered section header used in the auto-reminder settings flow. */
function StepHeader({
    step,
    title,
    subtitle,
}: {
    step: number;
    title: string;
    subtitle?: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                {step}
            </span>
            <div className="min-w-0">
                <p className="text-base font-black text-slate-900">{title}</p>
                {subtitle ? <p className="mt-0.5 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
            </div>
        </div>
    );
}

export function ClassroomLineAssignmentPanel({
    classroom,
    onOpenAssignment,
    onRefreshBindingStatus,
}: ClassroomLineAssignmentPanelProps) {
    const { toast } = useToast();
    const [sendingAssignmentId, setSendingAssignmentId] = useState<string | null>(null);
    const [announcingRow, setAnnouncingRow] = useState<{ assignmentId: string; kind: AnnounceAssignmentLineKind } | null>(null);
    const [bulkSending, setBulkSending] = useState(false);
    const [lastLineSendByAssignment, setLastLineSendByAssignment] = useState<Record<string, number>>({});
    const [lastBulkResult, setLastBulkResult] = useState<SendClassroomLineReminderResult | null>(null);
    const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
    const [bindingCommand, setBindingCommand] = useState<LineBindingCommandPayload | null>(null);
    const [bindingLoading, setBindingLoading] = useState(false);
    const [bindingError, setBindingError] = useState<string | null>(null);
    const [bindingStatusRefreshing, setBindingStatusRefreshing] = useState(false);
    const [bindingPollingActive, setBindingPollingActive] = useState(false);
    const [showAllStudentStatuses, setShowAllStudentStatuses] = useState(false);
    const [resettingStudentId, setResettingStudentId] = useState<string | null>(null);
    const [reminderSettingsDialogOpen, setReminderSettingsDialogOpen] = useState(false);
    const [reminderSetting, setReminderSetting] = useState<LineReminderSettingPayload | null>(null);
    const [reminderDeliveries, setReminderDeliveries] = useState<LineReminderDeliveryPayload[]>([]);
    const [reminderSettingsLoading, setReminderSettingsLoading] = useState(false);
    const [reminderSettingsSaving, setReminderSettingsSaving] = useState(false);
    const [readiness, setReadiness] = useState<LineReminderReadinessPayload | null>(null);
    const [readinessLoading, setReadinessLoading] = useState(false);
    const [testRunResult, setTestRunResult] = useState<TestRunResult | null>(null);
    const [testRunLoading, setTestRunLoading] = useState(false);
    const rows = useMemo(() => summarizeAssignments(classroom), [classroom]);

    // Auto-load readiness on mount (powers the inline status strip)
    useEffect(() => {
        if (lineReminderUnlocked) {
            void loadReadiness();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classroom.id]);

    const connectedGroupCount = classroom.lineBotGroups.length;
    const missingSubmissionSlots = rows.reduce((sum, row) => sum + row.missingSubmissions, 0);
    const overdueCount = rows.filter((row) => row.overdue).length;
    const dueSoonCount = rows.filter((row) => row.dueSoon).length;
    const hotRows = rows.filter((row) => row.missingSubmissions > 0 || row.overdue || row.dueSoon).slice(0, 8);
    const linkedStudents = classroom.students.filter((student) => student.lineLink?.linked);
    const pendingLinkedStudents = classroom.students.filter((student) => !student.lineLink?.linked);
    const lineReminderUnlocked = canUseLineFeature(classroom.teacher, "lineAutoReminders");
    const lineSubmissionUnlocked = canUseLineFeature(classroom.teacher, "lineSubmission");
    const lineAiUnlocked = canUseLineFeature(classroom.teacher, "lineAiPreliminaryGrading");
    const activeReminderPreset = reminderSetting ? getReminderPresetKey(reminderSetting) : "recommended";
    const activeReminderLabels = reminderSetting
        ? REMINDER_TRIGGER_OPTIONS.filter((option) => reminderSetting[option.key]).map((option) => option.label)
        : [];
    const linkedPercent =
        classroom.students.length > 0
            ? Math.round((linkedStudents.length / classroom.students.length) * 100)
            : 0;
    const reminderPreview = useMemo(() => {
        if (!reminderSetting) {
            return {
                items: [] as ReminderPreviewItem[],
                reasons: [] as string[],
                blockers: [] as string[],
            };
        }

        const now = new Date();
        const items: ReminderPreviewItem[] = [];
        const reasons: string[] = [];
        const blockers: string[] = [];

        if (!reminderSetting.enabled) {
            blockers.push("ยังไม่ได้เปิด auto reminder สำหรับห้องนี้");
        }
        if (connectedGroupCount <= 0) {
            blockers.push("ห้องนี้ยังไม่ได้ผูก LINE group");
        }

        const enabledTriggerCount = REMINDER_TRIGGER_OPTIONS.filter((option) => reminderSetting[option.key]).length;
        if (enabledTriggerCount <= 0) {
            blockers.push("ยังไม่ได้เลือกช่วงเวลาที่จะให้ระบบส่งเตือน");
        }

        const visibleAssignments = classroom.assignments.filter(
            (assignment) => assignment.visible && assignment.deadline
        );
        if (visibleAssignments.length <= 0) {
            blockers.push("ยังไม่มีงานที่ตั้งกำหนดส่งไว้");
        }

        for (const assignment of visibleAssignments) {
            const submittedStudentIds = new Set(
                classroom.students.flatMap((student) =>
                    (student.submissions ?? [])
                        .filter((submission) => submission.assignmentId === assignment.id)
                        .map((submission) => submission.studentId)
                )
            );
            const missingStudents = classroom.students.filter((student) => !submittedStudentIds.has(student.id));
            if (missingStudents.length <= 0 || !assignment.deadline) continue;

            const diffDays = diffBangkokCalendarDays(assignment.deadline, now);
            let reminderType: ReminderPreviewType | null = null;

            if (diffDays === 1) reminderType = "before_1d";
            else if (diffDays === 0) reminderType = "due_today";
            else if (diffDays === -1) reminderType = "overdue_1d";
            else if (diffDays < -1 && reminderSetting.weeklySummary && isBangkokMonday(now)) {
                reminderType = "weekly_summary";
            }

            if (!reminderType) continue;
            if (
                (reminderType === "before_1d" && !reminderSetting.beforeDeadline1d) ||
                (reminderType === "due_today" && !reminderSetting.dueToday) ||
                (reminderType === "overdue_1d" && !reminderSetting.overdue1d) ||
                (reminderType === "weekly_summary" && !reminderSetting.weeklySummary)
            ) {
                continue;
            }

            items.push({
                assignmentId: assignment.id,
                assignmentName: assignment.name,
                deadline: assignment.deadline.toISOString(),
                reminderType,
                reminderLabel: getReminderPreviewLabel(reminderType),
                targetCount: missingStudents.length,
                studentNames: missingStudents.map((student) => student.name),
            });
        }

        if (items.length <= 0) {
            if (reminderSetting.beforeDeadline1d) {
                reasons.push("ตอนนี้ยังไม่มีงานที่ครบกำหนดในวันพรุ่งนี้");
            }
            if (reminderSetting.dueToday) {
                reasons.push("ตอนนี้ยังไม่มีงานที่ครบกำหนดวันนี้");
            }
            if (reminderSetting.overdue1d) {
                reasons.push("ตอนนี้ยังไม่มีงานที่เลยกำหนดมา 1 วันและยังมีคนค้างส่ง");
            }
            if (reminderSetting.weeklySummary) {
                reasons.push(
                    isBangkokMonday(now)
                        ? "วันนี้เป็นวันสรุปรายสัปดาห์ แต่ยังไม่มีงานค้างเก่าที่เข้าเงื่อนไข"
                        : "สรุปรายสัปดาห์จะทำงานในวันจันทร์ตามเวลาเอเชีย/กรุงเทพ"
                );
            }
            if (reasons.length <= 0 && blockers.length <= 0) {
                reasons.push("ยังไม่มีงานที่เข้าเงื่อนไขการเตือนของ preset นี้");
            }
        }

        return { items, reasons, blockers };
    }, [classroom, connectedGroupCount, reminderSetting]);
    const previewHeadline =
        reminderPreview.items.length > 0
            ? `ถ้าบันทึกตอนนี้ ระบบมีคิวส่ง ${reminderPreview.items.length} รายการ`
            : "ตอนนี้ยังไม่มีรายการที่จะถูกส่ง";
    const visibleStudentStatuses =
        showAllStudentStatuses || classroom.students.length <= 8
            ? classroom.students
            : classroom.students.slice(0, 8);

    function handleLineUpgradePromptClick(source: Parameters<typeof trackLineUpgradePromptClick>[0]["source"]) {
        trackLineUpgradePromptClick({
            classroomId: classroom.id,
            source,
        });
    }

    async function loadBindingCommand() {
        setBindingLoading(true);
        setBindingError(null);
        try {
            const response = await fetch(`/api/classrooms/${classroom.id}/line-binding-command`);
            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as
                    | { error?: string | { message?: string }; message?: string }
                    | null;
                const message =
                    typeof payload?.message === "string"
                        ? payload.message
                        : typeof payload?.error === "string"
                          ? payload.error
                          : typeof payload?.error === "object" && typeof payload.error?.message === "string"
                            ? payload.error.message
                            : "โหลดคำสั่งผูก LINE ไม่สำเร็จ";
                throw new Error(message);
            }
            const payload = (await response.json()) as LineBindingCommandPayload;
            setBindingCommand(payload);
        } catch (error) {
            setBindingError(error instanceof Error ? error.message : "โหลดคำสั่งผูก LINE ไม่สำเร็จ");
        } finally {
            setBindingLoading(false);
        }
    }

    async function loadReminderSettings() {
        setReminderSettingsLoading(true);
        try {
            const [settingResponse, deliveriesResponse] = await Promise.all([
                fetch(`/api/classrooms/${classroom.id}/line-reminder-settings`),
                fetch(`/api/classrooms/${classroom.id}/line-reminder-deliveries`),
            ]);

            if (!settingResponse.ok) {
                throw new Error("โหลดการตั้งค่าเตือน LINE ไม่สำเร็จ");
            }
            const settingPayload = (await settingResponse.json()) as { setting: LineReminderSettingPayload };
            setReminderSetting(settingPayload.setting);

            if (deliveriesResponse.ok) {
                const deliveryPayload = (await deliveriesResponse.json()) as {
                    deliveries: LineReminderDeliveryPayload[];
                };
                setReminderDeliveries(deliveryPayload.deliveries);
            }
        } catch (error) {
            toast({
                title: "โหลด LINE auto reminder ไม่สำเร็จ",
                description: error instanceof Error ? error.message : "ลองใหม่อีกครั้ง",
                variant: "destructive",
            });
        } finally {
            setReminderSettingsLoading(false);
        }
    }

    async function loadReadiness() {
        setReadinessLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classroom.id}/line-reminder-readiness`);
            if (res.ok) {
                const data = (await res.json()) as LineReminderReadinessPayload;
                setReadiness(data);
            }
        } catch {
            // silently ignore — readiness is supplemental info
        } finally {
            setReadinessLoading(false);
        }
    }

    async function runTestRun() {
        setTestRunLoading(true);
        setTestRunResult(null);
        try {
            const res = await fetch(`/api/classrooms/${classroom.id}/line-reminder-test-run`, {
                method: "POST",
            });
            if (res.ok) {
                const data = (await res.json()) as TestRunResult;
                setTestRunResult(data);
            } else {
                toast({ title: "ทดสอบไม่สำเร็จ", description: "กรุณาลองใหม่อีกครั้ง", variant: "destructive" });
            }
        } catch {
            toast({ title: "ทดสอบไม่สำเร็จ", description: "ไม่สามารถเชื่อมต่อได้", variant: "destructive" });
        } finally {
            setTestRunLoading(false);
        }
    }

    async function saveReminderSettings() {
        if (!reminderSetting) return;
        setReminderSettingsSaving(true);
        try {
            const response = await fetch(`/api/classrooms/${classroom.id}/line-reminder-settings`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reminderSetting),
            });
            if (!response.ok) {
                throw new Error("บันทึกการตั้งค่าเตือน LINE ไม่สำเร็จ");
            }
            const payload = (await response.json()) as { setting: LineReminderSettingPayload };
            setReminderSetting(payload.setting);
            toast({
                title: payload.setting.enabled ? "เปิด auto reminder แล้ว" : "ปิด auto reminder แล้ว",
                description: "การตั้งค่านี้มีผลเฉพาะห้องเรียนนี้",
            });
        } catch (error) {
            toast({
                title: "บันทึก LINE auto reminder ไม่สำเร็จ",
                description: error instanceof Error ? error.message : "ลองใหม่อีกครั้ง",
                variant: "destructive",
            });
        } finally {
            setReminderSettingsSaving(false);
        }
    }

    function updateReminderSetting(patch: Partial<LineReminderSettingPayload>) {
        setReminderSetting((current) =>
            current
                ? { ...current, ...patch }
                : {
                      classroomId: classroom.id,
                      enabled: false,
                      beforeDeadline1d: true,
                      dueToday: true,
                      overdue1d: true,
                      weeklySummary: false,
                      timezone: "Asia/Bangkok",
                      ...patch,
                  }
        );
    }

    function applyReminderPreset(presetKey: ReminderPresetKey) {
        const preset = REMINDER_PRESETS.find((item) => item.key === presetKey);
        if (!preset) return;
        updateReminderSetting(preset.values);
    }

    async function handleCopyBindingCommand() {
        if (!bindingCommand) return;
        await navigator.clipboard.writeText(bindingCommand.command);
        toast({
            title: "คัดลอกคำสั่งผูก LINE แล้ว",
            description: "นำไปวางในกลุ่ม LINE ที่เชิญบอทเข้าไว้ได้เลย",
        });
    }

    async function handleRefreshBindingStatus() {
        setBindingStatusRefreshing(true);
        setBindingError(null);
        try {
            await onRefreshBindingStatus();
            toast({
                title: "รีเฟรชสถานะ LINE แล้ว",
                description: "ถ้าผูกห้องใน LINE สำเร็จแล้ว badge และรายชื่อกลุ่มด้านบนจะอัปเดตทันที",
            });
        } catch (error) {
            setBindingError(error instanceof Error ? error.message : "รีเฟรชสถานะ LINE ไม่สำเร็จ");
        } finally {
            setBindingStatusRefreshing(false);
        }
    }

    useEffect(() => {
        if (!bindingDialogOpen || connectedGroupCount > 0) {
            setBindingPollingActive(false);
            return;
        }

        setBindingPollingActive(true);
        const intervalId = window.setInterval(() => {
            void onRefreshBindingStatus().catch(() => {
                // Keep polling quietly while the dialog is open.
            });
        }, 8000);

        return () => {
            window.clearInterval(intervalId);
            setBindingPollingActive(false);
        };
    }, [bindingDialogOpen, connectedGroupCount, onRefreshBindingStatus]);

    async function handleSendLine(row: AssignmentActionRow) {
        setSendingAssignmentId(row.assignmentId);
        try {
            const result = await sendAssignmentLineReminder({
                classroomId: classroom.id,
                assignmentId: row.assignmentId,
            });
            setLastLineSendByAssignment((current) => ({
                ...current,
                [row.assignmentId]: result.targetCount,
            }));
            toast({
                title:
                    result.sentCount > 0
                        ? "ส่ง LINE แล้ว"
                        : connectedGroupCount === 0
                          ? "ห้องนี้ยังไม่ได้ผูก LINE"
                          : "ยังไม่มีข้อความถูกส่ง",
                description:
                    result.sentCount > 0
                        ? `ส่งไป ${result.lineGroupCount} กลุ่ม ติดตามนักเรียนค้างส่ง ${result.targetCount} คน`
                        : connectedGroupCount === 0
                          ? "ผูกกลุ่ม LINE กับห้องนี้ก่อน แล้วค่อยส่งเตือนจากหน้าเดียวกัน"
                          : "ตรวจสอบการเชื่อมต่อ LINE ของห้องนี้อีกครั้ง",
                variant: result.sentCount > 0 ? "default" : "destructive",
            });
        } catch (error) {
            toast({
                title: "ส่ง LINE ไม่สำเร็จ",
                description: error instanceof Error ? error.message : "ลองใหม่อีกครั้ง",
                variant: "destructive",
            });
        } finally {
            setSendingAssignmentId(null);
        }
    }

    async function handleAnnounce(row: AssignmentActionRow, kind: AnnounceAssignmentLineKind) {
        setAnnouncingRow({ assignmentId: row.assignmentId, kind });
        try {
            const result = await announceAssignmentToLine({
                classroomId: classroom.id,
                assignmentId: row.assignmentId,
                kind,
            });
            const what = kind === "result" ? "ผลคะแนน" : "งาน";
            toast({
                title:
                    result.sentCount > 0
                        ? `ประกาศ${what}เข้า LINE แล้ว`
                        : connectedGroupCount === 0
                          ? "ห้องนี้ยังไม่ได้ผูก LINE"
                          : "ยังไม่มีข้อความถูกส่ง",
                description:
                    result.sentCount > 0
                        ? `ส่งการ์ดประกาศ${what}ไป ${result.lineGroupCount} กลุ่ม`
                        : connectedGroupCount === 0
                          ? "ผูกกลุ่ม LINE กับห้องนี้ก่อน แล้วค่อยประกาศจากหน้าเดียวกัน"
                          : "ตรวจสอบการเชื่อมต่อ LINE ของห้องนี้อีกครั้ง",
                variant: result.sentCount > 0 ? "default" : "destructive",
            });
        } catch (error) {
            toast({
                title: "ประกาศเข้า LINE ไม่สำเร็จ",
                description: error instanceof Error ? error.message : "ลองใหม่อีกครั้ง",
                variant: "destructive",
            });
        } finally {
            setAnnouncingRow(null);
        }
    }

    async function handleBulkReminder() {
        setBulkSending(true);
        try {
            const result = await sendClassroomLineReminder(classroom.id);
            setLastBulkResult(result);
            toast({
                title:
                    result.sentCount > 0
                        ? "ส่งสรุปงานค้างทั้งห้องแล้ว"
                        : connectedGroupCount === 0
                          ? "ห้องนี้ยังไม่ได้ผูก LINE"
                          : "ยังไม่มีข้อความถูกส่ง",
                description:
                    result.sentCount > 0
                        ? `ส่งไป ${result.lineGroupCount} กลุ่ม ครอบคลุม ${result.assignmentCount} งาน`
                        : connectedGroupCount === 0
                          ? "ผูกกลุ่ม LINE ก่อน จึงจะส่งทวงงานทั้งห้องได้"
                          : "ตรวจสอบการเชื่อมต่อ LINE ของห้องนี้อีกครั้ง",
                variant: result.sentCount > 0 ? "default" : "destructive",
            });
        } catch (error) {
            toast({
                title: "ส่งสรุปงานค้างไม่สำเร็จ",
                description: error instanceof Error ? error.message : "ลองใหม่อีกครั้ง",
                variant: "destructive",
            });
        } finally {
            setBulkSending(false);
        }
    }

    async function handleResetStudentLineLink(student: ClassroomDashboardViewModel["students"][number]) {
        if (!student.lineLink?.linked) return;
        const confirmed = window.confirm(
            `รีเซ็ตการเชื่อม LINE ของ ${student.name} ใช่ไหม?\nนักเรียนจะต้องกด เชื่อม LINE และส่งรหัสใหม่อีกครั้ง`
        );
        if (!confirmed) return;

        setResettingStudentId(student.id);
        try {
            const result = await resetStudentLineLink({
                classroomId: classroom.id,
                studentId: student.id,
            });
            await onRefreshBindingStatus();
            toast({
                title: "รีเซ็ต LINE แล้ว",
                description:
                    result.accountLinksDeleted + result.groupBindingsDeleted > 0
                        ? `${student.name} สามารถเชื่อม LINE ใหม่ได้แล้ว`
                        : `${student.name} ยังไม่มี LINE link ที่ต้องรีเซ็ต`,
            });
        } catch (error) {
            toast({
                title: "รีเซ็ต LINE ไม่สำเร็จ",
                description: error instanceof Error ? error.message : "ลองใหม่อีกครั้ง",
                variant: "destructive",
            });
        } finally {
            setResettingStudentId(null);
        }
    }

    return (
        <section className="rounded-[22px] border border-[#d9d9dd] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28px] text-[#93939f]">
                        LINE / งานมอบหมาย
                    </p>
                    <h2 className="mt-1 text-xl font-black text-[#212121]">จุดสั่งงานและทวงงานของห้องนี้</h2>
                    <p className="mt-1 text-sm text-[#6b7280]">
                        ส่ง LINE และดูว่างานไหนยังค้างจากหน้านี้ได้เลย
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                            connectedGroupCount > 0
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                        }`}
                    >
                        <Link2 className="h-3.5 w-3.5" />
                        {connectedGroupCount > 0
                            ? `LINE connected ${connectedGroupCount} กลุ่ม`
                            : "LINE ยังไม่ผูกกับห้องนี้"}
                    </span>
                    <Dialog
                        open={bindingDialogOpen}
                        onOpenChange={(open) => {
                            setBindingDialogOpen(open);
                            if (open && !bindingLoading) {
                                void loadBindingCommand();
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="h-9 rounded-full">
                                <Link2 className="mr-1.5 h-4 w-4" />
                                {connectedGroupCount > 0 ? "จัดการ LINE ห้องนี้" : "ผูก LINE ห้องนี้"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto rounded-[28px] border border-slate-200 p-0 shadow-2xl">
                            <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6 text-left">
                                <DialogTitle className="text-xl font-black">ผูก LINE กับห้องเรียนนี้</DialogTitle>
                                <DialogDescription className="text-sm text-slate-600">
                                    ใช้คำสั่งแบบหมดอายุสำหรับห้องนี้โดยเฉพาะ เพื่อลดการเปิดเผย secret ตรง ๆ
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                    <p className="font-bold text-slate-900">ขั้นตอน</p>
                                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                                        <li>เพิ่มบอท LINE เป็นเพื่อน และเชิญบอทเข้ากลุ่มห้องนี้</li>
                                        <li>เปิดกลุ่มนั้น แล้ววางคำสั่งผูกห้องจากด้านล่าง</li>
                                        <li>เมื่อผูกสำเร็จ กลุ่มนี้จะใช้ `Send LINE` และ `ทวงงานค้างทั้งห้อง` ได้ทันที</li>
                                    </ol>
                                </div>

                                {classroom.lineBotGroups.length > 0 ? (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                        <p className="font-bold">เชื่อมอยู่แล้ว {classroom.lineBotGroups.length} กลุ่ม</p>
                                        <ul className="mt-2 space-y-1">
                                            {classroom.lineBotGroups.map((group) => (
                                                <li key={group.id}>
                                                    - {group.name?.trim() || group.lineGroupId}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}

                                {bindingLoading ? (
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                                        กำลังโหลดคำสั่งผูก LINE...
                                    </div>
                                ) : bindingError ? (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                        {bindingError}
                                    </div>
                                ) : bindingCommand ? (
                                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 min-w-0">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">คำสั่งผูกห้องสำหรับ {bindingCommand.classroomName}</p>
                                                <p className="text-xs text-slate-500">
                                                    ใช้ได้ถึง {new Date(bindingCommand.expiresAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                                                </p>
                                            </div>
                                            <Button type="button" size="sm" className="h-9 w-full sm:w-auto" onClick={() => void handleCopyBindingCommand()}>
                                                <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                                                คัดลอกคำสั่ง
                                            </Button>
                                        </div>
                                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm text-slate-800 break-all whitespace-pre-wrap">
                                            {bindingCommand.command}
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-9 w-full sm:w-auto"
                                                onClick={() => void handleRefreshBindingStatus()}
                                                disabled={bindingStatusRefreshing}
                                            >
                                                {bindingStatusRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชสถานะ LINE"}
                                            </Button>
                                            <p className="text-xs leading-5 text-slate-500 sm:self-center">
                                                หลังวางคำสั่งในกลุ่ม LINE แล้ว กดปุ่มนี้เพื่ออัปเดตสถานะบนหน้านี้ทันที
                                            </p>
                                        </div>
                                        {bindingPollingActive ? (
                                            <p className="text-xs text-emerald-700">
                                                ระบบกำลังตรวจสอบสถานะ LINE อัตโนมัติทุก 8 วินาทีระหว่างที่หน้าต่างนี้เปิดอยู่
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog
                        open={reminderSettingsDialogOpen}
                        onOpenChange={(open) => {
                            if (open && !lineReminderUnlocked) return;
                            setReminderSettingsDialogOpen(open);
                            if (open) {
                                void loadReminderSettings();
                                void loadReadiness();
                            } else {
                                setTestRunResult(null);
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-full"
                                disabled={!lineReminderUnlocked}
                                title={
                                    lineReminderUnlocked
                                        ? undefined
                                        : "Auto reminder และ Send LINE ใช้ได้ในแผน Plus หรือ School"
                                }
                            >
                                <Settings className="mr-1.5 h-4 w-4" />
                                Auto LINE
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="h-[90vh] w-[min(94vw,760px)] max-w-none overflow-hidden rounded-[28px] border border-slate-200 p-0 shadow-2xl">
                            <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6 text-left">
                                <DialogTitle className="text-xl font-black">ตั้งค่า LINE auto reminder</DialogTitle>
                                <DialogDescription className="text-sm text-slate-600">
                                    ทำตามขั้นตอน 1–3 ด้านล่างสำหรับห้อง {classroom.name}
                                </DialogDescription>
                            </DialogHeader>

                            {reminderSettingsLoading && !reminderSetting ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                    กำลังโหลดการตั้งค่า...
                                </div>
                            ) : reminderSetting ? (
                                <div className="h-[calc(90vh-92px)] overflow-y-auto px-6 py-6">
                                    <div className="mx-auto max-w-[640px] space-y-7">
                                        {/* ── STEP 1 — เปิด/ปิด ───────────────────────────── */}
                                        <section className="space-y-3">
                                            <StepHeader
                                                step={1}
                                                title="เปิดใช้งาน auto reminder"
                                                subtitle="ระบบจะส่งเตือนงานค้างเข้ากลุ่ม LINE ให้อัตโนมัติทุกวัน"
                                            />
                                            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-bold text-slate-900">
                                                        {reminderSetting.enabled ? "เปิดอยู่ — ระบบจะส่งเตือนให้" : "ปิดอยู่ — ยังไม่ส่งเตือน"}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                                                        เปิดไว้ก่อนได้ ระบบจะส่งเฉพาะเมื่อพร้อมครบ (ดูขั้นตอนที่ 2)
                                                    </span>
                                                </span>
                                                <span
                                                    className={cn(
                                                        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition",
                                                        reminderSetting.enabled ? "bg-emerald-500" : "bg-slate-300"
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="peer sr-only"
                                                        checked={reminderSetting.enabled}
                                                        onChange={(event) => updateReminderSetting({ enabled: event.target.checked })}
                                                    />
                                                    <span
                                                        className={cn(
                                                            "absolute left-1 h-5 w-5 rounded-full bg-white shadow transition",
                                                            reminderSetting.enabled ? "translate-x-5" : "translate-x-0"
                                                        )}
                                                    />
                                                </span>
                                            </label>
                                        </section>

                                        {/* ── STEP 2 — ความพร้อม ──────────────────────────── */}
                                        <section className="space-y-3">
                                            <StepHeader
                                                step={2}
                                                title="ตรวจสอบความพร้อม"
                                                subtitle="ระบบจะส่งได้ต่อเมื่อผ่านครบทุกข้อด้านล่าง"
                                            />
                                            <ReadinessCard readiness={readiness} loading={readinessLoading} />
                                        </section>

                                        {/* ── STEP 3 — ความถี่ ────────────────────────────── */}
                                        <section className="space-y-3">
                                            <StepHeader
                                                step={3}
                                                title="เลือกความถี่การเตือน"
                                                subtitle={`เริ่มจากแบบ “แนะนำ” ก่อน แล้วค่อยปรับเองได้ — ใช้งานอยู่: ${
                                                    REMINDER_PRESETS.find((preset) => preset.key === activeReminderPreset)?.title ?? "กำหนดเอง"
                                                }`}
                                            />
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {REMINDER_PRESETS.map((preset) => {
                                                    const isActive = activeReminderPreset === preset.key;
                                                    return (
                                                        <button
                                                            key={preset.key}
                                                            type="button"
                                                            className={cn(
                                                                "flex flex-col rounded-2xl border p-4 text-left transition",
                                                                isActive
                                                                    ? "border-indigo-400 bg-indigo-50 shadow-sm"
                                                                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                                                            )}
                                                            onClick={() => applyReminderPreset(preset.key)}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-sm font-black text-slate-900">{preset.title}</span>
                                                                {isActive ? <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600" /> : null}
                                                            </div>
                                                            <p className="mt-1.5 text-xs leading-5 text-slate-500">{preset.description}</p>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {activeReminderPreset === "custom" ? (
                                                <div className="grid gap-2.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 sm:grid-cols-2">
                                                    {REMINDER_TRIGGER_OPTIONS.map((option) => (
                                                        <label
                                                            key={option.key}
                                                            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="mt-0.5 h-5 w-5"
                                                                checked={Boolean(reminderSetting[option.key])}
                                                                onChange={(event) =>
                                                                    updateReminderSetting({
                                                                        [option.key]: event.target.checked,
                                                                    } as Partial<LineReminderSettingPayload>)
                                                                }
                                                            />
                                                            <span>
                                                                <span className="block text-sm font-bold text-slate-900">{option.label}</span>
                                                                <span className="mt-0.5 block text-xs leading-5 text-slate-500">{option.hint}</span>
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {activeReminderLabels.length > 0 ? (
                                                        activeReminderLabels.map((label) => (
                                                            <span
                                                                key={label}
                                                                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700"
                                                            >
                                                                {label}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
                                                            ยังไม่ได้เลือกช่วงเตือน
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </section>

                                        {/* ── พรีวิว ───────────────────────────────────────── */}
                                        <section className="space-y-3 border-t border-slate-100 pt-6">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-base font-black text-slate-900">พรีวิว: ถ้าบันทึกตอนนี้จะส่งอะไร</p>
                                                <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                                                    {reminderPreview.items.reduce((sum, item) => sum + item.targetCount, 0)} คน
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500">{previewHeadline}</p>

                                            {reminderPreview.items.length > 0 ? (
                                                <div className="space-y-2.5">
                                                    {reminderPreview.items.slice(0, 4).map((item) => (
                                                        <div
                                                            key={item.assignmentId + "-" + item.reminderType}
                                                            className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3"
                                                        >
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
                                                                    {item.reminderLabel}
                                                                </span>
                                                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                                                                    {item.targetCount} คน
                                                                </span>
                                                            </div>
                                                            <p className="mt-1.5 text-sm font-bold text-slate-900">{item.assignmentName}</p>
                                                            <p className="mt-0.5 text-xs text-slate-500">
                                                                กำหนดส่ง {formatDeadlineDisplayTh(item.deadline)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                                                    <p className="text-sm font-bold text-slate-700">ยังไม่มีคิวส่งในตอนนี้</p>
                                                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-500">
                                                        {reminderPreview.blockers.map((reason) => (
                                                            <li key={reason}>• {reason}</li>
                                                        ))}
                                                        {reminderPreview.reasons.map((reason) => (
                                                            <li key={reason}>• {reason}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </section>

                                        {/* ── ทดสอบ & ประวัติ ─────────────────────────────── */}
                                        <section className="space-y-3 border-t border-slate-100 pt-6">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-base font-black text-slate-900">ทดสอบ &amp; ประวัติการส่ง</p>
                                                    <p className="mt-0.5 text-sm text-slate-500">ลองรันดูว่าจะส่งอะไร โดยยังไม่ส่งจริง</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={testRunLoading}
                                                    onClick={() => void runTestRun()}
                                                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                                                >
                                                    {testRunLoading ? (
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                                                    ) : (
                                                        <SendHorizonal className="h-4 w-4 text-indigo-600" />
                                                    )}
                                                    {testRunLoading ? "กำลังตรวจสอบ..." : "ทดสอบตอนนี้"}
                                                </button>
                                            </div>
                                            {testRunResult ? <TestRunResultPanel result={testRunResult} /> : null}
                                            <DeliveryHistorySection deliveries={reminderDeliveries} />
                                        </section>
                                    </div>

                                    <div className="sticky bottom-0 z-10 -mx-6 mt-6 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
                                        <div className="mx-auto flex max-w-[640px] flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-11 rounded-2xl px-5"
                                                    onClick={() => {
                                                        void loadReminderSettings();
                                                        void loadReadiness();
                                                    }}
                                                    disabled={reminderSettingsLoading}
                                                >
                                                    รีเฟรช
                                                </Button>
                                                <Button
                                                    type="button"
                                                    className="h-11 rounded-2xl bg-[#000000] px-5 text-white hover:opacity-85"
                                                    onClick={() => void saveReminderSettings()}
                                                    disabled={reminderSettingsSaving}
                                                >
                                                    {reminderSettingsSaving
                                                        ? "กำลังบันทึก..."
                                                        : reminderSetting.enabled
                                                          ? "บันทึกและเปิดใช้งาน"
                                                          : "บันทึกการตั้งค่า"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                ) : null}
                        </DialogContent>
                    </Dialog>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-full"
                        onClick={() => onOpenAssignment(null)}
                    >
                        <ExternalLink className="mr-1.5 h-4 w-4" />
                        สรุปงาน
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="h-9 rounded-full bg-[#000000] text-white hover:opacity-85"
                        onClick={() => void handleBulkReminder()}
                        disabled={bulkSending || !lineReminderUnlocked}
                        title={
                            lineReminderUnlocked
                                ? undefined
                                : "Send LINE และทวงงานค้างทั้งห้อง ใช้ได้ในแผน Plus หรือ School"
                        }
                    >
                        <MessageCircleMore className="mr-1.5 h-4 w-4" />
                        {bulkSending ? "กำลังส่ง..." : "ทวงงานค้างทั้งห้อง"}
                    </Button>
                </div>
            </div>

            {/* ── Inline Auto Reminder Status Strip ── */}
            {lineReminderUnlocked ? (
                <div className="mt-4">
                    <AutoReminderStatusStrip
                        readiness={readiness}
                        loading={readinessLoading}
                        onOpenSettings={() => {
                            setReminderSettingsDialogOpen(true);
                            if (!reminderSetting) {
                                void loadReminderSettings();
                            }
                            if (!readiness) {
                                void loadReadiness();
                            }
                        }}
                    />
                </div>
            ) : null}

            {(!lineReminderUnlocked || !lineSubmissionUnlocked || !lineAiUnlocked) ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="font-black">LINE บนแผน Free ใช้ได้บางส่วน</p>
                            <p className="mt-1 text-amber-900">
                                Free ยังผูกห้องและสร้างงานจาก LINE ได้แบบจำกัด แต่ฟีเจอร์ที่ช่วยครูทำงานเร็วขึ้นจะถูกล็อกไว้จนกว่าจะอัปเกรด
                            </p>
                            <p className="mt-2 text-xs font-semibold text-amber-800">
                                Plus ปลด: Send LINE, auto reminder, LINE submissions และ AI ตรวจเบื้องต้น
                            </p>
                        </div>
                        <Button asChild size="sm" className="h-9 rounded-full bg-amber-900 text-white hover:bg-amber-950">
                            <Link
                                href="/dashboard/upgrade"
                                onClick={() => handleLineUpgradePromptClick("line_panel_blocked_card")}
                            >
                                ดูแผน Plus
                            </Link>
                        </Button>
                    </div>
                </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">เลยกำหนด</p>
                    <p className="mt-1 text-2xl font-black text-rose-900">{overdueCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">ใกล้ถึงกำหนด</p>
                    <p className="mt-1 text-2xl font-black text-amber-900">{dueSoonCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ช่องส่งงานที่ยังขาด</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{missingSubmissionSlots}</p>
                </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-black text-slate-900">สถานะการเชื่อม LINE ของนักเรียน</p>
                        <p className="mt-1 text-xs text-slate-500">
                            ดูได้ทันทีว่าใครพร้อมใช้งาน LINE ส่วนตัวแล้ว และใครยังต้องให้กดปุ่มเชื่อมจากหน้าเว็บนักเรียน
                        </p>
                        {lineReminderUnlocked && (
                            <button
                                type="button"
                                onClick={() => {
                                    setReminderSettingsDialogOpen(true);
                                    if (!reminderSetting) void loadReminderSettings();
                                    if (!readiness) void loadReadiness();
                                }}
                                className="mt-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                            >
                                ตั้งค่า auto reminder →
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                            เชื่อมแล้ว {linkedStudents.length} คน
                        </span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                            ยังไม่เชื่อม {pendingLinkedStudents.length} คน
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            พร้อมใช้ {linkedPercent}%
                        </span>
                    </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleStudentStatuses.map((student) => {
                        const linkedAtLabel = student.lineLink?.linkedAt
                            ? new Date(student.lineLink.linkedAt).toLocaleString("th-TH", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                  timeZone: "Asia/Bangkok",
                              })
                            : null;
                        const maskedLineUserId = maskLineUserId(student.lineLink?.lineUserId);
                        const isResetting = resettingStudentId === student.id;

                        return (
                            <div
                                key={student.id}
                                className="rounded-2xl border border-white bg-white px-3 py-3 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-slate-900">{student.name}</p>
                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                            รหัสเข้า {student.loginCode ?? "-"}
                                            {student.nickname ? ` โ€ข ${student.nickname}` : ""}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                            student.lineLink?.linked
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-amber-100 text-amber-800"
                                        }`}
                                    >
                                        {student.lineLink?.linked ? "เชื่อมแล้ว" : "รอเชื่อม"}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {student.lineLink?.linked && linkedAtLabel
                                        ? `เชื่อมเมื่อ ${linkedAtLabel}${maskedLineUserId ? ` โ€ข LINE ${maskedLineUserId}` : ""}`
                                        : "ให้นักเรียนล็อกอินแล้วกด เชื่อม LINE จากหน้าเว็บของตน"}
                                </p>
                                {student.lineLink?.linked ? (
                                    <div className="mt-3 flex justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 rounded-full border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50"
                                            disabled={isResetting}
                                            onClick={() => void handleResetStudentLineLink(student)}
                                        >
                                            {isResetting ? "กำลังรีเซ็ต..." : "รีเซ็ต LINE"}
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                {classroom.students.length > 8 ? (
                    <div className="mt-3 flex justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-slate-600"
                            onClick={() => setShowAllStudentStatuses((current) => !current)}
                        >
                            {showAllStudentStatuses
                                ? "ซ่อนรายชื่อนักเรียน"
                                : `ดูนักเรียนทั้งหมด ${classroom.students.length} คน`}
                        </Button>
                    </div>
                ) : null}
            </div>

            {connectedGroupCount === 0 ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                            ห้องนี้ยังไม่ผูกกับ LINE group จึงยังส่ง `Send LINE` หรือ `ทวงงานค้างทั้งห้อง` ไม่ได้
                            ตอนนี้ยังผูกผ่านคำสั่ง LINE เดิมก่อน: `ผูกห้อง classroomId secret`
                        </div>
                    </div>
                </div>
            ) : null}

            {lastBulkResult?.sentCount ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    ส่งสรุปงานค้างแล้ว {lastBulkResult.sentCount} กลุ่ม ครอบคลุม {lastBulkResult.assignmentCount} งาน
                </div>
            ) : null}

            <div className="mt-5 space-y-3">
                {hotRows.length > 0 ? (
                    hotRows.map((row) => {
                        const deadlineLabel = row.deadline
                            ? formatDeadlineDisplayTh(row.deadline)
                            : "ไม่มีกำหนดส่ง";
                        const lastSentCount = lastLineSendByAssignment[row.assignmentId];
                        // Assignments within ±1 Bangkok calendar day are in the auto-reminder window
                        const isInAutoWindow = (() => {
                            if (!row.deadline || !readiness || readiness.readiness === 'worker_unavailable') return false;
                            if (readiness.readiness === 'auto_reminder_disabled') return false;
                            const diff = diffBangkokCalendarDays(new Date(row.deadline), new Date());
                            return diff >= -1 && diff <= 1;
                        })();

                        return (
                            <div
                                key={row.assignmentId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-black text-slate-900">{row.name}</p>
                                        {row.overdue ? (
                                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                                เลยกำหนด
                                            </span>
                                        ) : row.dueSoon ? (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                                ใกล้ส่ง
                                            </span>
                                        ) : null}
                                        {row.missingSubmissions > 0 ? (
                                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                ค้าง {row.missingSubmissions} คน
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                ส่งครบแล้ว
                                            </span>
                                        )}
                                        {isInAutoWindow && readiness && readiness.readiness !== 'auto_reminder_disabled' ? (
                                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                                🔔 auto
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        กำหนดส่ง {deadlineLabel}
                                        {row.deadline && isAssignmentDeadlinePast(row.deadline)
                                            ? " ยท ต้องติดตามก่อน"
                                            : ""}
                                    </p>
                                    {typeof lastSentCount === "number" ? (
                                        <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                                            ส่ง LINE ล่าสุดสำหรับนักเรียนค้าง {lastSentCount} คน
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 rounded-full bg-emerald-600 px-3 text-white hover:bg-emerald-700"
                                        onClick={() => void handleAnnounce(row, "assignment")}
                                        disabled={
                                            (announcingRow?.assignmentId === row.assignmentId &&
                                                announcingRow.kind === "assignment") ||
                                            !lineReminderUnlocked
                                        }
                                        title={
                                            lineReminderUnlocked
                                                ? undefined
                                                : "ประกาศงานผ่าน LINE ใช้ได้ในแผน Plus หรือ School"
                                        }
                                    >
                                        <MessageCircleMore className="mr-1 h-3.5 w-3.5" />
                                        {announcingRow?.assignmentId === row.assignmentId &&
                                        announcingRow.kind === "assignment"
                                            ? "กำลังส่ง..."
                                            : "ประกาศงาน"}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                        onClick={() => void handleSendLine(row)}
                                        disabled={sendingAssignmentId === row.assignmentId || !lineReminderUnlocked}
                                        title={
                                            lineReminderUnlocked
                                                ? undefined
                                                : "ทวงงาน ใช้ได้ในแผน Plus หรือ School"
                                        }
                                    >
                                        <SendHorizonal className="mr-1 h-3.5 w-3.5" />
                                        {sendingAssignmentId === row.assignmentId ? "กำลังส่ง..." : "ทวงงาน"}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 rounded-full bg-sky-500 px-3 text-white hover:bg-sky-600"
                                        onClick={() => void handleAnnounce(row, "result")}
                                        disabled={
                                            (announcingRow?.assignmentId === row.assignmentId &&
                                                announcingRow.kind === "result") ||
                                            !lineReminderUnlocked
                                        }
                                        title={
                                            lineReminderUnlocked
                                                ? undefined
                                                : "ประกาศคะแนนผ่าน LINE ใช้ได้ในแผน Plus หรือ School"
                                        }
                                    >
                                        {announcingRow?.assignmentId === row.assignmentId &&
                                        announcingRow.kind === "result"
                                            ? "กำลังส่ง..."
                                            : "ประกาศคะแนน"}
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center text-sm text-slate-600">
                        ตอนนี้ยังไม่มีงานค้างหรือกำหนดส่งเร่งด่วนในห้องนี้
                    </div>
                )}
            </div>
        </section>
    );
}
