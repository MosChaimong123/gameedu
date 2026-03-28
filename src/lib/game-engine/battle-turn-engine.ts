/**
 * BattleTurnEngine — Full Battle RPG Engine
 * Phases: LOBBY → PREP → CO_OP_BOSS_RAID → SOLO_FARMING → RESULT
 * Requirements: 1, 2, 3, 4
 */
import { Server, Socket } from "socket.io";
import { AbstractGameEngine } from "./abstract-game";
import {
  BattlePlayer,
  BattleTurnSession,
  BattlePhase,
  BossState,
  SoloMonster,
  LootPayload,
  MaterialDrop,
  FinalReward,
  GameSettings,
  StatusEffect,
  StatusEffectType,
} from "../types/game";
import { StatCalculator } from "../game/stat-calculator";
import {
  buildGlobalSkillMap,
  getMergedClassDef,
  resolveEffectiveJobKey,
} from "../game/job-system";
import { RewardManager } from "../game/reward-manager";
import { db } from "../db";
import type { BattleRuntimeEventPayload } from "../game/battle-events";
import { parseGameStats, toPrismaJson } from "../game/game-stats";
import { getEffectiveSkillAtRank, getSkillRank } from "../game/skill-tree";

// ─── Boss Config ──────────────────────────────────────────────────────────────

const BOSS_CONFIG = {
  id: "co-op-boss-01",
  name: "The Knowledge Devourer",
  baseBossHp: 5000,
  perPlayerHpBonus: 500,
  baseAtk: 80,
  attackIntervalMs: 15_000,
};

// ─── Solo Monster Templates (scaled per level) ────────────────────────────────

const SOLO_MONSTER_TEMPLATES = [
  { name: "Slime",       baseHp: 120, baseAtk: 15 },
  { name: "Goblin",      baseHp: 180, baseAtk: 22 },
  { name: "Wolf",        baseHp: 250, baseAtk: 30 },
  { name: "Orc",         baseHp: 350, baseAtk: 40 },
  { name: "Troll",       baseHp: 500, baseAtk: 55 },
  { name: "Dark Knight", baseHp: 700, baseAtk: 70 },
];

// ─── Loot Tables ─────────────────────────────────────────────────────────────

const COMMON_MATERIALS: string[] = ["Stone Fragment", "Wolf Fang", "Iron Ore", "Forest Herb"];
const RARE_MATERIALS: string[]   = ["Dragon Scale", "Shadow Essence", "Thunder Crystal", "Void Shard"];
const EPIC_MATERIALS: string[]   = ["Phoenix Feather", "Abyssal Core", "Celestial Dust"];
const LEGENDARY_MATERIALS: string[] = ["Ancient Relic"];

function rollMaterials(wave: number): MaterialDrop[] {
  const drops: MaterialDrop[] = [];
  let pool: string[];

  if (wave <= 3) {
    pool = COMMON_MATERIALS;
  } else if (wave <= 6) {
    pool = [...COMMON_MATERIALS, ...RARE_MATERIALS];
  } else if (wave <= 9) {
    pool = [...RARE_MATERIALS, ...EPIC_MATERIALS];
  } else {
    pool = [...EPIC_MATERIALS, ...LEGENDARY_MATERIALS];
  }

  // Roll 1-2 drops
  const count = Math.random() < 0.4 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const type = pool[Math.floor(Math.random() * pool.length)];
    const existing = drops.find((d) => d.type === type);
    if (existing) {
      existing.quantity++;
    } else {
      drops.push({ type, quantity: 1 });
    }
  }
  return drops;
}

function rollGold(wave: number): number {
  const base = 20 + wave * 10;
  return base + Math.floor(Math.random() * base);
}

function rollXp(wave: number): number {
  return 10 + wave * 5;
}

// ─── Wave Scaling (7.10) ──────────────────────────────────────────────────────

/**
 * Scale monster HP: baseHp × (1 + wave × 0.15)
 * Scale monster ATK: baseAtk × (1 + wave × 0.10)
 */
export function scaleMonsterHp(baseHp: number, wave: number): number {
  return Math.floor(baseHp * (1 + wave * 0.15));
}

export function scaleMonsterAtk(baseAtk: number, wave: number): number {
  return Math.floor(baseAtk * (1 + wave * 0.10));
}

export function computeBossDamageAgainstPlayer(params: {
  bossAtk: number;
  playerDef: number;
  playerHp: number;
  playerMaxHp: number;
  hasToughSkin: boolean;
  hasTitanWill: boolean;
}): number {
  const defenseMultiplier =
    params.hasTitanWill && params.playerHp / Math.max(1, params.playerMaxHp) < 0.3 ? 1.5 : 1;
  const effectiveDef = Math.floor(params.playerDef * defenseMultiplier);
  const reducedBossAtk = params.hasToughSkin ? Math.floor(params.bossAtk * 0.9) : params.bossAtk;
  return Math.max(1, reducedBossAtk - effectiveDef);
}

export function computeDarkPactDrain(maxHp: number): number {
  return Math.max(1, Math.floor(maxHp * 0.05));
}

function spawnSoloMonster(level: number, wave: number): SoloMonster {
  // Pick template based on level bracket
  const templateIdx = Math.min(
    Math.floor((level - 1) / 10),
    SOLO_MONSTER_TEMPLATES.length - 1
  );
  const template = SOLO_MONSTER_TEMPLATES[templateIdx];
  const hp = scaleMonsterHp(template.baseHp, wave);
  const atk = scaleMonsterAtk(template.baseAtk, wave);
  return { name: template.name, hp, maxHp: hp, atk, wave, statusEffects: [] };
}

// ─── Default SOLO_FARMING timer ───────────────────────────────────────────────

const DEFAULT_SOLO_FARMING_MS = 5 * 60 * 1000; // 5 minutes

// ─── BattleTurnEngine ─────────────────────────────────────────────────────────

export class BattleTurnEngine extends AbstractGameEngine {
  public gameMode = "BATTLE_TURN";
  public players: BattlePlayer[] = [];
  public battlePhase: BattlePhase = "LOBBY";
  public boss: BossState | null = null;

  private bossTickInterval: ReturnType<typeof setInterval> | null = null;
  private soloFarmingTimer: ReturnType<typeof setTimeout> | null = null;
  private soloFarmingDurationMs: number;

  private emitBattleEvent(event: BattleRuntimeEventPayload) {
    this.io.to(this.pin).emit("battle-event", event);
  }

  private applyOutgoingDamageEffects(
    player: BattlePlayer,
    baseDamage: number,
    opts: { usesMagic?: boolean; targetBoss?: boolean } = {}
  ) {
    let damage = baseDamage;
    let critApplied = false;

    if (player.hasHolyFury && player.hp / Math.max(1, player.maxHp) < 0.3) {
      damage = Math.floor(damage * 1.4);
    }
    if (player.hasBerserkerRage && player.hp / Math.max(1, player.maxHp) < 0.5) {
      damage = Math.floor(damage * 1.2);
    }
    if (player.hasDarkPact) {
      damage = Math.floor(damage * 1.2);
    }
    if (opts.usesMagic && player.hasArcaneSurge) {
      damage = Math.floor(damage * 1.1);
    }
    if (opts.targetBoss && player.bossDamageMultiplier > 0) {
      damage = Math.floor(damage * (1 + player.bossDamageMultiplier));
    }

    const critChance = Math.max(0, Math.min(1, this.getEffectivePlayerCrit(player)));
    if (Math.random() < critChance) {
      damage = Math.floor(damage * 2);
      critApplied = true;
      if (player.hasHawkEye) {
        damage = Math.floor(damage * 1.3);
      }
    }

    if (player.shadowVeilCritBuff) {
      damage = Math.floor(damage * 1.2);
      critApplied = true;
      player.shadowVeilCritBuff = false;
    }

    return { damage: Math.max(1, damage), critApplied };
  }

