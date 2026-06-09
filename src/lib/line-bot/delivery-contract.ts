/**
 * Shared delivery contract for LINE reminder dispatch.
 *
 * Both the auto-reminder cron (auto-reminders.ts) and the manual classroom
 * send (classrooms/[id]/line-reminders/route.ts) use these types and helpers
 * to write consistent delivery records and status updates.
 *
 * Standardised error codes let the history UI and readiness API show
 * human-readable Thai reasons without string matching.
 */

import { getOptionalDbModel } from "@/lib/db";

// ─── Error codes ─────────────────────────────────────────────────────────────

export type LineDispatchErrorCode =
    | "LINE_PUSH_FAILED"          // pushLineFlex threw / LINE API error
    | "LINE_RATE_LIMITED"         // LINE API 429
    | "DELIVERY_RECORD_FAILED"    // Prisma create/update itself threw
    | "NAME_RESOLVE_FAILED"       // createMissingStudentNameResolver threw
    | "UNKNOWN_ERROR";            // catch-all

// ─── Delivery record model (superset of both manual + auto fields) ────────────

export type ReminderDeliveryCreateInput = {
    lineBotGroupId: string;
    lineGroupId: string;
    classroomId: string;
    assignmentId: string;
    reminderKey: string;
    reminderType: string;
    targetCount: number;
    status?: string;           // default "pending"
    errorCode?: string | null;
    errorMessage?: string | null;
    triggeredBy?: string;      // "cron" | "manual" | "manual_assignment"
};

export type SharedReminderDeliveryModel = {
    create(input: { data: ReminderDeliveryCreateInput }): Promise<{ id: string }>;
    update(input: {
        where: { id: string };
        data: {
            status: string;
            errorCode?: string | null;
            errorMessage?: string | null;
        };
    }): Promise<unknown>;
};

// ─── Record helpers ───────────────────────────────────────────────────────────

export type RecordDeliveryResult =
    | { type: "created"; id: string }
    | { type: "duplicate" }
    | { type: "error"; message: string };

/**
 * Creates a delivery record with status="pending".
 * Returns `{ type: "duplicate" }` if the unique constraint fires (P2002).
 * Returns `{ type: "error" }` for any other Prisma error.
 */
export async function recordDelivery(
    model: SharedReminderDeliveryModel,
    data: ReminderDeliveryCreateInput
): Promise<RecordDeliveryResult> {
    try {
        const row = await model.create({
            data: { status: "pending", ...data },
        });
        return { type: "created", id: row.id };
    } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
            return { type: "duplicate" };
        }
        return { type: "error", message: getErrorMessage(error) };
    }
}

export async function markDeliverySent(
    model: SharedReminderDeliveryModel,
    id: string
): Promise<void> {
    await model
        .update({ where: { id }, data: { status: "sent", errorCode: null, errorMessage: null } })
        .catch((err) => console.error("[delivery-contract] markDeliverySent failed", err));
}

export async function markDeliveryFailed(
    model: SharedReminderDeliveryModel,
    id: string,
    errorCode: LineDispatchErrorCode,
    rawError: unknown
): Promise<void> {
    await model
        .update({
            where: { id },
            data: {
                status: "failed",
                errorCode,
                errorMessage: getErrorMessage(rawError),
            },
        })
        .catch((err) => console.error("[delivery-contract] markDeliveryFailed failed", err));
}

// ─── Model accessor ───────────────────────────────────────────────────────────

/**
 * Returns the delivery model if the Prisma schema has it, otherwise null.
 * Centralises the getOptionalDbModel call so callers don't need to import
 * getOptionalDbModel or repeat the type parameter.
 */
export function getDeliveryModel(): SharedReminderDeliveryModel | null {
    return getOptionalDbModel<SharedReminderDeliveryModel>("lineAssignmentReminderDelivery");
}

// ─── Dispatch run result ──────────────────────────────────────────────────────

export type LineDispatchItemResult = {
    classroomId: string;
    assignmentId: string;
    reminderType: string;
    reminderKey: string;
    status: "sent" | "failed" | "duplicate" | "record_error";
    errorCode?: LineDispatchErrorCode;
    errorMessage?: string;
};

export type LineDispatchRunResult = {
    triggeredBy: "cron" | "manual" | "manual_assignment";
    startedAt: string;      // ISO
    completedAt: string;    // ISO
    scannedGroups: number;
    candidateCount: number;
    sentCount: number;
    skippedDuplicateCount: number;
    failedCount: number;
    items: LineDispatchItemResult[];
};

// ─── Utilities ────────────────────────────────────────────────────────────────

export function isPrismaUniqueConstraintError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
    );
}

export function getErrorMessage(error: unknown): string {
    const msg = error instanceof Error ? error.message : String(error);
    return msg.slice(0, 500);
}

export function isLineRateLimitError(error: unknown): boolean {
    // LINE SDK throws errors with status property or message containing "429"
    if (typeof error === "object" && error !== null) {
        const e = error as Record<string, unknown>;
        if (e["status"] === 429 || e["statusCode"] === 429) return true;
        if (typeof e["message"] === "string" && e["message"].includes("429")) return true;
    }
    return false;
}

export function classifyDispatchError(error: unknown): LineDispatchErrorCode {
    if (isLineRateLimitError(error)) return "LINE_RATE_LIMITED";
    // LINE SDK push errors
    if (
        typeof error === "object" &&
        error !== null &&
        ("status" in error || "statusCode" in error)
    ) {
        return "LINE_PUSH_FAILED";
    }
    return "UNKNOWN_ERROR";
}
