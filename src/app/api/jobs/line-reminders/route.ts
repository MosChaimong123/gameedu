import { NextResponse } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";
import { getLineReminderCronSecret, isLineBotEnabled } from "@/lib/line-bot/config";
import { runLineAutoReminders } from "@/lib/line-bot/auto-reminders";

export const runtime = "nodejs";

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
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("[jobs/line-reminders]", error);
        return createAppErrorResponse("INTERNAL_ERROR", "LINE reminder job failed", 500);
    }
}
