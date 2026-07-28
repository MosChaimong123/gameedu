import { isLineBotEnabled } from "@/lib/line-bot/config";
import {
    processLineWebhookInbox,
    pruneExpiredLineWebhookEvents,
} from "@/lib/line-bot/webhook-inbox";
import { logAuditEvent } from "@/lib/security/audit-log";

const INTERVAL_MS = 2_000;
let started = false;
let running = false;
let ticks = 0;

async function runOnce(): Promise<void> {
    if (running) return;
    running = true;
    try {
        const result = await processLineWebhookInbox();
        ticks += 1;
        if (ticks % 1_800 === 0) await pruneExpiredLineWebhookEvents();
        if (result.claimed > 0) {
            logAuditEvent({
                action: "line.webhook_worker.run",
                category: "line",
                status: result.dead > 0 ? "error" : "success",
                targetType: "LineWebhookWorker",
                metadata: result,
            });
        }
    } catch (error) {
        console.error("[line-webhook-scheduler] run failed", error);
        logAuditEvent({
            action: "line.webhook_worker.run",
            category: "line",
            status: "error",
            targetType: "LineWebhookWorker",
            metadata: {
                reason: error instanceof Error ? error.message : "worker_failed",
            },
        });
    } finally {
        running = false;
    }
}

export function startLineWebhookScheduler(): boolean {
    if (started || !isLineBotEnabled() || process.env.LINE_WEBHOOK_WORKER_DISABLED === "true") {
        return false;
    }
    if (
        process.env.NODE_ENV !== "production" &&
        process.env.LINE_WEBHOOK_WORKER_ENABLED !== "true"
    ) {
        return false;
    }
    started = true;
    const initial = setTimeout(() => void runOnce(), 1_000);
    const interval = setInterval(() => void runOnce(), INTERVAL_MS);
    initial.unref?.();
    interval.unref?.();
    console.log("[line-webhook-scheduler] started — polling every 2s");
    return true;
}
