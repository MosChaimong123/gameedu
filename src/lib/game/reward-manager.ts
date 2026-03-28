/**
 * RewardManager — Persists battle rewards to the database.
 * Handles XP gain, gold, item drops, and material upserts per student.
 * Implements atomic per-student transactions with retry logic (up to 3 attempts).
 *
 * Requirements: 15
 */
import { db } from "../db";
import { Prisma } from "@prisma/client";
import { IdleEngine, GameStats } from "./idle-engine";
import { BattlePlayer, FinalReward } from "../types/game";
import { parseGameStats } from "./game-stats";
import { buildStudentItemStatSnapshot } from "./student-item-stats";
import { applyJobSkillUnlocksOnLevelUp } from "./job-system";

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 100;

type RewardGameStats = GameStats & {
  goldBoostExpiry?: number;
  xpBoostExpiry?: number;
};

export class RewardManager {
  // Injectable sleep for testing — override to disable backoff in tests
  static sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  /**
   * Calculates XP gain for each player without persisting.
   * Returns FinalReward[] with leveledUp and newLevel populated.
   */
  static calculateRewards(players: BattlePlayer[]): FinalReward[] {
    return players.map((player) => {
      // Use default stats as a base for XP calculation (no DB access)
      const currentStats: GameStats = {
        gold: 0,
        level: player.level,
        xp: 0,
        inventory: [],
        equipment: {},
        multipliers: { gold: 1, xp: 1 },
      };

      const { level: newLevel, leveledUp } = IdleEngine.calculateXpGain(
        currentStats,
        player.earnedXp
      );

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
  static async persistRewards(players: BattlePlayer[]): Promise<FinalReward[]> {
    const results = await Promise.all(
      players.map((player) => this.persistPlayerReward(player))
    );
    return results;
  }

  private static async persistPlayerReward(
    player: BattlePlayer
  ): Promise<FinalReward> {
    const base: FinalReward = {
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

    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // Exponential backoff with full jitter: sleep between [base, 2×base] to spread
        // concurrent retries and avoid thundering-herd when many students fail simultaneously.
        const base = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * base;
        await RewardManager.sleep(base + jitter);
      }

      try {
        const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
          // 1. Fetch current student gameStats
          const student = await tx.student.findUnique({
            where: { id: player.studentId },
            select: {
              gameStats: true,
              jobClass: true,
              jobTier: true,
              advanceClass: true,
              jobSkills: true,
            },
          });

          if (!student) {
            throw new Error(`Student ${player.studentId} not found`);
          }

          const currentStats = parseGameStats(student.gameStats) as RewardGameStats;

          // 2. Apply time-based economy boosts (Lucky Scroll / Tome of Knowledge)
          const now = Date.now();
          const goldBoostActive = (currentStats.goldBoostExpiry ?? 0) > now;
          const xpBoostActive = (currentStats.xpBoostExpiry ?? 0) > now;
          const finalGold = goldBoostActive ? Math.floor(player.earnedGold * 2) : player.earnedGold;
          const finalXp   = xpBoostActive   ? Math.floor(player.earnedXp   * 2) : player.earnedXp;

          // 3. Calculate new XP and level
          const { level: newLevel, xp: newXp, leveledUp } =
            IdleEngine.calculateXpGain(currentStats, finalXp);

          let updatedJobSkills: string[] | undefined;
          if (leveledUp) {
            updatedJobSkills = applyJobSkillUnlocksOnLevelUp({
              jobClass: student.jobClass ?? null,
              jobTier: student.jobTier ?? null,
              advanceClass: student.advanceClass ?? null,
              oldLevel: currentStats.level ?? player.level ?? 1,
              newLevel: newLevel ?? (currentStats.level ?? player.level ?? 1),
              currentJobSkills: (student.jobSkills as string[] | null) ?? [],
            });
          }

          // 4. Update gameStats: gold, xp, level
          const updatedStats: GameStats = {
            ...currentStats,
            gold: (currentStats.gold ?? 0) + finalGold,
            xp: newXp,
            level: newLevel,
          };

          await tx.student.update({
            where: { id: player.studentId },
            data: {
              gameStats: updatedStats as unknown as Prisma.InputJsonValue,
              ...(updatedJobSkills ? { jobSkills: updatedJobSkills } : {}),
            },
          });

          // 4. Merge item drops into inventory to avoid duplicate-key failures
          for (const itemId of player.itemDrops) {
            const item = await tx.item.findUnique({
              where: { id: itemId },
              select: {
                baseHp: true,
                baseAtk: true,
                baseDef: true,
                baseSpd: true,
                baseCrit: true,
                baseLuck: true,
                baseMag: true,
                baseMp: true,
              },
            });

            if (!item) {
              throw new Error(`Item ${itemId} not found`);
            }

            await tx.studentItem.upsert({
              where: {
                studentId_itemId: {
                  studentId: player.studentId,
                  itemId,
                },
              },
              update: {
                quantity: { increment: 1 },
              },
              create: {
                studentId: player.studentId,
                itemId,
                quantity: 1,
                enhancementLevel: 0,
                isEquipped: false,
                ...buildStudentItemStatSnapshot(item, 0),
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

          return { newLevel, leveledUp, finalGold, finalXp };
        });

        return {
          ...base,
          earnedGold: result.finalGold,
          earnedXp: result.finalXp,
          leveledUp: result.leveledUp,
          newLevel: result.newLevel,
        };
      } catch (err) {
        lastError = err;
        console.error(
          `[RewardManager] Transaction failed for student ${player.studentId} (attempt ${attempt + 1}/${MAX_RETRIES}):`,
          err
        );
      }
    }

    // All retries exhausted
    console.error(
      `[RewardManager] All ${MAX_RETRIES} attempts failed for student ${player.studentId}:`,
      lastError
    );

    return { ...base, error: true };
  }
}
