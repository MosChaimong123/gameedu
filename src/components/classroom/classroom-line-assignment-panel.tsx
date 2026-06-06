"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Clipboard, Download, ExternalLink, Link2, MessageCircleMore, SendHorizonal, Settings } from "lucide-react";
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
import {
    resetStudentLineLink,
    sendAssignmentLineReminder,
    sendClassroomLineReminder,
    trackLineUpgradePromptClick,
    type SendClassroomLineReminderResult,
} from "@/lib/classroom-dashboard-actions";
import { canUseLineFeature } from "@/lib/line-bot/plan-access";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/classroom-dashboard.types";
import { buildAssignmentReminderMessage } from "@/components/dashboard/assignment-command-center.helpers";

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

export function ClassroomLineAssignmentPanel({
    classroom,
    onOpenAssignment,
    onRefreshBindingStatus,
}: ClassroomLineAssignmentPanelProps) {
    const { toast } = useToast();
    const [copiedAssignmentId, setCopiedAssignmentId] = useState<string | null>(null);
    const [sendingAssignmentId, setSendingAssignmentId] = useState<string | null>(null);
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
    const rows = useMemo(() => summarizeAssignments(classroom), [classroom]);

    const connectedGroupCount = classroom.lineBotGroups.length;
    const missingSubmissionSlots = rows.reduce((sum, row) => sum + row.missingSubmissions, 0);
    const overdueCount = rows.filter((row) => row.overdue).length;
    const dueSoonCount = rows.filter((row) => row.dueSoon).length;
    const hotRows = rows.filter((row) => row.missingSubmissions > 0 || row.overdue || row.dueSoon).slice(0, 8);
    const linkedStudents = classroom.students.filter((student) => student.lineLink?.linked);
    const pendingLinkedStudents = classroom.students.filter((student) => !student.lineLink?.linked);
    const lineReminderUnlocked = canUseLineFeature(classroom.teacher, "lineAutoReminders");
    const lineExportUnlocked = canUseLineFeature(classroom.teacher, "lineExport");
    const lineSubmissionUnlocked = canUseLineFeature(classroom.teacher, "lineSubmission");
    const lineAiUnlocked = canUseLineFeature(classroom.teacher, "lineAiPreliminaryGrading");
    const linkedPercent =
        classroom.students.length > 0
            ? Math.round((linkedStudents.length / classroom.students.length) * 100)
            : 0;
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

    async function handleCopyReminder(row: AssignmentActionRow) {
        const message = buildAssignmentReminderMessage({
            assignmentId: row.assignmentId,
            classId: classroom.id,
            classroomName: classroom.name,
            name: row.name,
            type: "score",
            deadline: row.deadline,
            missingSubmissions: row.missingSubmissions,
            overdue: row.overdue,
            dueWithinRange: row.dueSoon,
            lineReminderCount: 0,
            lastLineReminderSentAt: null,
            lastLineReminderTargetCount: null,
        });

        await navigator.clipboard.writeText(message);
        setCopiedAssignmentId(row.assignmentId);
        window.setTimeout(() => setCopiedAssignmentId(null), 1800);
        toast({
            title: "คัดลอกข้อความเตือนแล้ว",
            description: `งาน ${row.name} พร้อมนำไปส่งต่อใน LINE`,
        });
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
                        ส่ง LINE, เปิดตารางคะแนน, export งาน และดูว่างานไหนยังค้างจากหน้านี้ได้เลย
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
                        <DialogContent className="sm:max-w-[640px]">
                            <DialogHeader>
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
                                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">คำสั่งผูกห้องสำหรับ {bindingCommand.classroomName}</p>
                                                <p className="text-xs text-slate-500">
                                                    ใช้ได้ถึง {new Date(bindingCommand.expiresAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                                                </p>
                                            </div>
                                            <Button type="button" size="sm" className="h-8" onClick={() => void handleCopyBindingCommand()}>
                                                <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                                                คัดลอกคำสั่ง
                                            </Button>
                                        </div>
                                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm text-slate-800">
                                            {bindingCommand.command}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8"
                                                onClick={() => void handleRefreshBindingStatus()}
                                                disabled={bindingStatusRefreshing}
                                            >
                                                {bindingStatusRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชสถานะ LINE"}
                                            </Button>
                                            <p className="self-center text-xs text-slate-500">
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
                        <DialogContent className="sm:max-w-[640px]">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black">ตั้งค่า LINE auto reminder</DialogTitle>
                                <DialogDescription className="text-sm text-slate-600">
                                    ตั้งค่าเฉพาะห้อง {classroom.name} เพื่อให้ระบบส่งเตือนงานตามกำหนดอัตโนมัติ
                                </DialogDescription>
                            </DialogHeader>

                            {reminderSettingsLoading && !reminderSetting ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                    กำลังโหลดการตั้งค่า...
                                </div>
                            ) : reminderSetting ? (
                                <div className="space-y-4">
                                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            className="mt-1 h-4 w-4"
                                            checked={reminderSetting.enabled}
                                            onChange={(event) => updateReminderSetting({ enabled: event.target.checked })}
                                        />
                                        <span>
                                            <span className="block text-sm font-bold text-slate-900">เปิด auto reminder ห้องนี้</span>
                                            <span className="block text-xs text-slate-500">
                                                ระบบ cron จะส่งเฉพาะห้องที่เปิดไว้ และต้องผูกกลุ่ม LINE แล้ว
                                            </span>
                                        </span>
                                    </label>

                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                        {[
                                            ["beforeDeadline1d", "ก่อนครบกำหนด 1 วัน"],
                                            ["dueToday", "วันครบกำหนด"],
                                            ["overdue1d", "เลยกำหนด 1 วัน"],
                                            ["weeklySummary", "สรุปรายสัปดาห์"],
                                        ].map(([key, label]) => (
                                            <label
                                                key={key}
                                                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={Boolean(reminderSetting[key as keyof LineReminderSettingPayload])}
                                                    onChange={(event) =>
                                                        updateReminderSetting({
                                                            [key]: event.target.checked,
                                                        } as Partial<LineReminderSettingPayload>)
                                                    }
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>

                                    <div className="flex flex-wrap justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => void loadReminderSettings()}
                                            disabled={reminderSettingsLoading}
                                        >
                                            รีเฟรช
                                        </Button>
                                        <Button
                                            type="button"
                                            className="bg-[#000000] text-white hover:opacity-85"
                                            onClick={() => void saveReminderSettings()}
                                            disabled={reminderSettingsSaving}
                                        >
                                            {reminderSettingsSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                                        </Button>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-black text-slate-900">ประวัติส่ง LINE ล่าสุด</p>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                                                {reminderDeliveries.length} รายการ
                                            </span>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {reminderDeliveries.length > 0 ? (
                                                reminderDeliveries.slice(0, 8).map((delivery) => (
                                                    <div
                                                        key={delivery.id}
                                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"
                                                    >
                                                        <span className="font-bold text-slate-900">
                                                            {delivery.assignmentName ?? delivery.reminderType}
                                                        </span>
                                                        <span>
                                                            {delivery.reminderType} · {delivery.status ?? "sent"} ·{" "}
                                                            {delivery.targetCount} คน ·{" "}
                                                            {new Date(delivery.sentAt).toLocaleString("th-TH", {
                                                                dateStyle: "short",
                                                                timeStyle: "short",
                                                                timeZone: "Asia/Bangkok",
                                                            })}
                                                            {delivery.errorMessage ? ` · ${delivery.errorMessage}` : ""}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-slate-500">ยังไม่มีประวัติส่ง LINE ของห้องนี้</p>
                                            )}
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
                    {lineExportUnlocked ? (
                        <Button asChild variant="outline" size="sm" className="h-9 rounded-full gap-1">
                            <a href={`/api/classrooms/${classroom.id}/line-readiness/export`}>
                                <Download className="h-4 w-4" />
                                Export readiness
                            </a>
                        </Button>
                    ) : (
                        <Button type="button" variant="outline" size="sm" className="h-9 rounded-full gap-1" disabled title="LINE export ใช้ได้ในแผน Plus หรือ School">
                            <Download className="h-4 w-4" />
                            Export readiness
                        </Button>
                    )}
                    {lineExportUnlocked ? (
                        <Button asChild variant="outline" size="sm" className="h-9 rounded-full gap-1">
                            <a href={`/api/classrooms/${classroom.id}/line-submissions/export`}>
                                <Download className="h-4 w-4" />
                                Export ทั้งห้อง
                            </a>
                        </Button>
                    ) : (
                        <Button type="button" variant="outline" size="sm" className="h-9 rounded-full gap-1" disabled title="LINE export ใช้ได้ในแผน Plus หรือ School">
                            <Download className="h-4 w-4" />
                            Export ทั้งห้อง
                        </Button>
                    )}
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

            {(!lineReminderUnlocked || !lineExportUnlocked || !lineSubmissionUnlocked || !lineAiUnlocked) ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="font-black">LINE บนแผน Free ใช้ได้บางส่วน</p>
                            <p className="mt-1 text-amber-900">
                                Free ยังผูกห้องและสร้างงานจาก LINE ได้แบบจำกัด แต่ฟีเจอร์ที่ช่วยครูทำงานเร็วขึ้นจะถูกล็อกไว้จนกว่าจะอัปเกรด
                            </p>
                            <p className="mt-2 text-xs font-semibold text-amber-800">
                                Plus ปลด: Send LINE, auto reminder, LINE submissions, export, และ AI ตรวจเบื้องต้น
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
                                            {student.nickname ? ` • ${student.nickname}` : ""}
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
                                        ? `เชื่อมเมื่อ ${linkedAtLabel}${maskedLineUserId ? ` • LINE ${maskedLineUserId}` : ""}`
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
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        กำหนดส่ง {deadlineLabel}
                                        {row.deadline && isAssignmentDeadlinePast(row.deadline)
                                            ? " · ต้องติดตามก่อน"
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
                                        variant="outline"
                                        className="h-8 gap-1"
                                        onClick={() => void handleCopyReminder(row)}
                                    >
                                        {copiedAssignmentId === row.assignmentId ? (
                                            <Check className="h-3.5 w-3.5" />
                                        ) : (
                                            <Clipboard className="h-3.5 w-3.5" />
                                        )}
                                        {copiedAssignmentId === row.assignmentId ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}
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
                                                : "Send LINE ใช้ได้ในแผน Plus หรือ School"
                                        }
                                    >
                                        <SendHorizonal className="mr-1 h-3.5 w-3.5" />
                                        {sendingAssignmentId === row.assignmentId ? "กำลังส่ง..." : "Send LINE"}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8"
                                        onClick={() => onOpenAssignment(row.assignmentId)}
                                    >
                                        เปิดตารางคะแนน
                                    </Button>
                                    <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-slate-600">
                                        <a href={`/api/classrooms/${classroom.id}/assignments/${row.assignmentId}/export`}>
                                            <Download className="h-3.5 w-3.5" />
                                            Export
                                        </a>
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
