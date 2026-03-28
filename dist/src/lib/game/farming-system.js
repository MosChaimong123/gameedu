"use strict";
/**
 * Solo Farming System - Core Logic
 * Handles monster spawning, scaling, and rewards.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONSTER_TEMPLATES = void 0;
exports.scaleMonsterHp = scaleMonsterHp;
exports.scaleMonsterAtk = scaleMonsterAtk;
exports.spawnSoloMonster = spawnSoloMonster;
exports.rollFarmingLoot = rollFarmingLoot;
const crafting_system_1 = require("./crafting-system");
exports.MONSTER_TEMPLATES = [
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
function scaleMonsterHp(baseHp, wave) {
    return Math.floor(baseHp * (1 + wave * 0.15));
}
/**
 * Scales monster ATK: baseAtk × (1 + wave × 0.10)
 */
function scaleMonsterAtk(baseAtk, wave) {
    return Math.floor(baseAtk * (1 + wave * 0.10));
}
/**
 * Spawns a monster based on player level and current wave.
 */
function spawnSoloMonster(level, wave) {
    // Pick template based on level bracket (every 10 levels moves to next monster)
    const safeLevel = Number.isFinite(level) ? Math.max(1, level) : 1;
    const templateIdx = Math.min(Math.floor((safeLevel - 1) / 10), exports.MONSTER_TEMPLATES.length - 1);
    const template = exports.MONSTER_TEMPLATES[templateIdx];
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
function rollFarmingLoot(wave) {
    const gold = 20 + wave * 10 + Math.floor(Math.random() * (20 + wave * 5));
    const xp = 10 + wave * 5;
    // Materials roll — pools derived from MATERIAL_TYPES to stay in sync with crafting-system
    const COMMON_POOL = crafting_system_1.MATERIAL_TYPES.filter(t => crafting_system_1.MATERIAL_TIER_MAP[t] === "COMMON");
    const RARE_POOL = crafting_system_1.MATERIAL_TYPES.filter(t => crafting_system_1.MATERIAL_TIER_MAP[t] === "RARE");
    const EPIC_POOL = crafting_system_1.MATERIAL_TYPES.filter(t => crafting_system_1.MATERIAL_TIER_MAP[t] === "EPIC");
    // Wave-gated pool: waves 1-5 = Common only, 6-9 = Common+Rare, 10+ = all tiers
    const activePool = wave >= 10 ? [...COMMON_POOL, ...RARE_POOL, ...EPIC_POOL] :
        wave >= 6 ? [...COMMON_POOL, ...RARE_POOL] :
            [...COMMON_POOL];
    const materials = [];
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
