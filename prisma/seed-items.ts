import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Set IDs
const SET_DRAGON = 'DRAGON_SET';
const SET_THUNDER = 'THUNDER_SET';
const SET_SHADOW = 'SHADOW_SET';
const SET_LEGENDARY = 'LEGENDARY_SET';

// Dragon Set: WEAPON + BODY + HEAD + GLOVES
// Thunder Set: WEAPON + GLOVES + BOOTS + ACCESSORY
// Shadow Set: BODY + OFFHAND + BOOTS + ACCESSORY
// Legendary Set: all 7 slots
const CURRENCY_GOLD = 'GOLD';
const CURRENCY_POINTS = 'POINTS';

const items = [
  // ─────────────────────────────────────────────
  // WEAPONS (12 total)
  // ─────────────────────────────────────────────
  {
    name: 'Wooden Sword',
    description: 'A basic training weapon.',
    price: 100, type: 'WEAPON', slot: 'WEAPON', tier: 'COMMON',
    image: '🪵', baseAtk: 8, baseCrit: 0.02, bossDamageMultiplier: 0.03,
  },
  {
    name: 'Iron Blade',
    description: 'A reliable iron sword.',
    price: 400, type: 'WEAPON', slot: 'WEAPON', tier: 'COMMON',
    image: '🗡️', baseAtk: 18, baseCrit: 0.04, bossDamageMultiplier: 0.06,
  },
  {
    name: 'Steel Longsword',
    description: 'Forged from quality steel.',
    price: 900, type: 'WEAPON', slot: 'WEAPON', tier: 'COMMON',
    image: '⚔️', baseAtk: 30, baseCrit: 0.05, bossDamageMultiplier: 0.08,
  },
  {
    name: 'Silver Rapier',
    description: 'A swift silver blade.',
    price: 1800, type: 'WEAPON', slot: 'WEAPON', tier: 'RARE',
    image: '🤺', baseAtk: 48, baseCrit: 0.08, bossDamageMultiplier: 0.12,
    effects: ['GOLD_FINDER'],
  },
  {
    name: 'Enchanted Axe',
    description: 'Imbued with arcane energy.',
    price: 2500, type: 'WEAPON', slot: 'WEAPON', tier: 'RARE',
    image: '🪓', baseAtk: 60, baseCrit: 0.07, bossDamageMultiplier: 0.15,
    effects: ['QUICK_LEARNER'],
  },
  {
    name: 'Mithril Spear',
    description: 'Lightweight yet deadly.',
    price: 3500, type: 'WEAPON', slot: 'WEAPON', tier: 'RARE',
    image: '🔱', baseAtk: 72, baseCrit: 0.09, bossDamageMultiplier: 0.18,
    effects: ['TOUGH_SKIN'],
  },
  {
    name: 'Dragon Fang Sword',
    description: 'Carved from a dragon\'s fang.',
    price: 6000, type: 'WEAPON', slot: 'WEAPON', tier: 'EPIC',
    image: '🩸', baseAtk: 95, baseCrit: 0.12, bossDamageMultiplier: 0.25,
    setId: SET_DRAGON, effects: ['LIFESTEAL', 'LUCKY_STRIKE'],
  },
  {
    name: 'Thunder Blade',
    description: 'Crackles with lightning.',
    price: 6500, type: 'WEAPON', slot: 'WEAPON', tier: 'EPIC',
    image: '🌩️', baseAtk: 90, baseCrit: 0.14, bossDamageMultiplier: 0.22,
    setId: SET_THUNDER, effects: ['MANA_FLOW', 'LUCKY_STRIKE'],
  },
  {
    name: 'Void Reaper',
    description: 'A scythe from the void.',
    price: 7500, type: 'WEAPON', slot: 'WEAPON', tier: 'EPIC',
    image: '⛏️', baseAtk: 105, baseCrit: 0.15, bossDamageMultiplier: 0.28,
    effects: ['LIFESTEAL', 'MANA_FLOW'],
  },
  {
    name: 'Celestial Blade',
    description: 'Forged in the heavens.',
    price: 12000, type: 'WEAPON', slot: 'WEAPON', tier: 'LEGENDARY',
    image: '🌠', baseAtk: 140, baseCrit: 0.20, bossDamageMultiplier: 0.40,
    setId: SET_LEGENDARY, effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },
  {
    name: 'Excalibur',
    description: 'The legendary holy sword.',
    price: 15000, type: 'WEAPON', slot: 'WEAPON', tier: 'LEGENDARY',
    image: '⚜️', baseAtk: 160, baseCrit: 0.22, bossDamageMultiplier: 0.50,
    effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },
  {
    name: 'Abyssal Greatsword',
    description: 'Darkness made manifest.',
    price: 13000, type: 'WEAPON', slot: 'WEAPON', tier: 'LEGENDARY',
    image: '🦇', baseAtk: 150, baseCrit: 0.18, bossDamageMultiplier: 0.45,
    effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },

  // ─────────────────────────────────────────────
  // BODY (10 total)
  // ─────────────────────────────────────────────
  {
    name: 'Cloth Robe',
    description: 'Basic cloth protection.',
    price: 120, type: 'ARMOR', slot: 'BODY', tier: 'COMMON',
    image: '🥻', baseDef: 6, baseHp: 40, goldMultiplier: 0.02,
  },
  {
    name: 'Leather Vest',
    description: 'Tanned leather armor.',
    price: 450, type: 'ARMOR', slot: 'BODY', tier: 'COMMON',
    image: '🦺', baseDef: 14, baseHp: 80, goldMultiplier: 0.04,
  },
  {
    name: 'Chainmail',
    description: 'Interlocked metal rings.',
    price: 1000, type: 'ARMOR', slot: 'BODY', tier: 'COMMON',
    image: '⛓️', baseDef: 24, baseHp: 130, goldMultiplier: 0.06,
  },
  {
    name: 'Knight\'s Plate',
    description: 'Heavy plate for knights.',
    price: 2200, type: 'ARMOR', slot: 'BODY', tier: 'RARE',
    image: '🛡️', baseDef: 40, baseHp: 200, goldMultiplier: 0.10,
    effects: ['TOUGH_SKIN'],
  },
  {
    name: 'Mage\'s Vestment',
    description: 'Enchanted robes for mages.',
    price: 2800, type: 'ARMOR', slot: 'BODY', tier: 'RARE',
    image: '👘', baseDef: 28, baseHp: 160, goldMultiplier: 0.12,
    effects: ['QUICK_LEARNER'],
  },
  {
    name: 'Dragon Scale Armor',
    description: 'Scales from a mighty dragon.',
    price: 6500, type: 'ARMOR', slot: 'BODY', tier: 'EPIC',
    image: '🦎', baseDef: 65, baseHp: 350, goldMultiplier: 0.20,
    setId: SET_DRAGON, effects: ['LIFESTEAL', 'TOUGH_SKIN'],
  },
  {
    name: 'Shadow Shroud',
    description: 'Woven from shadow essence.',
    price: 7000, type: 'ARMOR', slot: 'BODY', tier: 'EPIC',
    image: '🧥', baseDef: 55, baseHp: 300, goldMultiplier: 0.25,
    setId: SET_SHADOW, effects: ['LUCKY_STRIKE', 'GOLD_FINDER'],
  },
  {
    name: 'Void Carapace',
    description: 'Armor from the void realm.',
    price: 7800, type: 'ARMOR', slot: 'BODY', tier: 'EPIC',
    image: '🪲', baseDef: 70, baseHp: 380, goldMultiplier: 0.22,
    effects: ['LIFESTEAL', 'MANA_FLOW'],
  },
  {
    name: 'Celestial Plate',
    description: 'Blessed by the heavens.',
    price: 14000, type: 'ARMOR', slot: 'BODY', tier: 'LEGENDARY',
    image: '👼', baseDef: 100, baseHp: 600, goldMultiplier: 0.40,
    setId: SET_LEGENDARY, effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },
  {
    name: 'Abyssal Robe',
    description: 'Darkness woven into fabric.',
    price: 13500, type: 'ARMOR', slot: 'BODY', tier: 'LEGENDARY',
    image: '🕴️', baseDef: 90, baseHp: 550, goldMultiplier: 0.38,
    effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },

  // ─────────────────────────────────────────────
  // HEAD (8 total)
  // ─────────────────────────────────────────────
  {
    name: 'Leather Cap',
    description: 'Simple leather headgear.',
    price: 150, type: 'HELMET', slot: 'HEAD', tier: 'COMMON',
    image: '🧢', baseDef: 5, baseHp: 30, baseMag: 0,
  },
  {
    name: 'Iron Helm',
    description: 'A sturdy iron helmet.',
    price: 500, type: 'HELMET', slot: 'HEAD', tier: 'COMMON',
    image: '🪖', baseDef: 12, baseHp: 60, baseMag: 0,
  },
  {
    name: 'Wizard Hat',
    description: 'Amplifies magical power.',
    price: 1200, type: 'HELMET', slot: 'HEAD', tier: 'RARE',
    image: '🎩', baseDef: 8, baseHp: 50, baseMag: 20,
    effects: ['QUICK_LEARNER'],
  },
  {
    name: 'Battle Helm',
    description: 'Forged for the front lines.',
    price: 2000, type: 'HELMET', slot: 'HEAD', tier: 'RARE',
    image: '🪨', baseDef: 22, baseHp: 120, baseMag: 5,
    effects: ['TOUGH_SKIN'],
  },
  {
    name: 'Dragon Crown',
    description: 'A crown of dragon bone.',
    price: 5500, type: 'HELMET', slot: 'HEAD', tier: 'EPIC',
    image: '👑', baseDef: 40, baseHp: 220, baseMag: 30,
    setId: SET_DRAGON, effects: ['LIFESTEAL', 'LUCKY_STRIKE'],
  },
  {
    name: 'Shadow Hood',
    description: 'Conceals the wearer in darkness.',
    price: 6000, type: 'HELMET', slot: 'HEAD', tier: 'EPIC',
    image: '🥷', baseDef: 32, baseHp: 180, baseMag: 40,
    effects: ['MANA_FLOW', 'LUCKY_STRIKE'],
  },
  {
    name: 'Celestial Tiara',
    description: 'Radiates divine light.',
    price: 12000, type: 'HELMET', slot: 'HEAD', tier: 'LEGENDARY',
    image: '🧝‍♀️', baseDef: 60, baseHp: 350, baseMag: 70,
    setId: SET_LEGENDARY, effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },
  {
    name: 'Void Mask',
    description: 'A mask from the void.',
    price: 11000, type: 'HELMET', slot: 'HEAD', tier: 'LEGENDARY',
    image: '👽', baseDef: 55, baseHp: 320, baseMag: 65,
    effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },

  // ─────────────────────────────────────────────
  // OFFHAND (8 total)
  // ─────────────────────────────────────────────
  {
    name: 'Wooden Shield',
    description: 'A basic wooden shield.',
    price: 130, type: 'OFFHAND', slot: 'OFFHAND', tier: 'COMMON',
    image: '🚪', baseDef: 8, baseMag: 0, baseMp: 10,
  },
  {
    name: 'Iron Buckler',
    description: 'A small iron shield.',
    price: 480, type: 'OFFHAND', slot: 'OFFHAND', tier: 'COMMON',
    image: '🛡️', baseDef: 18, baseMag: 0, baseMp: 20,
  },
  {
    name: 'Spell Tome',
    description: 'Boosts magical abilities.',
    price: 1500, type: 'OFFHAND', slot: 'OFFHAND', tier: 'RARE',
    image: '📘', baseDef: 10, baseMag: 25, baseMp: 40,
    effects: ['QUICK_LEARNER'],
  },
  {
    name: 'Mana Crystal',
    description: 'A crystal brimming with mana.',
    price: 2200, type: 'OFFHAND', slot: 'OFFHAND', tier: 'RARE',
    image: '💎', baseDef: 8, baseMag: 30, baseMp: 60,
    effects: ['GOLD_FINDER'],
  },
  {
    name: 'Shadow Orb',
    description: 'Pulses with shadow energy.',
    price: 5800, type: 'OFFHAND', slot: 'OFFHAND', tier: 'EPIC',
    image: '🔮', baseDef: 25, baseMag: 55, baseMp: 90,
    setId: SET_SHADOW, effects: ['MANA_FLOW', 'LUCKY_STRIKE'],
  },
  {
    name: 'Arcane Focus',
    description: 'Focuses arcane energies.',
    price: 6200, type: 'OFFHAND', slot: 'OFFHAND', tier: 'EPIC',
    image: '🧿', baseDef: 20, baseMag: 65, baseMp: 100,
    effects: ['LIFESTEAL', 'MANA_FLOW'],
  },
  {
    name: 'Celestial Grimoire',
    description: 'Contains divine knowledge.',
    price: 12500, type: 'OFFHAND', slot: 'OFFHAND', tier: 'LEGENDARY',
    image: '📒', baseDef: 40, baseMag: 100, baseMp: 160,
    setId: SET_LEGENDARY, effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },
  {
    name: 'Void Scepter',
    description: 'Channels void energy.',
    price: 11500, type: 'OFFHAND', slot: 'OFFHAND', tier: 'LEGENDARY',
    image: '🦯', baseDef: 35, baseMag: 90, baseMp: 150,
    effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },

  // ─────────────────────────────────────────────
  // GLOVES (8 total)
  // ─────────────────────────────────────────────
  {
    name: 'Cloth Gloves',
    description: 'Simple cloth hand wraps.',
    price: 100, type: 'GLOVES', slot: 'GLOVES', tier: 'COMMON',
    image: '🧤', baseAtk: 4, baseSpd: 2, baseCrit: 0.01,
  },
  {
    name: 'Leather Gauntlets',
    description: 'Sturdy leather gloves.',
    price: 420, type: 'GLOVES', slot: 'GLOVES', tier: 'COMMON',
    image: '🥊', baseAtk: 10, baseSpd: 5, baseCrit: 0.02,
  },
  {
    name: 'Swift Gloves',
    description: 'Increases attack speed.',
    price: 1600, type: 'GLOVES', slot: 'GLOVES', tier: 'RARE',
    image: '🪶', baseAtk: 18, baseSpd: 12, baseCrit: 0.04,
    effects: ['GOLD_FINDER'],
  },
  {
    name: 'Berserker Fists',
    description: 'Raw power in your hands.',
    price: 2400, type: 'GLOVES', slot: 'GLOVES', tier: 'RARE',
    image: '👊', baseAtk: 28, baseSpd: 8, baseCrit: 0.06,
    effects: ['TOUGH_SKIN'],
  },
  {
    name: 'Dragon Claws',
    description: 'Claws of a fearsome dragon.',
    price: 6000, type: 'GLOVES', slot: 'GLOVES', tier: 'EPIC',
    image: '🐾', baseAtk: 45, baseSpd: 18, baseCrit: 0.10,
    setId: SET_DRAGON, effects: ['LIFESTEAL', 'LUCKY_STRIKE'],
  },
  {
    name: 'Thunder Gauntlets',
    description: 'Crackling with electricity.',
    price: 6400, type: 'GLOVES', slot: 'GLOVES', tier: 'EPIC',
    image: '⚡', baseAtk: 40, baseSpd: 22, baseCrit: 0.12,
    setId: SET_THUNDER, effects: ['MANA_FLOW', 'LUCKY_STRIKE'],
  },
  {
    name: 'Celestial Gauntlets',
    description: 'Blessed by divine power.',
    price: 12000, type: 'GLOVES', slot: 'GLOVES', tier: 'LEGENDARY',
    image: '👐', baseAtk: 70, baseSpd: 35, baseCrit: 0.18,
    setId: SET_LEGENDARY, effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },
  {
    name: 'Void Grips',
    description: 'Grips from the void.',
    price: 11000, type: 'GLOVES', slot: 'GLOVES', tier: 'LEGENDARY',
    image: '🦾', baseAtk: 65, baseSpd: 30, baseCrit: 0.16,
    effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },

  // ─────────────────────────────────────────────
  // BOOTS (8 total)
  // ─────────────────────────────────────────────
  {
    name: 'Sandals',
    description: 'Basic footwear.',
    price: 90, type: 'BOOTS', slot: 'BOOTS', tier: 'COMMON',
    image: '🩴', baseSpd: 3, baseCrit: 0.01, baseLuck: 0.01,
  },
  {
    name: 'Leather Boots',
    description: 'Comfortable leather boots.',
    price: 380, type: 'BOOTS', slot: 'BOOTS', tier: 'COMMON',
    image: '🥾', baseSpd: 7, baseCrit: 0.02, baseLuck: 0.02,
  },
  {
    name: 'Swift Boots',
    description: 'Enchanted for speed.',
    price: 1400, type: 'BOOTS', slot: 'BOOTS', tier: 'RARE',
    image: '🪽', baseSpd: 15, baseCrit: 0.04, baseLuck: 0.04,
    effects: ['QUICK_LEARNER'],
  },
  {
    name: 'Lucky Treads',
    description: 'Fortune follows your steps.',
    price: 2100, type: 'BOOTS', slot: 'BOOTS', tier: 'RARE',
    image: '🩰', baseSpd: 12, baseCrit: 0.05, baseLuck: 0.08,
    effects: ['GOLD_FINDER'],
  },
  {
    name: 'Thunder Treads',
    description: 'Leave lightning in your wake.',
    price: 5800, type: 'BOOTS', slot: 'BOOTS', tier: 'EPIC',
    image: '⛸️', baseSpd: 25, baseCrit: 0.09, baseLuck: 0.10,
    setId: SET_THUNDER, effects: ['MANA_FLOW', 'LUCKY_STRIKE'],
  },
  {
    name: 'Shadow Walkers',
    description: 'Silent as the night.',
    price: 6200, type: 'BOOTS', slot: 'BOOTS', tier: 'EPIC',
    image: '👞', baseSpd: 28, baseCrit: 0.08, baseLuck: 0.12,
    setId: SET_SHADOW, effects: ['LIFESTEAL', 'LUCKY_STRIKE'],
  },
  {
    name: 'Celestial Boots',
    description: 'Walk among the stars.',
    price: 12000, type: 'BOOTS', slot: 'BOOTS', tier: 'LEGENDARY',
    image: '🛼', baseSpd: 45, baseCrit: 0.15, baseLuck: 0.20,
    setId: SET_LEGENDARY, effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },
  {
    name: 'Void Striders',
    description: 'Step through the void.',
    price: 11000, type: 'BOOTS', slot: 'BOOTS', tier: 'LEGENDARY',
    image: '🪐', baseSpd: 40, baseCrit: 0.13, baseLuck: 0.18,
    effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },

  // ─────────────────────────────────────────────
  // ACCESSORY (6 total)
  // ─────────────────────────────────────────────
  {
    name: 'Lucky Charm',
    description: 'A simple good luck charm.',
    price: 300, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'COMMON',
    image: '🐞', goldMultiplier: 0.05, baseLuck: 0.03, xpMultiplier: 0.02,
  },
  {
    name: 'Gold Ring',
    description: 'Increases gold earnings.',
    price: 1800, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'RARE',
    image: '🪙', goldMultiplier: 0.15, baseLuck: 0.05, xpMultiplier: 0.05,
    effects: ['GOLD_FINDER'],
  },
  {
    name: 'Scholar\'s Pendant',
    description: 'Boosts experience gained.',
    price: 2500, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'RARE',
    image: '📜', goldMultiplier: 0.10, baseLuck: 0.06, xpMultiplier: 0.10,
    effects: ['QUICK_LEARNER'],
  },
  {
    name: 'Thunder Amulet',
    description: 'Hums with electric energy.',
    price: 6000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'EPIC',
    image: '🔌', goldMultiplier: 0.20, baseLuck: 0.10, xpMultiplier: 0.12,
    setId: SET_THUNDER, effects: ['MANA_FLOW', 'LUCKY_STRIKE'],
  },
  {
    name: 'Shadow Talisman',
    description: 'Shrouded in dark energy.',
    price: 6500, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'EPIC',
    image: '🕸️', goldMultiplier: 0.25, baseLuck: 0.12, xpMultiplier: 0.10,
    setId: SET_SHADOW, effects: ['LIFESTEAL', 'LUCKY_STRIKE'],
  },
  {
    name: 'Celestial Orb',
    description: 'A relic of divine origin.',
    price: 14000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'LEGENDARY',
    image: '✨', goldMultiplier: 0.40, baseLuck: 0.25, xpMultiplier: 0.25,
    setId: SET_LEGENDARY, effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },
  {
    name: 'Tears of Goddess',
    description: 'สร้อยคอน้ำตาเทพธิดา ปัดเป่าความชั่วร้าย',
    price: 16000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'LEGENDARY',
    image: '💧', goldMultiplier: 0.50, baseLuck: 0.30, xpMultiplier: 0.30, baseHp: 1000,
    setId: SET_LEGENDARY, effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },
  {
    name: 'Ring of Sovereign',
    description: 'แหวนแห่งราชาผู้ยิ่งใหญ่ มอบอำนาจเด็ดขาด',
    price: 15500, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'LEGENDARY',
    image: '💍', goldMultiplier: 0.45, baseLuck: 0.25, xpMultiplier: 0.20, baseAtk: 100, baseMag: 150,
    effects: ['IMMORTAL', 'GODS_BLESSING', 'TIME_WARP'],
  },

  // ─────────────────────────────────────────────
  // CONSUMABLES (13 total)
  // ─────────────────────────────────────────────
  {
    name: 'Stamina Potion',
    description: 'ฟื้นฟู Stamina 1 หน่วยทันที',
    price: 5, type: 'CONSUMABLE', tier: 'COMMON',
    image: '🧪', currency: CURRENCY_POINTS, staminaRestore: 1,
  },
  {
    name: 'Mana Potion (S)',
    description: 'โพชั่นมานาขนาดเล็ก ฟื้นฟู Mana +20 ทันที',
    price: 80, type: 'CONSUMABLE', tier: 'COMMON',
    image: '🔵', currency: 'GOLD', manaRestore: 20,
  },
  {
    name: 'Mana Potion (M)',
    description: 'โพชั่นมานาขนาดกลาง ฟื้นฟู Mana +60 ทันที',
    price: 250, type: 'CONSUMABLE', tier: 'RARE',
    image: '💙', currency: 'GOLD', manaRestore: 60,
  },
  {
    name: 'Mana Potion (L)',
    description: 'โพชั่นมานาขนาดใหญ่ ฟื้นฟู Mana +150 ทันที',
    price: 600, type: 'CONSUMABLE', tier: 'EPIC',
    image: '🫧', currency: 'GOLD', manaRestore: 150,
  },
  {
    name: 'HP Potion (S)',
    description: 'โพชั่นขนาดเล็ก เพิ่ม HP สูงสุด +30% ใน Battle ถัดไป',
    price: 100, type: 'CONSUMABLE', tier: 'COMMON',
    image: '🔴', currency: 'GOLD', hpRestorePercent: 0.30,
  },
  {
    name: 'HP Potion (M)',
    description: 'โพชั่นขนาดกลาง เพิ่ม HP สูงสุด +60% ใน Battle ถัดไป',
    price: 300, type: 'CONSUMABLE', tier: 'RARE',
    image: '❤️‍🔥', currency: 'GOLD', hpRestorePercent: 0.60,
  },
  {
    name: 'HP Potion (L)',
    description: 'โพชั่นขนาดใหญ่ เพิ่ม HP สูงสุด +100% ใน Battle ถัดไป (HP เต็ม 2 เท่า!)',
    price: 800, type: 'CONSUMABLE', tier: 'EPIC',
    image: '💖', currency: 'GOLD', hpRestorePercent: 1.00,
  },
  {
    name: 'Phoenix Feather',
    description: 'ขนนกฟีนิกส์ ฟื้นคืนชีพพร้อม HP 50% เมื่อตายใน Battle ถัดไป (ใช้ได้ครั้งเดียว)',
    price: 2000, type: 'CONSUMABLE', tier: 'LEGENDARY',
    image: '🪶', currency: 'GOLD', isPhoenix: true,
  },

  // ─── Battle Stat Buffs (lasts for next battle) ───
  {
    name: 'Attack Elixir',
    description: 'ยาแดงสุดพลัง เพิ่ม ATK +50% ใน Battle ถัดไป',
    price: 500, type: 'CONSUMABLE', tier: 'RARE',
    image: '⚗️', currency: 'GOLD', buffAtk: 0.5,
  },
  {
    name: 'Iron Guard Brew',
    description: 'ยาเกราะเหล็ก เพิ่ม DEF +80% ใน Battle ถัดไป',
    price: 500, type: 'CONSUMABLE', tier: 'RARE',
    image: '🛡️', currency: 'GOLD', buffDef: 0.8,
  },
  {
    name: 'Haste Brew',
    description: 'ยาแห่งความเร็ว เพิ่ม SPD +100% ใน Battle ถัดไป (ออกเทิร์นก่อน!)',
    price: 500, type: 'CONSUMABLE', tier: 'RARE',
    image: '⚡', currency: 'GOLD', buffSpd: 1.0,
  },
  {
    name: 'Battle Elixir',
    description: 'ยาต่อสู้ขั้นสูง เพิ่ม ATK+DEF+SPD +30% ใน Battle ถัดไป',
    price: 1200, type: 'CONSUMABLE', tier: 'EPIC',
    image: '🌟', currency: 'GOLD', buffAtk: 0.3, buffDef: 0.3, buffSpd: 0.3,
  },

  // ─── Crafting Utility ───
  {
    name: 'Transmute Stone',
    description: 'หินแปรธาตุ แปลงวัตถุดิบ COMMON 5 ชิ้น (ชนิดที่มีมากสุด) → วัตถุดิบ RARE 1 ชิ้น (สุ่ม)',
    price: 800, type: 'CONSUMABLE', tier: 'RARE',
    image: '🪨', currency: 'GOLD', isTransmute: true,
  },

  // ─── Level Up ───
  {
    name: 'Ancient Tome of Ascension',
    description: '📖 คัมภีร์โบราณแห่งการเลื่อนขั้น — ใช้แล้วได้รับ +1 Lv ทันที (XP รีเซ็ต) ✨',
    price: 5000, type: 'CONSUMABLE', tier: 'LEGENDARY',
    image: '📖', currency: 'GOLD', isLevelUp: true,
  },

  // ─── Boss Utility ───
  {
    name: 'Holy Water',
    description: 'น้ำศักดิ์สิทธิ์จากเทพ เพิ่ม ATK+DEF+SPD +100% ใน Battle ถัดไป (สำหรับ hardcore)',
    price: 3000, type: 'CONSUMABLE', tier: 'LEGENDARY',
    image: '💧', currency: 'GOLD', buffAtk: 1.0, buffDef: 1.0, buffSpd: 1.0,
  },

  // ─── Economy Time Boosts ───
  {
    name: 'Lucky Scroll',
    description: 'เพิ่ม Gold รับ ×2 เป็นเวลา 10 นาที (นับจากเวลาที่ใช้)',
    price: 400, type: 'CONSUMABLE', tier: 'RARE',
    image: '📜', currency: 'GOLD', buffGoldMinutes: 10,
  },
  {
    name: 'Tome of Knowledge',
    description: 'เพิ่ม XP รับ ×2 เป็นเวลา 10 นาที (นับจากเวลาที่ใช้)',
    price: 400, type: 'CONSUMABLE', tier: 'RARE',
    image: '📚', currency: 'GOLD', buffXpMinutes: 10,
  },
];

