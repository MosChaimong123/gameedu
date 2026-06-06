"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Loader2,
    RefreshCw,
    ScrollText,
    Siren,
    Webhook,
} from "lucide-react";
import { PageBackLink } from "@/components/ui/page-back-link";
import { Button } from "@/components/ui/button";

type HealthStatus = "healthy" | "degraded";
type CheckState = "configured" | "missing";

type LineHealthResponse = {
    ok: boolean;
    status: HealthStatus;
    checks: {
        enabled: boolean;
        channelSecret: CheckState;
        channelAccessToken: CheckState;
        bindingSecret: CheckState;
        cronSecret: CheckState;
        appUrl: CheckState;
        botChatUrl: CheckState;
        geminiApiKey: CheckState;
        webhookPath: string;
    };
    webhook: {
        lastAuditEventAt: string | null;
        lastAuditAction: string | null;
        lastAuditStatus: string | null;
        lastEventCount: number | null;
    };
    reminders: {
        lastDeliveryAt: string | null;
        lastDeliveryType: string | null;
        lastDeliveryTargetCount: number | null;
        lastCronRunAt: string | null;
        lastCronRunStatus: string | null;
    };
    errors: {
        lastLineErrorAt: string | null;
        lastLineErrorAction: string | null;
        lastLineErrorReason: string | null;
    };
    recentEvents: Array<{
        action: string;
        status: "success" | "rejected" | "error";
        reason: string | null;
        targetType: string;
        targetId: string | null;
        timestamp: string;
    }>;
    timestamp: string;
};

function formatDateTime(value: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
    });
}

function statusClassName(status: string) {
    if (status === "success") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "rejected") {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }
    return "border-rose-200 bg-rose-50 text-rose-700";
}

function getErrorMessage(payload: unknown) {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    const record = payload as { message?: unknown; error?: unknown };
    if (typeof record.message === "string") {
        return record.message;
    }
    if (typeof record.error === "string") {
        return record.error;
    }
    if (record.error && typeof record.error === "object") {
        const nested = record.error as { message?: unknown };
        if (typeof nested.message === "string") {
            return nested.message;
        }
    }
    return null;
}

