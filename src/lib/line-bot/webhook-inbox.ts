import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from "node:crypto";
import type { WebhookEvent } from "@line/bot-sdk";
import { getOptionalDbModel } from "@/lib/db";
import { getLineWebhookInboxSecret } from "@/lib/line-bot/config";
import { handleLineWebhookEvent } from "@/lib/line-bot/handlers";

const PAYLOAD_VERSION = 1;
const DEFAULT_LEASE_MS = 30_000;
const DEFAULT_RETENTION_DAYS = 30;
const MAX_ATTEMPTS = 5;

type InboxRow = {
    id: string;
    eventKey: string;
    payloadCiphertext: string;
    attemptCount: number;
    status: string;
    availableAt: Date;
    lockExpiresAt: Date | null;
};

export type LineWebhookInboxModel = {
    create(input: { data: Record<string, unknown> }): Promise<{ id: string }>;
    findFirst(input: Record<string, unknown>): Promise<InboxRow | null>;
    updateMany(input: Record<string, unknown>): Promise<{ count: number }>;
    update(input: Record<string, unknown>): Promise<unknown>;
    count(input: Record<string, unknown>): Promise<number>;
    findMany(input: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    deleteMany(input: Record<string, unknown>): Promise<{ count: number }>;
};

export type LineWebhookWorkerResult = {
    claimed: number;
    processed: number;
    retried: number;
    dead: number;
};

function getInboxModel(): LineWebhookInboxModel {
    const model = getOptionalDbModel<LineWebhookInboxModel>("lineWebhookEvent");
    if (!model) {
        throw new Error("LINE_WEBHOOK_INBOX_MODEL_UNAVAILABLE");
    }
    return model;
}

/** Prefer LINE's immutable webhookEventId, with a stable payload hash fallback. */
export function getLineWebhookEventKey(event: WebhookEvent): string {
    const providerId = (event as WebhookEvent & { webhookEventId?: string }).webhookEventId;
    const source = providerId ? `line:${providerId}` : `payload:${JSON.stringify(event)}`;
    return createHash("sha256").update(source).digest("hex");
}

function encryptionKey(): Buffer {
    const secret = getLineWebhookInboxSecret();
    if (!secret) {
        throw new Error("LINE_WEBHOOK_INBOX_SECRET_MISSING");
    }
    return createHash("sha256").update(secret).digest();
}

export function encryptLineWebhookEvent(event: WebhookEvent): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(event), "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${PAYLOAD_VERSION}.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptLineWebhookEvent(value: string): WebhookEvent {
    const [version, ivValue, tagValue, encryptedValue] = value.split(".");
    if (version !== String(PAYLOAD_VERSION) || !ivValue || !tagValue || !encryptedValue) {
        throw new Error("LINE_WEBHOOK_PAYLOAD_INVALID");
    }
    const decipher = createDecipheriv(
        "aes-256-gcm",
        encryptionKey(),
        Buffer.from(ivValue, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, "base64url")),
        decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as WebhookEvent;
}

export async function enqueueLineWebhookEvents(
    events: WebhookEvent[],
    options: { model?: LineWebhookInboxModel; now?: Date } = {}
): Promise<{ accepted: number; duplicates: number }> {
    const model = options.model ?? getInboxModel();
    const now = options.now ?? new Date();
    const retentionDays = Math.max(
        1,
        Number(process.env.LINE_WEBHOOK_RETENTION_DAYS) || DEFAULT_RETENTION_DAYS
    );
    let accepted = 0;
    let duplicates = 0;

    for (const event of events) {
        try {
            const source = event.source;
            const sourceId =
                source.type === "group"
                    ? source.groupId
                    : source.type === "room"
                      ? source.roomId
                      : source.userId;
            await model.create({
                data: {
                    eventKey: getLineWebhookEventKey(event),
                    eventType: event.type,
                    sourceType: source.type,
                    sourceIdHash: sourceId
                        ? createHash("sha256").update(sourceId).digest("hex")
                        : null,
                    payloadCiphertext: encryptLineWebhookEvent(event),
                    payloadVersion: PAYLOAD_VERSION,
                    status: "received",
                    availableAt: now,
                    expiresAt: new Date(now.getTime() + retentionDays * 86_400_000),
                },
            });
            accepted += 1;
        } catch (error) {
            if (isPrismaUniqueConstraintError(error)) duplicates += 1;
            else throw error;
        }
    }
    return { accepted, duplicates };
}

function eligibleWhere(now: Date): Record<string, unknown> {
    return {
        availableAt: { lte: now },
        OR: [
            { status: { in: ["received", "retry_wait"] } },
            { status: "processing", lockExpiresAt: { lte: now } },
        ],
    };
}

