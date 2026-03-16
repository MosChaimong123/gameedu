import { Student, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getRankEntry } from "@/lib/classroom-utils";

/**
 * Core Character Stats
 */
export interface CharacterStats {
  hp: number;
  atk: number;
  def: number;
}

/**
 * Interface for the JSON gameStats field in the Student model
 */
export interface GameStats {
  gold: number;
  level: number;
  xp: number;
  inventory: any[];
  equipment: {
    weapon?: string;
    armor?: string;
    accessory?: string;
  };
  multipliers: {
    gold: number;
    xp: number;
  };
}

/**
 * Core RPG Idle Engine
 * Handles timestamp-based calculations for passive income and progression.
 */
export class IdleEngine {
  // Base rates
  private static readonly BASE_GOLD_RATE = 0.1; // Gold per second at Rank 1
  private static readonly SECONDS_IN_MINUTE = 60;

  /**
   * Calculates the current gold balance of a student based on time passed since last sync.
   * @param student The student object from database
   * @param activeEvents Optional array of active events for multipliers
   * @returns The updated game stats and the amount of gold earned
   */
  static calculateCurrentResources(student: any, activeEvents: any[] = []) {
    const now = new Date();
    const lastSync = student.lastSyncTime ? new Date(student.lastSyncTime) : now;
    const stats = (student.gameStats as unknown as GameStats) || this.getDefaultStats();

    // Calculate time difference in seconds with millisecond precision
    const secondsPassed = (now.getTime() - lastSync.getTime()) / 1000;
    
    if (secondsPassed <= 0) {
      return { stats, earnedGold: 0, secondsPassed: 0, syncTime: now };
    }

    // Calculate gold rate based on rank, behavior points, equipment and EVENTS
    const goldRate = this.calculateGoldRate(student.points, stats, student.classroom?.levelConfig, student.items, activeEvents);
    const earnedGold = secondsPassed * goldRate;

    const updatedStats: GameStats = {
      ...stats,
      gold: (stats.gold || 0) + earnedGold,
    };

    return {
      stats: updatedStats,
      earnedGold,
      secondsPassed,
      syncTime: now
    };
  }

  /**
   * Calculates total character stats (HP, ATK, DEF) based on behavior points and items.
   */
  static calculateCharacterStats(points: number, equippedItems: any[] = []): CharacterStats {
    // 1. Base Stats from Points (Behavior)
    // Every 10 points = 1 ATK, 1 DEF, 10 HP
    const baseAtk = 10 + Math.floor(points / 10);
    const baseDef = 5 + Math.floor(points / 20);
    const baseHp = 100 + Math.floor(points / 1);

    let totalAtk = baseAtk;
    let totalDef = baseDef;
    let totalHp = baseHp;

    // 2. Bonus from Equipment
    if (Array.isArray(equippedItems)) {
        equippedItems.forEach(si => {
            const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
            
            // Add Flat Stats from Item Template
            totalAtk += (si.item?.baseAtk || 0) * levelBonus;
            totalDef += (si.item?.baseDef || 0) * levelBonus;
            totalHp += (si.item?.baseHp || 0) * levelBonus;
        });
    }

    return {
      atk: Math.floor(totalAtk),
      def: Math.floor(totalDef),
      hp: Math.floor(totalHp)
    };
  }

  /**
   * Determines the gold earning rate per second.
   * Logic: Rank-based Rate (if configured) OR (Base Rate * Multipliers)
   * Multipliers are calculated from behavior points, equipped items, and ACTIVE EVENTS.
   */
  static calculateGoldRate(points: number, stats: GameStats, levelConfig?: any, equippedItems: any[] = [], activeEvents: any[] = []): number {
    // 1. Calculate Multipliers from Equipment
    let goldMultiplier = 1;
    if (Array.isArray(equippedItems)) {
        equippedItems.forEach(si => {
            const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
            if (si.item?.goldMultiplier) {
                goldMultiplier += si.item.goldMultiplier * levelBonus;
            }
        });
    }

    // 2. Apply multipliers from Active Events
    if (Array.isArray(activeEvents)) {
        activeEvents.forEach(event => {
            if (event.type === 'GOLD_BOOST' && event.multiplier > 1) {
                // Gold Boost events multiply the total rate (stacking multiplicatively or additively?)
                // Standard RPG practice: Event multipliers are usually applied to the final rate.
                goldMultiplier *= event.multiplier;
            }
        });
    }

    // 3. Try to get rate from Specific Rank Configuration (Gold per Minute)
    const rankEntry = getRankEntry(points, levelConfig);
    if (rankEntry && typeof rankEntry.goldRate === 'number') {
      const basePerSecond = rankEntry.goldRate / 60;
      return basePerSecond * goldMultiplier;
    }

    // 4. Legacy/Fallback Logic: Base Rate * Rank Multiplier * Equipment/Event Bonus
    // Every 100 points = +0.1 to multiplier
    const rankMultiplier = 1 + Math.floor(points / 100) * 0.1;

    return this.BASE_GOLD_RATE * rankMultiplier * goldMultiplier;
  }

