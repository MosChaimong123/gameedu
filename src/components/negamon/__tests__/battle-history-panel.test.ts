import { describe, expect, it } from "vitest";
import type { GameHistorySummary } from "@/lib/game-core";
import { formatBattleHistoryRewardStatus } from "../BattleHistoryPanel";

function makeEntry(overrides: Partial<GameHistorySummary> = {}): GameHistorySummary {
    return {
        id: "history-1",
        kind: "battle_finished",
        gameKind: "negamon",
        studentId: "student-1",
        opponentId: "student-2",
        winnerId: "student-1",
        outcome: "win",
        goldDelta: 0,
        expDelta: 0,
        itemDelta: 0,
        createdAt: "2026-06-01T00:00:00.000Z",
        sourceRefId: "battle-1",
        titleKey: "battleHistoryTitle",
        ...overrides,
    };
}

describe("formatBattleHistoryRewardStatus", () => {
    it("explains pair cooldown for a blocked win", () => {
        const status = formatBattleHistoryRewardStatus(makeEntry(), {
            requestedGoldReward: 30,
            goldReward: 0,
            rewardBlockedReason: "pair_cooldown",
        });

        expect(status.badge).toBe("พักรางวัล");
        expect(status.detail).toContain("คู่นี้ยังอยู่ในช่วงพักรางวัล");
        expect(status.detail).toContain("30G -> 0G");
        expect(status.tone).toBe("blocked");
    });

    it("keeps normal win messaging when reward is granted", () => {
        const status = formatBattleHistoryRewardStatus(
            makeEntry({ goldDelta: 24 }),
            {
                requestedGoldReward: 24,
                goldReward: 24,
                rewardBlockedReason: null,
            }
        );

        expect(status.badge).toBe("+24G");
        expect(status.detail).toContain("24G");
        expect(status.tone).toBe("win");
    });
});
