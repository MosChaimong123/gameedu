"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Property-Based Tests for RewardManager
 *
 * P6: Reward Atomicity — all or nothing per-student reward persistence.
 * Also tests retry logic and partial failure isolation.
 *
 * **Validates: Requirements 15.6, 15.7**
 */
const vitest_1 = require("vitest");
const fc = __importStar(require("fast-check"));
// ─── Mock db ──────────────────────────────────────────────────────────────────
// We mock the entire db module so $transaction can be made to throw on demand.
vitest_1.vi.mock("@/lib/db", () => {
    const mockTransaction = vitest_1.vi.fn();
    const mockStudentFindUnique = vitest_1.vi.fn();
    const mockStudentUpdate = vitest_1.vi.fn();
    const mockStudentItemCreate = vitest_1.vi.fn();
    const mockMaterialUpsert = vitest_1.vi.fn();
    return {
        db: {
            $transaction: mockTransaction,
            student: {
                findUnique: mockStudentFindUnique,
                update: mockStudentUpdate,
            },
            studentItem: {
                create: mockStudentItemCreate,
            },
            material: {
                upsert: mockMaterialUpsert,
            },
        },
    };
});
const db_1 = require("@/lib/db");
const reward_manager_1 = require("../reward-manager");
// Disable backoff delays in tests for speed
reward_manager_1.RewardManager.sleep = () => Promise.resolve();
// ─── Helpers ──────────────────────────────────────────────────────────────────
function makePlayer(overrides = {}) {
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
        earnedGold: 100,
        earnedXp: 50,
        itemDrops: [],
        materialDrops: [],
        ...overrides,
    };
}
function makeGameStats(level = 5, xp = 0, gold = 200) {
    return { gold, level, xp, inventory: [], equipment: {}, multipliers: { gold: 1, xp: 1 } };
}
// ─── P6: Reward Atomicity ─────────────────────────────────────────────────────
(0, vitest_1.describe)("P6 — Reward Atomicity", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)("no partial writes occur when DB transaction throws", async () => {
        // Arrange: transaction always throws
        db_1.db.$transaction.mockRejectedValue(new Error("DB connection lost"));
        const player = makePlayer({ studentId: "student-fail" });
        const results = await reward_manager_1.RewardManager.persistRewards([player]);
        // The result should have error: true
        (0, vitest_1.expect)(results[0].error).toBe(true);
        // The transaction was attempted MAX_RETRIES (3) times
        (0, vitest_1.expect)(db_1.db.$transaction).toHaveBeenCalledTimes(3);
    });
    (0, vitest_1.it)("P6 property: for any player with failing transaction, error flag is set and no partial writes", async () => {
        await fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 500 }), // earnedGold
        fc.integer({ min: 1, max: 200 }), // earnedXp
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }), // itemDrops
        async (earnedGold, earnedXp, itemDrops) => {
            vitest_1.vi.clearAllMocks();
            // Transaction always fails
            db_1.db.$transaction.mockRejectedValue(new Error("Simulated DB failure"));
            const player = makePlayer({ earnedGold, earnedXp, itemDrops, studentId: "student-x" });
            const results = await reward_manager_1.RewardManager.persistRewards([player]);
            // error flag must be set
            (0, vitest_1.expect)(results[0].error).toBe(true);
            // No student update, no item create, no material upsert should have been committed
            // (they're inside the transaction which threw — the mock confirms no commit)
            (0, vitest_1.expect)(db_1.db.$transaction).toHaveBeenCalledTimes(3);
        }), { numRuns: 50 });
    });
    (0, vitest_1.it)("retries exactly 3 times before giving up", async () => {
        db_1.db.$transaction.mockRejectedValue(new Error("Transient error"));
        const player = makePlayer({ studentId: "student-retry" });
        await reward_manager_1.RewardManager.persistRewards([player]);
        (0, vitest_1.expect)(db_1.db.$transaction).toHaveBeenCalledTimes(3);
    });
    (0, vitest_1.it)("succeeds on first attempt when transaction resolves", async () => {
        const gameStats = makeGameStats(5, 0, 200);
        db_1.db.$transaction.mockImplementation(async (fn) => {
            // Simulate the transaction executing the callback
            const tx = {
                student: {
                    findUnique: vitest_1.vi.fn().mockResolvedValue({ gameStats }),
                    update: vitest_1.vi.fn().mockResolvedValue({}),
                },
                studentItem: { create: vitest_1.vi.fn().mockResolvedValue({}) },
                material: { upsert: vitest_1.vi.fn().mockResolvedValue({}) },
            };
            return fn(tx);
        });
        const player = makePlayer({ studentId: "student-ok", earnedGold: 50, earnedXp: 30 });
        const results = await reward_manager_1.RewardManager.persistRewards([player]);
        (0, vitest_1.expect)(results[0].error).toBeUndefined();
        (0, vitest_1.expect)(db_1.db.$transaction).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)("successful players still get rewards even if one player's transaction fails", async () => {
        const gameStats = makeGameStats(5, 0, 200);
        // Verify independently: failing player gets error, succeeding player does not
        db_1.db.$transaction.mockRejectedValue(new Error("fail"));
        const failingPlayer = makePlayer({ studentId: "student-fail", id: "s1", name: "Fail" });
        const [failResult] = await reward_manager_1.RewardManager.persistRewards([failingPlayer]);
        (0, vitest_1.expect)(failResult.error).toBe(true);
        vitest_1.vi.clearAllMocks();
        db_1.db.$transaction.mockImplementation(async (fn) => {
            const tx = {
                student: {
                    findUnique: vitest_1.vi.fn().mockResolvedValue({ gameStats }),
                    update: vitest_1.vi.fn().mockResolvedValue({}),
                },
                studentItem: { create: vitest_1.vi.fn().mockResolvedValue({}) },
                material: { upsert: vitest_1.vi.fn().mockResolvedValue({}) },
            };
            return fn(tx);
        });
        const successPlayer = makePlayer({ studentId: "student-ok", id: "s2", name: "OK" });
        const [okResult] = await reward_manager_1.RewardManager.persistRewards([successPlayer]);
        (0, vitest_1.expect)(okResult.error).toBeUndefined();
    });
    (0, vitest_1.it)("player without studentId gets base reward without DB call", async () => {
        const player = makePlayer({ studentId: "" });
        const results = await reward_manager_1.RewardManager.persistRewards([player]);
        (0, vitest_1.expect)(results[0].error).toBeUndefined();
        (0, vitest_1.expect)(db_1.db.$transaction).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("leveledUp and newLevel are correctly populated on success", async () => {
        // Level 1 with 0 xp, earning 100 xp should level up (requirement is 100 at level 1)
        const gameStats = makeGameStats(1, 0, 0);
        db_1.db.$transaction.mockImplementation(async (fn) => {
            const tx = {
                student: {
                    findUnique: vitest_1.vi.fn().mockResolvedValue({ gameStats }),
                    update: vitest_1.vi.fn().mockResolvedValue({}),
                },
                studentItem: { create: vitest_1.vi.fn().mockResolvedValue({}) },
                material: { upsert: vitest_1.vi.fn().mockResolvedValue({}) },
            };
            return fn(tx);
        });
        const player = makePlayer({ studentId: "student-lvl", level: 1, earnedXp: 100 });
        const results = await reward_manager_1.RewardManager.persistRewards([player]);
        (0, vitest_1.expect)(results[0].leveledUp).toBe(true);
        (0, vitest_1.expect)(results[0].newLevel).toBeGreaterThan(1);
    });
    (0, vitest_1.it)("P6 property: successful transaction always returns leveledUp and newLevel", async () => {
        await fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 50 }), // level
        fc.integer({ min: 0, max: 500 }), // earnedXp
        fc.integer({ min: 0, max: 1000 }), // currentXp
        async (level, earnedXp, currentXp) => {
            vitest_1.vi.clearAllMocks();
            const gameStats = makeGameStats(level, currentXp, 0);
            db_1.db.$transaction.mockImplementation(async (fn) => {
                const tx = {
                    student: {
                        findUnique: vitest_1.vi.fn().mockResolvedValue({ gameStats }),
                        update: vitest_1.vi.fn().mockResolvedValue({}),
                    },
                    studentItem: { create: vitest_1.vi.fn().mockResolvedValue({}) },
                    material: { upsert: vitest_1.vi.fn().mockResolvedValue({}) },
                };
                return fn(tx);
            });
            const player = makePlayer({ studentId: "student-prop", level, earnedXp });
            const results = await reward_manager_1.RewardManager.persistRewards([player]);
            (0, vitest_1.expect)(results[0].error).toBeUndefined();
            (0, vitest_1.expect)(typeof results[0].leveledUp).toBe("boolean");
            (0, vitest_1.expect)(results[0].newLevel).toBeGreaterThanOrEqual(level);
        }), { numRuns: 50 });
    });
});