  // ── Status Effect Helpers ────────────────────────────────────────────────────

  private applyStatusEffect(
    target: { statusEffects: StatusEffect[] },
    effect: StatusEffect
  ) {
    const existing = target.statusEffects.find((e) => e.type === effect.type);
    if (existing) {
      existing.turnsRemaining = effect.turnsRemaining;
      if (effect.value !== undefined) existing.value = effect.value;
    } else {
      target.statusEffects.push({ ...effect });
    }
  }

  private tickStatusEffects(
    target: { statusEffects: StatusEffect[] },
    onDamage: (amount: number, label: string) => void,
    onHeal: (amount: number, label: string) => void
  ) {
    target.statusEffects = target.statusEffects.filter((effect) => {
      if (effect.type === "POISON") onDamage(effect.value ?? 0, "Poison");
      if (effect.type === "REGEN")  onHeal(effect.value ?? 0, "Regen");
      effect.turnsRemaining--;
      return effect.turnsRemaining > 0;
    });
  }

  private getIncomingDamageMultiplier(effects: StatusEffect[]): number {
    let mult = 1.0;
    for (const e of effects) {
      if (e.type === "ARMOR_PIERCE") mult += 0.20;
      if (e.type === "DEF_BREAK")    mult += 0.50;
    }
    return mult;
  }

  private getEffectivePlayerAtk(player: BattlePlayer): number {
    return player.statusEffects.some((e) => e.type === "BUFF_ATK")
      ? Math.floor(player.atk * 1.4)
      : player.atk;
  }

  private getEffectivePlayerCrit(player: BattlePlayer): number {
    const buffCrit = player.statusEffects.some((e) => e.type === "CRIT_BUFF") ? 0.30 : 0;
    const baseCrit = (player.crit ?? 0) + buffCrit;
    const battleFocusMult = player.hasBattleFocus && player.hp / Math.max(1, player.maxHp) < 0.5 ? 2 : 1;
    return Math.min(1, baseCrit * battleFocusMult);
  }

  private tickFarmingStatusEffects(player: BattlePlayer) {
    if (!player.soloMonster) return;
    // Monster DoT (POISON)
    this.tickStatusEffects(
      player.soloMonster,
      (dmg) => {
        player.soloMonster!.hp = Math.max(0, player.soloMonster!.hp - dmg);
        this.emitBattleEvent({ type: "DAMAGE_APPLIED", sourceId: "poison", targetId: "solo-monster", amount: dmg, label: "Poison", tone: "warning", fxPreset: "poison" });
      },
      () => {}
    );
    // Player HoT (REGEN)
    this.tickStatusEffects(
      player,
      () => {},
      (healAmt) => {
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        this.emitBattleEvent({ type: "HEAL_APPLIED", sourceId: player.id, targetId: player.id, amount: healAmt, label: "Regen" });
      }
    );
  }

  private applyDarkPactDrain(player: BattlePlayer) {
    if (!player.hasDarkPact || player.hp <= 0) return;
    const drain = computeDarkPactDrain(player.maxHp);
    player.hp = Math.max(1, player.hp - drain);
    this.emitBattleEvent({
      type: "DAMAGE_APPLIED",
      sourceId: player.id,
      targetId: player.id,
      amount: drain,
      label: "Dark Pact",
      tone: "warning",
    });
  }

  constructor(
    pin: string,
    hostId: string,
    setId: string,
    settings: GameSettings,
    questions: any[],
    io: Server,
    soloFarmingDurationMs: number = DEFAULT_SOLO_FARMING_MS
  ) {
    super(pin, hostId, setId, settings, questions, io);
    this.soloFarmingDurationMs = soloFarmingDurationMs;
  }

  // ── Phase Helpers ────────────────────────────────────────────────────────────

  private transitionTo(phase: BattlePhase) {
    this.battlePhase = phase;
    this.io.to(this.pin).emit("battle-state", this.buildBattleState());
  }

  private buildBattleState() {
    return {
      phase: this.battlePhase,
      players: this.players,
      boss: this.boss,
    };
  }

  protected statusUpdate(): void {
    this.io.to(this.pin).emit("battle-state", this.buildBattleState());
  }

  // ── Player Management ────────────────────────────────────────────────────────

  public addPlayer(player: any, socket: Socket) {
    const battlePlayer: BattlePlayer = {
      id: socket.id,
      name: player.name ?? "Unknown",
      avatar: player.avatar,
      isConnected: true,
      score: player.score ?? 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      // Stats will be populated in PREP phase
      hp: 100,
      maxHp: 100,
      ap: 0,
      maxAp: 100,
      stamina: 0,
      maxStamina: 100,
      mp: 0,
      maxMp: 50,
      atk: 10,
      def: 5,
      spd: 10,
      crit: 0.05,
      luck: 0.01,
      mag: 5,
      level: 1, // Placeholder — real level is fetched from DB in loadPlayerStats()
      skills: [],
      isDefending: false,
      jobClass: player.jobClass ?? null,
      jobTier: player.jobTier ?? "BASE",
      wave: 1,
      soloMonster: null,
      studentId: player.studentId ?? "",
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
      earnedGold: 0,
      earnedXp: 0,
      itemDrops: [],
      materialDrops: [],
      statusEffects: [],
    };

    const existingIdx = this.players.findIndex(
      (p) => p.studentId === battlePlayer.studentId && battlePlayer.studentId !== ""
    );
    if (existingIdx !== -1) {
      this.players[existingIdx].id = socket.id;
      this.players[existingIdx].isConnected = true;
    } else {
      this.players.push(battlePlayer);
    }

    this.statusUpdate();
  }

  // ── Game Start ───────────────────────────────────────────────────────────────

  public startGame() {
    super.startGame();
    this.startPrepPhase();
  }

  // ── 7.2 PREP Phase ───────────────────────────────────────────────────────────

  private async startPrepPhase() {
    this.transitionTo("PREP");

    await Promise.all(
      this.players.map((player) => this.loadPlayerStats(player))
    );

    this.startBossRaidPhase();
  }