  /**
   * Calculates the damage multiplier for World Boss battles based on equipped items.
   * New: Incorporates the ATK stat.
   */
  static calculateBossDamage(points: number, equippedItems: any[] = []): number {
    const stats = this.calculateCharacterStats(points, equippedItems);
    let itemMultiplier = 1;
    
    if (Array.isArray(equippedItems)) {
        equippedItems.forEach(si => {
            const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
            if (si.item?.bossDamageMultiplier) {
                itemMultiplier += si.item.bossDamageMultiplier * levelBonus;
            }
        });
    }
    
    // Formula: (Total ATK) * (Boss Damage Multiplier)
    return Math.floor(stats.atk * itemMultiplier);
  }

  /**
   * Applies damage to the world boss in a classroom.
   */
  static async applyBossDamage(classId: string, damage: number) {
    try {
      // 1. Fetch current boss status
      const classroom = await db.classroom.findUnique({
        where: { id: classId },
        select: { gamifiedSettings: true }
      });

      const settings = classroom?.gamifiedSettings as any;
      if (!settings?.boss?.active || settings.boss.currentHp <= 0) {
        return null;
      }

      // 2. Atomic HP update (simulated via update)
      const newHp = Math.max(0, settings.boss.currentHp - damage);
      const isDefeated = settings.boss.currentHp > 0 && newHp <= 0;
      
      const updatedClassroom = await db.classroom.update({
        where: { id: classId },
        data: {
          gamifiedSettings: {
            ...settings,
            boss: {
              ...settings.boss,
              currentHp: newHp,
              active: newHp > 0 // Deactivate if HP is 0
            }
          }
        }
      });

      // 3. Distribute Rewards if defeated
      if (isDefeated) {
        await this.distributeBossRewards(classId, settings.boss);
      }

      return (updatedClassroom.gamifiedSettings as any).boss;
    } catch (error) {
      console.error("Error applying boss damage:", error);
      return null;
    }
  }

  /**
   * Distributes rewards to all students in a classroom after defeating a boss.
   */
  private static async distributeBossRewards(classId: string, bossSettings: any) {
    try {
      const rewardGold = bossSettings.rewardGold || 500;
      const bossName = bossSettings.name || "World Boss";

      // 1. Get all students in this class
      const students = await db.student.findMany({
        where: { classId },
        select: { id: true, gameStats: true }
      });

      // 2. Process each student (can't use updateMany easily for JSON fields)
      for (const student of students) {
        const stats = (student.gameStats as unknown as GameStats) || this.getDefaultStats();
        const updatedStats: GameStats = {
          ...stats,
          gold: (stats.gold || 0) + rewardGold
        };

        await db.student.update({
          where: { id: student.id },
          data: {
            points: { increment: rewardGold }, // Add to Behavior Points too
            gameStats: updatedStats as any,
            history: {
              create: {
                reason: `🚀 รางวัลพิชิต ${bossName}!`,
                value: rewardGold,
                timestamp: new Date()
              }
            }
          }
        });
      }

      console.log(`[IdleEngine] Distributed ${rewardGold} gold to ${students.length} students for defeating ${bossName}`);
    } catch (error) {
      console.error("Error distributing boss rewards:", error);
    }
  }

  /**
   * Provides default game stats for new students or missing data
   */
  static getDefaultStats(): GameStats {
    return {
      gold: 0,
      level: 1,
      xp: 0,
      inventory: [],
      equipment: {},
      multipliers: {
        gold: 1,
        xp: 1
      }
    };
  }
}