function CheckBadge({ ok, label }: { ok: boolean; label: string }) {
    return (
        <div
            className={`rounded-xl border px-3 py-3 text-sm ${
                ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
        >
            <div className="flex items-center gap-2 font-bold">
                {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {label}
            </div>
        </div>
    );
}

function InfoCard({
    title,
    value,
    subvalue,
}: {
    title: string;
    value: string;
    subvalue?: string | null;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-2 text-base font-black text-slate-900">{value}</p>
            {subvalue ? <p className="mt-1 text-xs text-slate-500">{subvalue}</p> : null}
        </div>
    );
}

export function AdminLineHealthClient() {
    const [data, setData] = useState<LineHealthResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
        if (mode === "initial") {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        try {
            const response = await fetch("/api/health/line", { cache: "no-store" });
            const payload = (await response.json().catch(() => null)) as unknown;

            if (!response.ok) {
                const message = getErrorMessage(payload) ?? "โหลด LINE health ไม่สำเร็จ";
                throw new Error(message);
            }

            setData(payload as LineHealthResponse);
            setError(null);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "โหลด LINE health ไม่สำเร็จ");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load("initial");
    }, [load]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            void load("refresh");
        }, 30000);
        return () => window.clearInterval(timer);
    }, [load]);

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                        <PageBackLink href="/admin" label="กลับหน้าแอดมิน" />
                        <div>
                            <div className="flex items-center gap-2">
                                <Webhook className="h-5 w-5 text-emerald-600" />
                                <h1 className="text-2xl font-black text-slate-900">LINE Health</h1>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                เช็ก config, webhook, cron reminder และ error ล่าสุดของระบบ LINE ได้จากหน้านี้
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => void load("refresh")}
                        disabled={refreshing}
                    >
                        {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        รีเฟรช
                    </Button>
                </div>

                {loading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
                        <p className="mt-3 text-sm text-slate-500">กำลังโหลดสถานะ LINE...</p>
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-900 shadow-sm">
                        <div className="flex items-center gap-2 font-black">
                            <Siren className="h-5 w-5" />
                            โหลด LINE health ไม่สำเร็จ
                        </div>
                        <p className="mt-2 text-sm">{error}</p>
                    </div>
                ) : data ? (
                    <>
                        <div
                            className={`rounded-2xl border px-6 py-5 shadow-sm ${
                                data.ok
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                                    : "border-amber-200 bg-amber-50 text-amber-950"
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide">
                                        สถานะรวม
                                    </p>
                                    <p className="mt-2 text-2xl font-black">
                                        {data.status === "healthy" ? "พร้อมใช้งาน" : "ยังต้องเช็กเพิ่ม"}
                                    </p>
                                    <p className="mt-1 text-sm opacity-80">
                                        อัปเดตล่าสุด {formatDateTime(data.timestamp)}
                                    </p>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <CheckBadge ok={data.checks.enabled} label="LINE bot enabled" />
                                    <CheckBadge ok={data.checks.cronSecret === "configured"} label="Cron secret" />
                                    <CheckBadge ok={data.checks.channelSecret === "configured"} label="Channel secret" />
                                    <CheckBadge ok={data.checks.channelAccessToken === "configured"} label="Access token" />
                                    <CheckBadge ok={data.checks.appUrl === "configured"} label="Public app URL" />
                                    <CheckBadge ok={data.checks.botChatUrl === "configured"} label="Bot chat URL" />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <InfoCard
                                title="Webhook ล่าสุด"
                                value={formatDateTime(data.webhook.lastAuditEventAt)}
                                subvalue={
                                    data.webhook.lastAuditAction
                                        ? `${data.webhook.lastAuditAction} · ${data.webhook.lastAuditStatus ?? "-"}`
                                        : "ยังไม่มี webhook audit"
                                }
                            />
                            <InfoCard
                                title="Cron ล่าสุด"
                                value={formatDateTime(data.reminders.lastCronRunAt)}
                                subvalue={data.reminders.lastCronRunStatus ? `status: ${data.reminders.lastCronRunStatus}` : "ยังไม่มี cron audit"}
                            />
                            <InfoCard
                                title="Reminder ล่าสุด"
                                value={formatDateTime(data.reminders.lastDeliveryAt)}
                                subvalue={
                                    data.reminders.lastDeliveryType
                                        ? `${data.reminders.lastDeliveryType} · เป้าหมาย ${data.reminders.lastDeliveryTargetCount ?? 0} คน`
                                        : "ยังไม่มี delivery"
                                }
                            />
                            <InfoCard
                                title="LINE error ล่าสุด"
                                value={formatDateTime(data.errors.lastLineErrorAt)}
                                subvalue={
                                    data.errors.lastLineErrorAction
                                        ? `${data.errors.lastLineErrorAction} · ${data.errors.lastLineErrorReason ?? "-"}`
                                        : "ยังไม่พบ error/rejected ล่าสุด"
                                }
                            />
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-black text-slate-900">Config readiness</h2>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <CheckBadge ok={data.checks.channelSecret === "configured"} label="LINE_CHANNEL_SECRET" />
                                    <CheckBadge ok={data.checks.channelAccessToken === "configured"} label="LINE_CHANNEL_ACCESS_TOKEN" />
                                    <CheckBadge ok={data.checks.bindingSecret === "configured"} label="LINE_CLASSROOM_BINDING_SECRET" />
                                    <CheckBadge ok={data.checks.cronSecret === "configured"} label="LINE_REMINDER_CRON_SECRET" />
                                    <CheckBadge ok={data.checks.appUrl === "configured"} label="NEXT_PUBLIC_APP_URL" />
                                    <CheckBadge ok={data.checks.botChatUrl === "configured"} label="LINE_BOT_CHAT_URL" />
                                    <CheckBadge ok={data.checks.geminiApiKey === "configured"} label="GEMINI_API_KEY (optional)" />
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                                        <div className="font-bold text-slate-900">Webhook path</div>
                                        <div className="mt-1 font-mono text-xs">{data.checks.webhookPath}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-black text-slate-900">Quick interpretation</h2>
                                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                                    <li>
                                        ถ้า <span className="font-bold">Webhook ล่าสุด</span> ว่าง แปลว่ายังไม่มี event เข้า หรือ audit ยังไม่ถูกยิง
                                    </li>
                                    <li>
                                        ถ้า <span className="font-bold">Cron ล่าสุด</span> ว่าง แปลว่า scheduler ยังไม่เรียก `/api/jobs/line-reminders`
                                    </li>
                                    <li>
                                        ถ้า <span className="font-bold">Reminder ล่าสุด</span> มี แต่ cron ล่าสุดว่าง แปลว่าอาจเคยส่งจาก manual route
                                    </li>
                                    <li>
                                        ถ้ามี <span className="font-bold">LINE error ล่าสุด</span> ให้เปิด `/admin/audit?category=line`
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <ScrollText className="h-5 w-5 text-emerald-600" />
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900">Recent LINE audit</h2>
                                        <p className="text-xs text-slate-500">
                                            เหตุการณ์ LINE ล่าสุดที่ระบบบันทึกไว้ ใช้เช็ก webhook, cron, reminder และ error ได้เร็ว
                                        </p>
                                    </div>
                                </div>
                                <Button asChild variant="outline" size="sm" className="rounded-full">
                                    <Link href="/admin/audit?category=line">
                                        ดูทั้งหมด
                                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                                    </Link>
                                </Button>
                            </div>

                            <div className="mt-4 divide-y divide-slate-100">
                                {data.recentEvents.length > 0 ? (
                                    data.recentEvents.map((event, index) => (
                                        <div
                                            key={`${event.timestamp}-${event.action}-${index}`}
                                            className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_auto]"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate font-bold text-slate-900">{event.action}</span>
                                                    <span
                                                        className={`rounded-full border px-2 py-0.5 text-xs font-bold ${statusClassName(
                                                            event.status,
                                                        )}`}
                                                    >
                                                        {event.status}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {event.reason ? `reason: ${event.reason}` : "ไม่มี error reason"}
                                                    {event.targetType ? ` · target: ${event.targetType}` : ""}
                                                    {event.targetId ? `/${event.targetId}` : ""}
                                                </p>
                                            </div>
                                            <div className="text-xs font-medium text-slate-500 md:text-right">
                                                {formatDateTime(event.timestamp)}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-6 text-sm text-slate-500">ยังไม่มี LINE audit event</div>
                                )}
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}
