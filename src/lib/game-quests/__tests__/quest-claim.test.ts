import { describe, expect, it } from "vitest";
import {
    calculateQuestGoldReward,
    createQuestClaimIdempotencyKey,
    createQuestClaimRewardPlan,
    createQuestProgressSnapshot,
    createQuestChainClaimId,
    createQuestChainProgressSnapshot,
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
            ok: true,
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

    it("creates mixed reward plans and blocks duplicate quest-chain claims", () => {
        const plan = createQuestClaimRewardPlan({
            studentId: "student-1",
            classId: "class-1",
            questType: "chain",
            questId: "chain:chain_learning_path:submit_week",
            baseReward: 0,
            rewardRule: {
                gold: 25,
                exp: 15,
                itemIds: ["item_minor_potion"],
                skillIds: ["naga-aqua-jet"],
                formRank: 2,
            },
            balanceBefore: 100,
            periodKey: "chain_learning_path:submit_week",
        });

        expect(plan).toMatchObject({
            ok: true,
            idempotencyKey: "quest:student-1:chain:chain_learning_path:submit_week:chain:chain_learning_path:submit_week",
            reward: {
                gold: 25,
                exp: 15,
                grantedItemIds: ["item_minor_potion"],
                unlockedSkillIds: ["naga-aqua-jet"],
            },
            inventoryChange: {
                grantedItemIds: ["item_minor_potion"],
            },
            historyEvents: [
                {
                    kind: "quest_claimed",
                    titleKey: "questChainStepClaimedHistoryTitle",
                },
            ],
        });

        const duplicate = createQuestClaimRewardPlan({
            studentId: "student-1",
            questType: "chain",
            questId: "chain:chain_learning_path:submit_week",
            baseReward: 0,
            balanceBefore: 100,
            periodKey: "chain_learning_path:submit_week",
            finalizedRewardKeys: [plan.idempotencyKey],
        });
        expect(duplicate).toMatchObject({
            ok: false,
            reason: "duplicate_claim",
            reward: { blockedReason: "duplicate_finalize" },
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
            chain: {
                dailyClaimedIds: ["quest_login"],
                weeklyClaimedIds: [],
                challengeClaimedIds: [],
                chainClaimedRaw: [],
                streak: 14,
                submissionsThisWeek: 3,
                totalSubmissions: 10,
                inventoryCount: 1,
            },
        });

        expect(snapshot.daily.every((quest) => quest.completed)).toBe(true);
        expect(snapshot.weekly.every((quest) => quest.completed)).toBe(true);
        expect(snapshot.challenge.every((quest) => quest.completed)).toBe(true);
        expect(snapshot.chain[0]).toMatchObject({
            id: "chain:chain_learning_path:login",
            completed: true,
            claimed: false,
            questType: "chain",
            stepIndex: 1,
            totalSteps: 3,
        });
        expect(snapshot.chain[1].completed).toBe(false);
    });

    it("gates chain steps behind previous claimed steps", () => {
        const chain = createQuestChainProgressSnapshot({
            progress: {
                dailyClaimedIds: ["quest_login", "quest_checkin"],
                weeklyClaimedIds: ["wq_submit3_week"],
                challengeClaimedIds: [],
                chainClaimedIds: [createQuestChainClaimId("chain_learning_path", "login")],
                streak: 5,
                submissionsThisWeek: 3,
                totalSubmissions: 3,
                inventoryCount: 0,
            },
        });

        expect(chain.map((step) => ({ id: step.stepId, completed: step.completed, claimed: step.claimed }))).toEqual([
            { id: "login", completed: true, claimed: true },
            { id: "checkin", completed: true, claimed: false },
            { id: "submit_week", completed: false, claimed: false },
        ]);
    });
});
