import { Student, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getRankEntry } from "@/lib/classroom-utils";

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
   * @returns The updated game stats and the amount of gold earned
   */
  static calculateCurrentResources(student: any) {
    const now = new Date();
    const lastSync = student.lastSyncTime ? new Date(student.lastSyncTime) : now;
    const stats = (student.gameStats as unknown as GameStats) || this.getDefaultStats();

    // Calculate time difference in seconds with millisecond precision
    const secondsPassed = (now.getTime() - lastSync.getTime()) / 1000;
    
    if (secondsPassed <= 0) {
      return { stats, earnedGold: 0, secondsPassed: 0, syncTime: now };
    }

    // Calculate gold rate based on rank and behavior points
    // Pass classroom.levelConfig if available in the student object
    const goldRate = this.calculateGoldRate(student.points, stats, student.classroom?.levelConfig);
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
   * Determines the gold earning rate per second.
   * Logic: Rank-based Rate (if configured) OR (Base Rate * Multipliers)
   */
  static calculateGoldRate(points: number, stats: GameStats, levelConfig?: any): number {
    // 1. Try to get rate from Specific Rank Configuration (Gold per Minute)
    const rankEntry = getRankEntry(points, levelConfig);
    if (rankEntry && typeof rankEntry.goldRate === 'number') {
      const basePerSecond = rankEntry.goldRate / 60;
      const equipmentMultiplier = stats.multipliers?.gold || 1;
      return basePerSecond * equipmentMultiplier;
    }

    // 2. Legacy/Fallback Logic: Base Rate * Rank Multiplier * Behavior Bonus
    // Every 100 points = +0.1 to multiplier
    const rankMultiplier = 1 + Math.floor(points / 100) * 0.1;
    const equipmentMultiplier = stats.multipliers?.gold || 1;

    return this.BASE_GOLD_RATE * rankMultiplier * equipmentMultiplier;
  }

  /**
   * Applies damage to the world boss in a classroom.
   * Logic: Damage = Base (10) + Score-based Bonus
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
      
      const updatedClassroom = await db.classroom.update({
        where: { id: classId },
        data: {
          gamifiedSettings: {
            ...settings,
            boss: {
              ...settings.boss,
              currentHp: newHp
            }
          }
        }
      });

      return (updatedClassroom.gamifiedSettings as any).boss;
    } catch (error) {
      console.error("Error applying boss damage:", error);
      return null;
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
