// ============================================================
// Negamon Classroom RPG — Default Monster Species
// 5 สายพันธุ์จากตำนานไทย / หิมพานต์
// ============================================================

import type { MonsterSpecies, PassiveAbility } from "./types/negamon";

const ABILITY_ACID_RAIN: PassiveAbility    = { id: "acid_rain",      name: "ฝนกรด",       desc: "POISON ที่ติดคู่ต่อสู้ไม่หายตลอดเกม" };
const ABILITY_FLAME_BODY: PassiveAbility   = { id: "flame_body",     name: "ร่างเพลิง",    desc: "20% โอกาสผู้โจมตีติด BURN เมื่อโดนตี" };
const ABILITY_IRON_SHELL: PassiveAbility   = { id: "iron_shell",     name: "เกราะเหล็ก",   desc: "รับดาเมจลดลง 10% ตลอดเกม" };
const ABILITY_TAILWIND: PassiveAbility     = { id: "tailwind",       name: "ลมบน",         desc: "SPD สูงขึ้น 10% ตลอดเกม" };
const ABILITY_RAGE_MODE: PassiveAbility    = { id: "rage_mode",      name: "โทสะอสูร",     desc: "เมื่อ HP < 50% → ATK +30% ครั้งเดียว" };
const ABILITY_AERIAL_STRIKE: PassiveAbility = { id: "aerial_strike", name: "กระโจนจากฟ้า", desc: "Priority move ทำดาเมจเพิ่ม 20%" };
const ABILITY_STATIC: PassiveAbility       = { id: "static",         name: "สายฟ้าสถิต",   desc: "30% โอกาสผู้โจมตีติด PARALYZE เมื่อโดนตี" };
const ABILITY_GUARDIAN_SCALE: PassiveAbility = { id: "guardian_scale", name: "เกล็ดทองคุ้มครอง", desc: "เมื่อ HP < 30% → ฟื้น HP 15% ครั้งเดียว" };