  private async loadPlayerStats(player: BattlePlayer) {
    if (!player.studentId) return;

    try {
      const student = await db.student.findUnique({
        where: { id: player.studentId },
        select: {
          points: true,
          gameStats: true,
          jobClass: true,
          jobTier: true,
          advanceClass: true,
          jobSkills: true,
          items: {
            where: { isEquipped: true },
            include: { item: true },
          },
        },
      });

      if (!student) {
        // DB fetch failed — reset to safe minimums so spoofed placeholder stats cannot persist
        player.level = 1;
        player.hp = 100; player.maxHp = 100;
        player.atk = 10; player.def = 5; player.spd = 10;
        player.crit = 0.05; player.luck = 0.01; player.mag = 5;
        player.mp = 50; player.maxMp = 50;
        return;
      }

      const gameStats = parseGameStats(student.gameStats);
      const level = gameStats.level ?? 1;
      const stats = StatCalculator.compute(
        student.points ?? 0,
        student.items ?? [],
        level,
        student.jobClass ?? null,
        (student.jobTier as string) ?? "BASE",
        student.advanceClass ?? null
      );

      // ── Consumable buffs: apply pending HP bonus and Phoenix Feather ──────────
      const pendingHpBonus: number = gameStats.pendingHpBonus ?? 0;
      const phoenixCharges: number = gameStats.phoenixCharges ?? 0;
      const pendingBattleBuff = gameStats.pendingBattleBuff ?? { atk: 0, def: 0, spd: 0 };
      const hasPotionBuff   = pendingHpBonus > 0;
      const hasPhoenixBuff  = phoenixCharges > 0;
      const hasBattleBuff   = (pendingBattleBuff.atk ?? 0) > 0 || (pendingBattleBuff.def ?? 0) > 0 || (pendingBattleBuff.spd ?? 0) > 0;

      if (hasPotionBuff || hasPhoenixBuff || hasBattleBuff) {
        // Consume all one-time battle flags immediately
        const cleanedStats = {
          ...gameStats,
          pendingHpBonus: 0,
          phoenixCharges: 0,
          pendingBattleBuff: { atk: 0, def: 0, spd: 0 },
        };
        await db.student.update({
          where: { id: player.studentId },
          data: { gameStats: toPrismaJson(cleanedStats) },
        });
      }

      // Populate BattlePlayer fields
      const baseHp = stats.hp;
      const boostedHp = hasPotionBuff
        ? Math.floor(baseHp * (1 + pendingHpBonus))
        : baseHp;
      player.hp = boostedHp;
      player.maxHp = boostedHp;
      player.stamina = player.ap;
      player.maxStamina = player.maxAp;
      player.mp = stats.maxMp;
      player.maxMp = stats.maxMp;
      player.atk = hasBattleBuff ? Math.floor(stats.atk * (1 + (pendingBattleBuff.atk ?? 0))) : stats.atk;
      player.def = hasBattleBuff ? Math.floor(stats.def * (1 + (pendingBattleBuff.def ?? 0))) : stats.def;
      player.spd = hasBattleBuff ? Math.floor(stats.spd * (1 + (pendingBattleBuff.spd ?? 0))) : stats.spd;
      player.crit = stats.crit;
      player.luck = stats.luck;
      player.mag = stats.mag;
      player.level = level;
      player.jobClass = student.jobClass ?? null;
      player.jobTier = (student.jobTier as string) ?? "BASE";
      player.skillTreeProgress = gameStats.skillTreeProgress ?? {};

      // 8.1–8.4: Populate special effect flags from equipped items
      player.hasLifesteal = stats.hasLifesteal;
      // Phoenix Feather overrides item Immortal (both work the same way)
      player.hasImmortal  = stats.hasImmortal || hasPhoenixBuff;
      player.hasManaFlow  = stats.hasManaFlow;
      player.hasTimeWarp  = stats.hasTimeWarp;
      player.hasToughSkin = stats.hasToughSkin;
      player.hasTitanWill = stats.hasTitanWill;
      player.hasHolyFury = stats.hasHolyFury;
      player.hasArcaneSurge = stats.hasArcaneSurge;
      player.hasDarkPact = stats.hasDarkPact;
      player.hasHawkEye = stats.hasHawkEye;
      player.hasShadowVeil = stats.hasShadowVeil;
      player.hasGodBlessing = stats.hasGodBlessing;
      player.hasLuckyStrike = stats.hasLuckyStrike;
      player.chainLightningOnCrit = stats.chainLightningOnCrit;
      player.hasBerserkerRage = stats.hasBerserkerRage;
      player.hasBattleFocus = stats.hasBattleFocus;
      player.hasEchoStrike = stats.hasEchoStrike;
      player.hasDragonBlood = stats.hasDragonBlood;
      player.hasCelestialGrace = stats.hasCelestialGrace;
      player.hasVoidWalker = stats.hasVoidWalker;
      player.hasSoulEater = stats.hasSoulEater;
      player.dodgeChance = stats.dodgeChance ?? 0;
      player.shadowVeilCritBuff = false;
      player.goldMultiplier = stats.goldMultiplier ?? 0;
      player.xpMultiplier = stats.xpMultiplier ?? 0;
      player.bossDamageMultiplier = stats.bossDamageMultiplier ?? 0;

      // Load skills from jobSkills JSON
      const rawSkills = student.jobSkills;
      if (Array.isArray(rawSkills)) {
        player.skills = rawSkills as string[];
      } else if (rawSkills && typeof rawSkills === "object") {
        player.skills = Object.values(rawSkills as Record<string, string>);
      } else {
        const eff = resolveEffectiveJobKey({
          jobClass: student.jobClass,
          jobTier: student.jobTier,
          advanceClass: student.advanceClass,
        });
        const classDef = getMergedClassDef(eff);
        player.skills = classDef.skills
          .filter((s) => s.unlockLevel <= level)
          .map((s) => s.id);
      }
    } catch (err) {
      console.error(`[BattleTurnEngine] Failed to load stats for player ${player.studentId}:`, err);
    }
  }

  // ── 7.3 CO_OP_BOSS_RAID Phase ────────────────────────────────────────────────

  private startBossRaidPhase() {
    const playerCount = this.players.length;
    const maxHp =
      BOSS_CONFIG.baseBossHp + playerCount * BOSS_CONFIG.perPlayerHpBonus;

    // 8.4 Time Warp: reduce attack interval by 3000ms per player with Time Warp (min 5000ms)
    const timeWarpCount = this.players.filter((p) => p.hasTimeWarp).length;
    const attackIntervalMs = Math.max(
      5_000,
      BOSS_CONFIG.attackIntervalMs - timeWarpCount * 3_000
    );

    this.boss = {
      id: BOSS_CONFIG.id,
      name: BOSS_CONFIG.name,
      hp: maxHp,
      maxHp,
      atk: BOSS_CONFIG.baseAtk,
      lastAttackTick: Date.now(),
      attackIntervalMs,
      statusEffects: [],
    };

    this.transitionTo("CO_OP_BOSS_RAID");

    // Start boss attack tick using the (possibly reduced) interval
    this.bossTickInterval = setInterval(
      () => this.executeBossAttackTick(),
      attackIntervalMs
    );
  }

  // ── 7.4 Boss Attack Tick ─────────────────────────────────────────────────────

