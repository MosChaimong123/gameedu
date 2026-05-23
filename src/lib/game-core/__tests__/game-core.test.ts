import { describe, expect, it } from "vitest";
import {
    applyInventoryChange,
    applyInventoryChangeStrict,
    applyGoldBalance,
    aggregateGameHistoryAnalytics,
    assertEconomyMutationBalance,
    countInventoryItem,
    createBattleHistorySummary,
    createEconomyLedgerHistorySummary,
    createGameEconomyMutation,
    createGameHistoryEvent,
    createGameHistoryId,
    createInventoryConsumeChange,
    createGameMonsterSnapshot,
    createGameSkillSnapshot,
    createGameRewardIdempotencyKey,
    createGameRewardResult,
    createGameSessionSummary,
    isFinalGameSessionStatus,
    mergeInventoryChanges,
    parseGameBooleanFlag,
} from "@/lib/game-core";

describe("game-core contracts", () => {
    it("normalizes session summaries without requiring game-specific state", () => {
        const summary = createGameSessionSummary({
            id: "session-1",
            kind: "negamon",
            status: "active",
            studentId: "student-1",
            classId: "class-1",
            startedAt: new Date("2026-05-23T00:00:00.000Z"),
            opponentId: null,
        });

        expect(summary).toMatchObject({
            id: "session-1",
            kind: "negamon",
            status: "active",
            startedAt: "2026-05-23T00:00:00.000Z",
            opponentId: undefined,
        });
        expect(isFinalGameSessionStatus("finished")).toBe(true);
        expect(isFinalGameSessionStatus("active")).toBe(false);
    });

    it("normalizes rewards and idempotency keys", () => {
        const reward = createGameRewardResult({
            gold: 12.8,
            grantedItemIds: ["potion"],
            xp: 4.2,
            idempotencyKey: " reward-key ",
        });

        expect(reward).toEqual({
            gold: 12,
            grantedItemIds: ["potion"],
            exp: 4,
            xp: 4,
            levelUps: [],
            unlockedSkillIds: [],
            blockedReason: undefined,
            idempotencyKey: "reward-key",
        });
        expect(
            createGameRewardIdempotencyKey({
                kind: "negamon",
                sessionId: "battle-1",
                studentId: "student-1",
                reason: "win",
            })
        ).toBe("game:negamon:battle-1:student-1:win");
    });

    it("applies inventory changes with stack-aware consumption", () => {
        const merged = mergeInventoryChanges([
            { consumedItemIds: ["potion"], grantedItemIds: ["coin"] },
            { consumedItemIds: ["potion"], grantedItemIds: ["gem"], equippedItemIds: ["frame"] },
        ]);

        expect(merged).toEqual({
            consumedItemIds: ["potion", "potion"],
            grantedItemIds: ["coin", "gem"],
            equippedItemIds: ["frame"],
            unequippedItemIds: [],
        });
        expect(applyInventoryChange(["potion", "potion", "shield"], merged)).toEqual(["shield", "coin", "gem"]);
        expect(countInventoryItem(["potion", "potion", "shield"], "potion")).toBe(2);
        expect(applyInventoryChange(["shield"], createInventoryConsumeChange(["missing"]))).toEqual(["shield"]);
        expect(() =>
            applyInventoryChangeStrict(["shield"], createInventoryConsumeChange(["missing"]))
        ).toThrow("MISSING_ITEM:missing");
    });

    it("normalizes economy mutations and verifies balances", () => {
        const mutation = createGameEconomyMutation({
            studentId: "student-1",
            classId: "class-1",
            type: "spend",
            source: "shop",
            amount: -25.7,
            balanceBefore: 100.2,
            sourceRefId: "item-1",
            idempotencyKey: " shop-key ",
        });

        expect(mutation).toEqual({
            studentId: "student-1",
            classId: "class-1",
            type: "spend",
            source: "shop",
            amount: -25,
            balanceBefore: 100,
            balanceAfter: 75,
            sourceRefId: "item-1",
            idempotencyKey: "shop-key",
        });
        expect(applyGoldBalance(10, 5)).toBe(15);
        expect(() => assertEconomyMutationBalance(mutation)).not.toThrow();
        expect(() =>
            assertEconomyMutationBalance({ ...mutation, balanceAfter: 99 })
        ).toThrow("GAME_ECONOMY_BALANCE_MISMATCH");
    });

    it("creates history events with stable ids", () => {
        const id = createGameHistoryId({
            gameKind: "quest",
            kind: "quest_claimed",
            studentId: "student-1",
            refId: "quest-login",
        });
        const event = createGameHistoryEvent({
            id,
            kind: "quest_claimed",
            gameKind: "quest",
            studentId: "student-1",
            titleKey: "questLoginName",
            createdAt: new Date("2026-05-23T01:00:00.000Z"),
        });

        expect(event).toMatchObject({
            id: "game-history:quest:quest_claimed:student-1:quest-login",
            createdAt: "2026-05-23T01:00:00.000Z",
        });
    });

    it("creates battle history summaries and analytics", () => {
        const win = createBattleHistorySummary({
            id: "battle-1",
            classId: "class-1",
            studentId: "student-1",
            challengerId: "student-1",
            defenderId: "student-2",
            winnerId: "student-1",
            goldReward: 30,
            createdAt: new Date("2026-05-23T02:00:00.000Z"),
        });
        const loss = createBattleHistorySummary({
            id: "battle-2",
            classId: "class-1",
            studentId: "student-1",
            challengerId: "student-2",
            defenderId: "student-1",
            winnerId: "student-2",
            goldReward: 30,
            createdAt: "2026-05-23T03:00:00.000Z",
        });

        expect(win).toMatchObject({
            id: "game-history:negamon:battle_finished:student-1:battle-1",
            opponentId: "student-2",
            outcome: "win",
            goldDelta: 30,
        });
        expect(loss).toMatchObject({
            opponentId: "student-2",
            outcome: "loss",
            goldDelta: 0,
        });
        expect(aggregateGameHistoryAnalytics([win, loss])).toEqual({
            totalEvents: 2,
            wins: 1,
            losses: 1,
            goldEarned: 30,
            goldSpent: 0,
            expEarned: 0,
            itemsGranted: 0,
            byGameKind: { negamon: 2 },
            byStudent: { "student-1": 2 },
        });
    });

    it("creates quest and shop history summaries from economy ledger rows", () => {
        const quest = createEconomyLedgerHistorySummary({
            id: "tx-quest",
            studentId: "student-1",
            classId: "class-1",
            source: "quest",
            type: "earn",
            amount: 5,
            sourceRefId: null,
            createdAt: "2026-05-23T04:00:00.000Z",
            metadata: { questId: "quest_login" },
        });
        const shop = createEconomyLedgerHistorySummary({
            id: "tx-shop",
            studentId: "student-1",
            classId: "class-1",
            source: "shop",
            type: "spend",
            amount: -100,
            sourceRefId: "frame_fire_t1",
            createdAt: "2026-05-23T05:00:00.000Z",
            metadata: { itemId: "frame_fire_t1" },
        });

        expect(quest).toMatchObject({
            id: "game-history:quest:quest_claimed:student-1:quest_login",
            kind: "quest_claimed",
            gameKind: "quest",
            goldDelta: 5,
            expDelta: 0,
        });
        expect(shop).toMatchObject({
            id: "game-history:shop:shop_purchase:student-1:frame_fire_t1",
            kind: "shop_purchase",
            gameKind: "shop",
            goldDelta: -100,
            expDelta: 0,
            itemDelta: 1,
        });
        expect(createEconomyLedgerHistorySummary({
            id: "tx-checkin",
            studentId: "student-1",
            source: "checkin",
            type: "earn",
            amount: 10,
            createdAt: "2026-05-23T06:00:00.000Z",
        })).toBeNull();
    });

    it("parses game boolean flags consistently", () => {
        expect(parseGameBooleanFlag("enabled")).toBe(true);
        expect(parseGameBooleanFlag("off", true)).toBe(false);
        expect(parseGameBooleanFlag(undefined, true)).toBe(true);
        expect(parseGameBooleanFlag("unknown", false)).toBe(false);
    });

    it("normalizes monster and skill snapshots", () => {
        const monster = createGameMonsterSnapshot({
            studentId: "student-1",
            speciesId: "naga",
            speciesName: "Naga",
            formName: "Young Naga",
            rankIndex: 2,
            types: ["water", undefined, " light "],
            stats: { hp: 100, atk: 20, def: 18, spd: 12 },
            unlockedMoves: [
                { id: "slash", name: "Slash", category: "PHYSICAL", learnRank: 3, power: 60 },
                { id: "heal", name: "Heal", category: "HEAL", learnRank: 4, energyCost: 8 },
                { id: "slow", name: "Slow", category: "STATUS", effect: "LOWER_SPD" },
            ],
        });

        expect(monster).toMatchObject({
            studentId: "student-1",
            speciesId: "naga",
            formName: "Young Naga",
            rankIndex: 2,
            level: 3,
            types: ["WATER", "LIGHT"],
        });
        expect(monster.skills.map((skill) => skill.category)).toEqual(["attack", "heal", "debuff"]);
        expect(createGameSkillSnapshot({ id: "guard", name: "Guard", category: "STATUS", effect: "BOOST_DEF" }))
            .toMatchObject({ category: "buff", level: 1, unlocked: true });
    });
});
