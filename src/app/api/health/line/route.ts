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
    getLineChannelAccessToken,
    getLineChannelSecret,
    getLineClassroomBindingSecret,
    getLineReminderCronSecret,
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
        sentAt: Date;
    }>>;
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
        appUrl: checkStatus(Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim())),
        botChatUrl: checkStatus(Boolean(getLineBotChatUrl())),
        geminiApiKey: checkStatus(Boolean(process.env.GEMINI_API_KEY?.trim())),
        webhookPath: "/api/webhooks/line",
    };

    const [recentAuditEvents, recentWebhookEvents, recentCronEvents, latestReminder] = await Promise.all([
        listRecentAuditEvents(20, { category: "line" }).catch(() => []),
        listRecentAuditEvents(5, { action: "line.webhook.received" }).catch(() => []),
        listRecentAuditEvents(5, { action: "line.reminder_job.run" }).catch(() => []),
        getOptionalDbModel<ReminderDeliveryModel>("lineAssignmentReminderDelivery")
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
    ]);

    const lastErrorEvent =
        recentAuditEvents.find((event) => event.status === "error" || event.status === "rejected") ?? null;
    const lastWebhookEvent = recentWebhookEvents[0] ?? null;
    const lastCronEvent = recentCronEvents[0] ?? null;

    const ok =
        checks.enabled &&
        checks.channelSecret === "configured" &&
        checks.channelAccessToken === "configured" &&
        checks.bindingSecret === "configured" &&
        checks.cronSecret === "configured" &&
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
        },
        reminders: {
            lastDeliveryAt: latestReminder?.sentAt.toISOString() ?? null,
            lastDeliveryType: latestReminder?.reminderType ?? null,
            lastDeliveryTargetCount: latestReminder?.targetCount ?? null,
            lastCronRunAt: lastCronEvent?.timestamp.toISOString() ?? null,
            lastCronRunStatus: lastCronEvent?.status ?? null,
        },
        errors: {
            lastLineErrorAt: lastErrorEvent?.timestamp.toISOString() ?? null,
            lastLineErrorAction: lastErrorEvent?.action ?? null,
            lastLineErrorReason: lastErrorEvent?.reason ?? null,
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