  private executeBossAttackTick() {
    if (!this.boss || this.battlePhase !== "CO_OP_BOSS_RAID") return;

    this.boss.lastAttackTick = Date.now();

    // ── STUN: boss skips this entire attack tick ─────────────────────────────
    const stunIdx = this.boss.statusEffects.findIndex((e) => e.type === "STUN");
    if (stunIdx !== -1) {
      this.boss.statusEffects.splice(stunIdx, 1);
      this.emitBattleEvent({
        type: "BANNER",
        sourceId: this.boss.id,
        targetId: this.boss.id,
        label: `${this.boss.name} ติดสตัน — ข้ามการโจมตี`,
        tone: "warning",
      });
    } else {
      // ── SLOW: 35% chance boss misses entire tick ─────────────────────────
      const hasSlow = this.boss.statusEffects.some((e) => e.type === "SLOW");
      const bossSlowed = hasSlow && Math.random() < 0.35;

      if (bossSlowed) {
        this.emitBattleEvent({
          type: "BANNER",
          sourceId: this.boss.id,
          targetId: this.boss.id,
          label: `${this.boss.name} ติด Slow — พลาดการโจมตี`,
          tone: "warning",
          fxPreset: "ice",
        });
      } else {
        // ── DEBUFF_ATK: reduce effective boss ATK by 30% ───────────────────
        const hasDebuffAtk = this.boss.statusEffects.some((e) => e.type === "DEBUFF_ATK");
        const effectiveBossAtk = hasDebuffAtk
          ? Math.floor(this.boss.atk * 0.70)
          : this.boss.atk;

        for (const player of this.players) {
          if (!player.isConnected) continue;
          if (player.isDefending) continue;
          if (player.hp <= 0) continue;

          this.emitBattleEvent({
            type: "ACTION_SKILL_CAST",
            sourceId: this.boss.id,
            sourceRole: "enemy",
            targetId: player.id,
            label: `${this.boss.name} โจมตี`,
            fxPreset: "pierce",
            colorClass: "from-rose-600/80 via-orange-500/40 to-transparent",
          });

          if (player.hasShadowVeil && Math.random() < Math.max(0, Math.min(1, player.dodgeChance))) {
            player.shadowVeilCritBuff = true;
            this.emitBattleEvent({
              type: "BANNER",
              sourceId: player.id,
              targetId: player.id,
              label: `${player.name} หลบการโจมตีสำเร็จ`,
              tone: "success",
            });
            continue;
          }

          if (player.hasVoidWalker && Math.random() < 0.25) {
            this.emitBattleEvent({
              type: "BANNER",
              sourceId: player.id,
              targetId: player.id,
              label: `${player.name} Void Walker — หลบและโจมตีตอบ!`,
              tone: "success",
              fxPreset: "buff",
            });
            // Counter attack: 50% ATK to boss
            if (this.boss && this.boss.hp > 0) {
              const counterDmg = Math.max(1, Math.floor(player.atk * 0.5));
              this.boss.hp = Math.max(0, this.boss.hp - counterDmg);
              this.emitBattleEvent({
                type: "DAMAGE_APPLIED",
                sourceId: player.id,
                targetId: this.boss.id,
                amount: counterDmg,
                label: "Void Counter",
                tone: "skill",
              });
              if (this.boss.hp <= 0) {
                this.handleBossDefeated();
                return;
              }
            }
            continue;
          }

          let damage = computeBossDamageAgainstPlayer({
            bossAtk: effectiveBossAtk,
            playerDef: player.def,
            playerHp: player.hp,
            playerMaxHp: player.maxHp,
            hasToughSkin: player.hasToughSkin,
            hasTitanWill: player.hasTitanWill,
          });

          // BUFF_DEF: 50% damage reduction
          if (player.statusEffects.some((e) => e.type === "BUFF_DEF")) {
            damage = Math.max(1, Math.floor(damage * 0.5));
          }

          player.hp = Math.max(0, player.hp - damage);

          if (player.hp <= 0 && player.hasImmortal && !player.immortalUsed) {
            player.hp = 1;
            player.immortalUsed = true;
          }

          this.io.to(player.id).emit("player-damaged", {
            playerId: player.id,
            damage,
            remainingHp: player.hp,
          });
          this.emitBattleEvent({
            type: "DAMAGE_APPLIED",
            sourceId: this.boss.id,
            sourceRole: "enemy",
            targetId: player.id,
            amount: damage,
          });
        }
      }
    }

    // DRAGON_BLOOD: regen 2% maxHP per boss attack tick
    for (const player of this.players) {
      if (player.hp > 0 && player.hasDragonBlood) {
        const regenAmt = Math.max(1, Math.floor(player.maxHp * 0.02));
        player.hp = Math.min(player.maxHp, player.hp + regenAmt);
        this.emitBattleEvent({
          type: "HEAL_APPLIED",
          sourceId: player.id,
          targetId: player.id,
          amount: regenAmt,
          label: "Dragon Blood",
        });
      }
    }

    // ── Tick boss status effects (POISON DoT, decrement all) ────────────────
    this.tickStatusEffects(
      this.boss,
      (dmg) => {
        if (!this.boss) return;
        this.boss.hp = Math.max(0, this.boss.hp - dmg);
        this.emitBattleEvent({
          type: "DAMAGE_APPLIED",
          sourceId: "poison",
          targetId: this.boss.id,
          amount: dmg,
          label: "Poison",
          tone: "warning",
          fxPreset: "poison",
        });
        if (this.boss.hp <= 0) this.handleBossDefeated();
      },
      () => {}
    );

    // ── Tick player status effects (REGEN HoT, decrement all) ───────────────
    for (const player of this.players) {
      if (player.hp > 0) {
        this.tickStatusEffects(
          player,
          () => {},
          (healAmt) => {
            player.hp = Math.min(player.maxHp, player.hp + healAmt);
            this.emitBattleEvent({
              type: "HEAL_APPLIED",
              sourceId: player.id,
              targetId: player.id,
              amount: healAmt,
              label: "Regen",
            });
          }
        );
      }
    }

    // DARK_PACT: drain 5% maxHP per boss tick
    for (const player of this.players) {
      if (player.hp > 0) this.applyDarkPactDrain(player);
    }

    // Reset isDefending flags
    for (const player of this.players) {
      player.isDefending = false;
    }

    this.io.to(this.pin).emit("boss-damaged", {
      currentHp: this.boss.hp,
      maxHp: this.boss.maxHp,
      lastAttackerId: null,
    });

    this.statusUpdate();
  }

  // ── 7.5 battle-action Handler ────────────────────────────────────────────────

