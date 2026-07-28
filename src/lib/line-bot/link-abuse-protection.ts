import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    digestRateLimitIdentifier,
    resetRateLimitStore,
} from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit-log";

const ATTEMPT_LIMIT = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const GLOBAL_ATTEMPT_LIMIT = 120;

type LinkKind = "student" | "teacher";
type ProtectionResult = { allowed: true } | { allowed: false; reason: "LOCKED" | "RATE_LIMITED" };

const lockedActors = new Map<string, number>();

/**
 * Prevents brute-force attempts without retaining a raw link code. The durable
 * rate-limit backend is used when configured; the short lock is additionally
 * local so a repeatedly failing LINE user gets an immediate, clear response.
 */
export async function beginLineLinkAttempt(input: {
    kind: LinkKind;
    lineUserId: string;
    code: string;
    now?: Date;
}): Promise<ProtectionResult> {
    const now = input.now?.getTime() ?? Date.now();
    const actorKey = buildRateLimitKey(input.kind, input.lineUserId);
    const lockedUntil = lockedActors.get(actorKey) ?? 0;
    if (lockedUntil > now) return { allowed: false, reason: "LOCKED" };
    if (lockedUntil) lockedActors.delete(actorKey);

    const codeFingerprint = digestRateLimitIdentifier(input.code);
    const [byActor, byCode, global] = await Promise.all([
        consumeRateLimitWithStore({
            bucket: "line-link:attempt:actor",
            key: actorKey,
            limit: ATTEMPT_LIMIT,
            windowMs: ATTEMPT_WINDOW_MS,
            now,
        }),
        consumeRateLimitWithStore({
            bucket: "line-link:attempt:code",
            key: buildRateLimitKey(input.kind, codeFingerprint),
            limit: ATTEMPT_LIMIT,
            windowMs: ATTEMPT_WINDOW_MS,
            now,
        }),
        consumeRateLimitWithStore({
            bucket: "line-link:attempt:global",
            key: input.kind,
            limit: GLOBAL_ATTEMPT_LIMIT,
            windowMs: ATTEMPT_WINDOW_MS,
            now,
        }),
    ]);
    return byActor.allowed && byCode.allowed && global.allowed
        ? { allowed: true }
        : { allowed: false, reason: "RATE_LIMITED" };
}

export async function recordFailedLineLinkAttempt(input: {
    kind: LinkKind;
    lineUserId: string;
    now?: Date;
}): Promise<void> {
    const now = input.now?.getTime() ?? Date.now();
    const actorKey = buildRateLimitKey(input.kind, input.lineUserId);
    const failures = await consumeRateLimitWithStore({
        bucket: "line-link:failure:actor",
        key: actorKey,
        limit: ATTEMPT_LIMIT,
        windowMs: ATTEMPT_WINDOW_MS,
        now,
    });
    if (failures.remaining === 0) {
        lockedActors.set(actorKey, now + LOCK_WINDOW_MS);
        const metadata = { kind: input.kind, lockMinutes: LOCK_WINDOW_MS / 60_000, windowMinutes: ATTEMPT_WINDOW_MS / 60_000 };
        console.error("[line-link-abuse-alert]", JSON.stringify(metadata));
        logAuditEvent({
            action: "line.link.abuse_alert",
            category: "line",
            status: "error",
            targetType: "LineUser",
            targetId: input.lineUserId,
            metadata,
        });
        try {
            const Sentry = await import("@sentry/nextjs");
            Sentry.captureMessage("LINE link-code abuse threshold exceeded", {
                level: "warning",
                tags: { domain: "line", signal: "link_abuse" },
                extra: metadata,
            });
        } catch {
            // Audit and stderr remain the fallback alert channels.
        }
    }
}

export function resetLineLinkAbuseProtectionForTests() {
    lockedActors.clear();
    resetRateLimitStore();
}