function retryDelayMs(attempt: number, eventKey: string): number {
    const base = [60_000, 300_000, 900_000, 3_600_000][Math.min(attempt - 1, 3)];
    const jitterByte = Number.parseInt(eventKey.slice(-2), 16);
    const jitter = 0.8 + (Number.isFinite(jitterByte) ? jitterByte / 255 : 0.5) * 0.4;
    return Math.round(base * jitter);
}

function isPermanentWorkerError(error: unknown): boolean {
    return error instanceof Error && /PAYLOAD_INVALID|Unsupported webhook/i.test(error.message);
}

function errorMessage(error: unknown): string {
    return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

/**
 * Claims and handles persisted events one-by-one. The compare-and-set lease
 * makes concurrent processes safe; expired leases are recoverable after restart.
 */
export async function processLineWebhookInbox(options: {
    model?: LineWebhookInboxModel;
    now?: Date;
    limit?: number;
    leaseMs?: number;
    handleEvent?: (event: WebhookEvent) => Promise<void>;
} = {}): Promise<LineWebhookWorkerResult> {
    const model = options.model ?? getInboxModel();
    const now = options.now ?? new Date();
    const limit = Math.min(100, Math.max(1, options.limit ?? 25));
    const leaseMs = Math.max(5_000, options.leaseMs ?? DEFAULT_LEASE_MS);
    const handleEvent = options.handleEvent ?? handleLineWebhookEvent;
    const result: LineWebhookWorkerResult = { claimed: 0, processed: 0, retried: 0, dead: 0 };

    for (let index = 0; index < limit; index += 1) {
        const candidate = await model.findFirst({
            where: eligibleWhere(now),
            orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
        });
        if (!candidate) break;

        const claimed = await model.updateMany({
            where: { id: candidate.id, ...eligibleWhere(now) },
            data: {
                status: "processing",
                lockedAt: now,
                lockExpiresAt: new Date(now.getTime() + leaseMs),
                attemptCount: { increment: 1 },
                lastErrorCode: null,
                lastErrorMessage: null,
            },
        });
        if (claimed.count !== 1) continue;

        result.claimed += 1;
        const attempt = candidate.attemptCount + 1;
        try {
            await handleEvent(decryptLineWebhookEvent(candidate.payloadCiphertext));
            await model.update({
                where: { id: candidate.id },
                data: {
                    status: "processed",
                    processedAt: new Date(),
                    lockedAt: null,
                    lockExpiresAt: null,
                },
            });
            result.processed += 1;
        } catch (error) {
            const dead = isPermanentWorkerError(error) || attempt >= MAX_ATTEMPTS;
            await model.update({
                where: { id: candidate.id },
                data: {
                    status: dead ? "dead" : "retry_wait",
                    availableAt: dead
                        ? candidate.availableAt
                        : new Date(now.getTime() + retryDelayMs(attempt, candidate.eventKey)),
                    failedAt: dead ? new Date() : null,
                    lockedAt: null,
                    lockExpiresAt: null,
                    lastErrorCode: dead ? "LINE_WEBHOOK_DEAD" : "LINE_WEBHOOK_TRANSIENT_FAILURE",
                    lastErrorMessage: errorMessage(error),
                },
            });
            if (dead) result.dead += 1;
            else result.retried += 1;
        }
    }

    return result;
}

export async function pruneExpiredLineWebhookEvents(
    options: { model?: LineWebhookInboxModel; now?: Date } = {}
): Promise<number> {
    const model = options.model ?? getInboxModel();
    const deleted = await model.deleteMany({
        where: { expiresAt: { lt: options.now ?? new Date() } },
    });
    return deleted.count;
}

export async function getLineWebhookInboxCounts(
    model: LineWebhookInboxModel = getInboxModel()
): Promise<Record<string, number>> {
    const statuses = ["received", "processing", "retry_wait", "processed", "dead"] as const;
    const counts = await Promise.all(
        statuses.map(async (status) => [status, await model.count({ where: { status } })] as const)
    );
    return Object.fromEntries(counts);
}

export async function listLineWebhookFailures(
    input: { status?: "retry_wait" | "dead"; take?: number },
    model: LineWebhookInboxModel = getInboxModel()
): Promise<Array<Record<string, unknown>>> {
    return model.findMany({
        where: { status: input.status ?? { in: ["retry_wait", "dead"] } },
        orderBy: { updatedAt: "desc" },
        take: Math.min(100, Math.max(1, input.take ?? 50)),
        select: {
            id: true,
            eventKey: true,
            eventType: true,
            sourceType: true,
            status: true,
            attemptCount: true,
            availableAt: true,
            failedAt: true,
            lastErrorCode: true,
            lastErrorMessage: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
    );
}