  private handleBattleAction(player: BattlePlayer, payload: any, socket: Socket) {
    if (this.battlePhase !== "CO_OP_BOSS_RAID") {
      socket.emit("error", { message: "Battle actions only allowed during CO_OP_BOSS_RAID phase." });
      return;
    }
    if (!this.boss) return;

    const { type, skillId } = payload;

    if (!type) {
      socket.emit("error", { message: "Missing action type." });
      return;
    }

    if (type === "ATTACK") {
      if (player.ap < 10) {
        socket.emit("error", { message: "Insufficient Stamina for ATTACK (requires 10 Stamina)." });
        return;
      }
      this.emitBattleEvent({
        type: "ACTION_ATTACK",
        sourceId: player.id,
        targetId: this.boss.id,
        label: "โจมตี",
      });
      player.ap -= 10;
      player.stamina = player.ap;
      const { damage, critApplied } = this.applyOutgoingDamageEffects(player, this.getEffectivePlayerAtk(player), { targetBoss: true });
      this.applyDamageToBoss(damage, player.id, critApplied);
      this.applyDarkPactDrain(player);

    } else if (type === "DEFEND") {
      player.isDefending = true;
      this.emitBattleEvent({
        type: "ACTION_DEFEND",
        sourceId: player.id,
        targetId: player.id,
        label: "ตั้งรับ",
        tone: "neutral",
      });
      this.statusUpdate();

    } else if (type === "SKILL") {
      if (!skillId) {
        socket.emit("error", { message: "Missing skillId for SKILL action." });
        return;
      }
      if (!player.skills.includes(skillId)) {
        socket.emit("error", { message: `Skill ${skillId} is not unlocked.` });
        return;
      }
      this.executeSkillOnBoss(player, skillId, socket);

    } else {
      socket.emit("error", { message: `Unknown action type: ${type}` });
    }
  }

  private applyDamageToBoss(rawDamage: number, attackerId: string, critApplied = false) {
    if (!this.boss) return;
    const incomingMult = this.getIncomingDamageMultiplier(this.boss.statusEffects);
    const damage = incomingMult > 1 ? Math.floor(rawDamage * incomingMult) : rawDamage;
    this.boss.hp = Math.max(0, this.boss.hp - damage);
    this.emitBattleEvent({
      type: "DAMAGE_APPLIED",
      sourceId: attackerId,
      targetId: this.boss.id,
      amount: damage,
      correct: critApplied,
    });

    const attacker = this.players.find((p) => p.id === attackerId);

    // CHAIN_LIGHTNING (Thunder Set): on crit, deal 30% extra to boss
    if (critApplied && attacker?.chainLightningOnCrit && this.boss && this.boss.hp > 0) {
      const lightningDmg = Math.max(1, Math.floor(damage * 0.3));
      this.boss.hp = Math.max(0, this.boss.hp - lightningDmg);
      this.emitBattleEvent({
        type: "DAMAGE_APPLIED",
        sourceId: attackerId,
        targetId: this.boss.id,
        amount: lightningDmg,
        label: "Chain Lightning",
        tone: "skill",
      });
    }

    // 8.1 Lifesteal: heal attacker by 10% of damage dealt
    if (attacker && attacker.hasLifesteal) {
      const healAmount = Math.max(1, Math.floor(damage * 0.1));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
      this.io.to(attacker.id).emit("battle-event", {
        type: "HEAL_APPLIED",
        sourceId: attackerId,
        targetId: attackerId,
        amount: healAmount,
      });
    }

    // ECHO_STRIKE: 30% chance to deal a second hit for 50% of the original damage
    if (this.boss && this.boss.hp > 0 && attacker?.hasEchoStrike && Math.random() < 0.30) {
      const echoDmg = Math.max(1, Math.floor(damage * 0.5));
      this.boss.hp = Math.max(0, this.boss.hp - echoDmg);
      this.emitBattleEvent({
        type: "DAMAGE_APPLIED",
        sourceId: attackerId,
        targetId: this.boss.id,
        amount: echoDmg,
        label: "Echo Strike",
        tone: "skill",
      });
    }

    this.io.to(this.pin).emit("boss-damaged", {
      currentHp: this.boss.hp,
      maxHp: this.boss.maxHp,
      lastAttackerId: attackerId,
    });

    if (this.boss.hp <= 0) {
      this.handleBossDefeated();
    } else {
      this.statusUpdate();
    }
  }

