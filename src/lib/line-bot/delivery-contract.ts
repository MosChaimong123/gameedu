import { getOptionalDbModel } from "@/lib/db";

export type LineDispatchErrorCode =
    | "LINE_PUSH_FAILED"
    | "LINE_RATE_LIMITED"
    | "DELIVERY_RECORD_FAILED"
    | "NAME_RESOLVE_FAILED"
    | "UNKNOWN_ERROR";

const DEFAULT_LEASE_MS = 5 * 60_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const BACKOFF_MS = [60_000, 300_000, 900_000] as const;

export type ReminderDeliveryCreateInput = {
    lineBotGroupId: string;
    lineGroupId: string;
    classroomId: string;
    assignmentId: string;
    reminderKey: string;
    reminderType: string;
    targetCount: number;
    triggeredBy?: string;
};

export type ReminderDeliveryRow = {
    id: string;
    status: string;
    attemptCount: number;
    maxAttempts: number;
    nextAttemptAt: Date | null;
    lockedAt: Date | null;
};

export type SharedReminderDeliveryModel = {
    create(input: { data: Record<string, unknown> }): Promise<ReminderDeliveryRow>;
    findFirst(input: Record<string, unknown>): Promise<ReminderDeliveryRow | null>;
    findUnique(input: Record<string, unknown>): Promise<(ReminderDeliveryRow & Record<string, unknown>) | null>;
    findMany(input: Record<string, unknown>): Promise<Array<ReminderDeliveryRow & Record<string, unknown>>>;
    updateMany(input: Record<string, unknown>): Promise<{ count: number }>;
    update(input: Record<string, unknown>): Promise<unknown>;
    deleteMany(input: Record<string, unknown>): Promise<{ count: number }>;
};

export type RecordDeliveryResult =
    | { type: "claimed"; id: string; attemptCount: number }
    | { type: "duplicate"; reason: "sent" | "in_flight" | "not_ready" | "terminal" | "contended" }
    | { type: "error"; message: string };

function isActiveLease(row: ReminderDeliveryRow, now: Date, leaseMs: number): boolean {
    return (
        (row.status === "pending" || row.status === "sending") &&
        Boolean(row.lockedAt && row.lockedAt.getTime() > now.getTime() - leaseMs)
    );
}

/**
 * Creates or atomically reclaims a delivery. A unique-key collision is not
 * automatically a duplicate: retryable and stale rows can be claimed again.
 */
export async function recordDelivery(
    model: SharedReminderDeliveryModel,
    data: ReminderDeliveryCreateInput,
    options: { now?: Date; leaseMs?: number } = {}
): Promise<RecordDeliveryResult> {
    const now = options.now ?? new Date();
    const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
    try {
        const row = await model.create({
            data: {
                ...data,
                status: "sending",
                attemptCount: 1,
                maxAttempts: DEFAULT_MAX_ATTEMPTS,
                lockedAt: now,
                lastAttemptAt: now,
                nextAttemptAt: null,
            },
        });
        return { type: "claimed", id: row.id, attemptCount: 1 };
    } catch (error) {
        if (!isPrismaUniqueConstraintError(error)) {
            return { type: "error", message: getErrorMessage(error) };
        }
    }

    try {
        const row = await model.findFirst({
            where: {
                lineBotGroupId: data.lineBotGroupId,
                assignmentId: data.assignmentId,
                reminderKey: data.reminderKey,
            },
        });
        if (!row) return { type: "error", message: "Duplicate delivery row was not found" };
        if (row.status === "sent") return { type: "duplicate", reason: "sent" };
        if (isActiveLease(row, now, leaseMs)) return { type: "duplicate", reason: "in_flight" };
        if (row.attemptCount >= row.maxAttempts || row.status === "failed" || row.status === "abandoned") {
            return { type: "duplicate", reason: "terminal" };
        }
        if (
            row.status === "retry_wait" &&
            row.nextAttemptAt &&
            row.nextAttemptAt.getTime() > now.getTime()
        ) {
            return { type: "duplicate", reason: "not_ready" };
        }
        const claimed = await model.updateMany({
            where: {
                id: row.id,
                status: row.status,
                attemptCount: row.attemptCount,
                OR:
                    row.status === "pending" || row.status === "sending"
                        ? [{ lockedAt: null }, { lockedAt: { lte: new Date(now.getTime() - leaseMs) } }]
                        : undefined,
            },
            data: {
                status: "sending",
                attemptCount: { increment: 1 },
                lockedAt: now,
                lastAttemptAt: now,
                nextAttemptAt: null,
                failedAt: null,
            },
        });
        return claimed.count === 1
            ? { type: "claimed", id: row.id, attemptCount: row.attemptCount + 1 }
            : { type: "duplicate", reason: "contended" };
    } catch (error) {
        return { type: "error", message: getErrorMessage(error) };
    }
}

export async function claimDeliveryForManualRetry(
    model: SharedReminderDeliveryModel,
    id: string,
    now = new Date()
): Promise<
    | { type: "claimed"; row: ReminderDeliveryRow & Record<string, unknown>; attemptCount: number }
    | { type: "unavailable"; reason: "not_found" | "sent" | "in_flight" | "contended" }
