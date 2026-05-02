"use strict";
// ============================================================
// Negamon Classroom RPG - Default Monster Species
// 5 สายพันธุ์จากตำนานไทย / หิมพานต์
//
// แต่ละสายพันธุ์: type + type2 ครบคู่; สกิล 4 ท่า (learnRank 3–6) กระจาย 2 ธาตุของสายพันธุ์
// ท่า "โจมตีธรรมดา" ไม่เก็บที่นี่ — ระบบฝัง (type NORMAL = ไร้ธาตุ, ไม่ STAB ตามมอน)
// ============================================================
//
// forms[].icon: emoji หรือ path ใต้ public (เช่น /assets/negamon/naga_rank0.png)
// พญานาค ครุฑ สิงห์ กินรี ทศกัณฑ์ — ใช้ PNG ชุดใน public/assets/negamon/ (negamonPng)
// หนุมาน เมขลา สุพรรณมัจฉา — ยังไม่มีชุดรูปใน repo จึงใช้ emoji; เติมไฟล์แล้วเปลี่ยนเป็น negamonPng("key", n) ได้
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_NEGAMON_SPECIES = void 0;
exports.findSpeciesById = findSpeciesById;
exports.createDefaultNegamonSettings = createDefaultNegamonSettings;
/** รูปใน `public/assets/negamon/{key}_rank{n}.png` */
function negamonPng(key, rankIndex) {
    return `/assets/negamon/${key}_rank${rankIndex}.png`;
}
const ABILITY_ACID_RAIN = { id: "acid_rain", name: "ฝนกรด", desc: "เมื่อฝ่ายตรงข้ามติดพิษ — แต่ละปลายเทิร์นดาเมจพิษ +2% ของ max HP ต่อทิก (สะสม)" };
const ABILITY_FLAME_BODY = { id: "flame_body", name: "ร่างเพลิง", desc: "เมื่อ HP ต่ำกว่า 50% → ดาเมจไหม้ที่ศัตรูรับ +7% ของ max HP ต่อปลายเทิร์น" };
const ABILITY_IRON_SHELL = { id: "iron_shell", name: "เกราะเหล็ก", desc: "DEF +10% ตลอดการต่อสู้" };
const ABILITY_TAILWIND = { id: "tailwind", name: "ลมบน", desc: "SPD สูงขึ้น 10% ตลอดเกม" };
const ABILITY_RAGE_MODE = { id: "rage_mode", name: "โทสะอสูร", desc: "เมื่อ HP < 50% → ATK +25% ครั้งเดียว" };
const ABILITY_AERIAL_STRIKE = { id: "aerial_strike", name: "กระโจนจากฟ้า", desc: "โบนัสอัตราคริ: +20%" };
const ABILITY_VOLT_FLOW = { id: "volt_flow", name: "พลังฟ้าไหลวน", desc: "ฟื้น EN เพิ่ม +15 ทุกปลายเทิร์น" };
const ABILITY_GUARDIAN_SCALE = { id: "guardian_scale", name: "เกล็ดทองคุ้มครอง", desc: "เมื่อ HP < 30% → ฟื้น HP 15% ครั้งเดียว" };
exports.DEFAULT_NEGAMON_SPECIES = [
    // ---
    // 001 - พญานาค (WATER / DARK)
    // แข็งแกร่ง ทน — น้ำลึกกับเงามืด
    // ---
    {
        id: "naga",
        name: "พญานาค",
        type: "WATER",
        type2: "DARK",
        baseStats: { hp: 400, atk: 156, def: 138, spd: 106 },
        forms: [
            { rank: 0, name: "ไข่นาค", icon: negamonPng("naga", 0), color: "#94a3b8" },
            { rank: 1, name: "Nakat", icon: negamonPng("naga", 1), color: "#22c55e" },
            { rank: 2, name: "Naka", icon: negamonPng("naga", 2), color: "#3b82f6" },
            { rank: 3, name: "Nakaraja", icon: negamonPng("naga", 3), color: "#a855f7" },
            { rank: 4, name: "Phaya Nak", icon: negamonPng("naga", 4), color: "#f97316" },
            { rank: 5, name: "Ananta", icon: negamonPng("naga", 5), color: "#ef4444" },
        ],
        ability: ABILITY_ACID_RAIN,
        moves: [
            { id: "naga-aqua-jet", name: "กระโจนน้ำ", type: "WATER", category: "SPECIAL", power: 32, accuracy: 100, learnRank: 3 },
            { id: "naga-mind-snare", name: "เงาสะกดยมนาค", type: "DARK", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, effect: "LOWER_ATK" },
            { id: "naga-astral-surge", name: "คลื่นทมิฬลึก", type: "DARK", category: "SPECIAL", power: 38, accuracy: 88, learnRank: 5, drainPct: 25 },
            { id: "naga-tidal-force", name: "ยมสมุทรเกลียวคลื่น", type: "WATER", category: "SPECIAL", power: 46, accuracy: 76, learnRank: 6, effect: "BADLY_POISON", effectChance: 100, critBonus: 10 },
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
        baseStats: { hp: 280, atk: 188, def: 104, spd: 172 },
        forms: [
            { rank: 0, name: "ไข่ครุฑ", icon: negamonPng("garuda", 0), color: "#94a3b8" },
            { rank: 1, name: "Krutling", icon: negamonPng("garuda", 1), color: "#22c55e" },
            { rank: 2, name: "Krutha", icon: negamonPng("garuda", 2), color: "#3b82f6" },
            { rank: 3, name: "Kruthon", icon: negamonPng("garuda", 3), color: "#a855f7" },
            { rank: 4, name: "Garuda", icon: negamonPng("garuda", 4), color: "#f97316" },
            { rank: 5, name: "Mahagaru", icon: negamonPng("garuda", 5), color: "#ef4444" },
        ],
        ability: ABILITY_FLAME_BODY,
        moves: [
            { id: "garuda-flame-burst", name: "เปลวเพลิงระเบิด", type: "FIRE", category: "SPECIAL", power: 37, accuracy: 90, learnRank: 3, effect: "BURN", effectChance: 100 },
            { id: "garuda-sky-dive", name: "ดิ่งจากฟ้า", type: "WIND", category: "PHYSICAL", power: 42, accuracy: 90, learnRank: 4, critBonus: 20 },
            { id: "garuda-cyclone-scar", name: "แผลพายุเทพ", type: "WIND", category: "SPECIAL", power: 48, accuracy: 85, learnRank: 5 },
            { id: "garuda-strike", name: "เพลิงมหาครุฑวิถี", type: "FIRE", category: "PHYSICAL", power: 50, accuracy: 71, learnRank: 6, effect: "BURN", effectChance: 100 },
        ],
    },
    // ---
    // 003 - สิงห์ (EARTH / FIRE)
    // ทนดีที่สุด DEF สูง แต่ช้า — เพลิงราชสีห์
    // ---
    {
        id: "singha",
        name: "สิงห์",
        type: "EARTH",
        type2: "FIRE",
        baseStats: { hp: 560, atk: 176, def: 148, spd: 82 },
        forms: [
            { rank: 0, name: "ไข่สิงห์", icon: negamonPng("singha", 0), color: "#94a3b8" },
            { rank: 1, name: "Singlet", icon: negamonPng("singha", 1), color: "#22c55e" },
            { rank: 2, name: "Sinha", icon: negamonPng("singha", 2), color: "#3b82f6" },
            { rank: 3, name: "Singha", icon: negamonPng("singha", 3), color: "#a855f7" },
            { rank: 4, name: "Ratchasinga", icon: negamonPng("singha", 4), color: "#f97316" },
            { rank: 5, name: "Narasingha", icon: negamonPng("singha", 5), color: "#ef4444" },
        ],
        ability: ABILITY_IRON_SHELL,
        moves: [
            { id: "singha-earth-slam", name: "กระทืบแผ่นดิน", type: "EARTH", category: "PHYSICAL", power: 34, accuracy: 90, learnRank: 3 },
            { id: "singha-blaze-claw", name: "กรงเล็บเพลิงราชา", type: "FIRE", category: "PHYSICAL", power: 41, accuracy: 88, learnRank: 4 },
            { id: "singha-crimson-mane", name: "ยศเปลวสีห์", type: "FIRE", category: "SPECIAL", power: 41, accuracy: 86, learnRank: 5, effect: "BURN", effectChance: 100, effectBurnDotRate: 0.04, effectDurationTurns: 3 },
            { id: "singha-earth-king", name: "สิงห์ถล่มพิภพ", type: "EARTH", category: "PHYSICAL", power: 50, accuracy: 73, learnRank: 6, effect: "BOOST_DEF_20", effectChance: 100 },
        ],
    },
    // ---
    // 004 - กินรี (WIND / LIGHT)
    // เร็วที่สุด Heal ตัวเองได้ แต่ ATK ต่ำ — แสงแห่งสวรรค์
    // ---
    {
        id: "kinnaree",
        name: "กินรี",
        type: "WIND",
        type2: "LIGHT",
        baseStats: { hp: 320, atk: 162, def: 122, spd: 194 },
        forms: [
            { rank: 0, name: "ไข่กินรี", icon: negamonPng("kinnaree", 0), color: "#94a3b8" },
            { rank: 1, name: "Kinnari", icon: negamonPng("kinnaree", 1), color: "#22c55e" },
            { rank: 2, name: "Kinnara", icon: negamonPng("kinnaree", 2), color: "#3b82f6" },
            { rank: 3, name: "Kinnaree", icon: negamonPng("kinnaree", 3), color: "#a855f7" },
            { rank: 4, name: "Hamsa", icon: negamonPng("kinnaree", 4), color: "#f97316" },
            { rank: 5, name: "Celestia", icon: negamonPng("kinnaree", 5), color: "#ef4444" },
        ],
        ability: ABILITY_TAILWIND,
        moves: [
            { id: "kinnaree-air-slash", name: "กรีดลม", type: "WIND", category: "SPECIAL", power: 31, accuracy: 95, learnRank: 3, effect: "BOOST_SPD_30", effectChance: 100 },
            {
                id: "kinnaree-radiant-slash",
                name: "รังสีกรีดอากาศ",
                type: "LIGHT",
                category: "SPECIAL",
                power: 34,
                accuracy: 92,
                learnRank: 4,
                effect: "IGNORE_DEF",
                effectChance: 100,
                effectIgnoreDefRetained: 0.75,
            },
            { id: "kinnaree-heaven-song", name: "บทเพลงสวรรค์", type: "LIGHT", category: "HEAL", power: 0, accuracy: 100, learnRank: 5, effect: "HEAL_25" },
            {
                id: "kinnaree-divine-storm",
                name: "วังวนสวรรค์",
                type: "WIND",
                category: "SPECIAL",
                power: 44,
                accuracy: 76,
                learnRank: 6,
                effect: "LOWER_SPD",
                effectChance: 100,
                effectDurationTurns: 3,
                selfEffect: "BOOST_SPD_100",
                selfEffectDurationTurns: 3,
            },
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
        baseStats: { hp: 480, atk: 198, def: 144, spd: 90 },
        forms: [
            { rank: 0, name: "ไข่ยักษ์", icon: negamonPng("thotsakan", 0), color: "#94a3b8" },
            { rank: 1, name: "Yak Noi", icon: negamonPng("thotsakan", 1), color: "#22c55e" },
            { rank: 2, name: "Yak", icon: negamonPng("thotsakan", 2), color: "#3b82f6" },
            { rank: 3, name: "Yaksha", icon: negamonPng("thotsakan", 3), color: "#a855f7" },
            { rank: 4, name: "Thotsakan", icon: negamonPng("thotsakan", 4), color: "#f97316" },
            { rank: 5, name: "Asura King", icon: negamonPng("thotsakan", 5), color: "#ef4444" },
        ],
        ability: ABILITY_RAGE_MODE,
        moves: [
            { id: "thot-shadow-claw", name: "กรงเล็บเงา", type: "DARK", category: "PHYSICAL", power: 34, accuracy: 90, learnRank: 3, drainPct: 25 },
            { id: "thot-ten-faces", name: "สิบหน้า", type: "DARK", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, effect: "BOOST_ATK" },
            { id: "thot-hell-fist", name: "หมัดเพลิงนรก", type: "FIRE", category: "PHYSICAL", power: 46, accuracy: 85, learnRank: 5 },
            { id: "thot-asura-burst", name: "เพลิงอสูรสิบหน้า", type: "FIRE", category: "SPECIAL", power: 50, accuracy: 72, learnRank: 6, effect: "BURN", effectChance: 100, critBonus: 12 },
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
        baseStats: { hp: 320, atk: 182, def: 130, spd: 176 },
        forms: [
            { rank: 0, name: "ไข่วานร", icon: negamonPng("hanuman", 0), color: "#94a3b8" },
            { rank: 1, name: "ลิงน้อย", icon: negamonPng("hanuman", 1), color: "#22c55e" },
            { rank: 2, name: "Young Warrior", icon: negamonPng("hanuman", 2), color: "#3b82f6" },
            { rank: 3, name: "Hanuman", icon: negamonPng("hanuman", 3), color: "#a855f7" },
            { rank: 4, name: "ลิงเผือก", icon: negamonPng("hanuman", 4), color: "#f97316" },
            { rank: 5, name: "พญาอนุชิต", icon: negamonPng("hanuman", 5), color: "#ef4444" },
        ],
        ability: ABILITY_AERIAL_STRIKE,
        moves: [
            { id: "hanuman-slash", name: "สามกรีด", type: "WIND", category: "PHYSICAL", power: 34, accuracy: 90, learnRank: 3, critBonus: 20 },
            { id: "hanuman-yawn-stars", name: "หาวเป็นดาวเดือน", type: "LIGHT", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, effect: "SLEEP" },
            { id: "hanuman-cloud-dash", name: "พุ่งก้อนเมฆ", type: "WIND", category: "PHYSICAL", power: 40, accuracy: 90, learnRank: 5 },
            { id: "hanuman-divine-inc", name: "พระหัตถ์ทลายเกราะ", type: "LIGHT", category: "PHYSICAL", power: 46, accuracy: 75, learnRank: 6, effect: "IGNORE_DEF", effectChance: 100, critBonus: 30 },
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
        baseStats: { hp: 330, atk: 170, def: 128, spd: 186 },
        forms: [
            { rank: 0, name: "ไข่สายฟ้า", icon: negamonPng("mekkala", 0), color: "#94a3b8" },
            { rank: 1, name: "Little Maiden", icon: negamonPng("mekkala", 1), color: "#22c55e" },
            { rank: 2, name: "Storm Maiden", icon: negamonPng("mekkala", 2), color: "#3b82f6" },
            { rank: 3, name: "Goddess", icon: negamonPng("mekkala", 3), color: "#a855f7" },
            { rank: 4, name: "Mani Mekkala", icon: negamonPng("mekkala", 4), color: "#f97316" },
            { rank: 5, name: "Jewel Empress", icon: negamonPng("mekkala", 5), color: "#ef4444" },
        ],
        ability: ABILITY_VOLT_FLOW,
        moves: [
            { id: "mekkala-thunder", name: "ฟ้าผ่า", type: "THUNDER", category: "SPECIAL", power: 31, accuracy: 90, learnRank: 3, effect: "LOWER_EN_REGEN", effectChance: 100, effectRegenPenalty: 15, effectDurationTurns: 2 },
            { id: "mekkala-crystal-glare", name: "ประกายแก้ว", type: "LIGHT", category: "SPECIAL", power: 31, accuracy: 95, learnRank: 4, effect: "LOWER_DEF", effectChance: 100, critBonus: 10 },
            { id: "mekkala-prism", name: "แสงปริซึม", type: "LIGHT", category: "SPECIAL", power: 40, accuracy: 90, learnRank: 5 },
            { id: "mekkala-judgment", name: "แส้สายฟ้าตัดสิน", type: "THUNDER", category: "SPECIAL", power: 48, accuracy: 74, learnRank: 6, effect: "PARALYZE", effectChance: 100, effectDurationTurns: 1, effectParalyzeFullSkip: true, energyCost: 70 },
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
        baseStats: { hp: 500, atk: 168, def: 146, spd: 110 },
        forms: [
            { rank: 0, name: "ไข่ทองคำ", icon: negamonPng("suvannamaccha", 0), color: "#94a3b8" },
            { rank: 1, name: "Baby Mermaid", icon: negamonPng("suvannamaccha", 1), color: "#22c55e" },
            { rank: 2, name: "Princess", icon: negamonPng("suvannamaccha", 2), color: "#3b82f6" },
            { rank: 3, name: "Suvanna", icon: negamonPng("suvannamaccha", 3), color: "#a855f7" },
            { rank: 4, name: "Golden Queen", icon: negamonPng("suvannamaccha", 4), color: "#f97316" },
            { rank: 5, name: "Sea Empress", icon: negamonPng("suvannamaccha", 5), color: "#ef4444" },
        ],
        ability: ABILITY_GUARDIAN_SCALE,
        moves: [
            { id: "suvanna-wave", name: "คลื่นน้ำ", type: "WATER", category: "SPECIAL", power: 34, accuracy: 90, learnRank: 3 },
            { id: "suvanna-lullaby", name: "เพลงนางเงือก", type: "LIGHT", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, effect: "SLEEP" },
            { id: "suvanna-golden-tide", name: "คลื่นทองศักดิ์สิทธิ์", type: "LIGHT", category: "SPECIAL", power: 38, accuracy: 85, learnRank: 5, effect: "BOOST_DEF" },
            { id: "suvanna-blessing", name: "สมุทรนิทราประกายทอง", type: "WATER", category: "SPECIAL", power: 48, accuracy: 78, learnRank: 6, drainPct: 50 },
        ],
    },
];
/** ค้นหา species จาก id */
function findSpeciesById(id) {
    return exports.DEFAULT_NEGAMON_SPECIES.find(s => s.id === id);
}
/** Default NegamonSettings สำหรับห้องใหม่ */
function createDefaultNegamonSettings() {
    return {
        enabled: false,
        allowStudentChoice: true,
        expPerPoint: 10,
        expPerAttendance: 20,
        species: exports.DEFAULT_NEGAMON_SPECIES,
        studentMonsters: {},
    };
}