  private executeSkillOnBoss(player: BattlePlayer, skillId: string, socket: Socket) {
    const baseSkill = buildGlobalSkillMap()[skillId];
    const rank = getSkillRank(player.skillTreeProgress ?? {}, skillId);
    const skill = baseSkill ? getEffectiveSkillAtRank(baseSkill, rank) : undefined;

    if (!skill) {
      socket.emit("error", { message: `Skill definition not found for ${skillId}.` });
      return;
    }

    // Check resource
    if (skill.costType === "AP") {
      if (player.ap < skill.cost) {
        socket.emit("error", { message: `Insufficient Stamina for ${skill.name} (requires ${skill.cost} Stamina).` });
        return;
      }
      player.ap -= skill.cost;
      player.stamina = player.ap;
    } else if (skill.costType === "MP") {
      if (player.mp < skill.cost) {
        socket.emit("error", { message: `Insufficient MP for ${skill.name} (requires ${skill.cost} MP).` });
        return;
      }
      player.mp -= skill.cost;
    }

    this.emitBattleEvent({
      type: "ACTION_SKILL_CAST",
      sourceId: player.id,
      targetId: this.boss?.id,
      skillId,
      label: skill.name,
      tone: "skill",
    });

    const isMagic = (skill as any).damageBase === "MAG";
    const mult = (skill as any).damageMultiplier ?? (1 + skill.cost / 20);
    const effectiveAtk = this.getEffectivePlayerAtk(player);
    const baseStat = isMagic ? player.mag : effectiveAtk;

    const dealDamage = (base: number) => {
      const effected = this.applyOutgoingDamageEffects(player, base, {
        usesMagic: isMagic,
        targetBoss: true,
      });
      const isCritForced = Boolean((skill as any).isCrit);
      this.applyDamageToBoss(effected.damage, player.id, effected.critApplied || isCritForced);
      this.applyDarkPactDrain(player);
    };

    const effect = skill.effect;

    if (effect === "DAMAGE") {
      dealDamage(Math.floor(baseStat * mult));

    } else if (effect === "SLOW") {
      dealDamage(Math.floor(baseStat * mult));
      this.applyStatusEffect(this.boss!, { type: "SLOW", turnsRemaining: 3, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: this.boss?.id, label: "Slow — boss พลาดโจมตี 35%", tone: "warning", fxPreset: "ice" });

    } else if (effect === "STUN") {
      dealDamage(Math.floor(baseStat * mult));
      if (Math.random() < 0.5) {
        this.applyStatusEffect(this.boss!, { type: "STUN", turnsRemaining: 1, sourceId: player.id });
        this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: this.boss?.id, label: "STUN! Boss ข้ามโจมตีถัดไป", tone: "warning", fxPreset: "thunder" });
      }

    } else if (effect === "MANA_SURGE") {
      dealDamage(Math.floor(baseStat * mult));
      player.mp = Math.min(player.maxMp, player.mp + 10);
      this.emitBattleEvent({ type: "RESOURCE_GAINED", sourceId: player.id, targetId: player.id, amount: 10, resourceType: "MP" });

    } else if (effect === "ARMOR_PIERCE") {
      dealDamage(Math.floor(baseStat * mult));
      this.applyStatusEffect(this.boss!, { type: "ARMOR_PIERCE", turnsRemaining: 3, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: this.boss?.id, label: "Armor Pierced — boss รับดาเมจ +20%", tone: "skill", fxPreset: "pierce" });

    } else if (effect === "POISON") {
      dealDamage(Math.floor(baseStat * mult));
      const poisonVal = Math.max(1, Math.floor(baseStat * 0.4));
      const poisonTurns = Math.random() < 0.5 ? 3 : 4;
      this.applyStatusEffect(this.boss!, { type: "POISON", turnsRemaining: poisonTurns, value: poisonVal, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: this.boss?.id, label: `Poison ${poisonVal}/tick × ${poisonTurns}`, tone: "warning", fxPreset: "poison" });

    } else if (effect === "DEBUFF_ATK") {
      dealDamage(Math.floor(baseStat * mult));
      this.applyStatusEffect(this.boss!, { type: "DEBUFF_ATK", turnsRemaining: 2, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: this.boss?.id, label: "Boss ATK -30% 2 turns", tone: "skill", fxPreset: "debuff" });

    } else if (effect === "CRIT_BUFF") {
      this.applyStatusEffect(player, { type: "CRIT_BUFF", turnsRemaining: 3, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: player.id, label: "Eagle Eye — CRIT +30% 3 turns", tone: "success", fxPreset: "buff" });

    } else if (effect === "REGEN") {
      const regenVal = Math.max(1, Math.floor(player.mag * 0.25));
      this.applyStatusEffect(player, { type: "REGEN", turnsRemaining: 4, value: regenVal, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: player.id, label: `Regen +${regenVal} HP/tick × 4`, tone: "success", fxPreset: "heal" });

    } else if (effect === "DEF_BREAK") {
      dealDamage(Math.floor(baseStat * mult));
      this.applyStatusEffect(this.boss!, { type: "DEF_BREAK", turnsRemaining: 3, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: this.boss?.id, label: "DEF BREAK — boss รับดาเมจ +50%", tone: "warning", fxPreset: "pierce" });

    } else if (effect === "EXECUTE") {
      const hpRatio = this.boss ? this.boss.hp / Math.max(1, this.boss.maxHp) : 1;
      const execMult = hpRatio < 0.30 ? mult * 1.8 : mult;
      if (hpRatio < 0.30) {
        this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: this.boss?.id, label: "EXECUTE! ×1.8 damage", tone: "danger", fxPreset: "execute" });
      }
      dealDamage(Math.floor(baseStat * execMult));

    } else if (effect === "BUFF_ATK") {
      this.applyStatusEffect(player, { type: "BUFF_ATK", turnsRemaining: 3, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: player.id, label: "War Cry — ATK ×1.4 3 turns", tone: "success", fxPreset: "buff" });

    } else if (effect === "BUFF_DEF") {
      this.applyStatusEffect(player, { type: "BUFF_DEF", turnsRemaining: 2, sourceId: player.id });
      player.isDefending = true;
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: player.id, label: "Shield Wall — DMG -50% 2 turns", tone: "success", fxPreset: "shield" });

    } else if (effect === "LIFESTEAL") {
      dealDamage(Math.floor(baseStat * mult));

    } else if (effect === "HEAL") {
      const healAmt = Math.floor(player.mag * (skill.healMultiplier ?? 1.5));
      player.hp = Math.min(player.maxHp, player.hp + healAmt);
      this.emitBattleEvent({ type: "HEAL_APPLIED", sourceId: player.id, targetId: player.id, amount: healAmt });

    } else {
      // Fallback: treat as DAMAGE if damageMultiplier present
      if (mult > 0) dealDamage(Math.floor(baseStat * mult));
    }

    this.statusUpdate();
  }

  // ── 7.6 Boss Defeat ──────────────────────────────────────────────────────────

  private handleBossDefeated() {
    if (this.bossTickInterval) {
      clearInterval(this.bossTickInterval);
      this.bossTickInterval = null;
    }

    // Queue boss rewards for RESULT phase (apply goldMultiplier/xpMultiplier per player)
    const rewards = this.players.map((p) => {
      const gold = Math.floor(200 * (1 + (p.goldMultiplier ?? 0)));
      const xp   = Math.floor(50  * (1 + (p.xpMultiplier  ?? 0)));
      p.earnedGold += gold;
      p.earnedXp   += xp;
      return { playerId: p.id, playerName: p.name, gold, xp };
    });

    this.io.to(this.pin).emit("boss-defeated", { rewards });
    this.startSoloFarmingPhase();
  }

  // ── 7.7 SOLO_FARMING Phase ───────────────────────────────────────────────────

  private startSoloFarmingPhase() {
    // Assign each player a solo monster at wave 1
    for (const player of this.players) {
      player.wave = 1;
      player.soloMonster = spawnSoloMonster(player.level, player.wave);
      player.ap = 0; // Reset stamina for farming phase
      player.stamina = player.ap;
      player.maxStamina = player.maxAp;

      this.io.to(player.id).emit("farming-state", {
        wave: player.wave,
        monster: player.soloMonster,
        ap: player.ap,
        stamina: player.ap,
        maxStamina: player.maxAp,
        mp: player.mp,
      });
    }

    this.transitionTo("SOLO_FARMING");

    // 7.11 Phase timer — default 5 minutes
    this.soloFarmingTimer = setTimeout(
      () => this.startResultPhase(),
      this.soloFarmingDurationMs
    );
  }

  // ── 7.8 Correct-Answer Handler in SOLO_FARMING ───────────────────────────────

  private handleCorrectAnswerInFarming(player: BattlePlayer) {
    if (!player.soloMonster) return;

    // Auto-deal effective ATK damage to soloMonster
    const effected = this.applyOutgoingDamageEffects(player, this.getEffectivePlayerAtk(player));
    const incomingMult = this.getIncomingDamageMultiplier(player.soloMonster.statusEffects);
    const damage = Math.floor(effected.damage * incomingMult);
    this.emitBattleEvent({ type: "ACTION_ATTACK", sourceId: player.id, targetId: "solo-monster", label: "โจมตีอัตโนมัติ" });
    this.emitBattleEvent({ type: "DAMAGE_APPLIED", sourceId: player.id, targetId: "solo-monster", amount: damage, correct: effected.critApplied });
    player.soloMonster.hp = Math.max(0, player.soloMonster.hp - damage);

    // ECHO_STRIKE: 30% chance second hit for 50% DMG
    if (player.soloMonster.hp > 0 && player.hasEchoStrike && Math.random() < 0.30) {
      const echoDmg = Math.max(1, Math.floor(damage * 0.5));
      player.soloMonster.hp = Math.max(0, player.soloMonster.hp - echoDmg);
      this.emitBattleEvent({ type: "DAMAGE_APPLIED", sourceId: player.id, targetId: "solo-monster", amount: echoDmg, label: "Echo Strike", tone: "skill" });
    }

    this.applyDarkPactDrain(player);

    // Tick status effects each answer (POISON DoT on monster, REGEN on player)
    this.tickFarmingStatusEffects(player);

    if (player.soloMonster.hp <= 0) {
      this.handleMonsterDefeated(player);
    } else {
      this.io.to(player.id).emit("farming-state", {
        wave: player.wave,
        monster: player.soloMonster,
        ap: player.ap,
        stamina: player.ap,
        maxStamina: player.maxAp,
        mp: player.mp,
      });
    }
  }

  // ── 7.9 Monster Defeat ───────────────────────────────────────────────────────

  private handleMonsterDefeated(player: BattlePlayer) {
    const wave = player.wave;
    const materials = rollMaterials(wave);
    // Apply GOLD_FINDER / GODS_BLESSING / QUICK_LEARNER multipliers
    const gold = Math.floor(rollGold(wave) * (1 + (player.goldMultiplier ?? 0)));
    const xp   = Math.floor(rollXp(wave)   * (1 + (player.xpMultiplier  ?? 0)));

    // SOUL_EATER: regen 15% maxHP on kill
    if (player.hasSoulEater) {
      const soulHeal = Math.max(1, Math.floor(player.maxHp * 0.15));
      player.hp = Math.min(player.maxHp, player.hp + soulHeal);
      this.emitBattleEvent({
        type: "HEAL_APPLIED",
        sourceId: player.id,
        targetId: player.id,
        amount: soulHeal,
        label: "Soul Eater",
      });
    }

    // Accumulate rewards
    player.earnedGold += gold;
    player.earnedXp += xp;
    for (const mat of materials) {
      const existing = player.materialDrops.find((m) => m.type === mat.type);
      if (existing) {
        existing.quantity += mat.quantity;
      } else {
        player.materialDrops.push({ ...mat });
      }
    }

    const loot: LootPayload = {
      gold,
      xp,
      itemIds: [],
      materials,
    };

    const nextWave = wave + 1;

    this.io.to(player.id).emit("monster-defeated", {
      loot,
      nextWave,
    });

    // Spawn next wave monster
    player.wave = nextWave;
    player.soloMonster = spawnSoloMonster(player.level, nextWave);

    this.io.to(player.id).emit("next-wave", {
      wave: nextWave,
      monster: player.soloMonster,
    });

    this.io.to(player.id).emit("farming-state", {
      wave: player.wave,
      monster: player.soloMonster,
      ap: player.ap,
      stamina: player.ap,
      maxStamina: player.maxAp,
      mp: player.mp,
    });
  }

  // ── farming-action Handler ───────────────────────────────────────────────────

  private handleFarmingAction(player: BattlePlayer, payload: any, socket: Socket) {
    if (this.battlePhase !== "SOLO_FARMING") {
      socket.emit("error", { message: "Farming actions only allowed during SOLO_FARMING phase." });
      return;
    }

    const { type, skillId } = payload;

    if (type === "SKILL") {
      if (!skillId) {
        socket.emit("error", { message: "Missing skillId for SKILL farming action." });
        return;
      }
      if (!player.skills.includes(skillId)) {
        socket.emit("error", { message: `Skill ${skillId} is not unlocked.` });
        return;
      }
      this.executeSkillOnMonster(player, skillId, socket);
    } else {
      socket.emit("error", { message: `Unknown farming action type: ${type}` });
    }
  }

  private executeSkillOnMonster(player: BattlePlayer, skillId: string, socket: Socket) {
    if (!player.soloMonster) return;

    const baseSkill = buildGlobalSkillMap()[skillId];
    const rank = getSkillRank(player.skillTreeProgress ?? {}, skillId);
    const skill = baseSkill ? getEffectiveSkillAtRank(baseSkill, rank) : undefined;

    if (!skill) {
      socket.emit("error", { message: `Skill definition not found for ${skillId}.` });
      return;
    }

    this.emitBattleEvent({
      type: "ACTION_SKILL_CAST",
      sourceId: player.id,
      targetId: "solo-monster",
      skillId,
      label: skill.name,
      tone: "skill",
    });

    if (skill.costType === "AP") {
      if (player.ap < skill.cost) {
        socket.emit("error", { message: `Insufficient Stamina for ${skill.name}.` });
        return;
      }
      player.ap -= skill.cost;
      player.stamina = player.ap;
    } else if (skill.costType === "MP") {
      if (player.mp < skill.cost) {
        socket.emit("error", { message: `Insufficient MP for ${skill.name}.` });
        return;
      }
      player.mp -= skill.cost;
    }

    const isMagic = (skill as any).damageBase === "MAG";
    const mult = (skill as any).damageMultiplier ?? (1 + skill.cost / 20);
    const effectiveAtk = this.getEffectivePlayerAtk(player);
    const baseStat = isMagic ? player.mag : effectiveAtk;
    const effect = skill.effect;

    const dealMonsterDamage = (base: number) => {
      const effected = this.applyOutgoingDamageEffects(player, base, { usesMagic: isMagic });
      const incomingMult = this.getIncomingDamageMultiplier(player.soloMonster!.statusEffects);
      const finalDmg = Math.floor(effected.damage * incomingMult);
      player.soloMonster!.hp = Math.max(0, player.soloMonster!.hp - finalDmg);
      this.emitBattleEvent({ type: "DAMAGE_APPLIED", sourceId: player.id, targetId: "solo-monster", amount: finalDmg, correct: effected.critApplied });
      this.applyDarkPactDrain(player);
    };

    if (effect === "DAMAGE" || effect === "LIFESTEAL") {
      dealMonsterDamage(Math.floor(baseStat * mult));

    } else if (effect === "SLOW") {
      dealMonsterDamage(Math.floor(baseStat * mult));
      this.applyStatusEffect(player.soloMonster, { type: "SLOW", turnsRemaining: 3, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: "solo-monster", label: "Slow", tone: "warning", fxPreset: "ice" });

    } else if (effect === "STUN") {
      dealMonsterDamage(Math.floor(baseStat * mult));
      if (Math.random() < 0.5) {
        this.applyStatusEffect(player.soloMonster, { type: "STUN", turnsRemaining: 1, sourceId: player.id });
        this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: "solo-monster", label: "STUN!", tone: "warning", fxPreset: "thunder" });
      }

    } else if (effect === "MANA_SURGE") {
      dealMonsterDamage(Math.floor(baseStat * mult));
      player.mp = Math.min(player.maxMp, player.mp + 10);
      this.emitBattleEvent({ type: "RESOURCE_GAINED", sourceId: player.id, targetId: player.id, amount: 10, resourceType: "MP" });

    } else if (effect === "ARMOR_PIERCE") {
      dealMonsterDamage(Math.floor(baseStat * mult));
      this.applyStatusEffect(player.soloMonster, { type: "ARMOR_PIERCE", turnsRemaining: 3, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: "solo-monster", label: "Armor Pierced +20%", tone: "skill", fxPreset: "pierce" });

    } else if (effect === "POISON") {
      dealMonsterDamage(Math.floor(baseStat * mult));
      const poisonVal = Math.max(1, Math.floor(baseStat * 0.4));
      const poisonTurns = Math.random() < 0.5 ? 3 : 4;
      this.applyStatusEffect(player.soloMonster, { type: "POISON", turnsRemaining: poisonTurns, value: poisonVal, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: "solo-monster", label: `Poison ${poisonVal}/tick`, tone: "warning", fxPreset: "poison" });

    } else if (effect === "DEBUFF_ATK") {
      dealMonsterDamage(Math.floor(baseStat * mult));
      this.applyStatusEffect(player.soloMonster, { type: "DEBUFF_ATK", turnsRemaining: 2, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: "solo-monster", label: "Monster ATK -30%", tone: "skill", fxPreset: "debuff" });

    } else if (effect === "CRIT_BUFF") {
      this.applyStatusEffect(player, { type: "CRIT_BUFF", turnsRemaining: 3, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: player.id, label: "CRIT +30% 3 turns", tone: "success", fxPreset: "buff" });

    } else if (effect === "REGEN") {
      const regenVal = Math.max(1, Math.floor(player.mag * 0.25));
      this.applyStatusEffect(player, { type: "REGEN", turnsRemaining: 4, value: regenVal, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: player.id, label: `Regen +${regenVal}/tick`, tone: "success", fxPreset: "heal" });

    } else if (effect === "DEF_BREAK") {
      dealMonsterDamage(Math.floor(baseStat * mult));
      this.applyStatusEffect(player.soloMonster, { type: "DEF_BREAK", turnsRemaining: 3, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: "solo-monster", label: "DEF BREAK +50%", tone: "warning", fxPreset: "pierce" });

    } else if (effect === "EXECUTE") {
      const hpRatio = player.soloMonster.hp / Math.max(1, player.soloMonster.maxHp);
      const execMult = hpRatio < 0.30 ? mult * 1.8 : mult;
      if (hpRatio < 0.30) {
        this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: "solo-monster", label: "EXECUTE! ×1.8", tone: "danger", fxPreset: "execute" });
      }
      dealMonsterDamage(Math.floor(baseStat * execMult));

    } else if (effect === "BUFF_ATK") {
      this.applyStatusEffect(player, { type: "BUFF_ATK", turnsRemaining: 3, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: player.id, label: "ATK ×1.4 3 turns", tone: "success", fxPreset: "buff" });

    } else if (effect === "BUFF_DEF") {
      this.applyStatusEffect(player, { type: "BUFF_DEF", turnsRemaining: 2, sourceId: player.id });
      this.emitBattleEvent({ type: "BANNER", sourceId: player.id, targetId: player.id, label: "DMG -50% 2 turns", tone: "success", fxPreset: "shield" });

    } else if (effect === "HEAL") {
      const healAmt = Math.floor(player.mag * (skill.healMultiplier ?? 1.5));
      player.hp = Math.min(player.maxHp, player.hp + healAmt);
      this.emitBattleEvent({ type: "HEAL_APPLIED", sourceId: player.id, targetId: player.id, amount: healAmt });

    } else {
      if (mult > 0) dealMonsterDamage(Math.floor(baseStat * mult));
    }

    // Tick status effects after each skill action (POISON DoT, REGEN HoT)
    this.tickFarmingStatusEffects(player);

    if (player.soloMonster && player.soloMonster.hp <= 0) {
      this.handleMonsterDefeated(player);
      return;
    }

    this.io.to(player.id).emit("farming-state", {
      wave: player.wave,
      monster: player.soloMonster,
      ap: player.ap,
      stamina: player.ap,
      maxStamina: player.maxAp,
      mp: player.mp,
    });
  }

  // ── 7.11 RESULT Phase ────────────────────────────────────────────────────────

  private async startResultPhase() {
    if (this.soloFarmingTimer) {
      clearTimeout(this.soloFarmingTimer);
      this.soloFarmingTimer = null;
    }
    if (this.bossTickInterval) {
      clearInterval(this.bossTickInterval);
      this.bossTickInterval = null;
    }

    this.transitionTo("RESULT");

    // Persist rewards and emit battle-ended (Requirement 15.5, 15.6)
    const finalRewards = await RewardManager.persistRewards(this.players);
    const hasError = finalRewards.some((r) => r.error === true);

    this.io.to(this.pin).emit("battle-ended", {
      players: finalRewards,
      ...(hasError ? { error: true } : {}),
    });

    super.endGame();
  }

  public endGame() {
    // battle-ended is emitted in startResultPhase via RewardManager.
    super.endGame();
  }

  // ── Event Router ─────────────────────────────────────────────────────────────

  public handleEvent(eventName: string, payload: any, socket: Socket) {
    if (!payload || typeof payload !== "object") {
      socket.emit("error", { message: `Invalid payload for event: ${eventName}` });
      return;
    }

    const player = this.players.find((p) => p.id === socket.id) as BattlePlayer | undefined;

    switch (eventName) {
      case "start-battle":
        if (this.isHostSocket(socket.id)) {
          this.startGame();
        }
        break;

      case "submit-answer":
        if (player) this.handleSubmitAnswer(player, payload, socket);
        break;

      case "battle-action":
        if (player) this.handleBattleAction(player, payload, socket);
        break;

      case "farming-action":
        if (player) this.handleFarmingAction(player, payload, socket);
        break;

      case "request-question":
        this.handleRequestQuestion(socket);
        break;

      default:
        break;
    }
  }

  // ── Answer Handler ───────────────────────────────────────────────────────────

  private handleSubmitAnswer(player: BattlePlayer, payload: any, socket: Socket) {
    const { questionId, answerIndex } = payload;
    if (questionId === undefined || answerIndex === undefined) {
      socket.emit("error", { message: "Missing questionId or answerIndex." });
      return;
    }

    const question = this.questions.find((q) => q.id === questionId);
    if (!question) return;

    const isCorrect = question.correctAnswer === answerIndex;

    if (isCorrect) {
      player.correctAnswers++;
      // Grant 20 stamina, capped at maxAp (legacy field name)
      player.ap = Math.min(player.maxAp, player.ap + 20);
      player.stamina = player.ap;
      player.maxStamina = player.maxAp;
      // 8.3 Mana Flow: increment mp by 5 on correct answer
      if (player.hasManaFlow) {
        player.mp = Math.min(player.maxMp, player.mp + 5);
        this.emitBattleEvent({
          type: "RESOURCE_GAINED",
          sourceId: player.id,
          targetId: player.id,
          amount: 5,
          resourceType: "MP",
        });
      }
      socket.emit("answer-result", { correct: true, apGain: 20, staminaGain: 20 });

      // In SOLO_FARMING, auto-deal damage
      if (this.battlePhase === "SOLO_FARMING") {
        this.handleCorrectAnswerInFarming(player);
      }
    } else {
      player.incorrectAnswers++;
      socket.emit("answer-result", { correct: false });
    }

    this.statusUpdate();
  }

  private handleRequestQuestion(socket: Socket) {
    if (!this.questions || this.questions.length === 0) return;
    const q = this.questions[Math.floor(Math.random() * this.questions.length)];
    socket.emit("next-question", {
      id: q.id,
      question: q.question,
      options: q.options,
      image: q.image,
    });
  }

  // ── Tick ─────────────────────────────────────────────────────────────────────

  public tick() {
    // Boss tick is handled by setInterval; no additional tick logic needed here
  }

  // ── Serialization ────────────────────────────────────────────────────────────

  public serialize(): any {
    return {
      ...super.serialize(),
      battlePhase: this.battlePhase,
      boss: this.boss,
    };
  }

  public restore(data: any): void {
    super.restore(data);
    this.battlePhase = data.battlePhase ?? "LOBBY";
    this.boss = data.boss ?? null;
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  public cleanup() {
    if (this.bossTickInterval) {
      clearInterval(this.bossTickInterval);
      this.bossTickInterval = null;
    }
    if (this.soloFarmingTimer) {
      clearTimeout(this.soloFarmingTimer);
      this.soloFarmingTimer = null;
    }
  }
}
