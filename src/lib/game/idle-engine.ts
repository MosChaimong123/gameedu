import { Prisma, Student, PrismaClient } from "@prisma/client";
import { db } from "../db";
import { getRankEntry } from "../classroom-utils";
import { SKILLS } from "./game-constants";
import { spawnSoloMonster, rollFarmingLoot, SoloMonster } from "./farming-system";
import {
  applyJobPassiveMultipliers,
  getPassivesForClass,
  getStatMultipliers,
  resolveEffectiveJobKey,
  getNewlyUnlockedSkills,
  getSkillsForLevel,
  type JobTier,
  type Skill,
} from "./job-system";
import { toPrismaJson } from "./game-stats";
import {
  getTriggeredSkills,
  getBossPreset,
  getBossPhase,
  getBossTurnInterval,
  getActionsForPhase,
  type BossSkillConfig,
  type BossAction,
  type PlayerBattleState,
  type BattleLogEntry,
  type PlayerStatusType,
} from "./boss-config";
import {
  getBossRaidTemplate,
  getPersonalBossFromStats,
  mergeGameStatsWithPersonalBoss,
  spawnPersonalBossFromTemplate,
  type BossRaidTemplate,
  type PersonalClassroomBoss,
} from "./personal-classroom-boss";
import { trackQuestEvent } from "./quest-engine";
import { getComboMultiplier } from "./element-system";
import { StatCalculator } from "./stat-calculator";
import {
  getEffectiveSkillAtRank,
  getSkillRank,
  normalizeSkillTreeState,
  type SkillTreeProgress,
} from "./skill-tree";

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
  inventory: unknown[];
  equipment: {
    weapon?: string;
    armor?: string;
    accessory?: string;
  };
  multipliers: {
    gold: number;
    xp: number;
  };
  skillPointsAvailable?: number;
  skillPointsSpent?: number;
  skillTreeProgress?: SkillTreeProgress;
  lastRespecAt?: string;
  pendingHpBonus?: number;
  phoenixCharges?: number;
  pendingBattleBuff?: {
    atk?: number;
    def?: number;
    spd?: number;
  };
  /** Per-student classroom boss HP (not shared with classmates) */
  personalClassroomBoss?: unknown;
  farming?: {
    currentWave: number;
    monster: SoloMonster;
    playerHp?: number;
    playerMaxHp?: number;
    playerMaxMp?: number;
    skillCooldowns?: Record<string, number>; // skillId -> turns remaining
    activeEffects?: {
      poison?: { damagePerTurn: number; turnsLeft: number };
      defBuff?: { reduction: number; turnsLeft: number };
      atkBuff?: { multiplier: number; turnsLeft: number };
      atkDebuff?: { reduction: number; turnsLeft: number };
      critBuff?: { bonus: number; turnsLeft: number };
      defBreak?: { amplify: number; turnsLeft: number };
      slow?: { skipChance: number; turnsLeft: number };
      stun?: { turnsLeft: number };
      regen?: { healPerTurn: number; turnsLeft: number };
    };
  };
}

type LevelConfigLike = {
  ranks?: unknown[];
};

type EquippedItemLike = {
  enhancementLevel?: number | null;
  item?: {
    baseAtk?: number | null;
    baseDef?: number | null;
    baseHp?: number | null;
    baseSpd?: number | null;
    baseCrit?: number | null;
    baseLuck?: number | null;
    baseMag?: number | null;
    baseMp?: number | null;
    goldMultiplier?: number | null;
    bossDamageMultiplier?: number | null;
  } | null;
};

type ActiveEventLike = {
  type?: string | null;
  multiplier?: number | null;
};

type StudentResourceSource = {
  lastSyncTime?: string | Date | null;
  gameStats?: unknown;
  points: number;
  classroom?: {
    levelConfig?: unknown;
  } | null;
  items?: EquippedItemLike[] | null;
};

type BossActiveEffect = {
  type: string;
  effectValue: number;
  expiresAt: string | null; // ISO string, null = permanent
  skillId: string;
  skillName: string;
  skillIcon: string;
};

type BossState = {
  active: boolean;
  currentHp: number;
  maxHp?: number;
  rewardGold?: number;
  rewardXp?: number;
  rewardMaterials?: { type: string; quantity: number }[];
  name?: string;
  bossId?: string;
  difficulty?: string;
  passiveDamageMultiplier?: number;
  triggeredSkills?: string[];
  activeEffect?: BossActiveEffect | null;
  /**
   * Used for idempotency: reward for a single boss defeat should be distributed once.
   * Stored inside classroom.gamifiedSettings.boss (JSON field).
   */
  rewardDistributedAt?: string | null;
};

type GamifiedSettings = {
  boss?: BossState;
  bosses?: BossState[];
};

type BossClassroom = {
  gamifiedSettings: GamifiedSettings | null;
  updatedAt: Date;
};

type BossStudent = {
  points: number;
  stamina: number;
  gameStats: unknown;
  items: EquippedItemLike[];
  jobClass: string | null;
  jobTier: string;
  advanceClass: string | null;
};

type FarmingEffects = NonNullable<NonNullable<GameStats["farming"]>["activeEffects"]>;

// Default cooldown (in turns) for each skill effect type
const DEFAULT_COOLDOWN_BY_EFFECT: Record<string, number> = {
    POISON: 3,
    BUFF_ATK: 5,
    BUFF_DEF: 3,
    DEFEND: 3,
    DEBUFF_ATK: 3,
    CRIT_BUFF: 4,
    ARMOR_PIERCE: 3,
    HEAL: 4,
    SLOW: 3,
    STUN: 4,
    REGEN: 5,
    LIFESTEAL: 3,
    EXECUTE: 4,
    DEF_BREAK: 4,
    MANA_SURGE: 2,
};

type StudentJobProgress = {
  jobClass?: string | null;
  jobTier?: string | null;
  advanceClass?: string | null;
  jobSkills?: string[] | null;
};

type FarmingStudentSource = StudentJobProgress & {
  gameStats?: unknown;
};

type SkillUserStudent = StudentJobProgress & {
  points: number;
  mana: number;
  stamina: number;
  gameStats: unknown;
  jobClass?: string | null;
  jobTier?: string | null;
  advanceClass?: string | null;
  jobSkills?: string[] | null;
  items: EquippedItemLike[];
};

type CombatStudent = SkillUserStudent & {
  jobClass: string | null;
  jobTier: string | null;
  advanceClass: string | null;
  jobSkills?: string[] | null;
};

type HistoryCreateInput = {
  reason: string;
  value: number;
  timestamp?: Date;
};

type StudentUpdateData = {
  stamina?: number | { decrement: number };
  mana?: number | { decrement: number };
  gameStats?: Prisma.InputJsonValue;
  jobSkills?: string[];
  history?: {
    create: HistoryCreateInput;
  };
};

type BossRewardStudent = {
  id: string;
  gameStats: unknown;
};

type BossRewardUpdateData = {
  points: { increment: number };
  gameStats: Prisma.InputJsonValue;
  stamina?: { decrement: number };
  history: {
    create: HistoryCreateInput;
  };
};

/**
 * Core RPG Idle Engine
 * Handles timestamp-based calculations for passive income and progression.
 */
export class IdleEngine {
  /**
   * Normalize crit from mixed formats into percentage (0..500):
   * - 0..1   => ratio, converted to 0..100%
   * - 1..5   => legacy ratio (e.g. 4.26 means 426%), converted to %
   * - >5     => percentage
   */
  private static normalizeCritPercent(rawCrit: number): number {
    if (!Number.isFinite(rawCrit)) return 0;
    if (rawCrit > 1) {
      // Backward compatibility: existing character stats often store CRIT as ratio,
      // e.g. 4.26 = 426%. Treat small values as ratio format.
      if (rawCrit <= 5) return Math.max(0, Math.min(rawCrit * 100, 500));
      return Math.max(0, Math.min(rawCrit, 500));
    }
    return Math.max(0, Math.min(rawCrit * 100, 500));
  }

  private static normalizeCritChance(rawCrit: number): number {
    return Math.min(100, this.normalizeCritPercent(rawCrit)) / 100;
  }

  /**
   * Crit damage multiplier:
   * - Up to 100% crit: x2.0 on crit
   * - Overflow (>100%) converts to extra crit damage
   *   e.g. 150% => x2.5, 300% => x4.0, 500% => x6.0
   */
  private static getCritDamageMultiplier(rawCrit: number): number {
    const critPercent = this.normalizeCritPercent(rawCrit);
    const overflow = Math.max(0, critPercent - 100);
    return 2 + overflow / 100;
  }

  // Base rates
  private static readonly BASE_GOLD_RATE = 0.1; // Gold per second at Rank 1
  private static readonly SECONDS_IN_MINUTE = 60;
  private static readonly MAX_LEVEL = 60;

  static getMaxLevel(): number {
    return this.MAX_LEVEL;
  }

  /**
   * Skills definitions
   */
  public static readonly SKILLS = SKILLS;

  /**
   * Calculates the current gold balance of a student based on time passed since last sync.
   * @param student The student object from database
   * @param activeEvents Optional array of active events for multipliers
   * @returns The updated game stats and the amount of gold earned
   */
  static parseGameStats(gameStats: unknown): GameStats {
    const defaults = this.getDefaultStats();
    let stats: Partial<GameStats> = {};

    if (!gameStats) return defaults;
    
    if (typeof gameStats === 'string') {
      try {
        stats = JSON.parse(gameStats);
      } catch (e) {
        return defaults;
      }
    } else if (typeof gameStats === "object") {
      stats = gameStats as Partial<GameStats>;
    }

    // Merge with defaults to ensure level and xp exist
    const merged = {
      ...defaults,
      ...stats
    } as GameStats;
    const skillState = normalizeSkillTreeState(
      {
        skillPointsAvailable: merged.skillPointsAvailable,
        skillPointsSpent: merged.skillPointsSpent,
        skillTreeProgress: merged.skillTreeProgress,
        lastRespecAt: merged.lastRespecAt,
      },
      merged.level ?? 1
    );
    return {
      ...merged,
      ...skillState,
    };
  }

