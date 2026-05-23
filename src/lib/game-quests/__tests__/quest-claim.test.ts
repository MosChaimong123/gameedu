import { describe, expect, it } from "vitest";
import {
    calculateQuestGoldReward,
    createQuestClaimIdempotencyKey,
    createQuestClaimRewardPlan,
    createQuestProgressSnapshot,
} from "@/lib/game-quests";

describe("game-quests claim contracts", () => {
    it("normalizes quest gold rewards and economy mutations", () => {
        const plan = createQuestClaimRewardPlan({
            studentId: "student-1",
            classId: "class-1",
            questType: "weekly",
            questId: "weekly_submit_5",
            baseReward: 25,
            multiplier: 1.5,
            balanceBefore: 100,
        });

        expect(plan).toMatchObject({
            reward: {
                gold: 37,
                grantedItemIds: [],
                idempotencyKey: "quest:student-1:weekly:weekly_submit_5",
            },
            economyMutation: {
                studentId: "student-1",
                classId: "class-1",
                type: "earn",
                source: "quest",
                amount: 37,
                balanceBefore: 100,
                balanceAfter: 137,
                sourceRefId: "weekly_submit_5",
            },
        });
    });

    it("builds period-aware idempotency keys", () => {
        expect(calculateQuestGoldReward(10, 1.25)).toBe(12);
        expect(
            createQuestClaimIdempotencyKey({
                studentId: "student-1",
                questType: "daily",
                questId: "quest_login",
                periodKey: "2026-05-23",
            })
        ).toBe("quest:student-1:daily:2026-05-23:quest_login");
    });

    it("builds quest progress snapshots for all quest groups", () => {
        const snapshot = createQuestProgressSnapshot({
            daily: {
                streak: 7,
                lastCheckIn: new Date(),
                hasSubmitToday: true,
                claimedRaw: null,
            },
            weekly: {
                streak: 7,
                submissionsThisWeek: 3,
                allDailyClaimedToday: true,
                claimedRaw: null,
            },
            challenge: {
                streak: 14,
                totalSubmissions: 10,
                hasItem: true,
                claimedRaw: [],
            },
        });

        expect(snapshot.daily.every((quest) => quest.completed)).toBe(true);
        expect(snapshot.weekly.every((quest) => quest.completed)).toBe(true);
        expect(snapshot.challenge.every((quest) => quest.completed)).toBe(true);
    });
});
