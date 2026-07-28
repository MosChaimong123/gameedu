import type { WebhookEvent } from "@line/bot-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/line-bot/config", () => ({
    getLineWebhookInboxSecret: () => "test-secret-that-is-at-least-thirty-two-characters",
}));

vi.mock("@/lib/line-bot/handlers", () => ({
    handleLineWebhookEvent: vi.fn(),
}));

const event = {
    type: "message",
    webhookEventId: "evt-1",
    source: { type: "user", userId: "U-secret" },
    message: { id: "1", type: "text", text: "ping" },
    replyToken: "reply-token",
    timestamp: 1,
    mode: "active",
} as unknown as WebhookEvent;

describe("LINE webhook inbox", () => {
    beforeEach(() => vi.clearAllMocks());

    it("encrypts payloads and produces a deterministic key", async () => {
        const { decryptLineWebhookEvent, encryptLineWebhookEvent, getLineWebhookEventKey } =
            await import("@/lib/line-bot/webhook-inbox");
        const ciphertext = encryptLineWebhookEvent(event);
        expect(ciphertext).not.toContain("U-secret");
        expect(ciphertext).not.toContain("reply-token");
        expect(decryptLineWebhookEvent(ciphertext)).toEqual(event);
        expect(getLineWebhookEventKey(event)).toBe(getLineWebhookEventKey(event));
    });

    it("claims with compare-and-set and marks successful events processed", async () => {
        const { encryptLineWebhookEvent, processLineWebhookInbox } =
            await import("@/lib/line-bot/webhook-inbox");
        const row = {
            id: "row-1",
            eventKey: "a".repeat(64),
            payloadCiphertext: encryptLineWebhookEvent(event),
            attemptCount: 0,
            status: "received",
            availableAt: new Date("2026-01-01T00:00:00.000Z"),
            lockExpiresAt: null,
        };
        const model = {
            create: vi.fn(),
            findFirst: vi.fn().mockResolvedValueOnce(row).mockResolvedValueOnce(null),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue({}),
            count: vi.fn(),
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        };
        const handleEvent = vi.fn().mockResolvedValue(undefined);
        const result = await processLineWebhookInbox({
            model,
            handleEvent,
            now: new Date("2026-01-01T00:01:00.000Z"),
        });
        expect(result).toEqual({ claimed: 1, processed: 1, retried: 0, dead: 0 });
        expect(handleEvent).toHaveBeenCalledWith(event);
        expect(model.updateMany).toHaveBeenCalledTimes(1);
        expect(model.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: "processed" }) })
        );
    });

    it("requeues transient failures and dead-letters the fifth attempt", async () => {
        const { encryptLineWebhookEvent, processLineWebhookInbox } =
            await import("@/lib/line-bot/webhook-inbox");
        const baseRow = {
            id: "row-1",
            eventKey: "f".repeat(64),
            payloadCiphertext: encryptLineWebhookEvent(event),
            status: "retry_wait",
            availableAt: new Date("2026-01-01T00:00:00.000Z"),
            lockExpiresAt: null,
        };
        const run = async (attemptCount: number) => {
            const model = {
                create: vi.fn(),
                findFirst: vi
                    .fn()
                    .mockResolvedValueOnce({ ...baseRow, attemptCount })
                    .mockResolvedValueOnce(null),
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
                update: vi.fn().mockResolvedValue({}),
                count: vi.fn(),
                findMany: vi.fn(),
                deleteMany: vi.fn(),
            };
            const result = await processLineWebhookInbox({
                model,
                handleEvent: vi.fn().mockRejectedValue(new Error("network timeout")),
                now: new Date("2026-01-01T00:01:00.000Z"),
            });
            return { model, result };
        };
        const retry = await run(0);
        expect(retry.result.retried).toBe(1);
        expect(retry.model.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: "retry_wait" }) })
        );
        const dead = await run(4);
        expect(dead.result.dead).toBe(1);
        expect(dead.model.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: "dead" }) })
        );
    });
});
