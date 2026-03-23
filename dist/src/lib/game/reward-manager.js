"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardManager = void 0;
/**
 * RewardManager — Persists battle rewards to the database.
 * Handles XP gain, gold, item drops, and material upserts per student.
 * Implements atomic per-student transactions with retry logic (up to 3 attempts).
 *
 * Requirements: 15
 */
const db_1 = require("@/lib/db");
const idle_engine_1 = require("./idle-engine");
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 100;
class RewardManager {
    /**
     * Calculates XP gain for each player without persisting.
     * Returns FinalReward[] with leveledUp and newLevel populated.
     */
    static calculateRewards(players) {
        return players.map((player) => {
            // Use default stats as a base for XP calculation (no DB access)
            const currentStats = {
                gold: 0,
                level: player.level,
                xp: 0,
                inventory: [],
                equipment: {},
                multipliers: { gold: 1, xp: 1 },
            };
            const { level: newLevel, leveledUp } = idle_engine_1.IdleEngine.calculateXpGain(currentStats, player.earnedXp);
            return {
                studentId: player.studentId,
                playerName: player.name,
                earnedGold: player.earnedGold,
                earnedXp: player.earnedXp,
                itemDrops: player.itemDrops,
                materialDrops: player.materialDrops,
                leveledUp,
                newLevel,
            };
        });
    }
    /**
     * Persists rewards for all players atomically per student.
     * Each student's transaction is retried up to 3 times with exponential backoff.
     * Returns FinalReward[] with leveledUp, newLevel, and error fields populated.
     */
    static async persistRewards(players) {
        const results = await Promise.all(players.map((player) => this.persistPlayerReward(player)));
        return results;
    }
    static async persistPlayerReward(player) {
        const base = {
            studentId: player.studentId,
            playerName: player.name,
            earnedGold: player.earnedGold,
            earnedXp: player.earnedXp,
            itemDrops: player.itemDrops,
            materialDrops: player.materialDrops,
            leveledUp: false,
            newLevel: player.level,
        };
        // Skip DB persistence for players without a valid studentId
        if (!player.studentId) {
            return base;
        }
        let lastError;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                await RewardManager.sleep(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
            }
            try {
                const result = await db_1.db.$transaction(async (tx) => {
                    var _a, _b;
                    // 1. Fetch current student gameStats
                    const student = await tx.student.findUnique({
                        where: { id: player.studentId },
                        select: { gameStats: true },
                    });
                    if (!student) {
                        throw new Error(`Student ${player.studentId} not found`);
                    }
                    const currentStats = (_a = student.gameStats) !== null && _a !== void 0 ? _a : idle_engine_1.IdleEngine.getDefaultStats();
                    // 2. Calculate new XP and level
                    const { level: newLevel, xp: newXp, leveledUp } = idle_engine_1.IdleEngine.calculateXpGain(currentStats, player.earnedXp);
                    // 3. Update gameStats: gold, xp, level
                    const updatedStats = {
                        ...currentStats,
                        gold: ((_b = currentStats.gold) !== null && _b !== void 0 ? _b : 0) + player.earnedGold,
                        xp: newXp,
                        level: newLevel,
                    };
                    await tx.student.update({
                        where: { id: player.studentId },
                        data: { gameStats: updatedStats },
                    });
                    // 4. Create StudentItem records for each item drop
                    for (const itemId of player.itemDrops) {
                        await tx.studentItem.create({
                            data: {
                                studentId: player.studentId,
                                itemId,
                                quantity: 1,
                                enhancementLevel: 0,
                                isEquipped: false,
                            },
                        });
                    }
                    // 5. Upsert Material records
                    for (const mat of player.materialDrops) {
                        await tx.material.upsert({
                            where: {
                                studentId_type: {
                                    studentId: player.studentId,
                                    type: mat.type,
                                },
                            },
                            update: { quantity: { increment: mat.quantity } },
                            create: {
                                studentId: player.studentId,
                                type: mat.type,
                                quantity: mat.quantity,
                            },
                        });
                    }
                    return { newLevel, leveledUp };
                });
                return {
                    ...base,
                    leveledUp: result.leveledUp,
                    newLevel: result.newLevel,
                };
            }
            catch (err) {
                lastError = err;
                console.error(`[RewardManager] Transaction failed for student ${player.studentId} (attempt ${attempt + 1}/${MAX_RETRIES}):`, err);
            }
        }
        // All retries exhausted
        console.error(`[RewardManager] All ${MAX_RETRIES} attempts failed for student ${player.studentId}:`, lastError);
        return { ...base, error: true };
    }
}
exports.RewardManager = RewardManager;
// Injectable sleep for testing — override to disable backoff in tests
RewardManager.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