export const DEFAULT_NEGAMON_SPECIES: MonsterSpecies[] = [
    // ─────────────────────────────────────────────────────────
    // 001 — พญานาค (WATER / PSYCHIC)
    // แข็งแกร่ง ทน ใช้ magic attack
    // ─────────────────────────────────────────────────────────
    {
        id: "naga",
        name: "พญานาค",
        type: "WATER",
        type2: "PSYCHIC",
        baseStats: { hp: 360, atk: 105, def: 115, spd: 105 },
        forms: [
            { rank: 0, name: "ไข่นาค",   icon: "🥚",   color: "#94a3b8" },
            { rank: 1, name: "Nakat",     icon: "🐍",   color: "#22c55e" },
            { rank: 2, name: "Naka",      icon: "🐍",   color: "#3b82f6" },
            { rank: 3, name: "Nakaraja",  icon: "🐲",   color: "#a855f7" },
            { rank: 4, name: "Phaya Nak", icon: "🐉",   color: "#f97316" },
            { rank: 5, name: "Ananta",    icon: "🐉",   color: "#ef4444" },
        ],
        ability: ABILITY_ACID_RAIN,
        moves: [
            { id: "naga-water-splash", name: "กระเซ็นน้ำ",       type: "WATER",   category: "SPECIAL",  power: 35, accuracy: 95,  learnRank: 1 },
            { id: "naga-bite",         name: "กัด",               type: "DARK",    category: "PHYSICAL", power: 40, accuracy: 90,  learnRank: 2 },
            { id: "naga-aqua-jet",     name: "กระโจนน้ำ",         type: "WATER",   category: "SPECIAL",  power: 55, accuracy: 100, learnRank: 3, priority: 1 },
            { id: "naga-rain-dance",   name: "ระบำขอฝน",          type: "WATER",   category: "STATUS",   power: 0,  accuracy: 100, learnRank: 4, effect: "BOOST_WATER_DMG" },
            { id: "naga-hydro-stream", name: "สายน้ำศักดิ์สิทธิ์",  type: "WATER",   category: "SPECIAL",  power: 90, accuracy: 85,  learnRank: 5 },
            { id: "naga-tidal-force",  name: "พลังคลื่นยักษ์",    type: "WATER",   category: "SPECIAL",  power: 130,accuracy: 80,  learnRank: 6, effect: "IGNORE_DEF", critBonus: 12 },
        ],
    },

    // ─────────────────────────────────────────────────────────
    // 002 — ครุฑ (FIRE / WIND)
    // เร็ว โจมตีสูง แต่ทนน้อย
    // ─────────────────────────────────────────────────────────
    {
        id: "garuda",
        name: "ครุฑ",
        type: "FIRE",
        type2: "WIND",
        baseStats: { hp: 240, atk: 155, def: 70, spd: 155 },
        forms: [
            { rank: 0, name: "ไข่ครุฑ",  icon: "🥚",   color: "#94a3b8" },
            { rank: 1, name: "Krutling",  icon: "🐣",   color: "#22c55e" },
            { rank: 2, name: "Krutha",    icon: "🦅",   color: "#3b82f6" },
            { rank: 3, name: "Kruthon",   icon: "🦅",   color: "#a855f7" },
            { rank: 4, name: "Garuda",    icon: "🦅",   color: "#f97316" },
            { rank: 5, name: "Mahagaru",  icon: "🦅",   color: "#ef4444" },
        ],
        ability: ABILITY_FLAME_BODY,
        moves: [
            { id: "garuda-ember",        name: "ลูกไฟน้อย",      type: "FIRE",   category: "SPECIAL",  power: 35, accuracy: 95,  learnRank: 1 },
            { id: "garuda-peck",         name: "จิก",             type: "WIND",   category: "PHYSICAL", power: 35, accuracy: 100, learnRank: 1, priority: 1 },
            { id: "garuda-wing-attack",  name: "กระพือปีก",       type: "WIND",   category: "PHYSICAL", power: 55, accuracy: 95,  learnRank: 2 },
            { id: "garuda-flame-burst",  name: "เปลวเพลิงระเบิด", type: "FIRE",   category: "SPECIAL",  power: 65, accuracy: 90,  learnRank: 3, effect: "BURN", effectChance: 30 },
            { id: "garuda-sky-dive",     name: "ดิ่งจากฟ้า",     type: "WIND",   category: "PHYSICAL", power: 80, accuracy: 90,  learnRank: 4, critBonus: 20 },
            { id: "garuda-divine-fire",  name: "เพลิงทิพย์",     type: "FIRE",   category: "SPECIAL",  power: 120,accuracy: 85,  learnRank: 5 },
            { id: "garuda-strike",       name: "อาวุธครุฑ",       type: "FIRE",   category: "PHYSICAL", power: 150,accuracy: 75,  learnRank: 6 },
        ],
    },

    // ─────────────────────────────────────────────────────────
    // 003 — สิงห์ (EARTH)
    // ทนดีที่สุด DEF สูง แต่ช้า
    // ─────────────────────────────────────────────────────────
    {
        id: "singha",
        name: "สิงห์",
        type: "EARTH",
        baseStats: { hp: 480, atk: 100, def: 150, spd: 50 },
        forms: [
            { rank: 0, name: "ไข่สิงห์",  icon: "🥚",   color: "#94a3b8" },
            { rank: 1, name: "Singlet",    icon: "🐱",   color: "#22c55e" },
            { rank: 2, name: "Sinha",      icon: "🦁",   color: "#3b82f6" },
            { rank: 3, name: "Singha",     icon: "🦁",   color: "#a855f7" },
            { rank: 4, name: "Ratchasinga",icon: "🦁",   color: "#f97316" },
            { rank: 5, name: "Narasingha", icon: "🦁",   color: "#ef4444" },
        ],
        ability: ABILITY_IRON_SHELL,
        moves: [
            { id: "singha-tackle",      name: "พุ่งชน",         type: "EARTH",  category: "PHYSICAL", power: 35, accuracy: 100, learnRank: 1 },
            { id: "singha-roar",        name: "คำราม",          type: "EARTH",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "LOWER_ATK", priority: 1 },
            { id: "singha-earth-slam",  name: "กระทืบแผ่นดิน",  type: "EARTH",  category: "PHYSICAL", power: 60, accuracy: 90,  learnRank: 2 },
            { id: "singha-harden",      name: "เกราะหิน",       type: "EARTH",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 3, effect: "BOOST_DEF" },
            { id: "singha-quake",       name: "แผ่นดินสั่น",    type: "EARTH",  category: "PHYSICAL", power: 90, accuracy: 85,  learnRank: 4 },
            { id: "singha-royal-roar",  name: "คำรามราชัน",     type: "EARTH",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 5, effect: "LOWER_ATK_ALL" },
            { id: "singha-earth-king",  name: "ราชาแห่งแผ่นดิน", type: "EARTH",  category: "PHYSICAL", power: 140,accuracy: 80,  learnRank: 6 },
        ],
    },

    // ─────────────────────────────────────────────────────────
    // 004 — กินรี (WIND)
    // เร็วที่สุด Heal ตัวเองได้ แต่ ATK ต่ำ
    // ─────────────────────────────────────────────────────────
    {
        id: "kinnaree",
        name: "กินรี",
        type: "WIND",
        baseStats: { hp: 270, atk: 110, def: 85, spd: 185 },
        forms: [
            { rank: 0, name: "ไข่กินรี",  icon: "🥚",   color: "#94a3b8" },
            { rank: 1, name: "Kinnari",    icon: "🐦",   color: "#22c55e" },
            { rank: 2, name: "Kinnara",    icon: "🕊️",  color: "#3b82f6" },
            { rank: 3, name: "Kinnaree",   icon: "🦢",   color: "#a855f7" },
            { rank: 4, name: "Hamsa",      icon: "🦢",   color: "#f97316" },
            { rank: 5, name: "Celestia",   icon: "🦢",   color: "#ef4444" },
        ],
        ability: ABILITY_TAILWIND,
        moves: [
            { id: "kinnaree-gust",          name: "สายลม",          type: "WIND",  category: "SPECIAL",  power: 35, accuracy: 95,  learnRank: 1, priority: 1 },
            { id: "kinnaree-grace-dance",   name: "ระบำงดงาม",      type: "WIND",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "BOOST_SPD" },
            { id: "kinnaree-air-slash",     name: "กรีดลม",         type: "WIND",  category: "SPECIAL",  power: 55, accuracy: 95,  learnRank: 2, effect: "PARALYZE", effectChance: 20 },
            { id: "kinnaree-feather-storm", name: "พายุขนนก",       type: "WIND",  category: "SPECIAL",  power: 70, accuracy: 90,  learnRank: 3 },
            { id: "kinnaree-heaven-song",   name: "บทเพลงสวรรค์",  type: "WIND",  category: "HEAL",     power: 0,  accuracy: 100, learnRank: 4, effect: "HEAL_25" },
            { id: "kinnaree-heaven-dive",   name: "ดิ่งลงฟ้า",     type: "WIND",  category: "PHYSICAL", power: 110,accuracy: 85,  learnRank: 5 },
            { id: "kinnaree-divine-storm",  name: "พายุทิพย์",     type: "WIND",  category: "SPECIAL",  power: 145,accuracy: 80,  learnRank: 6 },
        ],
    },

    // ─────────────────────────────────────────────────────────
    // 005 — ทศกัณฑ์ (DARK / FIRE)
    // โจมตีสูงมาก แต่ช้าและป้องกันน้อย
    // ─────────────────────────────────────────────────────────
    {
        id: "thotsakan",
        name: "ทศกัณฑ์",
        type: "DARK",
        type2: "FIRE",
        baseStats: { hp: 420, atk: 170, def: 95, spd: 55 },
        forms: [
            { rank: 0, name: "ไข่ยักษ์",  icon: "🥚",   color: "#94a3b8" },
            { rank: 1, name: "Yak Noi",    icon: "👹",   color: "#22c55e" },
            { rank: 2, name: "Yak",        icon: "👺",   color: "#3b82f6" },
            { rank: 3, name: "Yaksha",     icon: "👹",   color: "#a855f7" },
            { rank: 4, name: "Thotsakan",  icon: "👹",   color: "#f97316" },
            { rank: 5, name: "Asura King", icon: "👹",   color: "#ef4444" },
        ],
        ability: ABILITY_RAGE_MODE,
        moves: [
            { id: "thot-dark-punch",    name: "หมัดมืด",       type: "DARK",  category: "PHYSICAL", power: 40, accuracy: 95,  learnRank: 1 },
            { id: "thot-intimidate",    name: "ขู่กรรโชก",     type: "DARK",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "LOWER_ATK" },
            { id: "thot-shadow-claw",   name: "กรงเล็บเงา",    type: "DARK",  category: "PHYSICAL", power: 65, accuracy: 90,  learnRank: 2, critBonus: 20 },
            { id: "thot-ten-faces",     name: "สิบหน้า",       type: "DARK",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 3, effect: "BOOST_ATK" },
            { id: "thot-dark-fire",     name: "เพลิงมืด",      type: "FIRE",  category: "SPECIAL",  power: 80, accuracy: 85,  learnRank: 4, effect: "BURN", effectChance: 40 },
            { id: "thot-demon-rage",    name: "โทสะอสูร",      type: "DARK",  category: "PHYSICAL", power: 110,accuracy: 85,  learnRank: 5 },
            { id: "thot-asura-burst",   name: "พลังอสูร",      type: "DARK",  category: "SPECIAL",  power: 150,accuracy: 80,  learnRank: 6 },
        ],
    },

    // ─────────────────────────────────────────────────────────
    // 006 — หนุมาน (WIND / LIGHT)
    // เร็วสูง โจมตีกายภาพแรง
    // ─────────────────────────────────────────────────────────
    {
        id: "hanuman",
        name: "หนุมาน",
        type: "WIND",
        type2: "LIGHT",
        baseStats: { hp: 255, atk: 145, def: 75, spd: 160 },
        forms: [
            { rank: 0, name: "ไข่วานร",    icon: "🥚",   color: "#94a3b8" },
            { rank: 1, name: "ลิงน้อย",     icon: "🐒",   color: "#22c55e" },
            { rank: 2, name: "Young Warrior", icon: "🐵",  color: "#3b82f6" },
            { rank: 3, name: "Hanuman",    icon: "🐵",   color: "#a855f7" },
            { rank: 4, name: "ลิงเผือก",     icon: "🐒",   color: "#f97316" },
            { rank: 5, name: "พญาอนุชิต",   icon: "🐒",   color: "#ef4444" },
        ],
        ability: ABILITY_AERIAL_STRIKE,
        moves: [
            { id: "hanuman-vayu-strike", name: "หมัดวายุ",          type: "WIND",   category: "PHYSICAL", power: 40, accuracy: 95,  learnRank: 1, priority: 1 },
            { id: "hanuman-agility",     name: "ปราดเปรียว",        type: "WIND",   category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "BOOST_SPD" },
            { id: "hanuman-slash",       name: "สามกรีด",           type: "WIND",   category: "PHYSICAL", power: 60, accuracy: 90,  learnRank: 2, critBonus: 20 },
            { id: "hanuman-yawn-stars",  name: "หาวเป็นดาวเดือน",   type: "LIGHT",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 3, effect: "SLEEP" },
            { id: "hanuman-cloud-dash",  name: "พุ่งก้อนเมฆ",      type: "WIND",   category: "PHYSICAL", power: 85, accuracy: 90,  learnRank: 4 },
            { id: "hanuman-sacred-fist", name: "กำปั้นศักดิ์สิทธิ์", type: "LIGHT", category: "PHYSICAL", power: 120, accuracy: 85, learnRank: 5, effect: "IGNORE_DEF" },
            { id: "hanuman-divine-inc",  name: "อวตารเทพ",          type: "LIGHT",  category: "PHYSICAL", power: 150,accuracy: 80,  learnRank: 6 },
        ],
    },

    // ─────────────────────────────────────────────────────────
    // 007 — เมขลา (THUNDER / LIGHT)
    // สายเวทย์สายฟ้า รวดเร็ว
    // ─────────────────────────────────────────────────────────
    {
        id: "mekkala",
        name: "เมขลา",
        type: "THUNDER",
        type2: "LIGHT",
        baseStats: { hp: 285, atk: 110, def: 85, spd: 170 },
        forms: [
            { rank: 0, name: "ไข่สายฟ้า",   icon: "🥚",   color: "#94a3b8" },
            { rank: 1, name: "Little Maiden", icon: "👧",   color: "#22c55e" },
            { rank: 2, name: "Storm Maiden",  icon: "👧",   color: "#3b82f6" },
            { rank: 3, name: "Goddess",       icon: "👸",   color: "#a855f7" },
            { rank: 4, name: "Mani Mekkala",  icon: "👸",   color: "#f97316" },
            { rank: 5, name: "Jewel Empress", icon: "👸",   color: "#ef4444" },
        ],
        ability: ABILITY_STATIC,
        moves: [
            { id: "mekkala-jewel-flash",   name: "แสงวาบแก้ว",  type: "LIGHT",   category: "SPECIAL",  power: 40, accuracy: 95,  learnRank: 1 },
            { id: "mekkala-entice",        name: "ล่อแก้ว",     type: "LIGHT",   category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "LOWER_ATK" },
            { id: "mekkala-thunder",       name: "ฟ้าผ่า",      type: "THUNDER", category: "SPECIAL",  power: 65, accuracy: 90,  learnRank: 2, effect: "PARALYZE", effectChance: 30 },
            { id: "mekkala-crystal-glare", name: "ประกายแก้ว",  type: "LIGHT",   category: "SPECIAL",  power: 70, accuracy: 95,  learnRank: 3, effect: "LOWER_DEF", critBonus: 15 },
            { id: "mekkala-prism",         name: "แสงปริซึม",   type: "LIGHT",   category: "SPECIAL",  power: 85, accuracy: 90,  learnRank: 4 },
            { id: "mekkala-storm",         name: "คลื่นพายุฟ้า", type: "THUNDER", category: "SPECIAL",  power: 110,accuracy: 85,  learnRank: 5 },
            { id: "mekkala-judgment",      name: "วันตัดสิน",   type: "LIGHT",   category: "SPECIAL",  power: 150,accuracy: 80,  learnRank: 6 },
        ],
    },

    // ─────────────────────────────────────────────────────────
    // 008 — สุพรรณมัจฉา (WATER / LIGHT)
    // สายแทงค์ เลือดเยอะ ป้องกันดี
    // ─────────────────────────────────────────────────────────
    {
        id: "suvannamaccha",
        name: "สุพรรณมัจฉา",
        type: "WATER",
        type2: "LIGHT",
        baseStats: { hp: 420, atk: 85, def: 135, spd: 95 },
        forms: [
            { rank: 0, name: "ไข่ทองคำ",   icon: "🥚",   color: "#94a3b8" },
            { rank: 1, name: "Baby Mermaid", icon: "🧜‍♀️",   color: "#22c55e" },
            { rank: 2, name: "Princess",     icon: "👸",   color: "#3b82f6" },
            { rank: 3, name: "Suvanna",      icon: "🧜‍♀️",   color: "#a855f7" },
            { rank: 4, name: "Golden Queen", icon: "🧜‍♀️",   color: "#f97316" },
            { rank: 5, name: "Sea Empress",  icon: "🧜‍♀️",   color: "#ef4444" },
        ],
        ability: ABILITY_GUARDIAN_SCALE,
        moves: [
            { id: "suvanna-water-gun",   name: "พ่นน้ำ",          type: "WATER",   category: "SPECIAL",  power: 40, accuracy: 95,  learnRank: 1 },
            { id: "suvanna-bubble",      name: "โล่ฟองน้ำ",      type: "WATER",   category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "BOOST_DEF" },
            { id: "suvanna-healing",     name: "รักษาทอง",       type: "LIGHT",   category: "HEAL",     power: 0,  accuracy: 100, learnRank: 2, effect: "HEAL_25" },
            { id: "suvanna-wave",        name: "คลื่นน้ำ",       type: "WATER",   category: "SPECIAL",  power: 70, accuracy: 90,  learnRank: 3 },
            { id: "suvanna-lullaby",     name: "เพลงนางเงือก",   type: "LIGHT",   category: "STATUS",   power: 0,  accuracy: 100, learnRank: 4, effect: "SLEEP" },
            { id: "suvanna-golden-tide", name: "คลื่นทองคำ",     type: "WATER",   category: "SPECIAL",  power: 115,accuracy: 85,  learnRank: 5, effect: "BOOST_DEF" },
            { id: "suvanna-blessing",    name: "พรแห่งท้องทะเล", type: "WATER",   category: "SPECIAL",  power: 140,accuracy: 80,  learnRank: 6 },
        ],
    },
];

/** ค้นหา species จาก id */
export function findSpeciesById(id: string): MonsterSpecies | undefined {
    return DEFAULT_NEGAMON_SPECIES.find(s => s.id === id);
}

/** Default NegamonSettings สำหรับห้องใหม่ */
export function createDefaultNegamonSettings(): import("./types/negamon").NegamonSettings {
    return {
        enabled: false,
        allowStudentChoice: true,
        expPerPoint: 10,
        expPerAttendance: 20,
        species: DEFAULT_NEGAMON_SPECIES,
        studentMonsters: {},
    };
}
