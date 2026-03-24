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
} from "../types/game";
import { StatCalculator } from "../game/stat-calculator";
import {
  buildGlobalSkillMap,
  getMergedClassDef,
  resolveEffectiveJobKey,
} from "../game/job-system";
import { RewardManager } from "../game/reward-manager";
import { db } from "../db";

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

function spawnSoloMonster(level: number, wave: number): SoloMonster {
  // Pick template based on level bracket
  const templateIdx = Math.min(
    Math.floor((level - 1) / 10),
    SOLO_MONSTER_TEMPLATES.length - 1
  );
  const template = SOLO_MONSTER_TEMPLATES[templateIdx];
  const hp = scaleMonsterHp(template.baseHp, wave);
  const atk = scaleMonsterAtk(template.baseAtk, wave);
  return { name: template.name, hp, maxHp: hp, atk, wave };
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
      earnedGold: 0,
      earnedXp: 0,
      itemDrops: [],
      materialDrops: [],
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

      const gameStats = (student.gameStats as any) ?? {};
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
          data: { gameStats: cleanedStats },
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

      // 8.1–8.4: Populate special effect flags from equipped items
      player.hasLifesteal = stats.hasLifesteal;
      // Phoenix Feather overrides item Immortal (both work the same way)
      player.hasImmortal  = stats.hasImmortal || hasPhoenixBuff;
      player.hasManaFlow  = stats.hasManaFlow;
      player.hasTimeWarp  = stats.hasTimeWarp;

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

    for (const player of this.players) {
      if (!player.isConnected) continue;
      if (player.isDefending) continue;
      if (player.hp <= 0) continue;

      const damage = Math.max(1, this.boss.atk - player.def);
      player.hp = Math.max(0, player.hp - damage);

      // 8.2 Immortal: if HP would reach 0 and immortal hasn't been used, set to 1
      if (player.hp <= 0 && player.hasImmortal && !player.immortalUsed) {
        player.hp = 1;
        player.immortalUsed = true;
      }

      // Emit player-damaged to that player's socket
      this.io.to(player.id).emit("player-damaged", {
        playerId: player.id,
        damage,
        remainingHp: player.hp,
      });

      // Handle player death
      if (player.hp <= 0) {
        if (!player.immortalUsed) {
          // Immortal effect handled in task 8 — for now just mark defeated
        }
      }
    }

    // Reset all isDefending flags
    for (const player of this.players) {
      player.isDefending = false;
    }

    // Emit boss-damaged to room (tick summary)
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
      player.ap -= 10;
      player.stamina = player.ap;
      const damage = player.atk; // base damage coefficient 1.0
      this.applyDamageToBoss(damage, player.id);

    } else if (type === "DEFEND") {
      player.isDefending = true;
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

  private applyDamageToBoss(damage: number, attackerId: string) {
    if (!this.boss) return;
    this.boss.hp = Math.max(0, this.boss.hp - damage);

    // 8.1 Lifesteal: heal attacker by 10% of damage dealt
    const attacker = this.players.find((p) => p.id === attackerId);
    if (attacker && attacker.hasLifesteal) {
      const healAmount = Math.max(1, Math.floor(damage * 0.1));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
      this.io.to(attacker.id).emit("battle-event", {
        type: "HEAL",
        sourceId: attackerId,
        targetId: attackerId,
        value: healAmount,
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
    const skill = buildGlobalSkillMap()[skillId];

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

    // Execute skill effect against boss
    let damage = 0;
    if (skill.effect === "DAMAGE") {
      const baseStat = (skill as any).damageBase === "MAG" ? player.mag : player.atk;
      const multiplier = (skill as any).damageMultiplier ?? (1 + skill.cost / 20);
      const critMult = (skill as any).isCrit ? 2.0 : 1.0;
      damage = Math.floor(baseStat * multiplier * critMult);
      this.applyDamageToBoss(damage, player.id);
    } else if (skill.effect === "BUFF_DEF") {
      player.isDefending = true;
    } else if (skill.effect === "BUFF_ATK") {
      const buffMult = (skill as any).damageMultiplier ?? 0.5;
      damage = Math.floor(player.atk * buffMult);
      this.applyDamageToBoss(damage, player.id);
    } else if (skill.effect === "HEAL") {
      const healAmount = Math.floor(player.mag * 1.5);
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
    }

    this.statusUpdate();
  }

  // ── 7.6 Boss Defeat ──────────────────────────────────────────────────────────

  private handleBossDefeated() {
    if (this.bossTickInterval) {
      clearInterval(this.bossTickInterval);
      this.bossTickInterval = null;
    }

    const rewards = this.players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      gold: 200,
      xp: 50,
    }));

    // Queue boss rewards for RESULT phase
    for (const player of this.players) {
      player.earnedGold += 200;
      player.earnedXp += 50;
    }

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

    // Auto-deal player.atk damage to soloMonster
    const damage = player.atk;
    player.soloMonster.hp = Math.max(0, player.soloMonster.hp - damage);

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
    const gold = rollGold(wave);
    const xp = rollXp(wave);

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

    const skill = buildGlobalSkillMap()[skillId];

    if (!skill) {
      socket.emit("error", { message: `Skill definition not found for ${skillId}.` });
      return;
    }

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

    if (skill.effect === "DAMAGE") {
      const baseStat = (skill as any).damageBase === "MAG" ? player.mag : player.atk;
      const multiplier = (skill as any).damageMultiplier ?? (1 + skill.cost / 20);
      const critMult = (skill as any).isCrit ? 2.0 : 1.0;
      const damage = Math.floor(baseStat * multiplier * critMult);
      player.soloMonster.hp = Math.max(0, player.soloMonster.hp - damage);

      if (player.soloMonster.hp <= 0) {
        this.handleMonsterDefeated(player);
        return;
      }
    } else if (skill.effect === "HEAL") {
      const healAmount = Math.floor(player.mag * 1.5);
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
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
        if (socket.id === this.hostId) {
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
