import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Set IDs ────────────────────────────────────────────────────────────────
const SET_TITAN    = 'TITAN_SET';    // Warrior/Tank (WEAPON+BODY+HEAD+OFFHAND+GLOVES EPIC)
const SET_ARCANE   = 'ARCANE_SET';   // Mage/Healer  (WEAPON+BODY+HEAD+OFFHAND+GLOVES EPIC)
const SET_HUNT     = 'HUNT_SET';     // Ranger       (WEAPON+BODY+HEAD+OFFHAND+GLOVES EPIC)
const SET_SHADOW   = 'SHADOW_SET';   // Rogue        (WEAPON+BODY+HEAD+BOOTS+ACCESSORY EPIC)
const SET_DIVINE   = 'LEGENDARY_SET';// All-class endgame (7 LEGENDARY pieces)

const GOLD   = 'GOLD';
const POINTS = 'POINTS';

// ─── Effects shorthand ──────────────────────────────────────────────────────
const E = {
  GOLD_FINDER:   'GOLD_FINDER',
  QUICK_LEARNER: 'QUICK_LEARNER',
  TOUGH_SKIN:    'TOUGH_SKIN',
  LIFESTEAL:     'LIFESTEAL',
  MANA_FLOW:     'MANA_FLOW',
  LUCKY_STRIKE:  'LUCKY_STRIKE',
  IMMORTAL:      'IMMORTAL',
  GODS_BLESSING: 'GODS_BLESSING',
  TIME_WARP:     'TIME_WARP',
  TITAN_WILL:    'TITAN_WILL',
  HOLY_FURY:     'HOLY_FURY',
  ARCANE_SURGE:  'ARCANE_SURGE',
  DARK_PACT:     'DARK_PACT',
  HAWK_EYE:      'HAWK_EYE',
  HUNTER_MARK:   'HUNTER_MARK',
  SHADOW_VEIL:   'SHADOW_VEIL',
  BLADE_DANCE:   'BLADE_DANCE',
};

