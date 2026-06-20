/**
 * In-process scheduler for LINE auto reminders.
 *
 * The reminder dispatch job lives at POST /api/jobs/line-reminders and was
 * designed to be triggered by an external scheduler (Render Cron). When no such
 * external cron is configured, auto reminders never fire. This module runs the
 * same job on an interval inside the long-running custom server (server.ts) so
 * reminders work without depending on external infrastructure.
 *
 * Safe to run alongside an external cron or across multiple instances: each
 * delivery is deduped by a unique reminderKey (see recordDelivery / P2002), so
 * concurrent or repeated runs never double-send.
 */

import { isLineBotEnabled } from "@/lib/line-bot/config";
import { runLineAutoReminders } from "@/lib/line-bot/auto-reminders";
import { logAuditEvent } from "@/lib/security/audit-log";

const DEFAULT_INTERVAL_MINUTES = 30;
const MIN_INTERVAL_MINUTES = 5;
/** Delay before the first run so server startup isn't blocked by a scan. */
const INITIAL_DELAY_MS = 60_000;

let started = false;
let running = false;

function resolveIntervalMs(): number {
    const raw = process.env.LINE_REMINDER_INTERVAL_MINUTES?.trim();
    const parsed = raw ? Number(raw) : DEFAULT_INTERVAL_MINUTES;
    const minutes =
        Number.isFinite(parsed) && parsed >= MIN_INTERVAL_MINUTES ? parsed : DEFAULT_INTERVAL_MINUTES;
    return minutes * 60_000;
}

/**
 * Whether the in-app scheduler should run in this process.
 *
 * - Disabled entirely when LINE bot is not configured/enabled.
 * - Disabled when LINE_REMINDER_SCHEDULER_DISABLED=true (e.g. you rely on an
 *   external cron instead).
 * - In development it stays off unless LINE_REMINDER_SCHEDULER_ENABLED=true, so
 *   local `npm run dev` does not push real LINE messages.
 */
function shouldRun(): boolean {
    if (process.env.LINE_REMINDER_SCHEDULER_DISABLED === "true") return false;
    if (!isLineBotEnabled()) return false;
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev && process.env.LINE_REMINDER_SCHEDULER_ENABLED !== "true") return false;
    return true;
}

async function runOnce(): Promise<void> {
    if (running) {
        // Previous run still in flight — skip this tick to avoid overlap.
        return;
    }
    running = true;
    try {
        const result = await runLineAutoReminders();
        logAuditEvent({
            action: "line.reminder_job.run",
            category: "line",
            status: "success",
            targetType: "LineReminderJob",
            metadata: {
                trigger: "in_app_scheduler",
                scannedGroups: result.scannedGroups,
                candidateCount: result.candidateCount,
                sentCount: result.sentCount,
                skippedDuplicateCount: result.skippedDuplicateCount,
                failedCount: result.failedCount,
                startedAt: result.startedAt,
                completedAt: result.completedAt,
            },
        });
        if (result.candidateCount > 0 || result.sentCount > 0) {
            console.log(
                `[line-reminder-scheduler] run complete: scanned=${result.scannedGroups} candidates=${result.candidateCount} sent=${result.sentCount} duplicate=${result.skippedDuplicateCount} failed=${result.failedCount}`
            );
        }
    } catch (error) {
        console.error("[line-reminder-scheduler] run failed", error);
        logAuditEvent({
            action: "line.reminder_job.run",
            category: "line",
            status: "error",
            targetType: "LineReminderJob",
            metadata: {
                trigger: "in_app_scheduler",
                reason: error instanceof Error ? error.message : "job_failed",
            },
        });
    } finally {
        running = false;
    }
}

/**
 * Starts the interval scheduler. Idempotent: calling it more than once is a
 * no-op. Returns true if the scheduler was started, false if it was skipped.
 */
export function startLineReminderScheduler(): boolean {
    if (started) return false;
    if (!shouldRun()) {
        console.log(
            "[line-reminder-scheduler] not started (LINE bot disabled, dev mode, or explicitly disabled)"
        );
        return false;
    }
    started = true;
    const intervalMs = resolveIntervalMs();

    // First run shortly after boot, then on a fixed interval.
    const initialTimer = setTimeout(() => void runOnce(), INITIAL_DELAY_MS);
    const intervalTimer = setInterval(() => void runOnce(), intervalMs);
    // Don't keep the event loop alive solely for these timers.
    initialTimer.unref?.();
    intervalTimer.unref?.();

    console.log(
        `[line-reminder-scheduler] started — every ${Math.round(intervalMs / 60_000)} min, first run in ${Math.round(
            INITIAL_DELAY_MS / 1000
        )}s`
    );
    return true;
}
