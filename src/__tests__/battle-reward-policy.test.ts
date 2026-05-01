import { describe, expect, it, vi } from "vitest";
import {
  BATTLE_PAIR_REWARD_COOLDOWN_HOURS,
  DAILY_BATTLE_REWARD_CAP,
  resolveBattleRewardPayout,
} from "@/lib/services/student-economy/battle-reward-policy";

describe("battle reward policy", () => {
  it("blocks battle gold after the daily reward cap", async () => {
    const db = {
      battleSession: {
        count: vi.fn().mockResolvedValue(DAILY_BATTLE_REWARD_CAP),
        findFirst: vi.fn(),
      },
    };

    const result = await resolveBattleRewardPayout(db as never, {
      classId: "class-1",
      winnerId: "student-1",
      challengerId: "student-1",
      defenderId: "student-2",
      requestedGold: 30,
      now: new Date("2026-04-29T05:00:00.000Z"),
    });

    expect(result).toMatchObject({
      goldReward: 0,
      rewardBlockedReason: "daily_cap",
      dailyRewardCount: DAILY_BATTLE_REWARD_CAP,
      dailyRewardCap: DAILY_BATTLE_REWARD_CAP,
    });
    expect(db.battleSession.findFirst).not.toHaveBeenCalled();
  });

  it("blocks battle gold when the pair is still on cooldown", async () => {
    const lastRewardAt = new Date("2026-04-29T04:00:00.000Z");
    const db = {
      battleSession: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue({ createdAt: lastRewardAt }),
      },
    };

    const result = await resolveBattleRewardPayout(db as never, {
      classId: "class-1",
      winnerId: "student-1",
      challengerId: "student-1",
      defenderId: "student-2",
      requestedGold: 30,
      now: new Date("2026-04-29T05:00:00.000Z"),
    });

    expect(result).toMatchObject({
      goldReward: 0,
      rewardBlockedReason: "pair_cooldown",
      pairCooldownHours: BATTLE_PAIR_REWARD_COOLDOWN_HOURS,
      pairCooldownUntil: "2026-04-29T10:00:00.000Z",
    });
  });

  it("allows battle gold when under cap and outside pair cooldown", async () => {
    const db = {
      battleSession: {
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await resolveBattleRewardPayout(db as never, {
      classId: "class-1",
      winnerId: "student-1",
      challengerId: "student-1",
      defenderId: "student-2",
      requestedGold: 30,
      now: new Date("2026-04-29T05:00:00.000Z"),
    });

    expect(result).toMatchObject({
      goldReward: 30,
      rewardBlockedReason: null,
      dailyRewardCount: 1,
    });
  });
});
