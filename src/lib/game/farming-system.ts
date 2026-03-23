/**
 * Solo Farming System - Core Logic
 * Handles monster spawning, scaling, and rewards.
 */

import { MATERIAL_TYPES, MATERIAL_TIER_MAP } from "./crafting-system";

export interface SoloMonster {
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  wave: number;
  image: string;
}

export const MONSTER_TEMPLATES = [
  { name: "Slime", baseHp: 120, baseAtk: 15, image: "/assets/monsters/slime.png" },
  { name: "Goblin", baseHp: 180, baseAtk: 22, image: "/assets/monsters/goblin.png" },
  { name: "Forest Wolf", baseHp: 250, baseAtk: 30, image: "/assets/monsters/forest_wolf.png" },
  { name: "Orc Warrior", baseHp: 350, baseAtk: 40, image: "/assets/monsters/orc_warrior.png" },
  { name: "Cave Troll", baseHp: 500, baseAtk: 55, image: "/assets/monsters/cave_troll.png" },
  { name: "Dark Knight", baseHp: 700, baseAtk: 70, image: "/assets/monsters/dark_knight.png" },
];

/**
 * Scales monster HP: baseHp × (1 + wave × 0.15)
 */
export function scaleMonsterHp(baseHp: number, wave: number): number {
  return Math.floor(baseHp * (1 + wave * 0.15));
}

/**
 * Scales monster ATK: baseAtk × (1 + wave × 0.10)
 */
export function scaleMonsterAtk(baseAtk: number, wave: number): number {
  return Math.floor(baseAtk * (1 + wave * 0.10));
}

/**
 * Spawns a monster based on player level and current wave.
 */
export function spawnSoloMonster(level: number, wave: number): SoloMonster {
  // Pick template based on level bracket (every 10 levels moves to next monster)
  const safeLevel = Number.isFinite(level) ? Math.max(1, level) : 1;
  const templateIdx = Math.min(
    Math.floor((safeLevel - 1) / 10),
    MONSTER_TEMPLATES.length - 1
  );
  const template = MONSTER_TEMPLATES[templateIdx];
  const hp = scaleMonsterHp(template.baseHp, wave);
  const atk = scaleMonsterAtk(template.baseAtk, wave);
  
  return { 
    name: template.name, 
    hp, 
    maxHp: hp, 
    atk, 
    wave,
    image: template.image
  };
}

/**
 * Calculates loot rewards for defeating a monster.
 */
export function rollFarmingLoot(wave: number) {
  const gold = 20 + wave * 10 + Math.floor(Math.random() * (20 + wave * 5));
  const xp = 10 + wave * 5;
  
  // Materials roll — pools derived from MATERIAL_TYPES to stay in sync with crafting-system
  const COMMON_POOL = MATERIAL_TYPES.filter(t => MATERIAL_TIER_MAP[t] === "COMMON");
  const RARE_POOL   = MATERIAL_TYPES.filter(t => MATERIAL_TIER_MAP[t] === "RARE");
  const EPIC_POOL   = MATERIAL_TYPES.filter(t => MATERIAL_TIER_MAP[t] === "EPIC");

  // Wave-gated pool: waves 1-5 = Common only, 6-9 = Common+Rare, 10+ = all tiers
  const activePool =
    wave >= 10 ? [...COMMON_POOL, ...RARE_POOL, ...EPIC_POOL] :
    wave >= 6  ? [...COMMON_POOL, ...RARE_POOL] :
                 [...COMMON_POOL];

  const materials: { type: string; quantity: number }[] = [];

  // 40% chance to get 1-2 materials
  if (Math.random() < 0.4) {
    const count = Math.random() < 0.3 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const type = activePool[Math.floor(Math.random() * activePool.length)];
      materials.push({ type, quantity: 1 });
    }
  }
  
  return { gold, xp, materials };
}
