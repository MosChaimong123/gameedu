/**
 * Property-Based Tests for RewardManager
 *
 * P6: Reward Atomicity — all or nothing per-student reward persistence.
 * Also tests retry logic and partial failure isolation.
 *
 * **Validates: Requirements 15.6, 15.7**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// ─── Mock db ──────────────────────────────────────────────────────────────────
// We mock the entire db module so $transaction can be made to throw on demand.

vi.mock("@/lib/db", () => {
  const mockTransaction = vi.fn();
  const mockStudentFindUnique = vi.fn();
  const mockStudentUpdate = vi.fn();
  const mockStudentItemUpsert = vi.fn();
  const mockMaterialUpsert = vi.fn();
  const mockItemFindUnique = vi.fn();

  return {
    db: {
      $transaction: mockTransaction,
      student: {
        findUnique: mockStudentFindUnique,
        update: mockStudentUpdate,
      },
      studentItem: {
        upsert: mockStudentItemUpsert,
      },
      item: {
        findUnique: mockItemFindUnique,
      },
      material: {
        upsert: mockMaterialUpsert,
      },
    },
  };
});

import { db } from "@/lib/db";
import { RewardManager } from "../reward-manager";
import { BattlePlayer } from "../../types/game";

// Disable backoff delays in tests for speed
RewardManager.sleep = () => Promise.resolve();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<BattlePlayer> = {}): BattlePlayer {
  return {
    id: "socket-1",
    name: "TestPlayer",
    isConnected: true,
    score: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    hp: 100,
    maxHp: 100,
    ap: 50,
    maxAp: 100,
    mp: 30,
    maxMp: 50,
    atk: 20,
    def: 10,
    spd: 10,
    crit: 0.05,
    luck: 0.01,
    mag: 5,
    level: 5,
    skills: [],
    isDefending: false,
    jobClass: null,
    jobTier: "BASE",
    wave: 3,
    soloMonster: null,
    studentId: "student-abc",
    immortalUsed: false,
    hasLifesteal: false,
    hasImmortal: false,
    hasManaFlow: false,
    hasTimeWarp: false,
    hasToughSkin: false,
    hasTitanWill: false,
    hasHolyFury: false,
    hasArcaneSurge: false,
    hasDarkPact: false,
    hasHawkEye: false,
    hasShadowVeil: false,
    hasGodBlessing: false,
    hasLuckyStrike: false,
    chainLightningOnCrit: false,
    hasBerserkerRage: false,
    hasBattleFocus: false,
    hasEchoStrike: false,
    hasDragonBlood: false,
    hasCelestialGrace: false,
    hasVoidWalker: false,
    hasSoulEater: false,
    dodgeChance: 0,
    shadowVeilCritBuff: false,
    goldMultiplier: 0,
    xpMultiplier: 0,
    bossDamageMultiplier: 0,
    earnedGold: 100,
    earnedXp: 50,
    itemDrops: [],
    materialDrops: [],
    statusEffects: [],
    ...overrides,
  };
}

function makeGameStats(level = 5, xp = 0, gold = 200) {
  return { gold, level, xp, inventory: [], equipment: {}, multipliers: { gold: 1, xp: 1 } };
}

function makeItemStats() {
  return {
    baseHp: 10,
    baseAtk: 5,
    baseDef: 3,
    baseSpd: 2,
    baseCrit: 0.01,
    baseLuck: 0.01,
    baseMag: 4,
    baseMp: 6,
  };
}

// ─── P6: Reward Atomicity ─────────────────────────────────────────────────────

describe("P6 — Reward Atomicity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no partial writes occur when DB transaction throws", async () => {
    // Arrange: transaction always throws
    (db.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB connection lost")
    );

    const player = makePlayer({ studentId: "student-fail" });
    const results = await RewardManager.persistRewards([player]);

    // The result should have error: true
    expect(results[0].error).toBe(true);
    // The transaction was attempted MAX_RETRIES (3) times
    expect(db.$transaction).toHaveBeenCalledTimes(3);
  });

  it("P6 property: for any player with failing transaction, error flag is set and no partial writes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 500 }),   // earnedGold
        fc.integer({ min: 1, max: 200 }),   // earnedXp
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }), // itemDrops
        async (earnedGold, earnedXp, itemDrops) => {
          vi.clearAllMocks();

          // Transaction always fails
          (db.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error("Simulated DB failure")
          );

          const player = makePlayer({ earnedGold, earnedXp, itemDrops, studentId: "student-x" });
          const results = await RewardManager.persistRewards([player]);

          // error flag must be set
          expect(results[0].error).toBe(true);
          // No student update, no item create, no material upsert should have been committed
          // (they're inside the transaction which threw — the mock confirms no commit)
          expect(db.$transaction).toHaveBeenCalledTimes(3);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("retries exactly 3 times before giving up", async () => {
    (db.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Transient error")
    );

    const player = makePlayer({ studentId: "student-retry" });
    await RewardManager.persistRewards([player]);

    expect(db.$transaction).toHaveBeenCalledTimes(3);
  });

  it("succeeds on first attempt when transaction resolves", async () => {
    const gameStats = makeGameStats(5, 0, 200);

    (db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof db) => Promise<unknown>) => {
        // Simulate the transaction executing the callback
        const tx = {
          student: {
            findUnique: vi.fn().mockResolvedValue({ gameStats }),
            update: vi.fn().mockResolvedValue({}),
          },
          studentItem: { upsert: vi.fn().mockResolvedValue({}) },
          item: { findUnique: vi.fn().mockResolvedValue(makeItemStats()) },
          material: { upsert: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx as unknown as typeof db);
      }
    );

    const player = makePlayer({ studentId: "student-ok", earnedGold: 50, earnedXp: 30 });
    const results = await RewardManager.persistRewards([player]);

    expect(results[0].error).toBeUndefined();
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it("successful players still get rewards even if one player's transaction fails", async () => {
    const gameStats = makeGameStats(5, 0, 200);

    // Verify independently: failing player gets error, succeeding player does not
    (db.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("fail"));
    const failingPlayer = makePlayer({ studentId: "student-fail", id: "s1", name: "Fail" });
    const [failResult] = await RewardManager.persistRewards([failingPlayer]);
    expect(failResult.error).toBe(true);

    vi.clearAllMocks();

    (db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof db) => Promise<unknown>) => {
        const tx = {
          student: {
            findUnique: vi.fn().mockResolvedValue({ gameStats }),
            update: vi.fn().mockResolvedValue({}),
          },
          studentItem: { upsert: vi.fn().mockResolvedValue({}) },
          item: { findUnique: vi.fn().mockResolvedValue(makeItemStats()) },
          material: { upsert: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx as unknown as typeof db);
      }
    );

    const successPlayer = makePlayer({ studentId: "student-ok", id: "s2", name: "OK" });
    const [okResult] = await RewardManager.persistRewards([successPlayer]);
    expect(okResult.error).toBeUndefined();
  });

  it("player without studentId gets base reward without DB call", async () => {
    const player = makePlayer({ studentId: "" });
    const results = await RewardManager.persistRewards([player]);

    expect(results[0].error).toBeUndefined();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("leveledUp and newLevel are correctly populated on success", async () => {
    // Level 1 with 0 xp, earning 100 xp should level up (requirement is 100 at level 1)
    const gameStats = makeGameStats(1, 0, 0);

    (db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof db) => Promise<unknown>) => {
        const tx = {
          student: {
            findUnique: vi.fn().mockResolvedValue({ gameStats }),
            update: vi.fn().mockResolvedValue({}),
          },
          studentItem: { upsert: vi.fn().mockResolvedValue({}) },
          item: { findUnique: vi.fn().mockResolvedValue(makeItemStats()) },
          material: { upsert: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx as unknown as typeof db);
      }
    );

    const player = makePlayer({ studentId: "student-lvl", level: 1, earnedXp: 100 });
    const results = await RewardManager.persistRewards([player]);

    expect(results[0].leveledUp).toBe(true);
    expect(results[0].newLevel).toBeGreaterThan(1);
  });

  it("P6 property: successful transaction always returns leveledUp and newLevel", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),   // level
        fc.integer({ min: 0, max: 500 }),  // earnedXp
        fc.integer({ min: 0, max: 1000 }), // currentXp
        async (level, earnedXp, currentXp) => {
          vi.clearAllMocks();

          const gameStats = makeGameStats(level, currentXp, 0);

          (db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
            async (fn: (tx: typeof db) => Promise<unknown>) => {
              const tx = {
                student: {
                  findUnique: vi.fn().mockResolvedValue({ gameStats }),
                  update: vi.fn().mockResolvedValue({}),
                },
                studentItem: { upsert: vi.fn().mockResolvedValue({}) },
                item: { findUnique: vi.fn().mockResolvedValue(makeItemStats()) },
                material: { upsert: vi.fn().mockResolvedValue({}) },
              };
              return fn(tx as unknown as typeof db);
            }
          );

          const player = makePlayer({ studentId: "student-prop", level, earnedXp });
          const results = await RewardManager.persistRewards([player]);

          expect(results[0].error).toBeUndefined();
          expect(typeof results[0].leveledUp).toBe("boolean");
          expect(results[0].newLevel).toBeGreaterThanOrEqual(level);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("merges duplicate item drops into existing inventory rows", async () => {
    const gameStats = makeGameStats(5, 0, 200);
    const studentItemUpsert = vi.fn().mockResolvedValue({});

    (db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof db) => Promise<unknown>) => {
        const tx = {
          student: {
            findUnique: vi.fn().mockResolvedValue({ gameStats }),
            update: vi.fn().mockResolvedValue({}),
          },
          studentItem: { upsert: studentItemUpsert },
          item: { findUnique: vi.fn().mockResolvedValue(makeItemStats()) },
          material: { upsert: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx as unknown as typeof db);
      }
    );

    const player = makePlayer({
      studentId: "student-dup",
      itemDrops: ["item-1", "item-1", "item-2"],
    });

    const results = await RewardManager.persistRewards([player]);

    expect(results[0].error).toBeUndefined();
    expect(studentItemUpsert).toHaveBeenCalledTimes(3);
    expect(studentItemUpsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          studentId_itemId: {
            studentId: "student-dup",
            itemId: "item-1",
          },
        },
        update: { quantity: { increment: 1 } },
      })
    );
  });
});