  static calculateCurrentResources(
    student: StudentResourceSource,
    activeEvents: ActiveEventLike[] = []
  ) {
    const now = new Date();
    const lastSync = student.lastSyncTime ? new Date(student.lastSyncTime) : now;
    const stats = this.parseGameStats(student.gameStats);

    // Calculate time difference in seconds with millisecond precision
    const secondsPassed = (now.getTime() - lastSync.getTime()) / 1000;
    
    if (secondsPassed <= 0) {
      return { stats, earnedGold: 0, secondsPassed: 0, syncTime: now };
    }

    // Calculate gold rate based on rank, behavior points, equipment and EVENTS
    const goldRate = this.calculateGoldRate(
      student.points,
      stats,
      student.classroom?.levelConfig,
      student.items ?? [],
      activeEvents
    );
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
   * Returns raw (unflored) base stats from level and equipment only.
   * Does NOT apply job class multipliers or passives.
   * Use this when job multipliers will be applied afterwards (e.g. StatCalculator),
   * to avoid double-flooring that causes 1-unit stat inconsistencies.
   */
  static computeRawStats(
    points: number,
    equippedItems: EquippedItemLike[] = [],
    level: number = 1
  ): CharacterStats {
    // Base Stats from Level
    let totalAtk = 10 + (level * 3);
    let totalDef = 5 + (level * 2);
    let totalHp = 100 + (level * 15);
    let totalSpd = 10 + (level * 1);
    let totalCrit = 0.05 + (level * 0.002); // 5% + 0.2% per level
    let totalLuck = 0.01 + (level * 0.001); // 1% + 0.1% per level
    let totalMag = 5 + (level * 2);
    let totalMaxMp = 50 + (level * 5);

    // Bonus from Equipment (float accumulation — no floor here)
    if (Array.isArray(equippedItems)) {
      equippedItems.forEach(si => {
        const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
        totalAtk   += (si.item?.baseAtk  || 0) * levelBonus;
        totalDef   += (si.item?.baseDef  || 0) * levelBonus;
        totalHp    += (si.item?.baseHp   || 0) * levelBonus;
        totalSpd   += (si.item?.baseSpd  || 0) * levelBonus;
        totalCrit  += (si.item?.baseCrit || 0) * levelBonus;
        totalLuck  += (si.item?.baseLuck || 0) * levelBonus;
        totalMag   += (si.item?.baseMag  || 0) * levelBonus;
        totalMaxMp += (si.item?.baseMp   || 0) * levelBonus;
      });
    }

    // Return floats — caller is responsible for flooring after multipliers
    return {
      atk: totalAtk,
      def: totalDef,
      hp: totalHp,
      spd: totalSpd,
      crit: totalCrit,
      luck: totalLuck,
      mag: totalMag,
      maxMp: totalMaxMp,
    };
  }

  /**
   * Calculates total character stats based on behavior points, items, and job class.
   * Applies job multipliers and passives on top of the raw base+equipment stats.
   */
  static calculateCharacterStats(
    points: number,
    equippedItems: EquippedItemLike[] = [],
    level: number = 1,
    jobClass: string | null = null,
    jobTier: string = "BASE",
    advanceClass: string | null = null
  ): CharacterStats {
    // 1. Raw base + equipment stats (float, no job multipliers)
    const raw = this.computeRawStats(points, equippedItems, level);

    // 2. Apply Job Class Multipliers if applicable
    let effectiveJobKey: string | null = null;
    let multipliers: ReturnType<typeof getStatMultipliers> | null = null;
    if (jobClass) {
      effectiveJobKey = resolveEffectiveJobKey({ jobClass, jobTier, advanceClass });
      multipliers = getStatMultipliers(effectiveJobKey, jobTier as JobTier);
    }

    let totalAtk   = multipliers ? raw.atk   * multipliers.atk   : raw.atk;
    let totalDef   = multipliers ? raw.def   * multipliers.def   : raw.def;
    let totalHp    = multipliers ? raw.hp    * multipliers.hp    : raw.hp;
    let totalSpd   = multipliers ? raw.spd   * multipliers.spd   : raw.spd;
    let totalCrit  = multipliers ? raw.crit  * multipliers.crit  : raw.crit;
    let totalMag   = multipliers ? raw.mag   * multipliers.mag   : raw.mag;
    let totalMaxMp = multipliers ? raw.maxMp * multipliers.mp    : raw.maxMp;
    let totalLuck  = multipliers ? raw.luck  * multipliers.luck  : raw.luck;

    // 3. Apply Job Passives (+X% stats)
    const afterPassives = effectiveJobKey
      ? applyJobPassiveMultipliers(
          { hp: totalHp, atk: totalAtk, def: totalDef, spd: totalSpd,
            mag: totalMag, maxMp: totalMaxMp, crit: totalCrit, luck: totalLuck },
          getPassivesForClass(effectiveJobKey)
        )
      : { hp: totalHp, atk: totalAtk, def: totalDef, spd: totalSpd,
          mag: totalMag, maxMp: totalMaxMp, crit: totalCrit, luck: totalLuck };

    // 4. Floor at the end (single floor per stat — no double-flooring)
    return {
      atk:   Math.floor(afterPassives.atk),
      def:   Math.floor(afterPassives.def),
      hp:    Math.floor(afterPassives.hp),
      spd:   Math.floor(afterPassives.spd),
      crit:  Number(afterPassives.crit.toFixed(2)),
      luck:  Number(afterPassives.luck.toFixed(2)),
      mag:   Math.floor(afterPassives.mag),
      maxMp: Math.floor(afterPassives.maxMp),
    };
  }

  /**
   * Determines the gold earning rate per second.
   * Logic: Rank-based Rate (if configured) OR (Base Rate * Multipliers)
   * Multipliers are calculated from behavior points, equipped items, and ACTIVE EVENTS.
   */
  static calculateGoldRate(
    points: number,
    stats: GameStats,
    levelConfig?: unknown,
    equippedItems: EquippedItemLike[] = [],
    activeEvents: ActiveEventLike[] = []
  ): number {
    // 1. Base Rate (Strictly from Classroom Rank Settings)
    const rankEntry = getRankEntry(points, levelConfig);
    
    // If the rank has a goldRate set by the teacher, use it. 
    // If not, fallback to a minimal 1 gold/hour to avoid zero income.
    let baseRatePerSec = (rankEntry && typeof rankEntry.goldRate === 'number') 
      ? rankEntry.goldRate / 3600 
      : 1 / 3600; 

    // 2. Multipliers (Items & Events only)
    // Removed level-based multipliers to ensure a Level 100 student without items 
    // earns exactly the same as a Level 1 student at the same rank.
    let totalMultiplier = 1;
    
    // Equipment Bonuses
    if (Array.isArray(equippedItems)) {
        equippedItems.forEach(si => {
            const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
            if (si.item?.goldMultiplier) {
                totalMultiplier += si.item.goldMultiplier * levelBonus;
            }
        });
    }

    // Active Event Bonuses — stacked additively (not multiplicatively) to prevent exponential abuse.
    // Two ×1.5 events yield +0.5+0.5 = ×2.0 total, not ×2.25.
    const GOLD_MULTIPLIER_CAP = 10;
    if (Array.isArray(activeEvents)) {
        activeEvents.forEach(event => {
            if (event.type === 'GOLD_BOOST' && (event.multiplier ?? 0) > 1) {
                totalMultiplier += (event.multiplier ?? 1) - 1;
            }
        });
    }

    // Final Formula: Base Rank Rate * (Items + Events Multipliers), capped at 10×
    return baseRatePerSec * Math.min(GOLD_MULTIPLIER_CAP, totalMultiplier);
  }

  /**
   * Calculates the damage multiplier for World Boss battles based on equipped items and stats.
   * Includes Critical Hit logic.
   */
  static calculateBossDamage(
    points: number,
    equippedItems: EquippedItemLike[] = [],
    level: number = 1,
    jobClass: string | null = null,
    jobTier: string = "BASE",
    advanceClass: string | null = null,
  ) {
    // Use StatCalculator for full pipeline: job multipliers + set bonuses + special effects
    const fullStats = StatCalculator.compute(
      points,
      equippedItems as Parameters<typeof StatCalculator.compute>[1],
      level,
      jobClass,
      jobTier,
      advanceClass,
    );

    // Use the higher of ATK or MAG so magic classes (Mage/Healer) are not penalized
    const effectiveStat = Math.max(fullStats.atk, fullStats.mag);

    // Item bossDamageMultiplier already included in fullStats.bossDamageMultiplier
    // Apply: base × (1 + bossDamageMultiplier)
    const baseDamage = Math.floor(effectiveStat * (1 + fullStats.bossDamageMultiplier));

    // Critical Hit Logic
    const critValue = this.normalizeCritPercent(fullStats.crit);
    const isCrit = Math.random() < this.normalizeCritChance(critValue);
    const finalDamage = isCrit
      ? Math.floor(baseDamage * this.getCritDamageMultiplier(critValue))
      : baseDamage;

    return {
        damage: finalDamage,
        isCrit,
        stats: fullStats,
    };
  }

  /**
   * Applies damage to this student's personal classroom boss (HP stored on student.gameStats).
   * Classroom only holds a shared template (bossRaidTemplate); each student has their own HP bar.
   */
  static async applyBossDamage(
    classId: string,
    studentId: string,
    options: {
      damageOverride?: number;
      consumeStamina?: boolean;
      elementMultiplier?: number;
      isLimitBreak?: boolean;
      jobClass?: string | null;
      isMagicAttack?: boolean;
      studentName?: string;
      skillDamageMultiplier?: number; // skill-specific multiplier (overrides base 1.0×)
      skillForceCrit?: boolean;       // guaranteed crit for skill with isCrit: true
      skillName?: string;             // for battle log display
    } = { consumeStamina: true }
  ) {
    try {
      const consumeStamina = options.consumeStamina ?? true;

      const student = await db.student.findUnique({
        where: { id: studentId },
        select: {
          points: true,
          items: { include: { item: true }, where: { isEquipped: true } },
          stamina: true,
          gameStats: true,
          classId: true,
          jobClass: true,
          jobTier: true,
          advanceClass: true,
        },
      }) as (BossStudent & { classId: string }) | null;

      if (!student || student.classId !== classId) {
        return { error: "Student not found" };
      }

      if (consumeStamina && student.stamina <= 0) {
        return { error: "Insufficient stamina" };
      }

      let damage = 0;
      let isCrit = false;

      if (typeof options.damageOverride === "number") {
        damage = options.damageOverride;
      } else {
        const stats = this.parseGameStats(student?.gameStats);
        const battleResult = this.calculateBossDamage(
          student?.points || 0,
          student?.items || [],
          stats?.level || 1,
          student.jobClass,
          student.jobTier ?? "BASE",
          student.advanceClass,
        );
        damage = battleResult.damage;
        isCrit = battleResult.isCrit;

        // Skill: guaranteed crit — re-apply crit multiplier if natural roll missed
        if (options.skillForceCrit && !isCrit) {
          const critValue = this.normalizeCritPercent(battleResult.stats.crit);
          damage = Math.floor(damage * this.getCritDamageMultiplier(critValue));
          isCrit = true;
        }
        // Skill: damage multiplier on top of base stats
        if (options.skillDamageMultiplier && options.skillDamageMultiplier !== 1.0) {
          damage = Math.floor(damage * options.skillDamageMultiplier);
        }
      }

      const txResult = await db.$transaction(async (tx) => {
        const classroom = await tx.classroom.findUnique({
          where: { id: classId },
          select: { gamifiedSettings: true },
        });

        if (!classroom) {
          return { error: "Classroom not found" } as const;
        }

        const template = getBossRaidTemplate(
          (classroom.gamifiedSettings ?? {}) as Record<string, unknown>
        );
        if (!template) {
          return { error: "No active boss" } as const;
        }

        const studentRow = await tx.student.findUnique({
          where: { id: studentId },
          select: { id: true, gameStats: true, stamina: true, classId: true },
        });

        if (!studentRow || studentRow.classId !== classId) {
          return { error: "Student not found" } as const;
        }

        if (consumeStamina && (!studentRow.stamina || studentRow.stamina < 1)) {
          return { error: "Insufficient stamina" } as const;
        }

        let personal = getPersonalBossFromStats(studentRow.gameStats);
        if (!personal || personal.templateId !== template.templateId) {
          personal = spawnPersonalBossFromTemplate(template);
        }

        if (personal.active === false || Number(personal.currentHp) <= 0) {
          return { error: "No active boss" } as const;
        }

        // ── FF: Player battle state ────────────────────────────────────────────
        const playerBattleState: PlayerBattleState = personal.playerBattleState ?? { battleHp: 100, statusEffects: [] };

        // Decrement status turns (each call = 1 turn)
        const activeStatuses = playerBattleState.statusEffects
          .map((e) => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
          .filter((e) => e.remainingTurns > 0) as PlayerBattleState["statusEffects"];

        // BIND: cannot attack this turn
        if (activeStatuses.some((e) => e.type === "BIND")) {
          // Persist decremented statuses and return error
          const boundPatch: PersonalClassroomBoss = {
            ...(personal as PersonalClassroomBoss),
            playerBattleState: { ...playerBattleState, statusEffects: activeStatuses },
          };
          await tx.student.update({
            where: { id: studentId },
            data: { gameStats: toPrismaJson(mergeGameStatsWithPersonalBoss(studentRow.gameStats, boundPatch)) },
          });
          return { error: "ถูกล็อค! ไม่สามารถโจมตีได้ในรอบนี้" } as const;
        }

        const bossState = { ...(personal as unknown as BossState) };

        let effectiveDamage = damage;
        const passive = bossState.passiveDamageMultiplier ?? 1.0;
        const elemMult = options.elementMultiplier ?? 1.0;
        effectiveDamage = Math.floor(effectiveDamage * passive * elemMult);

        const activeEffect = bossState.activeEffect as BossActiveEffect | null | undefined;
        const now = Date.now();
        const effectActive =
          activeEffect &&
          (activeEffect.expiresAt === null ||
            new Date(activeEffect.expiresAt).getTime() > now);

        if (options.isLimitBreak) {
          effectiveDamage = Math.floor(damage * passive * elemMult * 3);
        } else {
          if (effectActive && activeEffect) {
            if (activeEffect.type === "DAMAGE_REDUCTION") {
              effectiveDamage = Math.floor(effectiveDamage * (1 - activeEffect.effectValue));
            } else if (activeEffect.type === "DAMAGE_AMPLIFY") {
              effectiveDamage = Math.floor(effectiveDamage * (1 + activeEffect.effectValue));
            } else if (activeEffect.type === "CRIT_IMMUNITY") {
              if (isCrit) effectiveDamage = Math.floor(effectiveDamage / 2);
            }
          }
        }

        const recentAttacks: { jobClass: string; timestamp: number }[] =
          ((personal as unknown as Record<string, unknown>).recentAttacks as {
            jobClass: string;
            timestamp: number;
          }[]) ?? [];
        const recentWindow = recentAttacks.filter((a) => now - a.timestamp <= 10000);
        const recentJobClasses = recentWindow.map((a) => a.jobClass).filter(Boolean);
        const { multiplier: comboMult, label: comboLabel } = getComboMultiplier(
          options.jobClass,
          recentJobClasses
        );
        if (comboMult > 1.0) {
          effectiveDamage = Math.floor(effectiveDamage * comboMult);
        }

        const updatedRecentAttacks = [
          ...recentWindow,
          ...(options.jobClass ? [{ jobClass: options.jobClass, timestamp: now }] : []),
        ].slice(-10);

        let limitBreakChargeGain = 0;
        if (!options.isLimitBreak) {
          if (effectActive && activeEffect) {
            if (activeEffect.type === "DAMAGE_REDUCTION") limitBreakChargeGain = 30;
            else if (activeEffect.type === "STAMINA_DOUBLE") limitBreakChargeGain = 25;
            else if (activeEffect.type === "XP_REDUCTION") limitBreakChargeGain = 20;
            else if (activeEffect.type === "CRIT_IMMUNITY") limitBreakChargeGain = 20;
          }
          if ((options.elementMultiplier ?? 1.0) < 1.0) limitBreakChargeGain += 15;
        }

        // ── FF: BLIND miss check ───────────────────────────────────────────────
        const isBlind = activeStatuses.some((e) => e.type === "BLIND");
        const isMiss = !options.isLimitBreak && isBlind && Math.random() < 0.5;
        if (isMiss) effectiveDamage = 0;
        else effectiveDamage = Math.max(1, effectiveDamage);

        // ── FF: POISON self-damage + natural HP regen ─────────────────────────
        const isPoisoned = activeStatuses.some((e) => e.type === "POISON");
        const poisonDamage = isPoisoned ? 8 : 0;
        // Regen 10 HP every 5 turns when no status effects are active
        const totalAttacksForRegen = (personal.totalAttacksReceived ?? 0) + 1;
        const regenHeal = (activeStatuses.length === 0 && totalAttacksForRegen % 5 === 0) ? 10 : 0;
        const newPlayerBattleHp = Math.min(100, Math.max(0,
          (playerBattleState.battleHp ?? 100) - poisonDamage + regenHeal
        ));

        const prevHp = bossState.currentHp;
        const newHp = Math.max(0, prevHp - effectiveDamage);
        const isDefeated = prevHp > 0 && newHp <= 0;
        const alreadyDistributed = Boolean(bossState.rewardDistributedAt);

        const triggeredSkills = bossState.triggeredSkills ?? [];
        const newlyTriggered: BossSkillConfig[] = bossState.bossId
          ? getTriggeredSkills(
              bossState.bossId,
              bossState.maxHp ?? prevHp,
              prevHp,
              newHp,
              triggeredSkills
            )
          : [];

        let newActiveEffect: BossActiveEffect | null =
          activeEffect && effectActive ? activeEffect : null;
        if (newlyTriggered.length > 0) {
          const latestSkill = newlyTriggered[newlyTriggered.length - 1];
          if (latestSkill.effectType === "HP_REGEN") {
            const regenHp = Math.min(
              prevHp + Math.floor((bossState.maxHp ?? prevHp) * latestSkill.effectValue),
              bossState.maxHp ?? prevHp
            );
            const regenAdjusted = Math.min(regenHp, bossState.maxHp ?? prevHp);
            newActiveEffect = null;
            (newlyTriggered as any)._regenHp = regenAdjusted;
          } else {
            const expiresAt =
              latestSkill.durationSeconds !== null
                ? new Date(now + latestSkill.durationSeconds * 1000).toISOString()
                : null;
            newActiveEffect = {
              type: latestSkill.effectType,
              effectValue: latestSkill.effectValue,
              expiresAt,
              skillId: latestSkill.id,
              skillName: latestSkill.name,
              skillIcon: latestSkill.icon,
            };
          }
        }

        const regenHp: number | null = (newlyTriggered as any)._regenHp ?? null;
        const finalHp = regenHp !== null ? regenHp : newHp;

        // ── FF: Stagger System ─────────────────────────────────────────────────
        const prevStagger = personal.staggerGauge ?? 0;
        const prevIsStaggered = personal.isStaggered ?? false;
        const staggerExpiry = personal.staggerExpiry ?? null;
        const staggerActive = prevIsStaggered && staggerExpiry !== null && staggerExpiry > now;

        let newStaggerGauge = prevStagger;
        let newIsStaggered = staggerActive;
        let newStaggerExpiry: number | null = staggerActive ? staggerExpiry : null;
        let justStaggered = false;

        if (!isMiss && !isDefeated) {
          if (staggerActive) {
            // During stagger: gauge drains
            newStaggerGauge = Math.max(0, prevStagger - 15);
            if (newStaggerGauge === 0) { newIsStaggered = false; newStaggerExpiry = null; }
          } else {
            // Fill stagger gauge
            // Pressured (elemental weakness) fills stagger faster — FF13 mechanic
            const staggerGain = options.isMagicAttack ? 18 : (options.elementMultiplier ?? 1) > 1 ? 20 : 10;
            newStaggerGauge = Math.min(100, prevStagger + staggerGain);
            if (newStaggerGauge >= 100) {
              newIsStaggered = true;
              newStaggerExpiry = now + 30000;
              newStaggerGauge = 0;
              justStaggered = true;
              effectiveDamage = Math.floor(effectiveDamage * 2); // stagger bonus ×2
            }
          }
        }

        // ── FF: Boss Turn System ───────────────────────────────────────────────
        const bossPreset = personal.bossId ? getBossPreset(personal.bossId) : null;
        const totalAttacks = (personal.totalAttacksReceived ?? 0) + 1;
        const phase = getBossPhase(newHp, personal.maxHp);
        const turnInterval = getBossTurnInterval(phase);
        const prevIndex = personal.actionQueueIndex ?? 0;

        let executedBossAction: BossAction | null = null;
        let updatedPlayerState: PlayerBattleState = {
          battleHp: newPlayerBattleHp,
          statusEffects: activeStatuses,
        };
        const logEntries: BattleLogEntry[] = [...(personal.battleLog ?? [])];

        // Add player attack to log
        if (!isMiss) {
          const skillLabel = options.skillName ? `ใช้ ${options.skillName}` : options.isMagicAttack ? "ใช้ Magic" : "โจมตี";
          const skillEmoji = options.skillName ? "✨" : options.isMagicAttack ? "🔮" : "⚔️";
          logEntries.push({
            id: `${now}-atk`,
            type: options.isMagicAttack ? "PLAYER_MAGIC" : "PLAYER_ATTACK",
            text: `${skillEmoji} ${options.studentName ?? "คุณ"} ${skillLabel} ${effectiveDamage} DMG${isCrit ? " (Crit!)" : ""}${justStaggered ? " 💥 STAGGER!" : ""}`,
            damage: effectiveDamage,
            isCrit,
            timestamp: now,
          });
        } else {
          logEntries.push({ id: `${now}-miss`, type: "MISS", text: "💨 พลาด! (Blind)", timestamp: now });
        }

        if (regenHeal > 0) {
          logEntries.push({
            id: `${now}-regen`,
            type: "PLAYER_ATTACK",
            text: `💚 HP ฟื้นฟู +${regenHeal} HP (${newPlayerBattleHp}/100)`,
            timestamp: now,
          });
        }

        if (justStaggered) {
          logEntries.push({
            id: `${now}-stagger`,
            type: "STAGGER",
            text: `💥 STAGGER! ${personal.name} ถูก Stagger — ดาเมจ ×2 เป็นเวลา 30 วินาที`,
            timestamp: now,
          });
        }

        // Boss acts every N hits (skip during stagger)
        let bossHeal = 0;
        if (!staggerActive && !isDefeated && totalAttacks % turnInterval === 0 && bossPreset?.actions) {
          const availableActions = getActionsForPhase(bossPreset.actions, phase);
          if (availableActions.length > 0) {
            const actionIdx = prevIndex % availableActions.length;
            executedBossAction = availableActions[actionIdx];

            // Apply boss action effects to player
            let hitDamage = Math.floor(executedBossAction.baseDamage * (1 + (phase - 1) * 0.2));
            const isVulnerable = updatedPlayerState.statusEffects.some((e) => e.type === "VULNERABLE");
            if (isVulnerable) hitDamage = Math.floor(hitDamage * 1.5);

            const newBattleHp = Math.max(0, updatedPlayerState.battleHp - hitDamage);
            let newEffects = [...updatedPlayerState.statusEffects.filter((e) => e.type !== "VULNERABLE")];

            if (executedBossAction.statusEffect) {
              newEffects.push({
                type: executedBossAction.statusEffect.type,
                remainingTurns: executedBossAction.statusEffect.turns,
              });
            }

            // KO → BIND 2 turns
            if (newBattleHp <= 0) {
              newEffects = newEffects.filter((e) => e.type !== "BIND");
              newEffects.push({ type: "BIND", remainingTurns: 2 });
            }

            // Boss self-heal
            if (executedBossAction.selfHealPct) {
              bossHeal = Math.floor(personal.maxHp * executedBossAction.selfHealPct);
            }

            updatedPlayerState = { battleHp: Math.max(0, newBattleHp), statusEffects: newEffects };

            logEntries.push({
              id: `${now}-boss`,
              type: "BOSS_ACTION",
              text: `${executedBossAction.icon} ${personal.name}: ${executedBossAction.name} — ${executedBossAction.description}${hitDamage > 0 ? ` (−${hitDamage} HP)` : ""}`,
              damage: hitDamage,
              timestamp: now,
            });
          }
        }

        // Phase change announcement
        const prevPhase = getBossPhase(prevHp, personal.maxHp);
        if (phase > prevPhase) {
          logEntries.push({
            id: `${now}-phase`,
            type: "PHASE_CHANGE",
            text: `⚠️ Phase ${phase}! ${personal.name} เข้าสู่ช่วงอันตราย!`,
            timestamp: now,
          });
        }

        // Keep only last 15 entries
        const trimmedLog = logEntries.slice(-15);

        // Apply boss self-heal to finalHp
        const finalHpWithHeal = Math.min(personal.maxHp, finalHp + bossHeal);

        const mergedPatch: PersonalClassroomBoss = {
          ...(personal as PersonalClassroomBoss),
          currentHp: finalHpWithHeal,
          active: finalHpWithHeal > 0,
          triggeredSkills: [...triggeredSkills, ...newlyTriggered.map((s) => s.id)],
          activeEffect: newActiveEffect,
          recentAttacks: updatedRecentAttacks,
          staggerGauge: newStaggerGauge,
          isStaggered: newIsStaggered,
          staggerExpiry: newStaggerExpiry,
          totalAttacksReceived: totalAttacks,
          actionQueueIndex: (prevIndex + (executedBossAction ? 1 : 0)) % Math.max(1, bossPreset?.actions?.length ?? 1),
          playerBattleState: updatedPlayerState,
          battleLog: trimmedLog,
          ...(isDefeated && !alreadyDistributed
            ? { rewardDistributedAt: new Date().toISOString() }
            : {}),
        };

        if (isDefeated && !alreadyDistributed) {
          await this.distributeBossRewardsTx(
            tx,
            classId,
            mergedPatch as unknown as BossState,
            studentId,
            { clearPersonalBoss: true, staminaDecrement: consumeStamina }
          );
        } else if (!isDefeated) {
          await tx.student.update({
            where: { id: studentId },
            data: {
              ...(consumeStamina ? { stamina: { decrement: 1 } } : {}),
              gameStats: toPrismaJson(
                mergeGameStatsWithPersonalBoss(studentRow.gameStats, mergedPatch)
              ),
            },
          });
        } else {
          await tx.student.update({
            where: { id: studentId },
            data: {
              ...(consumeStamina ? { stamina: { decrement: 1 } } : {}),
              gameStats: toPrismaJson(
                mergeGameStatsWithPersonalBoss(studentRow.gameStats, null)
              ),
            },
          });
        }

        const after = await tx.student.findUnique({
          where: { id: studentId },
          select: { stamina: true, gameStats: true },
        });

        const outBoss = isDefeated
          ? null
          : (mergedPatch as unknown as BossState);

        return {
          boss: outBoss,
          bosses: [] as BossState[],
          targetInstanceId: personal.instanceId,
          staminaLeft: after?.stamina ?? 0,
          isDefeated,
          triggeredSkills: newlyTriggered,
          effectiveDamage,
          comboMult,
          comboLabel,
          limitBreakChargeGain,
          // FF extras
          isMiss,
          justStaggered,
          isStaggered: newIsStaggered,
          staggerGauge: newStaggerGauge,
          executedBossAction,
          playerBattleState: updatedPlayerState,
          battleLog: trimmedLog,
          phase,
          // Boss turn countdown: null during stagger (boss can't act), else hits remaining
          hitsUntilBossAct: staggerActive
            ? null
            : ((turnInterval - (totalAttacks % turnInterval)) % turnInterval) || turnInterval,
        } as const;
      });

      if ("error" in txResult) {
        return { error: txResult.error };
      }

      if (txResult.isDefeated) {
        void trackQuestEvent(studentId, "BOSS_KILL").catch(() => {});
      }

      return {
        boss: txResult.boss,
        bosses: txResult.bosses,
        targetInstanceId: txResult.targetInstanceId,
        damage: txResult.effectiveDamage,
        isCrit,
        staminaLeft: txResult.staminaLeft,
        triggeredSkills: txResult.triggeredSkills,
        comboMult: txResult.comboMult,
        comboLabel: txResult.comboLabel,
        limitBreakChargeGain: txResult.limitBreakChargeGain,
        // FF extras
        isMiss: txResult.isMiss,
        justStaggered: txResult.justStaggered,
        isStaggered: txResult.isStaggered,
        staggerGauge: txResult.staggerGauge,
        executedBossAction: txResult.executedBossAction,
        playerBattleState: txResult.playerBattleState,
        battleLog: txResult.battleLog,
        phase: txResult.phase,
        hitsUntilBossAct: txResult.hitsUntilBossAct,
      };
    } catch (error: unknown) {
      console.error("[IdleEngine] Error applying boss damage:", error);
      if (error && typeof error === "object" && "code" in error) console.error("Error Code:", error.code);
      if (error && typeof error === "object" && "meta" in error) console.error("Error Meta:", error.meta);
      const message = error instanceof Error ? error.message : "Unknown";
      return { error: `Internal error: ${message}` };
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
   * Distributes boss defeat rewards to a single student (legacy non-transaction helper).
   */
  private static async distributeBossRewards(
    classId: string,
    bossSettings: BossState,
    killerStudentId: string
  ) {
    try {
      const student = await db.student.findFirst({
        where: { id: killerStudentId, classId },
        select: { id: true, gameStats: true },
      }) as BossRewardStudent | null;
      if (!student) return;

      const rewardGold = bossSettings.rewardGold || 500;
      const bossName = bossSettings.name || "World Boss";
      const xpReward = Math.floor(rewardGold * 0.5);

      const stats = this.parseGameStats(student.gameStats);
      const xpResult = this.calculateXpGain(stats, xpReward);
      const updatedStats: GameStats = {
        ...stats,
        gold: (stats.gold || 0) + rewardGold,
        level: xpResult.level,
        xp: xpResult.xp,
      };

      const updateData: BossRewardUpdateData = {
        points: { increment: rewardGold },
        gameStats: toPrismaJson(updatedStats),
        history: {
          create: {
            reason: `🚀 รางวัลพิชิต ${bossName}!`,
            value: rewardGold,
            timestamp: new Date(),
          },
        },
      };

      await db.student.update({
        where: { id: student.id },
        data: updateData,
      });
    } catch (error: unknown) {
      console.error("Error distributing boss rewards:", error);
    }
  }

  /**
   * Atomic version: distribute rewards to the student who dealt the killing blow.
   * Must be called within the same transaction where classroom boss defeat is committed.
   */
  private static async distributeBossRewardsTx(
    tx: Prisma.TransactionClient,
    classId: string,
    bossSettings: BossState,
    killerStudentId: string,
    opts?: { clearPersonalBoss?: boolean; staminaDecrement?: boolean }
  ) {
    const rewardGold = bossSettings.rewardGold || 500;
    const rewardXp = bossSettings.rewardXp ?? Math.floor(rewardGold * 0.5);
    const bossName = bossSettings.name || "World Boss";
    const difficulty = bossSettings.difficulty ?? "EASY";
    const diffLabel: Record<string, string> = {
      BEGINNER: "🌱ฝึกหัด", EASY: "⚔️ง่าย", NORMAL: "⚔️⚔️ปกติ",
      HARD: "💀ยาก", LEGENDARY: "👑ตำนาน",
    };

    const student = (await tx.student.findFirst({
      where: { id: killerStudentId, classId },
      select: { id: true, gameStats: true },
    })) as BossRewardStudent | null;

    if (!student) {
      console.error("[IdleEngine] Boss reward: killer not in classroom", killerStudentId, classId);
      return;
    }

    const stats = this.parseGameStats(student.gameStats);
    if (opts?.clearPersonalBoss) {
      delete (stats as unknown as Record<string, unknown>).personalClassroomBoss;
    }
    const xpResult = this.calculateXpGain(stats, rewardXp);

    const materials = bossSettings.rewardMaterials ?? [];
    const existingMaterials: { type: string; quantity: number }[] = (stats as any).materials ?? [];
    for (const mat of materials) {
      const found = existingMaterials.find((m) => m.type === mat.type);
      if (found) found.quantity += mat.quantity;
      else existingMaterials.push({ ...mat });
    }

    const updatedStats: GameStats = {
      ...stats,
      gold: (stats.gold || 0) + rewardGold,
      level: xpResult.level,
      xp: xpResult.xp,
      materials: existingMaterials,
    } as GameStats & { materials: typeof existingMaterials };

    const updateData: BossRewardUpdateData = {
      points: { increment: rewardGold },
      gameStats: toPrismaJson(updatedStats),
      history: {
        create: {
          reason: `🏆 [${diffLabel[difficulty]}] พิชิต ${bossName}! +${rewardGold} ทอง +${rewardXp} EXP`,
          value: rewardGold,
          timestamp: new Date(),
        },
      },
    };

    if (opts?.staminaDecrement) {
      updateData.stamina = { decrement: 1 };
    }

    await tx.student.update({
      where: { id: student.id },
      data: updateData,
    });
  }

  /**
   * Calculates the XP needed for a specific level.
   * Exponential growth: 100 * (1.2 ^ (level - 1))
   */
  static getXpRequirement(level: number): number {
    if (level >= this.MAX_LEVEL) return Number.POSITIVE_INFINITY;
    return Math.floor(100 * Math.pow(1.2, level - 1));
  }

  /**
   * Adds XP to a student and handles automatic level up.
   */
  static calculateXpGain(currentStats: GameStats, xpToAdd: number) {
    let { level, xp } = currentStats;
    console.log(`[XP_DEBUG] Start: Lv.${level}, XP:${xp}, Adding:${xpToAdd}`);
    if (level >= this.MAX_LEVEL) {
      return {
        level: this.MAX_LEVEL,
        xp: 0,
        leveledUp: false,
        newMaxMp: this.calculateCharacterStats(0, [], this.MAX_LEVEL).maxMp
      };
    }
    let earnedXp = xp + xpToAdd;
    let leveledUp = false;
    while (level < this.MAX_LEVEL && earnedXp >= this.getXpRequirement(level)) {
      const req = this.getXpRequirement(level);
      console.log(`[XP_DEBUG] Leveling Up: ${level} -> ${level + 1}. Required: ${req}, Earned: ${earnedXp}`);
      earnedXp -= req;
      level++;
      leveledUp = true;
    }
    if (level >= this.MAX_LEVEL) {
      level = this.MAX_LEVEL;
      earnedXp = 0;
    }
    console.log(`[XP_DEBUG] End: Lv.${level}, NewXP:${earnedXp}, LeveledUp:${leveledUp}`);

    return { 
      level, 
      xp: Math.max(0, earnedXp), 
      leveledUp,
      newMaxMp: this.calculateCharacterStats(0, [], level).maxMp // Return new max MP if needed
    };
  }

  /**
   * Processes skill usage: Checks MP, applies effects, and updates DB.
   */
  static async useSkill(studentId: string, skillId: string, classId: string) {
    try {
        const { buildGlobalSkillMap } = require("./job-system");
        const baseSkill = (buildGlobalSkillMap() as Record<string, Skill | undefined>)[skillId];

        // 1. Fetch student data
        const student = await db.student.findUnique({
            where: { id: studentId },
            select: { 
                points: true, 
                mana: true, 
                stamina: true,
                gameStats: true,
                jobClass: true,
                jobTier: true,
                advanceClass: true,
                jobSkills: true,
                items: { where: { isEquipped: true }, include: { item: true } }
            }
        }) as SkillUserStudent | null;

        if (!student) return { error: "Student not found" };
        const stats = this.parseGameStats(student.gameStats);
        const rank = getSkillRank(stats.skillTreeProgress ?? {}, skillId);
        const skill = baseSkill ? getEffectiveSkillAtRank(baseSkill, rank) : undefined;

        if (!skill) return { error: "Skill not found" };

        // Security/consistency: allow using only skills already unlocked for this student.
        const effectiveJobKey = resolveEffectiveJobKey({
          jobClass: student.jobClass,
          jobTier: student.jobTier,
          advanceClass: student.advanceClass,
        });
        const unlockedSkillIds = new Set(
          getSkillsForLevel(effectiveJobKey, stats.level ?? 1).map((s) => s.id)
        );
        const persistedSkillIds = new Set(Array.isArray(student.jobSkills) ? student.jobSkills : []);
        if (!unlockedSkillIds.has(skillId) || !persistedSkillIds.has(skillId)) {
          return { error: "Skill locked" };
        }

        // 2. Check Resource Requirement (AP vs MP)
        const isAP = skill.costType === "AP";
        const currentResource = isAP ? student.stamina : student.mana;
        const resourceName = isAP ? "พลังกาย (Stamina)" : "มานา (Mana)";

        if (currentResource < skill.cost) {
            return { error: `${resourceName} ไม่เพียงพอ` };
        }

        let resultMessage = "";

        // 3. Apply Skill Effect
        // Most skills currently contribute to Boss Damage in this simple engine
        const battleRes = this.calculateBossDamage(
          student.points,
          student.items,
          stats.level,
          student.jobClass,
          student.jobTier ?? "BASE",
          student.advanceClass,
        );
        const bonusDamage = Math.floor(battleRes.damage * (isAP ? 1.5 : 2.0)); // Magic usually deals more raw dmg
        
        const bossResult = await this.applyBossDamage(classId, studentId, {
            damageOverride: bonusDamage,
            consumeStamina: false,
        });

        if (bossResult.error) return { error: bossResult.error };
        resultMessage = `ใช้ ${skill.name} สร้างความเสียหาย ${bonusDamage} ใส่บอส!`;

        // 4. Deduct Resource and Update History
        const updateData: StudentUpdateData = {
            history: {
                create: {
                    reason: `🔮 ใช้ทักษะ: ${skill.name}`,
                    value: 0,
                    timestamp: new Date()
                }
            }
        };

        if (isAP) {
            updateData.stamina = { decrement: skill.cost };
        } else {
            updateData.mana = { decrement: skill.cost };
        }

        const updatedStudent = await db.student.update({
            where: { id: studentId },
            data: updateData
        });

        return { 
            success: true, 
            message: resultMessage,
            mana: updatedStudent.mana,
            stamina: updatedStudent.stamina,
            boss: bossResult.boss
        };

    } catch (error) {
      console.error("[IdleEngine] Skill Error:", error);
      return { error: "เกิดข้อผิดพลาดในการใช้สกิล" };
    }
  }

  /**
   * Solo Farming: Get or initialize farming state
   */
  static getFarmingState(student: FarmingStudentSource): NonNullable<GameStats['farming']> {
    const stats = this.parseGameStats(student.gameStats);
    
    if (stats.farming) {
        return stats.farming;
    }

    // Initialize if no farming state exists
    const wave = 1;
    const monster = spawnSoloMonster(stats.level || 1, wave);
    return { currentWave: wave, monster };
  }

  /**
   * Solo Farming: Handle manual attack on monster
   */
  static async attackMonster(studentId: string) {
    try {
        const student = await db.student.findUnique({
            where: { id: studentId },
            include: { items: { where: { isEquipped: true }, include: { item: true } } }
        }) as CombatStudent | null;

        if (!student) return { error: "Student not found" };

        const stats = this.parseGameStats(student.gameStats);
        const farming = this.getFarmingState(student);
        const monster = { ...farming.monster }; // mutable copy

        // 1. Calculate character stats
        const charStats = this.calculateCharacterStats(
            student.points,
            student.items,
            stats.level,
            student.jobClass,
            student.jobTier || "BASE",
            student.advanceClass ?? null
        );

        // 2. Initialize playerHp (first time or after level-up)
        let playerHp = farming.playerHp ?? charStats.hp;
        const playerMaxHp = farming.playerMaxHp ?? charStats.hp;
        let activeEffects: FarmingEffects = { ...(farming.activeEffects ?? {}) };
        let skillCooldowns: Record<string, number> = { ...(farming.skillCooldowns ?? {}) };

        // 3. Read effect values for this turn (before decrement)
        let poisonDamage = 0;
        const atkBuffMulti = activeEffects.atkBuff ? activeEffects.atkBuff.multiplier : 1.0;
        const defBuffReduction = activeEffects.defBuff ? activeEffects.defBuff.reduction : 0.0;
        const atkDebuffReduction = activeEffects.atkDebuff ? activeEffects.atkDebuff.reduction : 0.0;
        const critBonus = activeEffects.critBuff ? activeEffects.critBuff.bonus : 0.0;
        const defBreakAmplify = activeEffects.defBreak ? activeEffects.defBreak.amplify : 0.0;
        const slowSkipChance = activeEffects.slow ? activeEffects.slow.skipChance : 0.0;
        const isStunned = !!(activeEffects.stun && activeEffects.stun.turnsLeft > 0);

        if (activeEffects.regen && activeEffects.regen.turnsLeft > 0) {
            playerHp = Math.min(playerMaxHp, playerHp + activeEffects.regen.healPerTurn);
        }
        if (activeEffects.poison && activeEffects.poison.turnsLeft > 0) {
            poisonDamage = activeEffects.poison.damagePerTurn;
            monster.hp = Math.max(0, monster.hp - poisonDamage);
        }

        // 4. Player normal attack (ATK buff + CRIT buff + DEF break included)
        const critValue = this.normalizeCritPercent(charStats.crit + critBonus);
        const isCrit = Math.random() < this.normalizeCritChance(critValue);
        const damage = Math.floor(
          charStats.atk *
            (isCrit ? this.getCritDamageMultiplier(critValue) : 1.0) *
            atkBuffMulti *
            (1 + defBreakAmplify)
        );
        monster.hp = Math.max(0, monster.hp - damage);

        // 5. Per-hit XP
        const hitXp = Math.max(1, Math.floor(farming.currentWave * 0.5));
        let xpResult = this.calculateXpGain(stats, hitXp);
        stats.level = xpResult.level;
        stats.xp = xpResult.xp;

        // 6. Handle Monster Defeat
        let rewardLoot = null;
        let nextWave = farming.currentWave;
        let newMonster: typeof monster = monster;
        let isDefeated = monster.hp <= 0;

        if (isDefeated) {
            activeEffects = {}; // clear effects on kill
            rewardLoot = rollFarmingLoot(farming.currentWave);
            nextWave++;
            newMonster = spawnSoloMonster(stats.level, nextWave);
            stats.gold = (stats.gold || 0) + rewardLoot.gold;
            xpResult = this.calculateXpGain(stats, rewardLoot.xp);
            stats.xp = xpResult.xp;
            stats.level = xpResult.level;
        }

        // 7. Monster Counter-Attack (if it survived, slow/stun may skip it)
        let monsterDamage = 0;
        let playerDied = false;
        let deathPenaltyWave = 0;
        const skipCounterAttack = isStunned || Math.random() < slowSkipChance;
        if (!isDefeated && !skipCounterAttack) {
            const rawDmg = Math.max(1, Math.floor(monster.atk * (1 - atkDebuffReduction) - charStats.def * 0.4));
            monsterDamage = Math.max(1, Math.floor(rawDmg * (1 - defBuffReduction)));
            playerHp = Math.max(0, playerHp - monsterDamage);
            if (playerHp <= 0) {
                playerDied = true;
                // Death penalty: retreat 2 waves (minimum wave 1)
                deathPenaltyWave = Math.max(1, Math.floor(farming.currentWave * 0.9));
                nextWave = deathPenaltyWave;
                newMonster = spawnSoloMonster(stats.level, deathPenaltyWave);
                activeEffects = {}; // clear all status effects on death
                playerHp = Math.floor(playerMaxHp * 0.5); // respawn at 50% HP
            }
        }

        // 8. Decrement effect turns at end of turn
        if (!isDefeated) {
            const next: FarmingEffects = {};
            if (activeEffects.poison && activeEffects.poison.turnsLeft > 1)
                next.poison = { ...activeEffects.poison, turnsLeft: activeEffects.poison.turnsLeft - 1 };
            if (activeEffects.atkBuff && activeEffects.atkBuff.turnsLeft > 1)
                next.atkBuff = { ...activeEffects.atkBuff, turnsLeft: activeEffects.atkBuff.turnsLeft - 1 };
            if (activeEffects.defBuff && activeEffects.defBuff.turnsLeft > 1)
                next.defBuff = { ...activeEffects.defBuff, turnsLeft: activeEffects.defBuff.turnsLeft - 1 };
            if (activeEffects.atkDebuff && activeEffects.atkDebuff.turnsLeft > 1)
                next.atkDebuff = { ...activeEffects.atkDebuff, turnsLeft: activeEffects.atkDebuff.turnsLeft - 1 };
            if (activeEffects.critBuff && activeEffects.critBuff.turnsLeft > 1)
                next.critBuff = { ...activeEffects.critBuff, turnsLeft: activeEffects.critBuff.turnsLeft - 1 };
            if (activeEffects.defBreak && activeEffects.defBreak.turnsLeft > 1)
                next.defBreak = { ...activeEffects.defBreak, turnsLeft: activeEffects.defBreak.turnsLeft - 1 };
            if (activeEffects.slow && activeEffects.slow.turnsLeft > 1)
                next.slow = { ...activeEffects.slow, turnsLeft: activeEffects.slow.turnsLeft - 1 };
            if (activeEffects.stun && activeEffects.stun.turnsLeft > 1)
                next.stun = { turnsLeft: activeEffects.stun.turnsLeft - 1 };
            if (activeEffects.regen && activeEffects.regen.turnsLeft > 1)
                next.regen = { ...activeEffects.regen, turnsLeft: activeEffects.regen.turnsLeft - 1 };
            activeEffects = next;

            // Decrement skill cooldowns
            const nextCooldowns: Record<string, number> = {};
            for (const [sid, cd] of Object.entries(skillCooldowns)) {
                if (cd > 1) nextCooldowns[sid] = cd - 1;
            }
            skillCooldowns = nextCooldowns;
        }

        // 9. Level-up HP/Mana refill
        let finalPlayerHp = playerHp;
        let finalPlayerMaxHp = playerMaxHp;
        let newMana = student.mana;
        if (xpResult.leveledUp) {
            const lvStats = this.calculateCharacterStats(
                student.points, student.items, xpResult.level,
                student.jobClass, student.jobTier || "BASE", student.advanceClass ?? null
            );
            newMana = lvStats.maxMp;
            finalPlayerHp = lvStats.hp;
            finalPlayerMaxHp = lvStats.hp;
        }

        const updatedFarming = {
            currentWave: nextWave,
            monster: newMonster,
            playerHp: finalPlayerHp,
            playerMaxHp: finalPlayerMaxHp,
            playerMaxMp: xpResult.leveledUp
                ? this.calculateCharacterStats(student.points, student.items, xpResult.level, student.jobClass, student.jobTier || "BASE", student.advanceClass ?? null).maxMp
                : charStats.maxMp,
            activeEffects: Object.keys(activeEffects).length > 0 ? activeEffects : undefined,
            skillCooldowns: Object.keys(skillCooldowns).length > 0 ? skillCooldowns : undefined,
        };

        const updatedStats: GameStats = { ...stats, farming: updatedFarming };

        // Unlock new skills if leveled up
        let updatedJobSkills: string[] | undefined;
        if (xpResult.leveledUp) {
            const eff = resolveEffectiveJobKey({
                jobClass: student.jobClass,
                jobTier: student.jobTier || "BASE",
                advanceClass: student.advanceClass ?? null,
            });
            const currentSkillIds = Array.isArray(student.jobSkills)
                ? student.jobSkills
                : [];
            const newSkills = getNewlyUnlockedSkills(eff, stats.level, xpResult.level, currentSkillIds);
            if (newSkills.length > 0) {
                updatedJobSkills = [...currentSkillIds, ...newSkills];
            }
        }

        const data: StudentUpdateData = {
            stamina: { decrement: 1 },
            mana: newMana,
            gameStats: toPrismaJson(updatedStats),
            ...(updatedJobSkills ? { jobSkills: updatedJobSkills } : {}),
            history: {
                create: {
                    reason: isDefeated ? `⚔️ กำจัดมอนสเตอร์ Wave ${farming.currentWave}` : "⚔️ โจมทีมอนสเตอร์",
                    value: 0
                }
            }
        };

        if (rewardLoot?.materials && rewardLoot.materials.length > 0) {
            for (const mat of rewardLoot.materials) {
                await db.material.upsert({
                    where: { studentId_type: { studentId, type: mat.type } },
                    update: { quantity: { increment: mat.quantity } },
                    create: { studentId, type: mat.type, quantity: mat.quantity }
                });
            }
        }

        const finalStudent = await db.student.update({ where: { id: studentId }, data });

        // Track quest event for wave clear (fire-and-forget)
        if (isDefeated) {
            void trackQuestEvent(studentId, "FARMING_WAVE");
        }

        return {
            success: true,
            damage,
            isCrit,
            poisonDamage,
            isDefeated,
            loot: rewardLoot,
            stamina: finalStudent.stamina,
            farming: updatedFarming,
            gold: this.parseGameStats(finalStudent.gameStats).gold,
            xp: this.parseGameStats(finalStudent.gameStats).xp,
            leveledUp: xpResult.leveledUp,
            newLevel: xpResult.level,
            mana: finalStudent.mana,
            monsterDamage,
            playerHp: finalPlayerHp,
            playerMaxHp: finalPlayerMaxHp,
            activeEffects: updatedFarming.activeEffects,
            skillCooldowns: updatedFarming.skillCooldowns,
            playerDied,
            deathPenaltyWave,
        };

    } catch (error) {
        console.error("[IdleEngine] Farming Attack Error:", error);
        return { error: "เกิดข้อผิดพลาดในการต่อสู้" };
    }
  }

  /**
   * Solo Farming: Use Skill on monster
   */
  static async useSkillOnMonster(studentId: string, skillId: string) {
    try {
        const { buildGlobalSkillMap } = require("./job-system");
        const baseSkill = (buildGlobalSkillMap() as Record<string, Skill | undefined>)[skillId];

        const student = await db.student.findUnique({
            where: { id: studentId },
            include: { items: { where: { isEquipped: true }, include: { item: true } } }
        }) as CombatStudent | null;
        if (!student) return { error: "Student not found" };

        const stats = this.parseGameStats(student.gameStats);
        const rank = getSkillRank(stats.skillTreeProgress ?? {}, skillId);
        const skill = baseSkill ? getEffectiveSkillAtRank(baseSkill, rank) : undefined;
        if (!skill) return { error: "ไม่พบทักษะ" };
        const isAP = skill.costType === "AP";
        const currentResource = isAP ? student.stamina : student.mana;
        if (currentResource < skill.cost) return { error: "พลังงานไม่เพียงพอ" };
        const farming = this.getFarmingState(student);
        const monster = { ...farming.monster }; // mutable copy

        // Check skill cooldown
        let skillCooldowns: Record<string, number> = { ...(farming.skillCooldowns ?? {}) };
        const remainingCooldown = skillCooldowns[skillId] ?? 0;
        if (remainingCooldown > 0) return { error: `สกิลยังไม่พร้อม (${remainingCooldown} เทิร์น)`, cooldownRemaining: remainingCooldown };

        const { StatCalculator } = require("./stat-calculator");
        const charStats = StatCalculator.compute(
            student.points, student.items, stats.level,
            student.jobClass, student.jobTier || "BASE", student.advanceClass ?? null
        );

        // Initialize playerHp
        let playerHp = farming.playerHp ?? charStats.hp;
        const playerMaxHp = farming.playerMaxHp ?? charStats.hp;
        let activeEffects: FarmingEffects = { ...(farming.activeEffects ?? {}) };

        // Read active effect values for this turn
        let poisonDamage = 0;
        const atkBuffMulti = activeEffects.atkBuff ? activeEffects.atkBuff.multiplier : 1.0;
        const skillAtkDebuffReduction = activeEffects.atkDebuff ? activeEffects.atkDebuff.reduction : 0.0;
        const skillCritBonus = activeEffects.critBuff ? activeEffects.critBuff.bonus : 0.0;
        const skillDefBreakAmplify = activeEffects.defBreak ? activeEffects.defBreak.amplify : 0.0;
        const skillSlowSkipChance = activeEffects.slow ? activeEffects.slow.skipChance : 0.0;
        const skillIsStunned = !!(activeEffects.stun && activeEffects.stun.turnsLeft > 0);

        if (activeEffects.regen && activeEffects.regen.turnsLeft > 0) {
            playerHp = Math.min(playerMaxHp, playerHp + activeEffects.regen.healPerTurn);
        }
        if (activeEffects.poison && activeEffects.poison.turnsLeft > 0) {
            poisonDamage = activeEffects.poison.damagePerTurn;
            monster.hp = Math.max(0, monster.hp - poisonDamage);
        }

        // Apply skill effect by type
        let skillDamage = 0;
        let isForcedCrit = false;
        let healAmount = 0;
        let newEffectDescription = "";
        const effect = skill.effect ?? "DAMAGE";

        switch (effect) {
            case "DAMAGE": {
                const usesMag = skill.damageBase === "MAG";
                const base = usesMag ? charStats.mag : charStats.atk;
                const mult = skill.damageMultiplier ?? (usesMag ? 2.5 : 1.5);
                const skillCritValue = this.normalizeCritPercent(skillCritBonus);
                isForcedCrit =
                  skill.isCrit === true ||
                  (!skill.isCrit && Math.random() < this.normalizeCritChance(skillCritValue));
                skillDamage = Math.floor(
                  base *
                    mult *
                    (isForcedCrit ? this.getCritDamageMultiplier(skillCritValue) : 1.0) *
                    atkBuffMulti *
                    (1 + skillDefBreakAmplify)
                );
                monster.hp = Math.max(0, monster.hp - skillDamage);
                break;
            }
            case "POISON": {
                const usesMag = skill.damageBase === "MAG";
                const base = usesMag ? charStats.mag : charStats.atk;
                const mult = skill.damageMultiplier ?? 1.5;
                const skillCritValue = this.normalizeCritPercent(skillCritBonus);
                isForcedCrit =
                  skill.isCrit === true ||
                  (!skill.isCrit && Math.random() < this.normalizeCritChance(skillCritValue));
                skillDamage = Math.floor(
                  base *
                    mult *
                    (isForcedCrit ? this.getCritDamageMultiplier(skillCritValue) : 1.0) *
                    atkBuffMulti *
                    (1 + skillDefBreakAmplify)
                );
                monster.hp = Math.max(0, monster.hp - skillDamage);
                activeEffects.poison = { damagePerTurn: Math.max(1, Math.floor(base * 0.15)), turnsLeft: 3 };
                newEffectDescription = "☠️ วางยาพิษ 3 เทิร์น";
                break;
            }
            case "BUFF_DEF":
            case "DEFEND": {
                activeEffects.defBuff = { reduction: 0.5, turnsLeft: 2 };
                newEffectDescription = "🛡️ ลดดาเมจ 50% (2 เทิร์น)";
                break;
            }
            case "BUFF_ATK": {
                activeEffects.atkBuff = { multiplier: 1.4, turnsLeft: 3 };
                newEffectDescription = "⚔️ เพิ่ม ATK 40% (3 เทิร์น)";
                break;
            }
            case "DEBUFF_ATK": {
                const usesMag = skill.damageBase === "MAG";
                const base = usesMag ? charStats.mag : charStats.atk;
                const mult = skill.damageMultiplier ?? 1.5;
                skillDamage = Math.floor(base * mult * atkBuffMulti * (1 + skillDefBreakAmplify));
                monster.hp = Math.max(0, monster.hp - skillDamage);
                activeEffects.atkDebuff = { reduction: 0.30, turnsLeft: 2 };
                newEffectDescription = "🌪️ ลดพลังโจมตีศัตรู 30% (2 เทิร์น)";
                break;
            }
            case "CRIT_BUFF": {
                activeEffects.critBuff = { bonus: 0.30, turnsLeft: 3 };
                newEffectDescription = "🎯 เพิ่มโอกาส CRIT 30% (3 เทิร์น)";
                break;
            }
            case "ARMOR_PIERCE": {
                const mult = skill.damageMultiplier ?? 2.5;
                skillDamage = Math.floor(charStats.atk * mult * atkBuffMulti);
                monster.hp = Math.max(0, monster.hp - skillDamage);
                activeEffects.defBreak = { amplify: 0.20, turnsLeft: 3 };
                newEffectDescription = "🔓 ทะลวงเกราะ รับดาเมจ +20% (3 เทิร์น)";
                break;
            }
            case "HEAL": {
                const mult = skill.damageMultiplier ?? 1.5;
                healAmount = Math.floor(charStats.mag * mult);
                playerHp = Math.min(playerMaxHp, playerHp + healAmount);
                newEffectDescription = `❤️ ฟื้นคืน HP ${healAmount.toLocaleString()}`;
                break;
            }
            case "SLOW": {
                const usesMag = skill.damageBase === "MAG";
                const base = usesMag ? charStats.mag : charStats.atk;
                const mult = skill.damageMultiplier ?? 1.5;
                skillDamage = Math.floor(base * mult * atkBuffMulti * (1 + skillDefBreakAmplify));
                monster.hp = Math.max(0, monster.hp - skillDamage);
                activeEffects.slow = { skipChance: 0.35, turnsLeft: 2 };
                newEffectDescription = "🧊 ชะลอศัตรู 35% โอกาสไม่โจมตี (2 เทิร์น)";
                break;
            }
            case "STUN": {
                const usesMag = skill.damageBase === "MAG";
                const base = usesMag ? charStats.mag : charStats.atk;
                const mult = skill.damageMultiplier ?? 1.5;
                skillDamage = Math.floor(base * mult * atkBuffMulti * (1 + skillDefBreakAmplify));
                monster.hp = Math.max(0, monster.hp - skillDamage);
                if (Math.random() < 0.50) {
                    activeEffects.stun = { turnsLeft: 1 };
                    newEffectDescription = "⚡ สตัน! ศัตรูไม่โจมตีเทิร์นนี้";
                } else {
                    newEffectDescription = "⚡ ฟ้าผ่า — สตันพลาด";
                }
                break;
            }
            case "REGEN": {
                const healPerTurn = Math.max(1, Math.floor(charStats.mag * 0.25));
                activeEffects.regen = { healPerTurn, turnsLeft: 4 };
                newEffectDescription = `💚 ฟื้นฟู ${healPerTurn.toLocaleString()} HP/เทิร์น (4 เทิร์น)`;
                break;
            }
            case "LIFESTEAL": {
                const usesMag = skill.damageBase === "MAG";
                const base = usesMag ? charStats.mag : charStats.atk;
                const mult = skill.damageMultiplier ?? 1.5;
                const skillCritValue = this.normalizeCritPercent(skillCritBonus);
                isForcedCrit =
                  skill.isCrit === true ||
                  (!skill.isCrit && Math.random() < this.normalizeCritChance(skillCritValue));
                skillDamage = Math.floor(
                  base *
                    mult *
                    (isForcedCrit ? this.getCritDamageMultiplier(skillCritValue) : 1.0) *
                    atkBuffMulti *
                    (1 + skillDefBreakAmplify)
                );
                monster.hp = Math.max(0, monster.hp - skillDamage);
                healAmount = Math.floor(skillDamage * 0.30);
                playerHp = Math.min(playerMaxHp, playerHp + healAmount);
                newEffectDescription = `🩸 ดูดเลือด ฟื้นคืน ${healAmount.toLocaleString()} HP`;
                break;
            }
            case "EXECUTE": {
                const hpPercent = monster.maxHp > 0 ? monster.hp / monster.maxHp : 1;
                const execMult = hpPercent < 0.30 ? (skill.damageMultiplier ?? 3.0) * 1.8 : (skill.damageMultiplier ?? 3.0);
                skillDamage = Math.floor(charStats.atk * execMult * atkBuffMulti * (1 + skillDefBreakAmplify));
                monster.hp = Math.max(0, monster.hp - skillDamage);
                newEffectDescription = hpPercent < 0.30 ? "💀 ประหาร! ดาเมจสูงสุด" : "🗡️ โจมตี";
                break;
            }
            case "DEF_BREAK": {
                const usesMag = skill.damageBase === "MAG";
                const base = usesMag ? charStats.mag : charStats.atk;
                const mult = skill.damageMultiplier ?? 2.0;
                skillDamage = Math.floor(base * mult * atkBuffMulti);
                monster.hp = Math.max(0, monster.hp - skillDamage);
                activeEffects.defBreak = { amplify: 0.50, turnsLeft: 3 };
                newEffectDescription = "💢 ทำลายเกราะ รับดาเมจ +50% (3 เทิร์น)";
                break;
            }
            case "MANA_SURGE": {
                const mult = skill.damageMultiplier ?? 2.7;
                const skillCritValue = this.normalizeCritPercent(skillCritBonus);
                isForcedCrit =
                  skill.isCrit === true ||
                  (!skill.isCrit && Math.random() < this.normalizeCritChance(skillCritValue));
                skillDamage = Math.floor(
                  charStats.mag *
                    mult *
                    (isForcedCrit ? this.getCritDamageMultiplier(skillCritValue) : 1.0) *
                    atkBuffMulti *
                    (1 + skillDefBreakAmplify)
                );
                monster.hp = Math.max(0, monster.hp - skillDamage);
                healAmount = 10; // flag: treated as MP restore in finalMana calc below
                newEffectDescription = "🔮 Mana Surge +10 MP";
                break;
            }
            default: {
                const usesMag = skill.damageBase === "MAG";
                const base = usesMag ? charStats.mag : charStats.atk;
                skillDamage = Math.floor(base * (skill.damageMultiplier ?? 1.5) * atkBuffMulti * (1 + skillDefBreakAmplify));
                monster.hp = Math.max(0, monster.hp - skillDamage);
            }
        }

        // Set skill cooldown after use
        let skillCd = skill.cooldown ?? DEFAULT_COOLDOWN_BY_EFFECT[effect] ?? 0;
        if (skillCd === 0) {
            // DAMAGE skills get cooldown based on multiplier strength
            const mult = skill.damageMultiplier ?? 1.5;
            skillCd = mult < 1.5 ? 3 : mult < 2.0 ? 4 : mult < 2.5 ? 5 : mult < 3.0 ? 6 : mult < 3.5 ? 7 : 8;
        }
        if (skillCd > 0) skillCooldowns[skillId] = skillCd;

        // Per-skill XP (3× normal rate)
        const hitXp = Math.max(2, Math.floor(farming.currentWave * 0.5 * 3));
        let xpResult = this.calculateXpGain(stats, hitXp);
        stats.level = xpResult.level;
        stats.xp = xpResult.xp;

        // Handle Monster Defeat
        let rewardLoot = null;
        let nextWave = farming.currentWave;
        let newMonster: typeof monster = monster;
        let isDefeated = monster.hp <= 0;

        if (isDefeated) {
            activeEffects = {};
            rewardLoot = rollFarmingLoot(farming.currentWave);
            nextWave++;
            newMonster = spawnSoloMonster(stats.level, nextWave);
            stats.gold = (stats.gold || 0) + rewardLoot.gold;
            xpResult = this.calculateXpGain(stats, rewardLoot.xp);
            stats.xp = xpResult.xp;
            stats.level = xpResult.level;
        }

        // Monster Counter-Attack (slow/stun may skip it)
        let monsterDamage = 0;
        let playerDied = false;
        let deathPenaltyWave = 0;
        const skillSkipCounter = skillIsStunned || Math.random() < skillSlowSkipChance;
        if (!isDefeated && !skillSkipCounter) {
            const activeDefReduction = activeEffects.defBuff ? activeEffects.defBuff.reduction : 0.0;
            const rawDmg = Math.max(1, Math.floor(monster.atk * (1 - skillAtkDebuffReduction) - charStats.def * 0.4));
            monsterDamage = Math.max(1, Math.floor(rawDmg * (1 - activeDefReduction)));
            playerHp = Math.max(0, playerHp - monsterDamage);
            if (playerHp <= 0) {
                playerDied = true;
                // Death penalty: retreat 2 waves (minimum wave 1)
                deathPenaltyWave = Math.max(1, Math.floor(farming.currentWave * 0.9));
                nextWave = deathPenaltyWave;
                newMonster = spawnSoloMonster(stats.level, deathPenaltyWave);
                activeEffects = {}; // clear all status effects on death
                playerHp = Math.floor(playerMaxHp * 0.5); // respawn at 50% HP
            }
        }

        // Decrement effect turns
        if (!isDefeated) {
            const next: FarmingEffects = {};
            if (activeEffects.poison && activeEffects.poison.turnsLeft > 1)
                next.poison = { ...activeEffects.poison, turnsLeft: activeEffects.poison.turnsLeft - 1 };
            if (activeEffects.atkBuff && activeEffects.atkBuff.turnsLeft > 1)
                next.atkBuff = { ...activeEffects.atkBuff, turnsLeft: activeEffects.atkBuff.turnsLeft - 1 };
            if (activeEffects.defBuff && activeEffects.defBuff.turnsLeft > 1)
                next.defBuff = { ...activeEffects.defBuff, turnsLeft: activeEffects.defBuff.turnsLeft - 1 };
            if (activeEffects.atkDebuff && activeEffects.atkDebuff.turnsLeft > 1)
                next.atkDebuff = { ...activeEffects.atkDebuff, turnsLeft: activeEffects.atkDebuff.turnsLeft - 1 };
            if (activeEffects.critBuff && activeEffects.critBuff.turnsLeft > 1)
                next.critBuff = { ...activeEffects.critBuff, turnsLeft: activeEffects.critBuff.turnsLeft - 1 };
            if (activeEffects.defBreak && activeEffects.defBreak.turnsLeft > 1)
                next.defBreak = { ...activeEffects.defBreak, turnsLeft: activeEffects.defBreak.turnsLeft - 1 };
            if (activeEffects.slow && activeEffects.slow.turnsLeft > 1)
                next.slow = { ...activeEffects.slow, turnsLeft: activeEffects.slow.turnsLeft - 1 };
            if (activeEffects.stun && activeEffects.stun.turnsLeft > 1)
                next.stun = { turnsLeft: activeEffects.stun.turnsLeft - 1 };
            if (activeEffects.regen && activeEffects.regen.turnsLeft > 1)
                next.regen = { ...activeEffects.regen, turnsLeft: activeEffects.regen.turnsLeft - 1 };
            activeEffects = next;

            // Decrement skill cooldowns
            const nextCooldowns: Record<string, number> = {};
            for (const [sid, cd] of Object.entries(skillCooldowns)) {
                if (cd > 1) nextCooldowns[sid] = cd - 1;
            }
            skillCooldowns = nextCooldowns;
        }

        // Resolve mana + level-up refill
        let finalPlayerHp = playerHp;
        let finalPlayerMaxHp = playerMaxHp;
        let finalMana: number;
        if (xpResult.leveledUp) {
            const lvStats = StatCalculator.compute(
                student.points, student.items, xpResult.level,
                student.jobClass, student.jobTier || "BASE", student.advanceClass ?? null
            );
            finalMana = lvStats.maxMp;
            finalPlayerHp = lvStats.hp;
            finalPlayerMaxHp = lvStats.hp;
        } else {
            const mpRestore = effect === "MANA_SURGE" ? 10 : 0;
            finalMana = isAP
                ? Math.min(charStats.maxMp, student.mana + mpRestore)
                : Math.min(charStats.maxMp, Math.max(0, student.mana - skill.cost + mpRestore));
            // MANA_SURGE healAmount was repurposed as flag — clear it
            if (effect === "MANA_SURGE") healAmount = 0;
        }

        const updatedFarming = {
            currentWave: nextWave,
            monster: newMonster,
            playerHp: finalPlayerHp,
            playerMaxHp: finalPlayerMaxHp,
            playerMaxMp: xpResult.leveledUp
                ? StatCalculator.compute(student.points, student.items, xpResult.level, student.jobClass, student.jobTier || "BASE", student.advanceClass ?? null).maxMp
                : charStats.maxMp,
            activeEffects: Object.keys(activeEffects).length > 0 ? activeEffects : undefined,
            skillCooldowns: Object.keys(skillCooldowns).length > 0 ? skillCooldowns : undefined,
        };
        const updatedStats = { ...stats, farming: updatedFarming };

        // Unlock new skills if leveled up
        let updatedJobSkillsSkill: string[] | undefined;
        if (xpResult.leveledUp) {
            const eff = resolveEffectiveJobKey({
                jobClass: student.jobClass,
                jobTier: student.jobTier || "BASE",
                advanceClass: student.advanceClass ?? null,
            });
            const currentSkillIds = Array.isArray(student.jobSkills)
                ? student.jobSkills
                : [];
            const newSkills = getNewlyUnlockedSkills(eff, stats.level, xpResult.level, currentSkillIds);
            if (newSkills.length > 0) {
                updatedJobSkillsSkill = [...currentSkillIds, ...newSkills];
            }
        }

        const data: StudentUpdateData = {
            mana: finalMana,
            gameStats: toPrismaJson(updatedStats),
            ...(updatedJobSkillsSkill ? { jobSkills: updatedJobSkillsSkill } : {}),
            history: {
                create: {
                    reason: `🔮 ใช้ทักษะ ${skill.name}${newEffectDescription ? ` — ${newEffectDescription}` : ""}`,
                    value: 0
                }
            }
        };
        if (isAP) data.stamina = { decrement: skill.cost };

        if (rewardLoot?.materials) {
            for (const mat of rewardLoot.materials) {
                await db.material.upsert({
                    where: { studentId_type: { studentId, type: mat.type } },
                    update: { quantity: { increment: mat.quantity } },
                    create: { studentId, type: mat.type, quantity: mat.quantity }
                });
            }
        }

        const updatedStudent = await db.student.update({ where: { id: studentId }, data });

        return {
            success: true,
            damage: skillDamage,
            isCrit: isForcedCrit,
            poisonDamage,
            healAmount,
            effect,
            newEffectDescription,
            isDefeated,
            loot: rewardLoot,
            gold: this.parseGameStats(updatedStudent.gameStats).gold,
            xp: this.parseGameStats(updatedStudent.gameStats).xp,
            leveledUp: xpResult.leveledUp,
            newLevel: xpResult.level,
            mana: updatedStudent.mana,
            stamina: updatedStudent.stamina,
            farming: updatedFarming,
            monsterDamage,
            playerHp: finalPlayerHp,
            playerMaxHp: finalPlayerMaxHp,
            activeEffects: updatedFarming.activeEffects,
            skillCooldowns: updatedFarming.skillCooldowns,
            playerDied,
            deathPenaltyWave,
        };

    } catch (error) {
        console.error("[IdleEngine] Farming Skill Error:", error);
        return { error: "เกิดข้อผิดพลาดในการใช้สกิล" };
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
      },
      skillPointsAvailable: 0,
      skillPointsSpent: 0,
      skillTreeProgress: {},
    };
  }
}
