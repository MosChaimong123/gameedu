// ============================================================
// Negamon Classroom RPG - Default Monster Species
// 5 สายพันธุ์จากตำนานไทย / หิมพานต์
// ============================================================
//
// forms[].icon: emoji หรือ path ใต้ public (เช่น /assets/negamon/naga_rank0.png)
// พญานาค ครุฑ สิงห์ กินรี ทศกัณฑ์ — ใช้ PNG ชุดใน public/assets/negamon/ (negamonPng)
// หนุมาน เมขลา สุพรรณมัจฉา — ยังไม่มีชุดรูปใน repo จึงใช้ emoji; เติมไฟล์แล้วเปลี่ยนเป็น negamonPng("key", n) ได้

import type { MonsterSpecies, PassiveAbility } from "./types/negamon";

/** รูปใน `public/assets/negamon/{key}_rank{n}.png` */
function negamonPng(key: string, rankIndex: number): string {
    return `/assets/negamon/${key}_rank${rankIndex}.png`;
}

const ABILITY_ACID_RAIN: PassiveAbility    = { id: "acid_rain",      name: "ฝนกรด",       desc: "POISON ที่ติดคู่ต่อสู้ไม่หายตลอดเกม" };
const ABILITY_FLAME_BODY: PassiveAbility   = { id: "flame_body",     name: "ร่างเพลิง",    desc: "10% โอกาสผู้โจมตีติด BURN เมื่อโดนตี" };
const ABILITY_IRON_SHELL: PassiveAbility   = { id: "iron_shell",     name: "เกราะเหล็ก",   desc: "รับดาเมจลดลง 10% ตลอดเกม" };
const ABILITY_TAILWIND: PassiveAbility     = { id: "tailwind",       name: "ลมบน",         desc: "SPD สูงขึ้น 10% ตลอดเกม" };
const ABILITY_RAGE_MODE: PassiveAbility    = { id: "rage_mode",      name: "โทสะอสูร",     desc: "เมื่อ HP < 50% → ATK +25% ครั้งเดียว" };
const ABILITY_AERIAL_STRIKE: PassiveAbility = { id: "aerial_strike", name: "กระโจนจากฟ้า", desc: "Priority move ทำดาเมจเพิ่ม 20%" };
const ABILITY_STATIC: PassiveAbility       = { id: "static",         name: "สายฟ้าสถิต",   desc: "15% โอกาสผู้โจมตีติด PARALYZE เมื่อโดนตี" };
const ABILITY_GUARDIAN_SCALE: PassiveAbility = { id: "guardian_scale", name: "เกล็ดทองคุ้มครอง", desc: "เมื่อ HP < 30% → ฟื้น HP 15% ครั้งเดียว" };