async function main() {
  console.log('--- 🛡️ Seeding Item Catalog (74 items) ---');

  // Wipe existing items (and student items referencing them to avoid dangling refs)
  console.log('Cleaning up existing items...');
  await prisma.studentItem.deleteMany({});
  await prisma.item.deleteMany({});

  // Verify distribution before inserting
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (item.slot) {
      counts[item.slot] = (counts[item.slot] ?? 0) + 1;
    }
  }
  console.log('Item distribution:', counts);

  const expected: Record<string, number> = {
    WEAPON: 12, BODY: 10, HEAD: 8, OFFHAND: 8, GLOVES: 8, BOOTS: 8, ACCESSORY: 8,
  };
  for (const [slot, count] of Object.entries(expected)) {
    if (counts[slot] !== count) {
      throw new Error(`Distribution mismatch for ${slot}: expected ${count}, got ${counts[slot] ?? 0}`);
    }
  }
  console.log('✅ Distribution verified: 12 WEAPON, 10 BODY, 8 HEAD, 8 OFFHAND, 8 GLOVES, 8 BOOTS, 8 ACCESSORY');

  console.log(`Inserting ${items.length} items...`);
  for (const item of items) {
    const { slot, tier, setId, effects, xpMultiplier, currency, staminaRestore, manaRestore, ...rest } = item as any;
    const created = await prisma.item.create({
      data: {
        ...rest,
        slot,
        tier,
        ...(setId ? { setId } : {}),
        ...(effects ? { effects } : {}),
        ...(xpMultiplier !== undefined ? { xpMultiplier } : {}),
        ...(currency ? { currency } : { currency: 'GOLD' }),
        ...(staminaRestore !== undefined ? { staminaRestore } : {}),
        ...(manaRestore !== undefined ? { manaRestore } : {}),
      },
    });
    console.log(`  ✅ ${created.tier.padEnd(9)} ${created.slot?.padEnd(9)} ${created.name}`);
  }

  console.log(`\n--- ✅ Seeding complete! ${items.length} items created ---`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
