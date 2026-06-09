import { NextResponse } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";
import { getLineReminderCronSecret, isLineBotEnabled } from "@/lib/line-bot/config";
import { runLineAutoReminders } from "@/lib/line-bot/auto-reminders";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getDeliveryModel } from "@/lib/line-bot/delivery-contract";
import { getNextCronRunAt } from "@/lib/line-bot/bangkok-date";

export const runtime = "nodejs";

// ─── POST: trigger cron job ───────────────────────────────────────────────────

export async function POST(req: Request) {
    if (!isLineBotEnabled()) {
        return createAppErrorResponse("INTERNAL_ERROR", "LINE bot is not enabled", 503);
    }

    const expectedSecret = getLineReminderCronSecret();
    if (!expectedSecret) {
        return createAppErrorResponse("INTERNAL_ERROR", "LINE reminder cron secret is not configured", 503);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    const headerSecret = req.headers.get("x-cron-secret")?.trim() ?? "";
    if (bearer !== expectedSecret && headerSecret !== expectedSecret) {
        return createAppErrorResponse("FORBIDDEN", "Invalid cron secret", 403);
    }

    try {
        const result = await runLineAutoReminders();
        logAuditEvent({
            action: "line.reminder_job.run",
            category: "line",
            status: "success",
            targetType: "LineReminderJob",
            metadata: {
                scannedGroups: result.scannedGroups,
                candidateCount: result.candidateCount,
                sentCount: result.sentCount,
                skippedDuplicateCount: result.skippedDuplicateCount,
                failedCount: result.failedCount,
                startedAt: result.startedAt,
                completedAt: result.completedAt,
            },
        });
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("[jobs/line-reminders]", error);
        logAuditEvent({
            action: "line.reminder_job.run",
            category: "line",
            status: "error",
            targetType: "LineReminderJob",
            metadata: { reason: error instanceof Error ? error.message : "job_failed" },
        });
        return createAppErrorResponse("INTERNAL_ERROR", "LINE reminder job failed", 500);
    }
}

// ─── GET: health / status signal ─────────────────────────────────────────────

/**
 * Health endpoint for the LINE reminder worker.
 * Returns configuration state, last-run info, and estimated next run time.
 *
 * Auth: not required — this is intentionally read-only and reveals no PII.
 */
export async function GET() {
    const lineBotEnabled = isLineBotEnabled();
    const cronSecretConfigured = Boolean(getLineReminderCronSecret());
    const nextRunAt = getNextCronRunAt(new Date()).toISOString();

    const deliveryModel = getDeliveryModel();

    type LastRunModel = {
        findFirst(input: {
            where: { triggeredBy: string };
            orderBy: { sentAt: "desc" };
            select: { sentAt: true; status: true };
        }): Promise<{ sentAt: Date; status: string } | null>;
    };

    let lastCronRunAt: string | null = null;
    let lastCronRunStatus: string | null = null;

    if (deliveryModel) {
        try {
            const model = deliveryModel as unknown as LastRunModel;
            const lastRun = await model.findFirst({
                where: { triggeredBy: "cron" },
                orderBy: { sentAt: "desc" },
                select: { sentAt: true, status: true },
            });
            if (lastRun) {
                lastCronRunAt = lastRun.sentAt.toISOString();
                lastCronRunStatus = lastRun.status;
            }
        } catch {
            // Model may not support this query shape — degrade gracefully
        }
    }

    return NextResponse.json({
        ok: lineBotEnabled && cronSecretConfigured,
        lineBotEnabled,
        cronSecretConfigured,
        nextRunAt,
        lastCronRunAt,
        lastCronRunStatus,
        asOf: new Date().toISOString(),
    });
}