export const DEFAULT_NEGAMON_SPECIES: MonsterSpecies[] = [
    // ---
    // 001 - พญานาค (WATER / PSYCHIC)
    // แข็งแกร่ง ทน ใช้ magic attack
    // ---
    {
        id: "naga",
        name: "พญานาค",
        type: "WATER",
        type2: "PSYCHIC",
        baseStats: { hp: 380, atk: 132, def: 104, spd: 108 },
        forms: [
            { rank: 0, name: "ไข่นาค",   icon: negamonPng("naga", 0),   color: "#94a3b8" },
            { rank: 1, name: "Nakat",     icon: negamonPng("naga", 1),   color: "#22c55e" },
            { rank: 2, name: "Naka",      icon: negamonPng("naga", 2),   color: "#3b82f6" },
            { rank: 3, name: "Nakaraja",  icon: negamonPng("naga", 3),   color: "#a855f7" },
            { rank: 4, name: "Phaya Nak", icon: negamonPng("naga", 4),   color: "#f97316" },
            { rank: 5, name: "Ananta",    icon: negamonPng("naga", 5),   color: "#ef4444" },
        ],
        ability: ABILITY_ACID_RAIN,
        moves: [
            { id: "naga-water-splash", name: "กระเซ็นน้ำ",       type: "WATER",   category: "SPECIAL",  power: 24, accuracy: 95,  learnRank: 1 },
            { id: "naga-bite",         name: "กัด",               type: "DARK",    category: "PHYSICAL", power: 28, accuracy: 90,  learnRank: 2 },
            { id: "naga-aqua-jet",     name: "กระโจนน้ำ",         type: "WATER",   category: "SPECIAL",  power: 32, accuracy: 100, learnRank: 3, priority: 1 },
            { id: "naga-rain-dance",   name: "ระบำขอฝน",          type: "WATER",   category: "STATUS",   power: 0,  accuracy: 100, learnRank: 4, effect: "BOOST_WATER_DMG" },
            { id: "naga-hydro-stream", name: "สายน้ำศักดิ์สิทธิ์",  type: "WATER",   category: "SPECIAL",  power: 38, accuracy: 85,  learnRank: 5 },
            { id: "naga-tidal-force",  name: "พลังคลื่นยักษ์",    type: "WATER",   category: "SPECIAL",  power: 46, accuracy: 80,  learnRank: 6, effect: "IGNORE_DEF", critBonus: 12 },
        ],
    },

    // ---
    // 002 - ครุฑ (FIRE / WIND)
    // เร็ว โจมตีสูง แต่ทนน้อย
    // ---
    {
        id: "garuda",
        name: "ครุฑ",
        type: "FIRE",
        type2: "WIND",
        baseStats: { hp: 250, atk: 170, def: 96, spd: 156 },
        forms: [
            { rank: 0, name: "ไข่ครุฑ",  icon: negamonPng("garuda", 0),  color: "#94a3b8" },
            { rank: 1, name: "Krutling",  icon: negamonPng("garuda", 1),  color: "#22c55e" },
            { rank: 2, name: "Krutha",    icon: negamonPng("garuda", 2),  color: "#3b82f6" },
            { rank: 3, name: "Kruthon",   icon: negamonPng("garuda", 3),  color: "#a855f7" },
            { rank: 4, name: "Garuda",    icon: negamonPng("garuda", 4),  color: "#f97316" },
            { rank: 5, name: "Mahagaru",  icon: negamonPng("garuda", 5),  color: "#ef4444" },
        ],
        ability: ABILITY_FLAME_BODY,
        moves: [
            { id: "garuda-ember",        name: "ลูกไฟน้อย",      type: "FIRE",   category: "SPECIAL",  power: 26, accuracy: 95,  learnRank: 1 },
            { id: "garuda-peck",         name: "จิก",             type: "WIND",   category: "PHYSICAL", power: 24, accuracy: 100, learnRank: 1, priority: 1 },
            { id: "garuda-wing-attack",  name: "กระพือปีก",       type: "WIND",   category: "PHYSICAL", power: 34, accuracy: 95,  learnRank: 2 },
            { id: "garuda-flame-burst",  name: "เปลวเพลิงระเบิด", type: "FIRE",   category: "SPECIAL",  power: 38, accuracy: 90,  learnRank: 3, effect: "BURN", effectChance: 25 },
            { id: "garuda-sky-dive",     name: "ดิ่งจากฟ้า",     type: "WIND",   category: "PHYSICAL", power: 42, accuracy: 90,  learnRank: 4, critBonus: 20 },
            { id: "garuda-divine-fire",  name: "เพลิงทิพย์",     type: "FIRE",   category: "SPECIAL",  power: 50, accuracy: 85,  learnRank: 5 },
            { id: "garuda-strike",       name: "อาวุธครุฑ",       type: "FIRE",   category: "PHYSICAL", power: 56, accuracy: 75,  learnRank: 6 },
        ],
    },

    // ---
    // 003 - สิงห์ (EARTH)
    // ทนดีที่สุด DEF สูง แต่ช้า
    // ---
    {
        id: "singha",
        name: "สิงห์",
        type: "EARTH",
        baseStats: { hp: 500, atk: 158, def: 126, spd: 62 },
        forms: [
            { rank: 0, name: "ไข่สิงห์",  icon: negamonPng("singha", 0),  color: "#94a3b8" },
            { rank: 1, name: "Singlet",    icon: negamonPng("singha", 1),  color: "#22c55e" },
            { rank: 2, name: "Sinha",      icon: negamonPng("singha", 2),  color: "#3b82f6" },
            { rank: 3, name: "Singha",     icon: negamonPng("singha", 3),  color: "#a855f7" },
            { rank: 4, name: "Ratchasinga",icon: negamonPng("singha", 4),  color: "#f97316" },
            { rank: 5, name: "Narasingha", icon: negamonPng("singha", 5),  color: "#ef4444" },
        ],
        ability: ABILITY_IRON_SHELL,
        moves: [
            { id: "singha-tackle",      name: "พุ่งชน",         type: "EARTH",  category: "PHYSICAL", power: 26, accuracy: 100, learnRank: 1 },
            { id: "singha-roar",        name: "คำราม",          type: "EARTH",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "LOWER_ATK", priority: 1 },
            { id: "singha-earth-slam",  name: "กระทืบแผ่นดิน",  type: "EARTH",  category: "PHYSICAL", power: 34, accuracy: 90,  learnRank: 2 },
            { id: "singha-harden",      name: "เกราะหิน",       type: "EARTH",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 3, effect: "BOOST_DEF" },
            { id: "singha-quake",       name: "แผ่นดินสั่น",    type: "EARTH",  category: "PHYSICAL", power: 40, accuracy: 85,  learnRank: 4 },
            { id: "singha-royal-roar",  name: "คำรามราชัน",     type: "EARTH",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 5, effect: "LOWER_ATK_ALL" },
            { id: "singha-earth-king",  name: "ราชาแห่งแผ่นดิน", type: "EARTH",  category: "PHYSICAL", power: 52, accuracy: 80,  learnRank: 6 },
        ],
    },

    // ---
    // 004 - กินรี (WIND)
    // เร็วที่สุด Heal ตัวเองได้ แต่ ATK ต่ำ
    // ---
    {
        id: "kinnaree",
        name: "กินรี",
        type: "WIND",
        baseStats: { hp: 300, atk: 146, def: 102, spd: 188 },
        forms: [
            { rank: 0, name: "ไข่กินรี",  icon: negamonPng("kinnaree", 0),  color: "#94a3b8" },
            { rank: 1, name: "Kinnari",    icon: negamonPng("kinnaree", 1),  color: "#22c55e" },
            { rank: 2, name: "Kinnara",    icon: negamonPng("kinnaree", 2),  color: "#3b82f6" },
            { rank: 3, name: "Kinnaree",   icon: negamonPng("kinnaree", 3),  color: "#a855f7" },
            { rank: 4, name: "Hamsa",      icon: negamonPng("kinnaree", 4),  color: "#f97316" },
            { rank: 5, name: "Celestia",   icon: negamonPng("kinnaree", 5),  color: "#ef4444" },
        ],
        ability: ABILITY_TAILWIND,
        moves: [
            { id: "kinnaree-gust",          name: "สายลม",          type: "WIND",  category: "SPECIAL",  power: 24, accuracy: 95,  learnRank: 1, priority: 1 },
            { id: "kinnaree-grace-dance",   name: "ระบำงดงาม",      type: "WIND",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "BOOST_SPD" },
            { id: "kinnaree-air-slash",     name: "กรีดลม",         type: "WIND",  category: "SPECIAL",  power: 32, accuracy: 95,  learnRank: 2, effect: "PARALYZE", effectChance: 20 },
            { id: "kinnaree-feather-storm", name: "พายุขนนก",       type: "WIND",  category: "SPECIAL",  power: 36, accuracy: 90,  learnRank: 3 },
            { id: "kinnaree-heaven-song",   name: "บทเพลงสวรรค์",  type: "WIND",  category: "HEAL",     power: 0,  accuracy: 100, learnRank: 4, effect: "HEAL_25" },
            { id: "kinnaree-heaven-dive",   name: "ดิ่งลงฟ้า",     type: "WIND",  category: "PHYSICAL", power: 44, accuracy: 85,  learnRank: 5 },
            { id: "kinnaree-divine-storm",  name: "พายุทิพย์",     type: "WIND",  category: "SPECIAL",  power: 50, accuracy: 80,  learnRank: 6 },
        ],
    },

    // ---
    // 005 - ทศกัณฑ์ (DARK / FIRE)
    // โจมตีสูงมาก แต่ช้าและป้องกันน้อย
    // ---
    {
        id: "thotsakan",
        name: "ทศกัณฑ์",
        type: "DARK",
        type2: "FIRE",
        baseStats: { hp: 430, atk: 182, def: 124, spd: 68 },
        forms: [
            { rank: 0, name: "ไข่ยักษ์",  icon: negamonPng("thotsakan", 0),  color: "#94a3b8" },
            { rank: 1, name: "Yak Noi",    icon: negamonPng("thotsakan", 1),  color: "#22c55e" },
            { rank: 2, name: "Yak",        icon: negamonPng("thotsakan", 2),  color: "#3b82f6" },
            { rank: 3, name: "Yaksha",     icon: negamonPng("thotsakan", 3),  color: "#a855f7" },
            { rank: 4, name: "Thotsakan",  icon: negamonPng("thotsakan", 4),  color: "#f97316" },
            { rank: 5, name: "Asura King", icon: negamonPng("thotsakan", 5),  color: "#ef4444" },
        ],
        ability: ABILITY_RAGE_MODE,
        moves: [
            { id: "thot-dark-punch",    name: "หมัดมืด",       type: "DARK",  category: "PHYSICAL", power: 26, accuracy: 95,  learnRank: 1 },
            { id: "thot-intimidate",    name: "ขู่กรรโชก",     type: "DARK",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "LOWER_ATK" },
            { id: "thot-shadow-claw",   name: "กรงเล็บเงา",    type: "DARK",  category: "PHYSICAL", power: 34, accuracy: 90,  learnRank: 2, critBonus: 20 },
            { id: "thot-ten-faces",     name: "สิบหน้า",       type: "DARK",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 3, effect: "BOOST_ATK" },
            { id: "thot-dark-fire",     name: "เพลิงมืด",      type: "FIRE",  category: "SPECIAL",  power: 38, accuracy: 85,  learnRank: 4, effect: "BURN", effectChance: 30 },
            { id: "thot-demon-rage",    name: "โทสะอสูร",      type: "DARK",  category: "PHYSICAL", power: 46, accuracy: 85,  learnRank: 5 },
            { id: "thot-asura-burst",   name: "พลังอสูร",      type: "DARK",  category: "SPECIAL",  power: 54, accuracy: 80,  learnRank: 6 },
        ],
    },

    // ---
    // 006 - หนุมาน (WIND / LIGHT)
    // เร็วสูง โจมตีกายภาพแรง
    // ---
    {
        id: "hanuman",
        name: "หนุมาน",
        type: "WIND",
        type2: "LIGHT",
        baseStats: { hp: 270, atk: 164, def: 112, spd: 160 },
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
            { id: "hanuman-vayu-strike", name: "หมัดวายุ",          type: "WIND",   category: "PHYSICAL", power: 24, accuracy: 95,  learnRank: 1, priority: 1 },
            { id: "hanuman-agility",     name: "ปราดเปรียว",        type: "WIND",   category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "BOOST_SPD" },
            { id: "hanuman-slash",       name: "สามกรีด",           type: "WIND",   category: "PHYSICAL", power: 34, accuracy: 90,  learnRank: 2, critBonus: 20 },
            { id: "hanuman-yawn-stars",  name: "หาวเป็นดาวเดือน",   type: "LIGHT",  category: "STATUS",   power: 0,  accuracy: 100, learnRank: 3, effect: "SLEEP" },
            { id: "hanuman-cloud-dash",  name: "พุ่งก้อนเมฆ",      type: "WIND",   category: "PHYSICAL", power: 40, accuracy: 90,  learnRank: 4 },
            { id: "hanuman-sacred-fist", name: "กำปั้นศักดิ์สิทธิ์", type: "LIGHT", category: "PHYSICAL", power: 48, accuracy: 85, learnRank: 5, effect: "IGNORE_DEF" },
            { id: "hanuman-divine-inc",  name: "อวตารเทพ",          type: "LIGHT",  category: "PHYSICAL", power: 56, accuracy: 80,  learnRank: 6 },
        ],
    },

    // ---
    // 007 - เมขลา (THUNDER / LIGHT)
    // สายเวทย์สายฟ้า รวดเร็ว
    // ---
    {
        id: "mekkala",
        name: "เมขลา",
        type: "THUNDER",
        type2: "LIGHT",
        baseStats: { hp: 300, atk: 142, def: 108, spd: 168 },
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
            { id: "mekkala-jewel-flash",   name: "แสงวาบแก้ว",  type: "LIGHT",   category: "SPECIAL",  power: 24, accuracy: 95,  learnRank: 1 },
            { id: "mekkala-entice",        name: "ล่อแก้ว",     type: "LIGHT",   category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "LOWER_ATK" },
            { id: "mekkala-thunder",       name: "ฟ้าผ่า",      type: "THUNDER", category: "SPECIAL",  power: 32, accuracy: 90,  learnRank: 2, effect: "PARALYZE", effectChance: 25 },
            { id: "mekkala-crystal-glare", name: "ประกายแก้ว",  type: "LIGHT",   category: "SPECIAL",  power: 34, accuracy: 95,  learnRank: 3, effect: "LOWER_DEF", critBonus: 15 },
            { id: "mekkala-prism",         name: "แสงปริซึม",   type: "LIGHT",   category: "SPECIAL",  power: 40, accuracy: 90,  learnRank: 4 },
            { id: "mekkala-storm",         name: "คลื่นพายุฟ้า", type: "THUNDER", category: "SPECIAL",  power: 48, accuracy: 85,  learnRank: 5 },
            { id: "mekkala-judgment",      name: "วันตัดสิน",   type: "LIGHT",   category: "SPECIAL",  power: 54, accuracy: 80,  learnRank: 6 },
        ],
    },

    // ---
    // 008 - สุพรรณมัจฉา (WATER / LIGHT)
    // สายแทงค์ เลือดเยอะ ป้องกันดี
    // ---
    {
        id: "suvannamaccha",
        name: "สุพรรณมัจฉา",
        type: "WATER",
        type2: "LIGHT",
        baseStats: { hp: 420, atk: 148, def: 128, spd: 102 },
        forms: [
            { rank: 0, name: "ไข่ทองคำ",   icon: "🥚",   color: "#94a3b8" },
            { rank: 1, name: "Baby Mermaid", icon: "\u{1F9DC}\u{200D}\u{2640}\u{FE0F}",   color: "#22c55e" },
            { rank: 2, name: "Princess",     icon: "👸",   color: "#3b82f6" },
            { rank: 3, name: "Suvanna",      icon: "\u{1F9DC}\u{200D}\u{2640}\u{FE0F}",   color: "#a855f7" },
            { rank: 4, name: "Golden Queen", icon: "\u{1F9DC}\u{200D}\u{2640}\u{FE0F}",   color: "#f97316" },
            { rank: 5, name: "Sea Empress",  icon: "\u{1F9DC}\u{200D}\u{2640}\u{FE0F}",   color: "#ef4444" },
        ],
        ability: ABILITY_GUARDIAN_SCALE,
        moves: [
            { id: "suvanna-water-gun",   name: "พ่นน้ำ",          type: "WATER",   category: "SPECIAL",  power: 24, accuracy: 95,  learnRank: 1 },
            { id: "suvanna-bubble",      name: "โล่ฟองน้ำ",      type: "WATER",   category: "STATUS",   power: 0,  accuracy: 100, learnRank: 1, effect: "BOOST_DEF" },
            { id: "suvanna-healing",     name: "รักษาทอง",       type: "LIGHT",   category: "HEAL",     power: 0,  accuracy: 100, learnRank: 2, effect: "HEAL_25" },
            { id: "suvanna-wave",        name: "คลื่นน้ำ",       type: "WATER",   category: "SPECIAL",  power: 34, accuracy: 90,  learnRank: 3 },
            { id: "suvanna-lullaby",     name: "เพลงนางเงือก",   type: "LIGHT",   category: "STATUS",   power: 0,  accuracy: 100, learnRank: 4, effect: "SLEEP" },
            { id: "suvanna-golden-tide", name: "คลื่นทองคำ",     type: "WATER",   category: "SPECIAL",  power: 44, accuracy: 85,  learnRank: 5, effect: "BOOST_DEF" },
            { id: "suvanna-blessing",    name: "พรแห่งท้องทะเล", type: "WATER",   category: "SPECIAL",  power: 50, accuracy: 80,  learnRank: 6 },
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


