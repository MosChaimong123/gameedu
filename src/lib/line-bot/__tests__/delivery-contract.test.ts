import { describe, expect, it, vi } from "vitest";
import {
    markDeliveryFailed,
    recordDelivery,
    type SharedReminderDeliveryModel,
} from "@/lib/line-bot/delivery-contract";

const delivery = {
    lineBotGroupId: "group-row-1",
    lineGroupId: "LINE-group-1",
    classroomId: "class-1",
    assignmentId: "assignment-1",
    reminderKey: "due_today:2026-07-27",
    reminderType: "due_today",
    targetCount: 2,
    triggeredBy: "cron",
};

describe("LINE reminder delivery contract", () => {
    it("allows only one concurrent claim for the same unique delivery", async () => {
        let row:
            | {
                  id: string;
                  status: string;
                  attemptCount: number;
                  maxAttempts: number;
                  nextAttemptAt: Date | null;
                  lockedAt: Date | null;
              }
            | undefined;
        const model = {
            create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
                if (row) throw { code: "P2002" };
                row = {
                    id: "delivery-1",
                    status: String(data.status),
                    attemptCount: Number(data.attemptCount),
                    maxAttempts: Number(data.maxAttempts),
                    nextAttemptAt: null,
                    lockedAt: data.lockedAt as Date,
                };
                return row;
            }),
            findFirst: vi.fn(async () => row ?? null),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            updateMany: vi.fn(async () => ({ count: 0 })),
            update: vi.fn(),
            deleteMany: vi.fn(),
        } as unknown as SharedReminderDeliveryModel;
        const now = new Date("2026-07-27T00:00:00.000Z");
        const [first, second] = await Promise.all([
            recordDelivery(model, delivery, { now }),
            recordDelivery(model, delivery, { now }),
        ]);
        expect([first.type, second.type].sort()).toEqual(["claimed", "duplicate"]);
    });

    it("recovers a sending row after its lease becomes stale", async () => {
        const stale = {
            id: "delivery-1",
            status: "sending",
            attemptCount: 1,
            maxAttempts: 3,
            nextAttemptAt: null,
            lockedAt: new Date("2026-07-26T23:00:00.000Z"),
        };
        const model = {
            create: vi.fn().mockRejectedValue({ code: "P2002" }),
            findFirst: vi.fn().mockResolvedValue(stale),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn(),
            deleteMany: vi.fn(),
        } as unknown as SharedReminderDeliveryModel;
        const result = await recordDelivery(model, delivery, {
            now: new Date("2026-07-27T00:00:00.000Z"),
        });
        expect(result).toMatchObject({ type: "claimed", attemptCount: 2 });
    });

    it("backs off a transient 429 and makes a terminal failure on attempt three", async () => {
        const update = vi.fn().mockResolvedValue({});
        const model = { update } as unknown as SharedReminderDeliveryModel;
        const now = new Date("2026-07-27T00:00:00.000Z");
        const retry = await markDeliveryFailed(
            model,
            "delivery-1",
            1,
            "LINE_RATE_LIMITED",
            { status: 429 },
            now
        );
        expect(retry).toBe("retry_wait");
        expect(update).toHaveBeenLastCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: "retry_wait",
                    nextAttemptAt: new Date("2026-07-27T00:01:00.000Z"),
                }),
            })
        );
        const terminal = await markDeliveryFailed(
            model,
            "delivery-1",
            3,
            "LINE_PUSH_FAILED",
            { status: 503 },
            now
        );
        expect(terminal).toBe("failed");
    });
});