> {
    const row = await model.findUnique({ where: { id } });
    if (!row) return { type: "unavailable", reason: "not_found" };
    if (row.status === "sent") return { type: "unavailable", reason: "sent" };
    if (isActiveLease(row, now, DEFAULT_LEASE_MS)) {
        return { type: "unavailable", reason: "in_flight" };
    }
    const attemptCount = row.attemptCount + 1;
    const claimed = await model.updateMany({
        where: { id, status: row.status, attemptCount: row.attemptCount },
        data: {
            status: "sending",
            attemptCount,
            maxAttempts: Math.max(row.maxAttempts, attemptCount),
            lockedAt: now,
            lastAttemptAt: now,
            nextAttemptAt: null,
            failedAt: null,
        },
    });
    return claimed.count === 1
        ? { type: "claimed", row, attemptCount }
        : { type: "unavailable", reason: "contended" };
}

export async function markDeliverySent(
    model: SharedReminderDeliveryModel,
    id: string,
    now = new Date()
): Promise<void> {
    await model.update({
        where: { id },
        data: {
            status: "sent",
            sentAt: now,
            failedAt: null,
            lockedAt: null,
            nextAttemptAt: null,
            errorCode: null,
            errorMessage: null,
        },
    });
}

export async function markDeliveryFailed(
    model: SharedReminderDeliveryModel,
    id: string,
    attemptCount: number,
    errorCode: LineDispatchErrorCode,
    rawError: unknown,
    now = new Date()
): Promise<"retry_wait" | "failed"> {
    const retryable =
        isRetryableDispatchError(rawError) && attemptCount < DEFAULT_MAX_ATTEMPTS;
    const status = retryable ? "retry_wait" : "failed";
    await model.update({
        where: { id },
        data: {
            status,
            errorCode,
            errorMessage: getErrorMessage(rawError),
            failedAt: retryable ? null : now,
            lockedAt: null,
            nextAttemptAt: retryable
                ? new Date(now.getTime() + BACKOFF_MS[Math.min(attemptCount - 1, 2)])
                : null,
        },
    });
    return status;
}

/** Common claim/send/finalize path used by automatic and manual reminders. */
export async function dispatchLineReminder(input: {
    model: SharedReminderDeliveryModel;
    delivery: ReminderDeliveryCreateInput;
    send: () => Promise<void>;
    now?: Date;
}): Promise<
    | { status: "sent"; id: string }
    | { status: "duplicate"; reason: "sent" | "in_flight" | "not_ready" | "terminal" | "contended" }
    | { status: "failed" | "retry_wait" | "record_error"; errorCode?: LineDispatchErrorCode; message?: string }
> {
    const claimed = await recordDelivery(input.model, input.delivery, { now: input.now });
    if (claimed.type === "duplicate") return { status: "duplicate", reason: claimed.reason };
    if (claimed.type === "error") return { status: "record_error", message: claimed.message };
    try {
        await input.send();
        await markDeliverySent(input.model, claimed.id);
        return { status: "sent", id: claimed.id };
    } catch (error) {
        const errorCode = classifyDispatchError(error);
        const status = await markDeliveryFailed(
            input.model,
            claimed.id,
            claimed.attemptCount,
            errorCode,
            error
        );
        return { status, errorCode, message: getErrorMessage(error) };
    }
}

export function getDeliveryModel(): SharedReminderDeliveryModel | null {
    return getOptionalDbModel<SharedReminderDeliveryModel>("lineAssignmentReminderDelivery");
}

export async function pruneExpiredLineReminderDeliveries(
    input: { model?: SharedReminderDeliveryModel; now?: Date } = {}
): Promise<number> {
    const model = input.model ?? getDeliveryModel();
    if (!model) return 0;
    const days = Math.max(1, Number(process.env.LINE_DELIVERY_RETENTION_DAYS) || 90);
    const deleted = await model.deleteMany({
        where: {
            status: { in: ["sent", "failed", "abandoned"] },
            createdAt: { lt: new Date((input.now ?? new Date()).getTime() - days * 86_400_000) },
        },
    });
    return deleted.count;
}

export type LineDispatchItemResult = {
    classroomId: string;
    assignmentId: string;
    reminderType: string;
    reminderKey: string;
    status: "sent" | "failed" | "retry_wait" | "duplicate" | "record_error";
    errorCode?: LineDispatchErrorCode;
    errorMessage?: string;
};

export type LineDispatchRunResult = {
    triggeredBy: "cron" | "manual" | "manual_assignment";
    startedAt: string;
    completedAt: string;
    scannedGroups: number;
    candidateCount: number;
    sentCount: number;
    skippedDuplicateCount: number;
    failedCount: number;
    items: LineDispatchItemResult[];
};

export function isPrismaUniqueConstraintError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
    );
}

export function getErrorMessage(error: unknown): string {
    return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

export function isLineRateLimitError(error: unknown): boolean {
    if (typeof error === "object" && error !== null) {
        const value = error as Record<string, unknown>;
        if (value.status === 429 || value.statusCode === 429) return true;
        if (typeof value.message === "string" && value.message.includes("429")) return true;
    }
    return false;
}

export function classifyDispatchError(error: unknown): LineDispatchErrorCode {
    if (isLineRateLimitError(error)) return "LINE_RATE_LIMITED";
    if (
        typeof error === "object" &&
        error !== null &&
        ("status" in error || "statusCode" in error)
    ) {
        return "LINE_PUSH_FAILED";
    }
    return "UNKNOWN_ERROR";
}

export function isRetryableDispatchError(error: unknown): boolean {
    if (isLineRateLimitError(error)) return true;
    if (typeof error === "object" && error !== null) {
        const value = error as { status?: unknown; statusCode?: unknown };
        const status = value.status ?? value.statusCode;
        return typeof status === "number" ? status >= 500 : false;
    }
    return error instanceof Error && /timeout|network|econn|fetch failed/i.test(error.message);
}
