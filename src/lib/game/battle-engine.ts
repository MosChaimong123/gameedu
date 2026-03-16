// PvP Battle Engine
// Determines the outcome of a battle between two students

interface StudentBattleStats {
  points: number;   // Behavior points
  gold: number;     // Gold owned
  items: { goldMultiplier: number | null; bossDamageMultiplier: number | null; enhancementLevel: number }[];
}

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

// Resolve a battle — returns { challengerRoll, defenderRoll, winnerId }
export function resolveBattle(
  challengerId: string,
  challengerStats: StudentBattleStats,
  defenderId: string,
  defenderStats: StudentBattleStats
): { challengerRoll: number; defenderRoll: number; winnerId: string } {
  const cPower = calcBattlePower(challengerStats);
  const dPower = calcBattlePower(defenderStats);

  // Roll: power (base) + random luck (0-500)
  // 70% stats influence, 30% pure luck to keep it exciting
  const cRoll = Math.floor(cPower * 7 + Math.random() * 500);
  const dRoll = Math.floor(dPower * 7 + Math.random() * 500);

  const winnerId = cRoll >= dRoll ? challengerId : defenderId;
  return { challengerRoll: cRoll, defenderRoll: dRoll, winnerId };
}