const items = [

  // ══════════════════════════════════════════════════════════════════════════
  // WEAPONS (16 total: 4 archetypes × 4 tiers)
  // Archetypes: Sword=Warrior, Staff=Caster, Bow=Ranger, Dagger=Rogue
  // ══════════════════════════════════════════════════════════════════════════

  // ── COMMON Weapons ──────────────────────────────────────────────────────
  {
    name: 'Iron Sword', description: 'ดาบเหล็กธรรมดา เหมาะสำหรับนักรบ',
    price: 200, type: 'WEAPON', slot: 'WEAPON', tier: 'COMMON', image: '⚔️',
    baseAtk: 25, baseHp: 80,
  },
  {
    name: 'Wooden Staff', description: 'ไม้เท้าไม้ธรรมดา สำหรับผู้ใช้เวทมนตร์',
    price: 200, type: 'WEAPON', slot: 'WEAPON', tier: 'COMMON', image: '🪄',
    baseMag: 20, baseMp: 30,
  },
  {
    name: 'Short Bow', description: 'ธนูสั้น เบาและคล่องตัว สำหรับนักธนู',
    price: 200, type: 'WEAPON', slot: 'WEAPON', tier: 'COMMON', image: '🏹',
    baseAtk: 20, baseCrit: 0.03, baseSpd: 5,
  },
  {
    name: 'Iron Dagger', description: 'มีดสั้นเหล็ก รวดเร็วและแม่นยำ สำหรับนักสังหาร',
    price: 200, type: 'WEAPON', slot: 'WEAPON', tier: 'COMMON', image: '🗡️',
    baseAtk: 18, baseCrit: 0.04, baseSpd: 7, baseLuck: 0.02,
  },

  // ── RARE Weapons ────────────────────────────────────────────────────────
  {
    name: 'War Hammer', description: 'ค้อนสงคราม ทรงพลังมหาศาล',
    price: 2000, type: 'WEAPON', slot: 'WEAPON', tier: 'RARE', image: '🔨',
    baseAtk: 55, baseHp: 200, baseDef: 10, effects: [E.TOUGH_SKIN],
  },
  {
    name: 'Crystal Staff', description: 'ไม้เท้าคริสตัล เสริมพลังเวทย์',
    price: 2000, type: 'WEAPON', slot: 'WEAPON', tier: 'RARE', image: '💎',
    baseMag: 50, baseMp: 80, baseCrit: 0.03, effects: [E.QUICK_LEARNER],
  },
  {
    name: 'Elven Bow', description: 'ธนูเอลฟ์ แม่นยำและเบาพิเศษ',
    price: 2000, type: 'WEAPON', slot: 'WEAPON', tier: 'RARE', image: '🌿',
    baseAtk: 45, baseCrit: 0.08, baseSpd: 14, baseLuck: 0.03, effects: [E.GOLD_FINDER],
  },
  {
    name: 'Viper Blade', description: 'ใบมีดพิษงู เร็วและอันตราย',
    price: 2000, type: 'WEAPON', slot: 'WEAPON', tier: 'RARE', image: '🐍',
    baseAtk: 38, baseCrit: 0.10, baseSpd: 16, baseLuck: 0.05, effects: [E.LUCKY_STRIKE],
  },

  // ── EPIC Weapons (Set pieces) ────────────────────────────────────────────
  {
    name: "Titan's Greatsword", description: 'ดาบยักษ์ไทแทน พลังทำลายล้างสูงสุด — ชุด TITAN',
    price: 7000, type: 'WEAPON', slot: 'WEAPON', tier: 'EPIC', image: '🩸',
    baseAtk: 105, baseHp: 400, baseDef: 25, baseCrit: 0.06,
    setId: SET_TITAN, effects: [E.LIFESTEAL],
  },
  {
    name: 'Arcane Staff', description: 'ไม้เท้าลึกลับ เพิ่มพลังเวทย์ขั้นสูง — ชุด ARCANE',
    price: 7000, type: 'WEAPON', slot: 'WEAPON', tier: 'EPIC', image: '🔮',
    baseMag: 110, baseMp: 180, baseCrit: 0.09, baseSpd: 10,
    setId: SET_ARCANE, effects: [E.MANA_FLOW],
  },
  {
    name: 'Eagle Bow', description: 'ธนูนกอินทรี แม่นยำสูง — ชุด HUNT',
    price: 7000, type: 'WEAPON', slot: 'WEAPON', tier: 'EPIC', image: '🦅',
    baseAtk: 90, baseCrit: 0.14, baseSpd: 26, baseLuck: 0.07,
    setId: SET_HUNT, effects: [E.LUCKY_STRIKE],
  },
  {
    name: "Assassin's Fang", description: 'เขี้ยวนักสังหาร คมและรวดเร็วร้ายกาจ — ชุด SHADOW',
    price: 7000, type: 'WEAPON', slot: 'WEAPON', tier: 'EPIC', image: '🦷',
    baseAtk: 78, baseCrit: 0.18, baseSpd: 28, baseLuck: 0.10,
    setId: SET_SHADOW, effects: [E.LIFESTEAL],
  },

  // ── LEGENDARY Weapons ────────────────────────────────────────────────────
  {
    name: "Warlord's Cleaver", description: 'ขวานแห่งจอมทัพ ฉีกทุกอย่างได้',
    price: 14000, type: 'WEAPON', slot: 'WEAPON', tier: 'LEGENDARY', image: '⚒️',
    baseAtk: 180, baseHp: 700, baseDef: 50, baseCrit: 0.10,
    effects: [E.IMMORTAL, E.TITAN_WILL],
  },
  {
    name: 'Staff of Eternity', description: 'ไม้เท้าแห่งนิรันดร์ เวทย์มนต์ไม่มีที่สิ้นสุด',
    price: 14000, type: 'WEAPON', slot: 'WEAPON', tier: 'LEGENDARY', image: '✨',
    baseMag: 210, baseMp: 360, baseCrit: 0.17, baseSpd: 18,
    effects: [E.MANA_FLOW, E.ARCANE_SURGE],
  },
  {
    name: 'Godslayer Bow', description: 'ธนูสังหารเทพ ไม่มีสิ่งใดรอดพ้น',
    price: 14000, type: 'WEAPON', slot: 'WEAPON', tier: 'LEGENDARY', image: '🔱',
    baseAtk: 160, baseCrit: 0.24, baseSpd: 42, baseLuck: 0.14,
    effects: [E.LUCKY_STRIKE, E.HAWK_EYE],
  },
  {
    name: "Death's Edge", description: 'คมแห่งความตาย ทุกเงาเป็นอาวุธ',
    price: 14000, type: 'WEAPON', slot: 'WEAPON', tier: 'LEGENDARY', image: '💀',
    baseAtk: 140, baseCrit: 0.28, baseSpd: 48, baseLuck: 0.22,
    effects: [E.LIFESTEAL, E.SHADOW_VEIL],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BODY ARMOR (12 total: 3 weight classes × 4 tiers)
  // Heavy=Warrior, Light/Robe=Caster, Medium=Ranger+Rogue
  // ══════════════════════════════════════════════════════════════════════════

  // ── COMMON Body ──────────────────────────────────────────────────────────
  {
    name: 'Iron Plate', description: 'เกราะเหล็กหนา ปกป้องได้ดี',
    price: 150, type: 'BODY', slot: 'BODY', tier: 'COMMON', image: '🛡️',
    baseDef: 22, baseHp: 150, goldMultiplier: 0.02,
  },
  {
    name: 'Cloth Robe', description: 'เสื้อผ้าธรรมดา เสริมพลังเวทย์',
    price: 150, type: 'BODY', slot: 'BODY', tier: 'COMMON', image: '👘',
    baseDef: 7, baseHp: 80, baseMag: 18, baseMp: 25,
  },
  {
    name: 'Leather Vest', description: 'เสื้อหนัง เบาและคล่องตัว',
    price: 150, type: 'BODY', slot: 'BODY', tier: 'COMMON', image: '🧥',
    baseDef: 14, baseHp: 100, baseSpd: 5, baseCrit: 0.01,
  },

  // ── RARE Body ────────────────────────────────────────────────────────────
  {
    name: 'Steel Plate', description: 'เกราะเหล็กกล้า แข็งแกร่งยิ่งขึ้น',
    price: 2500, type: 'BODY', slot: 'BODY', tier: 'RARE', image: '⚙️',
    baseDef: 50, baseHp: 320, baseAtk: 10, goldMultiplier: 0.06,
    effects: [E.TOUGH_SKIN],
  },
  {
    name: 'Mage Vestment', description: 'เครื่องแต่งกายนักเวทย์ เสริมพลังสูงสุด',
    price: 2500, type: 'BODY', slot: 'BODY', tier: 'RARE', image: '🌟',
    baseDef: 18, baseHp: 180, baseMag: 45, baseMp: 75, baseCrit: 0.02,
    effects: [E.QUICK_LEARNER],
  },
  {
    name: 'Scout Armor', description: 'ชุดลาดตระเวน รวดเร็วและทนทาน',
    price: 2500, type: 'BODY', slot: 'BODY', tier: 'RARE', image: '🎽',
    baseDef: 32, baseHp: 220, baseSpd: 13, baseCrit: 0.04, baseLuck: 0.02,
    effects: [E.GOLD_FINDER],
  },

  // ── EPIC Body (Set pieces) ────────────────────────────────────────────────
  {
    name: 'Dragon Plate', description: 'เกราะมังกร ทนทานสุดขีด — ชุด TITAN',
    price: 7500, type: 'BODY', slot: 'BODY', tier: 'EPIC', image: '🐉',
    baseDef: 95, baseHp: 650, baseAtk: 22, goldMultiplier: 0.12,
    setId: SET_TITAN, effects: [E.LIFESTEAL, E.TOUGH_SKIN],
  },
  {
    name: 'Arcane Robe', description: 'เสื้อคลุมอาร์เคน พลังเวทย์ล้นเหลือ — ชุด ARCANE',
    price: 7500, type: 'BODY', slot: 'BODY', tier: 'EPIC', image: '🪬',
    baseDef: 35, baseHp: 380, baseMag: 95, baseMp: 160, baseCrit: 0.06,
    setId: SET_ARCANE, effects: [E.MANA_FLOW, E.LUCKY_STRIKE],
  },
  {
    name: 'Shadow Shroud', description: 'ชุดเงามืด ผสานกับความมืด — ชุด HUNT',
    price: 7500, type: 'BODY', slot: 'BODY', tier: 'EPIC', image: '🌑',
    baseDef: 60, baseHp: 450, baseSpd: 24, baseCrit: 0.09, baseLuck: 0.06,
    setId: SET_HUNT, effects: [E.LUCKY_STRIKE, E.GOLD_FINDER],
  },

  // ── LEGENDARY Body ────────────────────────────────────────────────────────
  {
    name: "Titan's Fortress", description: 'ป้อมไทแทน ป้องกันทุกสิ่ง',
    price: 16000, type: 'BODY', slot: 'BODY', tier: 'LEGENDARY', image: '🏰',
    baseDef: 160, baseHp: 1100, baseAtk: 40, goldMultiplier: 0.22,
    effects: [E.IMMORTAL, E.TITAN_WILL],
  },
  {
    name: 'Cosmic Shroud', description: 'เสื้อคลุมจักรวาล เวทย์มนต์แห่งดวงดาว',
    price: 16000, type: 'BODY', slot: 'BODY', tier: 'LEGENDARY', image: '🌌',
    baseDef: 60, baseHp: 650, baseMag: 185, baseMp: 320, baseCrit: 0.12,
    effects: [E.MANA_FLOW, E.ARCANE_SURGE],
  },
  {
    name: 'Phantom Cloak', description: 'เสื้อคลุมผี เคลื่อนไหวไม่มีเงา',
    price: 16000, type: 'BODY', slot: 'BODY', tier: 'LEGENDARY', image: '👻',
    baseDef: 105, baseHp: 750, baseSpd: 40, baseCrit: 0.16, baseLuck: 0.14,
    effects: [E.LIFESTEAL, E.SHADOW_VEIL],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HEAD ARMOR (12 total: 3 styles × 4 tiers)
  // Heavy Helm=Warrior, Medium Hood=Ranger/Rogue, Light Headgear=Caster
  // ══════════════════════════════════════════════════════════════════════════

  // ── COMMON Head ──────────────────────────────────────────────────────────
  {
    name: 'Iron Helm', description: 'หมวกเหล็กธรรมดา',
    price: 120, type: 'HEAD', slot: 'HEAD', tier: 'COMMON', image: '⛑️',
    baseDef: 16, baseHp: 90,
  },
  {
    name: 'Cloth Hood', description: 'ผ้าคลุมหัวธรรมดา',
    price: 120, type: 'HEAD', slot: 'HEAD', tier: 'COMMON', image: '🎓',
    baseDef: 5, baseHp: 50, baseMag: 14, baseMp: 18,
  },
  {
    name: 'Leather Cap', description: 'หมวกหนังเบา',
    price: 120, type: 'HEAD', slot: 'HEAD', tier: 'COMMON', image: '🧢',
    baseDef: 9, baseHp: 60, baseSpd: 4, baseCrit: 0.01,
  },

  // ── RARE Head ────────────────────────────────────────────────────────────
  {
    name: 'War Helm', description: 'หมวกนักรบ แข็งแกร่ง',
    price: 1800, type: 'HEAD', slot: 'HEAD', tier: 'RARE', image: '🪖',
    baseDef: 36, baseHp: 200, baseAtk: 12, effects: [E.TOUGH_SKIN],
  },
  {
    name: 'Wizard Hat', description: 'หมวกพ่อมด เพิ่มพลังเวทย์',
    price: 1800, type: 'HEAD', slot: 'HEAD', tier: 'RARE', image: '🎩',
    baseDef: 13, baseHp: 120, baseMag: 36, baseMp: 58, baseCrit: 0.02,
    effects: [E.QUICK_LEARNER],
  },
  {
    name: "Hunter's Hat", description: 'หมวกนักล่า แม่นยำสูง',
    price: 1800, type: 'HEAD', slot: 'HEAD', tier: 'RARE', image: '🕵️',
    baseDef: 22, baseHp: 150, baseSpd: 10, baseCrit: 0.04, effects: [E.GOLD_FINDER],
  },

  // ── EPIC Head (Set pieces) ────────────────────────────────────────────────
  {
    name: 'Berserker Helm', description: 'หมวกคลั่ง ปลุกความโกรธ — ชุด TITAN',
    price: 6500, type: 'HEAD', slot: 'HEAD', tier: 'EPIC', image: '😤',
    baseDef: 68, baseHp: 400, baseAtk: 28,
    setId: SET_TITAN, effects: [E.TOUGH_SKIN],
  },
  {
    name: 'Arcane Crown', description: 'มงกุฎอาร์เคน สัญลักษณ์แห่งพลังเวทย์ — ชุด ARCANE',
    price: 6500, type: 'HEAD', slot: 'HEAD', tier: 'EPIC', image: '👑',
    baseDef: 26, baseHp: 260, baseMag: 76, baseMp: 120, baseCrit: 0.07,
    setId: SET_ARCANE, effects: [E.MANA_FLOW],
  },
  {
    name: 'Shadow Hood', description: 'ฮู้ดเงามืด ซ่อนตัวในเงา — ชุด HUNT',
    price: 6500, type: 'HEAD', slot: 'HEAD', tier: 'EPIC', image: '🦹',
    baseDef: 42, baseHp: 300, baseSpd: 20, baseCrit: 0.09,
    setId: SET_HUNT, effects: [E.LUCKY_STRIKE],
  },

  // ── LEGENDARY Head ────────────────────────────────────────────────────────
  {
    name: "Warlord's Crown", description: 'มงกุฎจอมทัพ สัญลักษณ์แห่งอำนาจ',
    price: 13000, type: 'HEAD', slot: 'HEAD', tier: 'LEGENDARY', image: '🫅',
    baseDef: 115, baseHp: 680, baseAtk: 50,
    effects: [E.IMMORTAL, E.HOLY_FURY],
  },
  {
    name: 'Celestial Tiara', description: 'ไทอาร่าสวรรค์ เชื่อมต่อกับพลังจักรวาล',
    price: 13000, type: 'HEAD', slot: 'HEAD', tier: 'LEGENDARY', image: '💫',
    baseDef: 48, baseHp: 450, baseMag: 155, baseMp: 240, baseCrit: 0.14,
    effects: [E.MANA_FLOW, E.GODS_BLESSING],
  },
  {
    name: 'Phantom Mask', description: 'หน้ากากผี มองไม่เห็น จับไม่ได้',
    price: 13000, type: 'HEAD', slot: 'HEAD', tier: 'LEGENDARY', image: '🎭',
    baseDef: 75, baseHp: 520, baseSpd: 36, baseCrit: 0.17,
    effects: [E.SHADOW_VEIL, E.BLADE_DANCE],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // OFFHAND (12 total: 3 types × 4 tiers)
  // Shield=Warrior, Tome=Caster, Quiver=Ranger/Rogue
  // ══════════════════════════════════════════════════════════════════════════

  // ── COMMON Offhand ───────────────────────────────────────────────────────
  {
    name: 'Wooden Shield', description: 'โล่ไม้ธรรมดา',
    price: 130, type: 'OFFHAND', slot: 'OFFHAND', tier: 'COMMON', image: '🪵',
    baseDef: 18, baseHp: 70,
  },
  {
    name: 'Spell Tome', description: 'หนังสือเวทมนต์พื้นฐาน',
    price: 130, type: 'OFFHAND', slot: 'OFFHAND', tier: 'COMMON', image: '📖',
    baseMag: 12, baseMp: 25, baseDef: 5,
  },
  {
    name: 'Arrow Quiver', description: 'ถุงลูกธนูธรรมดา',
    price: 130, type: 'OFFHAND', slot: 'OFFHAND', tier: 'COMMON', image: '🪃',
    baseAtk: 8, baseCrit: 0.02, baseSpd: 3,
  },

  // ── RARE Offhand ─────────────────────────────────────────────────────────
  {
    name: 'Iron Shield', description: 'โล่เหล็กกล้า ป้องกันสูง',
    price: 1600, type: 'OFFHAND', slot: 'OFFHAND', tier: 'RARE', image: '🔰',
    baseDef: 40, baseHp: 180, baseAtk: 8, effects: [E.TOUGH_SKIN],
  },
  {
    name: 'Crystal Tome', description: 'หนังสือคริสตัล เพิ่มพลังเวทย์',
    price: 1600, type: 'OFFHAND', slot: 'OFFHAND', tier: 'RARE', image: '💠',
    baseMag: 32, baseMp: 68, baseCrit: 0.03, baseDef: 10, effects: [E.QUICK_LEARNER],
  },
  {
    name: 'Precise Quiver', description: 'ถุงลูกธนูพิเศษ เพิ่มความแม่นยำ',
    price: 1600, type: 'OFFHAND', slot: 'OFFHAND', tier: 'RARE', image: '🔍',
    baseAtk: 22, baseCrit: 0.07, baseSpd: 8, baseLuck: 0.02, effects: [E.GOLD_FINDER],
  },

  // ── EPIC Offhand (Set pieces) ────────────────────────────────────────────
  {
    name: 'Dragon Shield', description: 'โล่มังกร แทบไม่มีอะไรทะลุผ่าน — ชุด TITAN',
    price: 6000, type: 'OFFHAND', slot: 'OFFHAND', tier: 'EPIC', image: '🐲',
    baseDef: 78, baseHp: 380, baseAtk: 18,
    setId: SET_TITAN, effects: [E.TOUGH_SKIN],
  },
  {
    name: 'Arcane Focus', description: 'คริสตัลโฟกัสอาร์เคน เพิ่มพลังสะกด — ชุด ARCANE',
    price: 6000, type: 'OFFHAND', slot: 'OFFHAND', tier: 'EPIC', image: '🔷',
    baseMag: 70, baseMp: 140, baseCrit: 0.09, baseDef: 20,
    setId: SET_ARCANE, effects: [E.MANA_FLOW],
  },
  {
    name: 'Eagle Quiver', description: 'ถุงลูกธนูนกอินทรี ยิงเร็ว — ชุด HUNT',
    price: 6000, type: 'OFFHAND', slot: 'OFFHAND', tier: 'EPIC', image: '🪺',
    baseAtk: 45, baseCrit: 0.13, baseSpd: 16, baseLuck: 0.06,
    setId: SET_HUNT, effects: [E.LUCKY_STRIKE],
  },

  // ── LEGENDARY Offhand ────────────────────────────────────────────────────
  {
    name: 'Aegis of Light', description: 'โล่แห่งแสงสวรรค์ ป้องกันทั้งร่างกายและวิญญาณ',
    price: 12000, type: 'OFFHAND', slot: 'OFFHAND', tier: 'LEGENDARY', image: '☀️',
    baseDef: 130, baseHp: 650, baseAtk: 35,
    effects: [E.IMMORTAL, E.HOLY_FURY],
  },
  {
    name: 'Grimoire of Eternity', description: 'คัมภีร์นิรันดร์ ความรู้ที่ไม่มีขีดจำกัด',
    price: 12000, type: 'OFFHAND', slot: 'OFFHAND', tier: 'LEGENDARY', image: '📜',
    baseMag: 145, baseMp: 280, baseCrit: 0.17, baseDef: 38,
    effects: [E.MANA_FLOW, E.ARCANE_SURGE],
  },
  {
    name: 'Infinity Quiver', description: 'ถุงลูกธนูอนันต์ ไม่มีวันหมด',
    price: 12000, type: 'OFFHAND', slot: 'OFFHAND', tier: 'LEGENDARY', image: '♾️',
    baseAtk: 85, baseCrit: 0.22, baseSpd: 28, baseLuck: 0.12,
    effects: [E.LUCKY_STRIKE, E.HUNTER_MARK],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GLOVES (12 total: 3 types × 4 tiers)
  // Heavy=Warrior, Cloth=Caster, Light=Ranger/Rogue
  // ══════════════════════════════════════════════════════════════════════════

  // ── COMMON Gloves ─────────────────────────────────────────────────────────
  {
    name: 'Iron Gauntlets', description: 'ถุงมือเหล็ก หนักแต่ปลอดภัย',
    price: 100, type: 'GLOVES', slot: 'GLOVES', tier: 'COMMON', image: '🥊',
    baseAtk: 8, baseDef: 6,
  },
  {
    name: 'Cloth Gloves', description: 'ถุงมือผ้า เบาและใส่สบาย',
    price: 100, type: 'GLOVES', slot: 'GLOVES', tier: 'COMMON', image: '🧤',
    baseMag: 8, baseMp: 12,
  },
  {
    name: 'Leather Gloves', description: 'ถุงมือหนัง คล่องตัวสูง',
    price: 100, type: 'GLOVES', slot: 'GLOVES', tier: 'COMMON', image: '🖐️',
    baseAtk: 6, baseCrit: 0.02, baseSpd: 3,
  },

  // ── RARE Gloves ──────────────────────────────────────────────────────────
  {
    name: 'Titan Fists', description: 'กำปั้นไทแทน พลังทำลายล้าง',
    price: 1500, type: 'GLOVES', slot: 'GLOVES', tier: 'RARE', image: '👊',
    baseAtk: 22, baseDef: 16, baseHp: 80, effects: [E.TOUGH_SKIN],
  },
  {
    name: 'Mage Wraps', description: 'ผ้าพันมือนักเวทย์ ควบคุมพลัง',
    price: 1500, type: 'GLOVES', slot: 'GLOVES', tier: 'RARE', image: '🌀',
    baseMag: 22, baseMp: 40, baseCrit: 0.02, effects: [E.QUICK_LEARNER],
  },
  {
    name: 'Scout Gloves', description: 'ถุงมือลาดตระเวน แม่นยำสูง',
    price: 1500, type: 'GLOVES', slot: 'GLOVES', tier: 'RARE', image: '🤲',
    baseAtk: 18, baseCrit: 0.06, baseSpd: 8, effects: [E.LUCKY_STRIKE],
  },

  // ── EPIC Gloves (Set pieces) ──────────────────────────────────────────────
  {
    name: 'Dragon Claws', description: 'กรงเล็บมังกร ฉีกทุกเกราะ — ชุด TITAN',
    price: 6000, type: 'GLOVES', slot: 'GLOVES', tier: 'EPIC', image: '🐾',
    baseAtk: 48, baseDef: 32, baseHp: 200,
    setId: SET_TITAN, effects: [E.LIFESTEAL],
  },
  {
    name: 'Arcane Gloves', description: 'ถุงมืออาร์เคน ปลดปล่อยเวทย์ — ชุด ARCANE',
    price: 6000, type: 'GLOVES', slot: 'GLOVES', tier: 'EPIC', image: '🌐',
    baseMag: 48, baseMp: 90, baseCrit: 0.07,
    setId: SET_ARCANE, effects: [E.MANA_FLOW],
  },
  {
    name: 'Shadow Gloves', description: 'ถุงมือเงา ซ่อนในความมืด — ชุด HUNT',
    price: 6000, type: 'GLOVES', slot: 'GLOVES', tier: 'EPIC', image: '🌒',
    baseAtk: 38, baseCrit: 0.12, baseSpd: 16, baseLuck: 0.05,
    setId: SET_HUNT, effects: [E.LUCKY_STRIKE],
  },

  // ── LEGENDARY Gloves ──────────────────────────────────────────────────────
  {
    name: "Warlord's Grip", description: 'กำมือจอมทัพ ทำลายทุกป้อมปราการ',
    price: 12000, type: 'GLOVES', slot: 'GLOVES', tier: 'LEGENDARY', image: '💪',
    baseAtk: 85, baseDef: 55, baseHp: 380,
    effects: [E.IMMORTAL, E.TITAN_WILL],
  },
  {
    name: 'Celestial Gauntlets', description: 'ถุงมือสวรรค์ ปลดปล่อยพลังจักรวาล',
    price: 12000, type: 'GLOVES', slot: 'GLOVES', tier: 'LEGENDARY', image: '🌠',
    baseMag: 95, baseMp: 190, baseCrit: 0.14,
    effects: [E.MANA_FLOW, E.GODS_BLESSING],
  },
  {
    name: 'Phantom Grips', description: 'กำมือผี จับทุกอย่างได้โดยไม่ทิ้งร่องรอย',
    price: 12000, type: 'GLOVES', slot: 'GLOVES', tier: 'LEGENDARY', image: '🫴',
    baseAtk: 72, baseCrit: 0.20, baseSpd: 28, baseLuck: 0.12,
    effects: [E.LIFESTEAL, E.BLADE_DANCE],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BOOTS (12 total: 3 types × 4 tiers)
  // Heavy=Warrior, Cloth=Caster, Light=Ranger/Rogue
  // ══════════════════════════════════════════════════════════════════════════

  // ── COMMON Boots ─────────────────────────────────────────────────────────
  {
    name: 'Iron Boots', description: 'รองเท้าเหล็กหนัก เดินทนทาน',
    price: 100, type: 'BOOTS', slot: 'BOOTS', tier: 'COMMON', image: '🥾',
    baseDef: 8, baseHp: 50,
  },
  {
    name: 'Cloth Shoes', description: 'รองเท้าผ้า สวมใส่สบาย',
    price: 100, type: 'BOOTS', slot: 'BOOTS', tier: 'COMMON', image: '👟',
    baseDef: 4, baseMag: 8, baseMp: 12,
  },
  {
    name: 'Leather Boots', description: 'รองเท้าหนัง เบาและรวดเร็ว',
    price: 100, type: 'BOOTS', slot: 'BOOTS', tier: 'COMMON', image: '👢',
    baseSpd: 6, baseCrit: 0.02, baseLuck: 0.02,
  },

  // ── RARE Boots ───────────────────────────────────────────────────────────
  {
    name: 'War Treads', description: 'รองเท้าสงคราม บดขยี้ทุกอย่าง',
    price: 1500, type: 'BOOTS', slot: 'BOOTS', tier: 'RARE', image: '🦶',
    baseDef: 22, baseHp: 130, baseAtk: 5, effects: [E.TOUGH_SKIN],
  },
  {
    name: 'Mage Boots', description: 'รองเท้านักเวทย์ ลอยเหนือพื้น',
    price: 1500, type: 'BOOTS', slot: 'BOOTS', tier: 'RARE', image: '🌙',
    baseDef: 10, baseMag: 22, baseMp: 42, baseSpd: 4, effects: [E.QUICK_LEARNER],
  },
  {
    name: 'Swift Boots', description: 'รองเท้าพิเศษ เร็วดั่งลม',
    price: 1500, type: 'BOOTS', slot: 'BOOTS', tier: 'RARE', image: '💨',
    baseSpd: 16, baseCrit: 0.05, baseLuck: 0.05, effects: [E.LUCKY_STRIKE],
  },

  // ── EPIC Boots (Shadow set + standalone) ─────────────────────────────────
  {
    name: 'Dragon Boots', description: 'รองเท้ามังกร แผดเผาทุกพื้นที่',
    price: 6000, type: 'BOOTS', slot: 'BOOTS', tier: 'EPIC', image: '🔥',
    baseDef: 45, baseHp: 280, baseAtk: 12, effects: [E.TOUGH_SKIN, E.LIFESTEAL],
  },
  {
    name: 'Arcane Treads', description: 'รองเท้าอาร์เคน ลอยเหนือแรงโน้มถ่วง',
    price: 6000, type: 'BOOTS', slot: 'BOOTS', tier: 'EPIC', image: '🌊',
    baseDef: 20, baseMag: 48, baseMp: 90, baseSpd: 9, effects: [E.MANA_FLOW],
  },
  {
    name: 'Shadow Walkers', description: 'รองเท้าเงามืด เดินในความมืด — ชุด SHADOW',
    price: 6000, type: 'BOOTS', slot: 'BOOTS', tier: 'EPIC', image: '🕷️',
    baseSpd: 30, baseCrit: 0.10, baseLuck: 0.10,
    setId: SET_SHADOW, effects: [E.LUCKY_STRIKE, E.LIFESTEAL],
  },

  // ── LEGENDARY Boots ───────────────────────────────────────────────────────
  {
    name: 'Titan Greaves', description: 'เกรฟส์ไทแทน ย่างก้าวทำลายล้าง',
    price: 12000, type: 'BOOTS', slot: 'BOOTS', tier: 'LEGENDARY', image: '🏔️',
    baseDef: 80, baseHp: 500, baseAtk: 22,
    effects: [E.IMMORTAL, E.TITAN_WILL],
  },
  {
    name: 'Celestial Boots', description: 'รองเท้าสวรรค์ เดินบนดวงดาว',
    price: 12000, type: 'BOOTS', slot: 'BOOTS', tier: 'LEGENDARY', image: '⭐',
    baseDef: 38, baseMag: 95, baseMp: 185, baseSpd: 16,
    effects: [E.MANA_FLOW, E.GODS_BLESSING],
  },
  {
    name: 'Phantom Striders', description: 'รองเท้าผีพเนจร ไร้ซึ่งร่องรอย',
    price: 12000, type: 'BOOTS', slot: 'BOOTS', tier: 'LEGENDARY', image: '🌫️',
    baseSpd: 50, baseCrit: 0.18, baseLuck: 0.18,
    effects: [E.SHADOW_VEIL, E.BLADE_DANCE],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACCESSORY (15 total: 2 COMMON + 4 RARE + 4 EPIC + 5 LEGENDARY)
  // ══════════════════════════════════════════════════════════════════════════

  // ── COMMON Accessories ────────────────────────────────────────────────────
  {
    name: 'Lucky Charm', description: 'เครื่องรางนำโชค ดึงดูดโชคลาภ',
    price: 300, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'COMMON', image: '🍀',
    baseLuck: 0.03, goldMultiplier: 0.05, xpMultiplier: 0.02,
  },
  {
    name: 'Combat Badge', description: 'เข็มกลัดนักรบ เพิ่มพลังโจมตี',
    price: 300, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'COMMON', image: '🎖️',
    baseAtk: 10, baseHp: 40,
  },

  // ── RARE Accessories ──────────────────────────────────────────────────────
  {
    name: "Warrior's Crest", description: 'ตราสัญลักษณ์นักรบ แสดงความเข้มแข็ง',
    price: 2200, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'RARE', image: '⚜️',
    baseAtk: 25, baseHp: 120, baseDef: 10, effects: [E.TOUGH_SKIN],
  },
  {
    name: "Scholar's Pendant", description: 'จี้นักปราชญ์ เสริมพลังการเรียนรู้',
    price: 2200, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'RARE', image: '📿',
    baseMag: 28, baseMp: 50, baseCrit: 0.03, xpMultiplier: 0.10, effects: [E.QUICK_LEARNER],
  },
  {
    name: "Hunter's Badge", description: 'เข็มกลัดนักล่า ติดตามเหยื่อ',
    price: 2200, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'RARE', image: '🎯',
    baseAtk: 20, baseCrit: 0.06, baseSpd: 8, goldMultiplier: 0.10, effects: [E.GOLD_FINDER],
  },
  {
    name: 'Shadow Ring', description: 'แหวนเงามืด เพิ่มโชคและความเร็ว',
    price: 2200, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'RARE', image: '💍',
    baseCrit: 0.08, baseLuck: 0.07, baseSpd: 10, effects: [E.LUCKY_STRIKE],
  },

  // ── EPIC Accessories (1 per archetype + 1 Shadow set) ─────────────────────
  {
    name: 'Titan Medallion', description: 'เหรียญไทแทน อำนาจแห่งความแข็งแกร่ง',
    price: 7000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'EPIC', image: '🏅',
    baseAtk: 50, baseHp: 280, baseDef: 22, effects: [E.LIFESTEAL, E.TOUGH_SKIN],
  },
  {
    name: 'Arcane Orb', description: 'ลูกโลกอาร์เคน พลังเวทย์กลั่นกรอง',
    price: 7000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'EPIC', image: '🧿',
    baseMag: 65, baseMp: 120, baseCrit: 0.08, effects: [E.MANA_FLOW, E.LUCKY_STRIKE],
  },
  {
    name: 'Eagle Eye Charm', description: 'เครื่องรางตาอินทรี มองเห็นทุกจุดอ่อน',
    price: 7000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'EPIC', image: '👁️',
    baseAtk: 42, baseCrit: 0.14, baseSpd: 18, goldMultiplier: 0.15,
    effects: [E.LUCKY_STRIKE, E.GOLD_FINDER],
  },
  {
    name: 'Shadow Talisman', description: 'เครื่องรางเงามืด พลังแห่งกลางคืน — ชุด SHADOW',
    price: 7000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'EPIC', image: '🕸️',
    baseCrit: 0.16, baseLuck: 0.14, baseSpd: 22, goldMultiplier: 0.20,
    setId: SET_SHADOW, effects: [E.LIFESTEAL, E.LUCKY_STRIKE],
  },

  // ── LEGENDARY Accessories ─────────────────────────────────────────────────
  {
    name: 'Heart of the Titan', description: 'หัวใจแห่งไทแทน ไม่มีวันพ่ายแพ้',
    price: 16000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'LEGENDARY', image: '❤️',
    baseAtk: 90, baseHp: 500, baseDef: 40, effects: [E.IMMORTAL, E.GODS_BLESSING],
  },
  {
    name: 'Eye of Eternity', description: 'นัยน์ตาแห่งนิรันดร์ มองเห็นอดีตและอนาคต',
    price: 16000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'LEGENDARY', image: '🔯',
    baseMag: 130, baseMp: 260, baseCrit: 0.16, effects: [E.IMMORTAL, E.ARCANE_SURGE],
  },
  {
    name: 'Ring of the Hunt', description: 'แหวนแห่งการล่า ไม่มีเหยื่อใดหนีรอด',
    price: 16000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'LEGENDARY', image: '🦁',
    baseAtk: 75, baseCrit: 0.24, baseSpd: 38, bossDamageMultiplier: 0.15,
    effects: [E.IMMORTAL, E.HAWK_EYE],
  },
  {
    name: 'Phantom Soul', description: 'วิญญาณผี มีทั้งชีวิตและความตาย',
    price: 16000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'LEGENDARY', image: '🫀',
    baseCrit: 0.28, baseLuck: 0.24, baseSpd: 44, effects: [E.IMMORTAL, E.SHADOW_VEIL],
  },
  {
    name: 'Tears of Goddess', description: 'น้ำตาเทพธิดา อำนาจจากสรวงสวรรค์',
    price: 18000, type: 'ACCESSORY', slot: 'ACCESSORY', tier: 'LEGENDARY', image: '💧',
    baseHp: 800, baseMag: 80, baseAtk: 60, goldMultiplier: 0.35, xpMultiplier: 0.20,
    effects: [E.IMMORTAL, E.GODS_BLESSING, E.TIME_WARP],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CONSUMABLES (kept from original)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Stamina ───────────────────────────────────────────────────────────────
  {
    name: 'Stamina Potion', description: 'ฟื้นฟู Stamina 1 หน่วยทันที',
    price: 5, type: 'CONSUMABLE', tier: 'COMMON', image: '🧪',
    currency: POINTS, staminaRestore: 1,
  },

  // ── Mana ──────────────────────────────────────────────────────────────────
  {
    name: 'Mana Potion (S)', description: 'โพชั่นมานาขนาดเล็ก ฟื้นฟู Mana +20',
    price: 80, type: 'CONSUMABLE', tier: 'COMMON', image: '🔵', currency: GOLD, manaRestore: 20,
  },
  {
    name: 'Mana Potion (M)', description: 'โพชั่นมานาขนาดกลาง ฟื้นฟู Mana +60',
    price: 250, type: 'CONSUMABLE', tier: 'RARE', image: '💙', currency: GOLD, manaRestore: 60,
  },
  {
    name: 'Mana Potion (L)', description: 'โพชั่นมานาขนาดใหญ่ ฟื้นฟู Mana +150',
    price: 600, type: 'CONSUMABLE', tier: 'EPIC', image: '🫧', currency: GOLD, manaRestore: 150,
  },

  // ── HP ─────────────────────────────────────────────────────────────────────
  {
    name: 'HP Potion (S)', description: 'โพชั่นขนาดเล็ก เพิ่ม HP +30% ใน Battle ถัดไป',
    price: 100, type: 'CONSUMABLE', tier: 'COMMON', image: '🔴', currency: GOLD, hpRestorePercent: 0.30,
  },
  {
    name: 'HP Potion (M)', description: 'โพชั่นขนาดกลาง เพิ่ม HP +60%',
    price: 300, type: 'CONSUMABLE', tier: 'RARE', image: '❤️‍🔥', currency: GOLD, hpRestorePercent: 0.60,
  },
  {
    name: 'HP Potion (L)', description: 'โพชั่นขนาดใหญ่ เพิ่ม HP +100% (HP เต็ม 2 เท่า!)',
    price: 800, type: 'CONSUMABLE', tier: 'EPIC', image: '💖', currency: GOLD, hpRestorePercent: 1.00,
  },
  {
    name: 'Phoenix Feather', description: 'ขนนกฟีนิกส์ ฟื้นคืนชีพพร้อม HP 50% (ครั้งเดียว)',
    price: 2000, type: 'CONSUMABLE', tier: 'LEGENDARY', image: '🪶', currency: GOLD, isPhoenix: true,
  },

  // ── Battle Stat Buffs ─────────────────────────────────────────────────────
  {
    name: 'Attack Elixir', description: 'ยาแดงสุดพลัง เพิ่ม ATK +50% ใน Battle ถัดไป',
    price: 500, type: 'CONSUMABLE', tier: 'RARE', image: '⚗️', currency: GOLD, buffAtk: 0.5,
  },
  {
    name: 'Iron Guard Brew', description: 'ยาเกราะเหล็ก เพิ่ม DEF +80%',
    price: 500, type: 'CONSUMABLE', tier: 'RARE', image: '🦺', currency: GOLD, buffDef: 0.8,
  },
  {
    name: 'Haste Brew', description: 'ยาแห่งความเร็ว เพิ่ม SPD +100%',
    price: 500, type: 'CONSUMABLE', tier: 'RARE', image: '⚡', currency: GOLD, buffSpd: 1.0,
  },
  {
    name: 'Battle Elixir', description: 'ยาต่อสู้ขั้นสูง ATK+DEF+SPD +30%',
    price: 1200, type: 'CONSUMABLE', tier: 'EPIC', image: '💥', currency: GOLD,
    buffAtk: 0.3, buffDef: 0.3, buffSpd: 0.3,
  },

  // ── Crafting ──────────────────────────────────────────────────────────────
  {
    name: 'Transmute Stone', description: 'หินแปรธาตุ แปลงวัตถุดิบ COMMON 5 ชิ้น → วัตถุดิบ RARE 1 ชิ้น',
    price: 800, type: 'CONSUMABLE', tier: 'RARE', image: '🪨', currency: GOLD, isTransmute: true,
  },

  // ── Level Up ──────────────────────────────────────────────────────────────
  {
    name: 'Ancient Tome of Ascension', description: '📖 คัมภีร์โบราณ ใช้แล้วได้รับ +1 Lv ทันที ✨',
    price: 5000, type: 'CONSUMABLE', tier: 'LEGENDARY', image: '📕', currency: GOLD, isLevelUp: true,
  },

  // ── Boss Utility ──────────────────────────────────────────────────────────
  {
    name: 'Holy Water', description: 'น้ำศักดิ์สิทธิ์ เพิ่ม ATK+DEF+SPD +100% ใน Battle ถัดไป',
    price: 3000, type: 'CONSUMABLE', tier: 'LEGENDARY', image: '🫙', currency: GOLD,
    buffAtk: 1.0, buffDef: 1.0, buffSpd: 1.0,
  },

  // ── Economy Time Boosts ───────────────────────────────────────────────────
  {
    name: 'Lucky Scroll', description: 'เพิ่ม Gold รับ ×2 เป็นเวลา 10 นาที',
    price: 400, type: 'CONSUMABLE', tier: 'RARE', image: '📰', currency: GOLD, buffGoldMinutes: 10,
  },
  {
    name: 'Tome of Knowledge', description: 'เพิ่ม XP รับ ×2 เป็นเวลา 10 นาที',
    price: 400, type: 'CONSUMABLE', tier: 'RARE', image: '📚', currency: GOLD, buffXpMinutes: 10,
  },

  // ── Farming Buff Consumables ──────────────────────────────────────────────
  {
    name: 'น้ำยาเสริมแรง', description: '⚔️ เพิ่ม ATK +40% เป็นเวลา 3 เทิร์นในการฟาร์ม',
    price: 120, type: 'CONSUMABLE', tier: 'COMMON', image: '🧴', currency: GOLD,
    farmingBuffType: 'BUFF_ATK', farmingBuffTurns: 3,
  },
  {
    name: 'ยาเสริมแรงชั้นดี', description: '⚔️ เพิ่ม ATK +40% เป็นเวลา 5 เทิร์นในการฟาร์ม',
    price: 350, type: 'CONSUMABLE', tier: 'RARE', image: '💢', currency: GOLD,
    farmingBuffType: 'BUFF_ATK', farmingBuffTurns: 5,
  },
  {
    name: 'ยาเกราะป้องกัน', description: '🛡️ ลดดาเมจที่รับ 50% เป็นเวลา 3 เทิร์นในการฟาร์ม',
    price: 120, type: 'CONSUMABLE', tier: 'COMMON', image: '🦾', currency: GOLD,
    farmingBuffType: 'BUFF_DEF', farmingBuffTurns: 3,
  },
  {
    name: 'ยาเกราะชั้นยอด', description: '🛡️ ลดดาเมจที่รับ 50% เป็นเวลา 5 เทิร์นในการฟาร์ม',
    price: 350, type: 'CONSUMABLE', tier: 'RARE', image: '🏵️', currency: GOLD,
    farmingBuffType: 'BUFF_DEF', farmingBuffTurns: 5,
  },
  {
    name: 'ยาแห่งโชค', description: '🎯 เพิ่ม CRIT +30% เป็นเวลา 3 เทิร์นในการฟาร์ม',
    price: 150, type: 'CONSUMABLE', tier: 'COMMON', image: '🎰', currency: GOLD,
    farmingBuffType: 'CRIT_BUFF', farmingBuffTurns: 3,
  },
  {
    name: 'ยาฟื้นฟูพลังงาน', description: '🌿 ฟื้นฟู HP 8% ต่อเทิร์น เป็นเวลา 3 เทิร์นในการฟาร์ม',
    price: 130, type: 'CONSUMABLE', tier: 'COMMON', image: '🌱', currency: GOLD,
    farmingBuffType: 'REGEN', farmingBuffTurns: 3,
  },
  {
    name: 'ยาฟื้นฟูชั้นสูง', description: '🌿 ฟื้นฟู HP 8% ต่อเทิร์น เป็นเวลา 5 เทิร์นในการฟาร์ม',
    price: 380, type: 'CONSUMABLE', tier: 'RARE', image: '🍃', currency: GOLD,
    farmingBuffType: 'REGEN', farmingBuffTurns: 5,
  },
  {
    name: 'ยาเทพเจ้านักรบ', description: '⚔️🛡️ ATK +40% และลดดาเมจ 50% เป็นเวลา 4 เทิร์น',
    price: 900, type: 'CONSUMABLE', tier: 'EPIC', image: '🧬', currency: GOLD,
    farmingBuffType: 'BUFF_ATK', farmingBuffTurns: 4,
  },
];

// ─── Seed function ───────────────────────────────────────────────────────────

async function main() {
  const equipmentSlots = ['WEAPON', 'BODY', 'HEAD', 'OFFHAND', 'GLOVES', 'BOOTS', 'ACCESSORY'];
  const equipmentItems = items.filter((i: any) => equipmentSlots.includes(i.slot));
  const consumableItems = items.filter((i: any) => i.type === 'CONSUMABLE');

  console.log('--- 🛡️ Seeding Item Catalog ---');
  console.log(`Equipment: ${equipmentItems.length}, Consumables: ${consumableItems.length}, Total: ${items.length}`);

  // Wipe existing items
  console.log('Cleaning up existing items...');
  await prisma.studentItem.deleteMany({});
  await prisma.item.deleteMany({});

  // Verify distribution
  const counts: Record<string, number> = {};
  for (const item of items) {
    const slot = (item as any).slot;
    if (slot) counts[slot] = (counts[slot] ?? 0) + 1;
  }
  console.log('Item distribution:', counts);

  const expected: Record<string, number> = {
    WEAPON: 16, BODY: 12, HEAD: 12, OFFHAND: 12, GLOVES: 12, BOOTS: 12, ACCESSORY: 15,
  };
  for (const [slot, count] of Object.entries(expected)) {
    if (counts[slot] !== count) {
      throw new Error(`Distribution mismatch for ${slot}: expected ${count}, got ${counts[slot] ?? 0}`);
    }
  }
  console.log('✅ Distribution verified');

  console.log(`Inserting ${items.length} items...`);
  for (const item of items) {
    const {
      slot, tier, setId, effects, xpMultiplier, currency,
      staminaRestore, manaRestore, ...rest
    } = item as any;
    const created = await prisma.item.create({
      data: {
        ...rest,
        slot,
        tier,
        ...(setId        ? { setId }        : {}),
        ...(effects      ? { effects }      : {}),
        ...(xpMultiplier !== undefined ? { xpMultiplier } : {}),
        ...(currency     ? { currency }     : { currency: GOLD }),
        ...(staminaRestore !== undefined ? { staminaRestore } : {}),
        ...(manaRestore    !== undefined ? { manaRestore }    : {}),
      },
    });
    console.log(`  ✅ ${created.tier.padEnd(9)} ${(created.slot ?? 'CONSUMABLE').padEnd(9)} ${created.name}`);
  }

  console.log(`\n--- ✅ Seeding complete! ${items.length} items created ---`);
  console.log('Sets: TITAN_SET (5pc) | ARCANE_SET (5pc) | HUNT_SET (5pc) | SHADOW_SET (5pc)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
