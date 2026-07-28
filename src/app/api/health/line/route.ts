import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { getOptionalDbModel } from "@/lib/db";
import {
    getLineBotChatUrl,
    getLineAppUrl,
    getLineChannelAccessToken,
    getLineChannelSecret,
    getLineClassroomBindingSecret,
    getLineReminderCronSecret,
    getLineWebhookInboxSecret,
    isLineBotEnabled,
} from "@/lib/line-bot/config";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { listRecentAuditEvents } from "@/lib/security/audit-log";

type ReminderDeliveryModel = {
    findMany(input: {
        orderBy: { sentAt: "desc" };
        take: number;
        select: {
            id: true;
            classroomId: true;
            reminderType: true;
            targetCount: true;
            sentAt: true;
        };
    }): Promise<Array<{
        id: string;
        classroomId: string;
        reminderType: string;
        targetCount: number;
        sentAt: Date | null;
    }>>;
    count(input: { where: { status: string } }): Promise<number>;
};

type StatusCountModel = {
    count(input: { where: { status: string } }): Promise<number>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkStatus(configured: boolean) {
    return configured ? "configured" : "missing";
}

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role) || session.user.role !== "ADMIN") {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const checks = {
        enabled: isLineBotEnabled(),
        channelSecret: checkStatus(Boolean(getLineChannelSecret())),
        channelAccessToken: checkStatus(Boolean(getLineChannelAccessToken())),
        bindingSecret: checkStatus(Boolean(getLineClassroomBindingSecret())),
        cronSecret: checkStatus(Boolean(getLineReminderCronSecret())),
        webhookInboxSecret: checkStatus(Boolean(getLineWebhookInboxSecret())),
        appUrl: checkStatus(Boolean(getLineAppUrl())),
        botChatUrl: checkStatus(Boolean(getLineBotChatUrl())),
        geminiApiKey: checkStatus(Boolean(process.env.GEMINI_API_KEY?.trim())),
        webhookPath: "/api/webhooks/line",
    };

    const deliveryModel = getOptionalDbModel<ReminderDeliveryModel>("lineAssignmentReminderDelivery");
    const webhookInboxModel = getOptionalDbModel<StatusCountModel>("lineWebhookEvent");
    const [recentAuditEvents, recentWebhookEvents, recentCronEvents, recentWorkerEvents, latestReminder, deliveryCounts, webhookCounts] = await Promise.all([
        listRecentAuditEvents(20, { category: "line" }).catch(() => []),
        listRecentAuditEvents(5, { action: "line.webhook.received" }).catch(() => []),
        listRecentAuditEvents(20, { action: "line.reminder_job.run" }).catch(() => []),
        listRecentAuditEvents(20, { action: "line.webhook_worker.run" }).catch(() => []),
        deliveryModel
            ?.findMany({
                orderBy: { sentAt: "desc" },
                take: 1,
                select: {
                    id: true,
                    classroomId: true,
                    reminderType: true,
                    targetCount: true,
                    sentAt: true,
                },
            })
            .then((rows) => rows[0] ?? null)
            .catch(() => null) ?? Promise.resolve(null),
        Promise.all(["pending", "sending", "retry_wait", "failed"].map(async (status) => [status, await deliveryModel?.count({ where: { status } }).catch(() => 0) ?? 0] as const))
            .then((rows) => Object.fromEntries(rows))
            .catch(() => ({ pending: 0, sending: 0, retry_wait: 0, failed: 0 })),
        Promise.all(["received", "processing", "retry_wait", "dead"].map(async (status) => [status, await webhookInboxModel?.count({ where: { status } }).catch(() => 0) ?? 0] as const))
            .then((rows) => Object.fromEntries(rows))
            .catch(() => ({ received: 0, processing: 0, retry_wait: 0, dead: 0 })),
    ]);

    const lastErrorEvent =
        recentAuditEvents.find((event) => event.status === "error" || event.status === "rejected") ?? null;
    const lastWebhookEvent = recentWebhookEvents[0] ?? null;
    const lastCronEvent = recentCronEvents[0] ?? null;
    const lastSuccessfulCronEvent = recentCronEvents.find((event) => event.status === "success") ?? null;
    const lastWorkerEvent = recentWorkerEvents[0] ?? null;
    const lastSuccessfulWorkerEvent = recentWorkerEvents.find((event) => event.status === "success") ?? null;
    const alertCodes = [
        ...(Number(webhookCounts.dead ?? 0) > 0 ? ["LINE_WEBHOOK_DEAD_EVENTS"] : []),
        ...(Number(deliveryCounts.failed ?? 0) > 0 ? ["LINE_REMINDER_FAILED_DELIVERIES"] : []),
        ...(recentAuditEvents.some((event) => event.metadata?.errorCode === "LINE_RATE_LIMITED")
            ? ["LINE_PROVIDER_RATE_LIMITED"]
            : []),
        ...(lastWorkerEvent &&
        Date.now() - lastWorkerEvent.timestamp.getTime() > 5 * 60_000
            ? ["LINE_WEBHOOK_WORKER_STALE"]
            : []),
    ];

    const ok =
        checks.enabled &&
        checks.channelSecret === "configured" &&
        checks.channelAccessToken === "configured" &&
        checks.bindingSecret === "configured" &&
        checks.cronSecret === "configured" &&
        checks.webhookInboxSecret === "configured" &&
        checks.appUrl === "configured" &&
        checks.botChatUrl === "configured";

    const body = {
        ok,
        status: ok ? "healthy" : "degraded",
        checks,
        webhook: {
            lastAuditEventAt: lastWebhookEvent?.timestamp.toISOString() ?? null,
            lastAuditAction: lastWebhookEvent?.action ?? null,
            lastAuditStatus: lastWebhookEvent?.status ?? null,
            lastEventCount:
                typeof lastWebhookEvent?.metadata?.eventCount === "number"
                    ? lastWebhookEvent.metadata.eventCount
                    : null,
            workerLastAttemptedAt: lastWorkerEvent?.timestamp.toISOString() ?? null,
            workerLastSuccessfulAt: lastSuccessfulWorkerEvent?.timestamp.toISOString() ?? null,
            pendingCount: webhookCounts.received ?? 0,
            processingCount: webhookCounts.processing ?? 0,
            retryingCount: webhookCounts.retry_wait ?? 0,
            deadCount: webhookCounts.dead ?? 0,
        },
        reminders: {
            lastDeliveryAt: latestReminder?.sentAt?.toISOString() ?? null,
            lastDeliveryType: latestReminder?.reminderType ?? null,
            lastDeliveryTargetCount: latestReminder?.targetCount ?? null,
            lastCronAttemptedAt: lastCronEvent?.timestamp.toISOString() ?? null,
            lastCronSuccessfulAt: lastSuccessfulCronEvent?.timestamp.toISOString() ?? null,
            lastCronRunStatus: lastCronEvent?.status ?? null,
            nextRunAt: new Date(Date.now() + 30 * 60_000).toISOString(),
            schedulerSource:
                process.env.LINE_REMINDER_SCHEDULER_DISABLED === "true"
                    ? "external"
                    : "in_app_and_optional_external",
            pendingCount: deliveryCounts.pending ?? 0,
            sendingCount: deliveryCounts.sending ?? 0,
            retryWaitCount: deliveryCounts.retry_wait ?? 0,
            failedCount: deliveryCounts.failed ?? 0,
        },
        errors: {
            lastLineErrorAt: lastErrorEvent?.timestamp.toISOString() ?? null,
            lastLineErrorAction: lastErrorEvent?.action ?? null,
            lastLineErrorReason: lastErrorEvent?.reason ?? null,
        },
        alerts: {
            activeCodes: alertCodes,
            count: alertCodes.length,
        },
        retention: {
            webhookDays: Math.max(1, Number(process.env.LINE_WEBHOOK_RETENTION_DAYS) || 30),
            deliveryDays: Math.max(1, Number(process.env.LINE_DELIVERY_RETENTION_DAYS) || 90),
            auditDays: Math.max(1, Number(process.env.AUDIT_LOG_RETENTION_DAYS) || 365),
        },
        recentEvents: recentAuditEvents.slice(0, 8).map((event) => ({
            action: event.action,
            status: event.status,
            reason: event.reason ?? null,
            targetType: event.targetType,
            targetId: event.targetId ?? null,
            timestamp: event.timestamp.toISOString(),
        })),
        timestamp: new Date().toISOString(),
    };

    return NextResponse.json(body, { status: ok ? 200 : 503 });
}
