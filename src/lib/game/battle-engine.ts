// PvP Battle Engine
// Determines the outcome of a battle between two students

interface StudentBattleStats {
  points: number;   // Behavior points
  gold: number;     // Gold owned
  items: { goldMultiplier: number | null; bossDamageMultiplier: number | null; enhancementLevel: number }[];
  jobClass?: string | null;
}

// ─── PvP Matchup Multipliers ──────────────────────────────────────────────────

export const PVP_MATCHUP_MULTIPLIERS: Record<string, Record<string, number>> = {
  WARRIOR: { HEALER: 1.2 },
  MAGE:    { WARRIOR: 1.2 },
  ROGUE:   { MAGE: 1.2 },
  RANGER:  { HEALER: 1.2 },
  HEALER:  { ROGUE: 1.2 },
};

/**
 * Returns 1.2 if attacker has a matchup advantage over defender, else 1.0.
 */
export function getPvpMatchupMultiplier(
  attackerClass: string | null | undefined,
  defenderClass: string | null | undefined
): number {
  if (!attackerClass || !defenderClass) return 1.0;
  return PVP_MATCHUP_MULTIPLIERS[attackerClass]?.[defenderClass] ?? 1.0;
}

// ─── Calculate Battle Power ───────────────────────────────────────────────────

// Calculate a student's battle power (1-100 base multiplier)
export function calcBattlePower(stats: StudentBattleStats): number {
  let power = 50; // Base

  // Behavior points: each 100 points = +1 power (capped at +20)
  power += Math.min(20, Math.floor(stats.points / 100));

  // Gold: each 1000 gold = +1 power (capped at +15)
  power += Math.min(15, Math.floor(stats.gold / 1000));

  // Equipped items bonus
  for (const item of stats.items) {
    // Both multipliers contribute to "Combat Power"
    const goldBonus = item.goldMultiplier || 0;
    const bossBonus = item.bossDamageMultiplier || 0;

    if (goldBonus > 0 || bossBonus > 0) {
      const enhanceMult = 1 + item.enhancementLevel * 0.1;
      // Convert multiplier (e.g. 0.5) to a power score
      power += Math.floor((goldBonus + bossBonus) * 10 * enhanceMult);
    }
  }

  return Math.max(1, Math.min(100, power));
}

// ─── Resolve Battle ───────────────────────────────────────────────────────────

// Resolve a battle — returns { challengerRoll, defenderRoll, winnerId }
export function resolveBattle(
  challengerId: string,
  challengerStats: StudentBattleStats,
  defenderId: string,
  defenderStats: StudentBattleStats,
  challengerJobClass?: string | null,
  defenderJobClass?: string | null
): { challengerRoll: number; defenderRoll: number; winnerId: string } {
  let cPower = calcBattlePower(challengerStats);
  let dPower = calcBattlePower(defenderStats);

  // Apply PvP matchup multiplier to the attacker's power
  const cMatchup = getPvpMatchupMultiplier(challengerJobClass, defenderJobClass);
  const dMatchup = getPvpMatchupMultiplier(defenderJobClass, challengerJobClass);
  cPower = Math.min(100, Math.floor(cPower * cMatchup));
  dPower = Math.min(100, Math.floor(dPower * dMatchup));

  // Roll: power (base) + random luck (0-500)
  // 70% stats influence, 30% pure luck to keep it exciting
  const cRoll = Math.floor(cPower * 7 + Math.random() * 500);
  const dRoll = Math.floor(dPower * 7 + Math.random() * 500);

  const winnerId = cRoll >= dRoll ? challengerId : defenderId;
  return { challengerRoll: cRoll, defenderRoll: dRoll, winnerId };
}

// ─── PvP Battle State ─────────────────────────────────────────────────────────

export interface PvpBattleState {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  mag: number;
  crit: number;
  jobClass: string | null;
  skills: string[];
  shieldWallTurnsRemaining: number;  // for Shield Wall
  lastSkillUsed: string | null;       // for Backstab+Execution combo tracking
  mpDrained: boolean;                 // for HEALER win condition
}

// ─── PvP Skill Effects ────────────────────────────────────────────────────────

/**
 * Apply a PvP skill from attacker to defender.
 * Returns { damage, effect }.
 */
export function applyPvpSkill(
  attacker: PvpBattleState,
  defender: PvpBattleState,
  skillId: string
): { damage: number; effect: string } {
  switch (skillId) {
    case "warrior_shield_wall": {
      attacker.shieldWallTurnsRemaining = 2;
      return { damage: 0, effect: "SHIELD_WALL" };
    }
    case "mage_meteor": {
      const damage = attacker.mag * 3.0;
      return { damage, effect: "METEOR" };
    }
    case "rogue_backstab": {
      attacker.lastSkillUsed = "rogue_backstab";
      const damage = attacker.atk * 2.0;
      return { damage, effect: "BACKSTAB" };
    }
    case "rogue_execution": {
      // Combo: Backstab → Execution on target below 30% HP = 4.5× ATK (3× base × 1.5 combo bonus)
      const isCombo =
        attacker.lastSkillUsed === "rogue_backstab" &&
        defender.hp / defender.maxHp < 0.3;
      const damage = isCombo
        ? attacker.atk * 3.0 * 1.5
        : attacker.atk * 3.0;
      return { damage, effect: "EXECUTION" };
    }
    default:
      return { damage: 0, effect: "UNKNOWN" };
  }
}

/**
 * Apply damage to a defender, accounting for Shield Wall.
 * Returns actual damage taken.
 */
export function applyPvpDamage(defender: PvpBattleState, damage: number): number {
  let actualDamage = damage;
  if (defender.shieldWallTurnsRemaining > 0) {
    actualDamage = Math.floor(damage * 0.5);
    defender.shieldWallTurnsRemaining -= 1;
  }
  defender.hp = Math.max(0, defender.hp - actualDamage);
  return actualDamage;
}

// ─── RANGER CRIT ──────────────────────────────────────────────────────────────

/**
 * Returns true if a crit occurs based on critChance (0.0–1.0).
 */
export function rollCrit(critChance: number): boolean {
  return Math.random() < critChance;
}

/**
 * If attacker is RANGER and crits, returns baseDamage + 150% bonus (total 250%).
 * Otherwise returns baseDamage unchanged.
 */
export function applyRangerCritBonus(
  attacker: PvpBattleState,
  baseDamage: number
): number {
  if (attacker.jobClass === "RANGER" && rollCrit(attacker.crit)) {
    return baseDamage + Math.floor(baseDamage * 1.5);
  }
  return baseDamage;
}

// ─── HEALER MP Drain ──────────────────────────────────────────────────────────

/**
 * Reduces target's MP by amount, clamps to 0.
 * Sets mpDrained = true if MP reaches 0.
 */
export function applyMpDrain(target: PvpBattleState, amount: number): void {
  target.mp = Math.max(0, target.mp - amount);
  if (target.mp === 0) {
    target.mpDrained = true;
  }
}

/**
 * Returns false if the player's MP has been fully drained, else true.
 */
export function canUseSkill(player: PvpBattleState): boolean {
  return !player.mpDrained;
}
