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
  spd: number;
  crit: number; // Ratio 0 - 1.0 (e.g. 0.05 is 5%)
  luck: number; // Ratio 0 - 1.0
  mag: number;
  maxMp: number;
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
  static calculateCurrentResources(student: Record<string, any>, activeEvents: any[] = []) {
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
   * Calculates total character stats based on behavior points, items, and level.
   */
  static calculateCharacterStats(points: number, equippedItems: any[] = [], level: number = 1): CharacterStats {
    // 1. Base Stats from Points (Behavior)
    // Every 10 points = 1 ATK, 1 DEF, 10 HP
    const baseAtk = 10 + Math.floor(points / 10);
    const baseDef = 5 + Math.floor(points / 20);
    const baseHp = 100 + Math.floor(points / 1);
    
    // Advanced Base Stats (Starting fixed values)
    const baseSpd = 10; 
    const baseCrit = 0.05; // 5% base
    const baseLuck = 0.01; // 1% base
    const baseMag = 5;
    const baseMaxMp = 50 + (level * 5); // MP grows with level

    let totalAtk = baseAtk;
    let totalDef = baseDef;
    let totalHp = baseHp;
    let totalSpd = baseSpd;
    let totalCrit = baseCrit;
    let totalLuck = baseLuck;
    let totalMag = baseMag;
    let totalMaxMp = baseMaxMp;

    // 2. Bonus from Equipment
    if (Array.isArray(equippedItems)) {
        equippedItems.forEach(si => {
            const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
            
            // Core Stats
            totalAtk += (si.item?.baseAtk || 0) * levelBonus;
            totalDef += (si.item?.baseDef || 0) * levelBonus;
            totalHp += (si.item?.baseHp || 0) * levelBonus;

            // Advanced Stats from Item Template
            totalSpd += (si.item?.baseSpd || 0) * levelBonus;
            totalCrit += (si.item?.baseCrit || 0) * levelBonus;
            totalLuck += (si.item?.baseLuck || 0) * levelBonus;
            totalMag += (si.item?.baseMag || 0) * levelBonus;
            totalMaxMp += (si.item?.baseMp || 0) * levelBonus;
        });
    }

    return {
      atk: Math.floor(totalAtk),
      def: Math.floor(totalDef),
      hp: Math.floor(totalHp),
      spd: Math.floor(totalSpd),
      crit: Number(totalCrit.toFixed(2)),
      luck: Number(totalLuck.toFixed(2)),
      mag: Math.floor(totalMag),
      maxMp: Math.floor(totalMaxMp)
    };
  }

  /**
   * Determines the gold earning rate per second.
   * Logic: Rank-based Rate (if configured) OR (Base Rate * Multipliers)
   * Multipliers are calculated from behavior points, equipped items, and ACTIVE EVENTS.
   */
  static calculateGoldRate(points: number, stats: GameStats, levelConfig?: any, equippedItems: any[] = [], activeEvents: any[] = []): number {
    // 1. Level-based Passive Income (New)
    // Each level adds 0.05 gold/sec base passive income
    const levelIncome = (stats.level || 1) * 0.05;

    // 2. Calculate Multipliers from Equipment
    let goldMultiplier = 1;
    if (Array.isArray(equippedItems)) {
        equippedItems.forEach(si => {
            const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
            if (si.item?.goldMultiplier) {
                goldMultiplier += si.item.goldMultiplier * levelBonus;
            }
        });
    }

    // 3. Apply multipliers from Active Events
    if (Array.isArray(activeEvents)) {
        activeEvents.forEach(event => {
            if (event.type === 'GOLD_BOOST' && event.multiplier > 1) {
                goldMultiplier *= event.multiplier;
            }
        });
    }

    // 4. Try to get rate from Specific Rank Configuration (Gold per Minute)
    let finalBaseRate = this.BASE_GOLD_RATE;
    const rankEntry = getRankEntry(points, levelConfig);
    if (rankEntry && typeof rankEntry.goldRate === 'number') {
      finalBaseRate = rankEntry.goldRate / 60;
    } else {
      // Legacy/Fallback Logic
      const rankMultiplier = 1 + Math.floor(points / 100) * 0.1;
      finalBaseRate = this.BASE_GOLD_RATE * rankMultiplier;
    }

    // Formula: (Rank Rate + Level Passive) * Multipliers
    return (finalBaseRate + levelIncome) * goldMultiplier;
  }

  /**
   * Calculates the damage multiplier for World Boss battles based on equipped items and stats.
   * Includes Critical Hit logic.
   */
  static calculateBossDamage(points: number, equippedItems: any[] = [], level: number = 1) {
    const stats = this.calculateCharacterStats(points, equippedItems, level);
    let itemMultiplier = 1;
    
    if (Array.isArray(equippedItems)) {
        equippedItems.forEach(si => {
            const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
            if (si.item?.bossDamageMultiplier) {
                itemMultiplier += si.item.bossDamageMultiplier * levelBonus;
            }
        });
    }
    
    const baseDamage = Math.floor(stats.atk * itemMultiplier);
    
    // Critical Hit Logic
    const isCrit = Math.random() < stats.crit;
    const finalDamage = isCrit ? Math.floor(baseDamage * 2) : baseDamage;

    return {
        damage: finalDamage,
        isCrit,
        stats // Returning full stats for reference in UI
    };
  }

  /**
   * Applies damage to the world boss in a classroom.
   * Now requires studentId to handle stamina consumption.
   * @param options.damageOverride Optional fixed damage (e.g. from assignment)
   * @param options.consumeStamina Whether to consume stamina (default: true)
   */
  static async applyBossDamage(
    classId: string, 
    studentId: string, 
    options: { damageOverride?: number; consumeStamina?: boolean } = { consumeStamina: true }
  ) {
    try {
      // 1. Fetch current boss status and student stamina
      const [classroom, student] = await Promise.all([
        db.classroom.findUnique({
            where: { id: classId },
            select: { gamifiedSettings: true }
        }),
        db.student.findUnique({
            where: { id: studentId },
            select: { points: true, items: { include: { item: true }, where: { isEquipped: true } }, stamina: true, gameStats: true }
        })
      ]);

      const settings = (classroom?.gamifiedSettings as Record<string, any>) || {};
      if (!settings?.boss?.active || settings.boss.currentHp <= 0) {
        return { error: "No active boss" };
      }

      const consumeStamina = options.consumeStamina ?? true;
      if (consumeStamina && (!student || student.stamina <= 0)) {
        return { error: "Insufficient stamina" };
      }

      // 2. Calculate Damage
      let damage = 0;
      let isCrit = false;

      if (typeof options.damageOverride === 'number') {
        damage = options.damageOverride;
      } else {
        const stats = student?.gameStats as Record<string, any>;
        const battleResult = this.calculateBossDamage(student?.points || 0, student?.items || [], stats?.level || 1);
        damage = battleResult.damage;
        isCrit = battleResult.isCrit;
      }

      // 3. Atomic Updates
      const newHp = Math.max(0, settings.boss.currentHp - damage);
      const isDefeated = settings.boss.currentHp > 0 && newHp <= 0;
      
      const [updatedClassroom, updatedStudent] = await db.$transaction([
        db.classroom.update({
            where: { id: classId },
            data: {
              gamifiedSettings: {
                ...settings,
                boss: {
                  ...settings.boss,
                  currentHp: newHp,
                  active: newHp > 0
                }
              }
            }
        }),
        // Only update student if we consume stamina
        ...(consumeStamina ? [
          db.student.update({
              where: { id: studentId },
              data: {
                  stamina: { decrement: 1 }
              }
          })
        ] : [])
      ]);

      // 4. Distribute Rewards if defeated
      if (isDefeated) {
        await this.distributeBossRewards(classId, settings.boss);
      }

      return {
        boss: (updatedClassroom.gamifiedSettings as Record<string, any>).boss,
        damage,
        isCrit,
        staminaLeft: updatedStudent?.stamina ?? student?.stamina ?? 0
      };
    } catch (error: any) {
      console.error("[IdleEngine] Error applying boss damage:", error);
      // Log more details about the error if possible
      if (error.code) console.error("Error Code:", error.code);
      if (error.meta) console.error("Error Meta:", error.meta);
      return { error: `Internal error: ${error.message || "Unknown"}` };
    }
  }

  /**
   * Helper to refill stamina based on points (e.g. teacher gives +10 points = +1 stamina if max not reached)
   */
  static async handleStaminaRefill(studentId: string, pointIncrease: number) {
    if (pointIncrease < 10) return; // Only "Significant" good deeds refill stamina
    
    // Simple logic: +1 stamina for every 10 points added manually
    const refillAmount = Math.floor(pointIncrease / 10);
    
    await db.student.update({
        where: { id: studentId },
        data: {
            stamina: {
                increment: refillAmount
            }
        }
      }).catch(() => {});
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
            gameStats: updatedStats as unknown as Record<string, any>,
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
