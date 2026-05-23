import { describe, expect, it, vi } from "vitest";
import type { AbstractGameEngine } from "@/lib/game-engine/abstract-game";
import {
    shouldStartNegamonClassroomRewardSync,
    triggerNegamonClassroomRewardSync,
} from "@/lib/game-engine/negamon-reward-sync-runner";

const mocks = vi.hoisted(() => ({
    logAuditEvent: vi.fn(),
}));

vi.mock("@/lib/security/audit-log", () => ({
    logAuditEvent: mocks.logAuditEvent,
}));

function makeEndedNegamonGame(): AbstractGameEngine {
    return {
        status: "ENDED",
        gameMode: "NEGAMON_BATTLE",
        pin: "123456",
        hostId: "teacher-1",
        setId: "set-1",
        settings: {
            negamonRewardClassroomId: "class-1",
        },
        negamonClassroomRewardsSynced: false,
        negamonClassroomRewardsSyncInProgress: false,
        negamonClassroomRewardsLastAttemptAt: 0,
        negamonClassroomRewardsLastError: null,
    } as unknown as AbstractGameEngine;
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("negamon classroom reward sync runner", () => {
    it("marks rewards as synced only after the async sync succeeds", async () => {
        const game = makeEndedNegamonGame();
        const syncFn = vi.fn().mockResolvedValue(undefined);

        const started = triggerNegamonClassroomRewardSync(game, {
            now: 1_000,
            syncFn,
        });

        expect(started).toBe(true);
        expect(syncFn).toHaveBeenCalledWith(game);
        expect(game.negamonClassroomRewardsSyncInProgress).toBe(true);
        expect(game.negamonClassroomRewardsSynced).toBe(false);
        expect(game.negamonClassroomRewardsLastAttemptAt).toBe(1_000);

        await flushPromises();

        expect(game.negamonClassroomRewardsSyncInProgress).toBe(false);
        expect(game.negamonClassroomRewardsSynced).toBe(true);
        expect(game.negamonClassroomRewardsLastError).toBeNull();
    });

    it("does not start parallel sync jobs while one is in progress", () => {
        const game = makeEndedNegamonGame();
        const syncFn = vi.fn(() => new Promise(() => undefined));

        expect(triggerNegamonClassroomRewardSync(game, { now: 1_000, syncFn })).toBe(true);
        expect(triggerNegamonClassroomRewardSync(game, { now: 2_000, syncFn })).toBe(false);
        expect(syncFn).toHaveBeenCalledTimes(1);
    });

    it("leaves failed sync retryable and logs enough metadata for recovery", async () => {
        const game = makeEndedNegamonGame();
        const syncFn = vi.fn().mockRejectedValue(new Error("database timeout"));

        expect(triggerNegamonClassroomRewardSync(game, { now: 1_000, syncFn })).toBe(true);
        await flushPromises();

        expect(game.negamonClassroomRewardsSyncInProgress).toBe(false);
        expect(game.negamonClassroomRewardsSynced).toBe(false);
        expect(game.negamonClassroomRewardsLastError).toBe("database timeout");
        expect(mocks.logAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                actorUserId: "teacher-1",
                action: "classroom.negamon_battle.rewards_sync_failed",
                status: "error",
                targetId: "class-1",
                metadata: expect.objectContaining({
                    gamePin: "123456",
                    setId: "set-1",
                    error: "database timeout",
                    retryable: true,
                }),
            })
        );
    });

    it("waits for the retry delay after a failed attempt before starting another sync", () => {
        const game = makeEndedNegamonGame();
        game.negamonClassroomRewardsLastAttemptAt = 10_000;

        expect(shouldStartNegamonClassroomRewardSync(game, 12_000, 10_000)).toBe(false);
        expect(shouldStartNegamonClassroomRewardSync(game, 20_000, 10_000)).toBe(true);
    });
});
