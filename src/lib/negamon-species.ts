// ============================================================
// Negamon Classroom RPG - Default Monster Species
// Reworked starter roster aligned to the V2 battle system.
// ============================================================

import type { MonsterSpecies, PassiveAbility } from "./types/negamon";

const ABILITY_PREDATOR_HEAT: PassiveAbility = {
    id: "rage_mode",
    name: "สัญชาตญาณเพลิงล่า",
    desc: "หนึ่งครั้งต่อการต่อสู้ เมื่อ HP ต่ำกว่า 50% จะเพิ่มพลังโจมตี 25%",
};

const ABILITY_STORM_EDGE: PassiveAbility = {
    id: "aerial_strike",
    name: "จังหวะปีกแรก",
    desc: "ท่าโจมตีมีโอกาสคริติคอลเพิ่ม 20% ตราบใดที่แอโรลิสก์ยังครองจังหวะ",
};

const ABILITY_GRAVE_HIDE: PassiveAbility = {
    id: "iron_shell",
    name: "กระดองสุสาน",
    desc: "เมื่อเริ่มต่อสู้ เทอร์รานัวร์จะมีพลังป้องกันสูงขึ้น 10% ตลอดไฟต์",
};

const ABILITY_MOON_BLESSING: PassiveAbility = {
    id: "guardian_scale",
    name: "เมตตาไข่มุก",
    desc: "หนึ่งครั้งต่อการต่อสู้ เมื่อ HP ต่ำกว่า 30% จะฟื้น HP 15%",
};

const ABILITY_BLACKOUT_CORE: PassiveAbility = {
    id: "volt_flow",
    name: "โครงข่ายดับแสง",
    desc: "เมื่อจบแต่ละเทิร์น จะฟื้น EN เพิ่มอีก 15 เพื่อกดดันต่อเนื่อง",
};

const ABILITY_TITAN_CURRENT: PassiveAbility = {
    id: "acid_rain",
    name: "พิษกระแสวน",
    desc: "ศัตรูที่ติดพิษจะได้รับความเสียหายปลายเทิร์นเพิ่มอีก 2% ของ HP สูงสุด",
};

export const DEFAULT_NEGAMON_SPECIES: MonsterSpecies[] = [
    {
        id: "pyronox",
        name: "ไพรอน็อกซ์",
        type: "FIRE",
        battleRole: "burst",
        baseStats: { hp: 330, atk: 192, def: 108, spd: 164, spa: 130 },
        forms: [
            { rank: 0, name: "ไข่เถ้าถ่าน", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "ลูกเพลิงถ่าน", icon: "🐾", color: "#ef4444" },
            { rank: 2, name: "นักล่าเถ้าควัน", icon: "🐺", color: "#f97316" },
            { rank: 3, name: "ไพรอน็อกซ์", icon: "🔥", color: "#dc2626" },
            { rank: 4, name: "เขี้ยวนรกเพลิง", icon: "🦁", color: "#b91c1c" },
            { rank: 5, name: "ราชาเพลิงอำมหิต", icon: "👹", color: "#7f1d1d" },
        ],
        ability: ABILITY_PREDATOR_HEAT,
        moves: [
            { id: "pyronox-ember-fang", name: "ขย้ำเถ้าเพลิง", type: "FIRE", category: "PHYSICAL", power: 65, accuracy: 95, learnRank: 1, learnLevel: 1, displayDescription: "งับฝังเขี้ยวเพลิงใส่เป้าหมายอย่างดุดัน เป็นท่าเปิดที่บอกตัวตนสายล่าของไพรอน็อกซ์ทันที", effectFamily: "STRIKE", flags: ["contact", "bite", "protectable"], roleTag: "opener" },
            { id: "pyronox-war-cry", name: "คำรามเพลิงล่า", type: "FIRE", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, learnLevel: 8, displayDescription: "เปล่งคำรามพ่นเปลวเพลิงใส่ศัตรู ทำให้ติดสถานะเผาไหม้และสูญเสียเลือดทุกเทิร์น", effect: "BURN", effectChance: 100, effectDurationTurns: 3, effectFamily: "ENEMY_DEBUFF", flags: ["sound", "protectable"], roleTag: "control" },
            { id: "pyronox-hell-dive", name: "เพลิงนรกถล่ม", type: "FIRE", category: "SPECIAL", power: 100, accuracy: 50, learnRank: 6, learnLevel: 26, displayDescription: "ทิ้งตัวลงมาพร้อมเปลวเพลิงนรกที่เสี่ยงพลาดสูง แต่ถ้าโดนจะเผาเป้าหมายแน่นอน", effect: "BURN", effectChance: 100, effectDurationTurns: 3, effectFamily: "FINISHER", flags: ["protectable"], roleTag: "finisher" },
        ],
    },
    {
        id: "aerolisk",
        name: "แอโรลิสก์",
        type: "ELECTRICITY",
        battleRole: "tempo",
        baseStats: { hp: 298, atk: 174, def: 116, spd: 198, spa: 168 },
        forms: [
            { rank: 0, name: "ไข่พายุ", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "ลูกลมอ่อน", icon: "🐣", color: "#22d3ee" },
            { rank: 2, name: "กรงเล็บเมฆ", icon: "🪶", color: "#38bdf8" },
            { rank: 3, name: "แอโรลิสก์", icon: "🪽", color: "#0ea5e9" },
            { rank: 4, name: "คมมีดท้องฟ้า", icon: "⚡", color: "#eab308" },
            { rank: 5, name: "แร็พเตอร์พายุคลั่ง", icon: "🌪️", color: "#ca8a04" },
        ],
        ability: ABILITY_STORM_EDGE,
        moves: [
            { id: "aerolisk-gale-cut", name: "จิกพายุ", type: "ELECTRICITY", category: "PHYSICAL", power: 60, accuracy: 100, learnRank: 1, learnLevel: 1, displayDescription: "จิกฟันพร้อมคมลมที่พุ่งเร็วและนิ่ง ใช้ชิงโมเมนตัมตั้งแต่ต้นไฟต์", effectFamily: "STRIKE", flags: ["contact", "protectable"], roleTag: "opener" },
            { id: "aerolisk-tail-rush", name: "อาร์กช็อกฟาด", type: "ELECTRICITY", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, learnLevel: 8, displayDescription: "ปล่อยกระแสไฟฟ้าอาร์กฟาดศัตรู ทำให้หยุดชะงักและข้ามเทิร์นถัดไปไม่ได้", effect: "PARALYZE", effectChance: 100, effectDurationTurns: 1, effectParalyzeFullSkip: true, effectFamily: "ENEMY_DEBUFF", flags: ["protectable"], roleTag: "control" },
            { id: "aerolisk-skybreaker", name: "คำพิพากษาพายุ", type: "ELECTRICITY", category: "SPECIAL", power: 100, accuracy: 95, learnRank: 6, learnLevel: 26, displayDescription: "ปล่อยคมลมพิพากษาจากฟากฟ้า โจมตีหนักและมีโอกาสคริติคอลสูงกว่าปกติ", critBonus: 30, effectFamily: "FINISHER", flags: ["highCrit", "protectable"], roleTag: "finisher" },
        ],
    },
    {
        id: "terranoir",
        name: "เทอร์รานัวร์",
        type: "GRASS",
        battleRole: "wall",
        baseStats: { hp: 510, atk: 150, def: 162, spd: 80, spa: 120 },
        forms: [
            { rank: 0, name: "เมล็ดฝังดิน", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "กระดองฝุ่นผง", icon: "🪨", color: "#78716c" },
            { rank: 2, name: "หนังสุสาน", icon: "🦂", color: "#57534e" },
            { rank: 3, name: "เทอร์รานัวร์", icon: "🦬", color: "#44403c" },
            { rank: 4, name: "ป้อมปราการหลุมศพ", icon: "🗿", color: "#292524" },
            { rank: 5, name: "ไททันคาตาคอมบ์", icon: "🏔", color: "#1c1917" },
        ],
        ability: ABILITY_GRAVE_HIDE,
        moves: [
            { id: "terranoir-grave-slam", name: "หมัดหลุมศพ", type: "GRASS", category: "PHYSICAL", power: 34, accuracy: 100, learnRank: 1, learnLevel: 1, displayDescription: "หมัดหินหนักแน่น เปิดเกมสายยื้อของเทอร์รานัวร์", effectFamily: "STRIKE", flags: ["contact", "protectable"], roleTag: "opener" },
            { id: "terranoir-bastion-hide", name: "รากดึงขา", type: "GRASS", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, learnLevel: 8, displayDescription: "แทงรากหินจากดินดึงขาศัตรูให้ช้าลงอย่างชัดเจน เปิดโอกาสให้เทอร์รานัวร์ยืนเกมรับได้ดีขึ้น", effect: "LOWER_SPD", effectChance: 100, effectDurationTurns: 3, effectFamily: "ENEMY_DEBUFF", flags: ["protectable"], roleTag: "control" },
            { id: "terranoir-catacomb-crush", name: "ทลายคาตาคอมบ์", type: "GRASS", category: "PHYSICAL", power: 95, accuracy: 95, learnRank: 6, learnLevel: 26, displayDescription: "กดร่างทะลวงพื้นดินอย่างรุนแรงเพื่อปิดฉากเมื่อเทอร์รานัวร์ยืนระยะจนชนะเกมรับได้แล้ว", effectFamily: "FINISHER", flags: ["protectable"], roleTag: "finisher" },
        ],
    },
    {
        id: "lumilune",
        name: "ลูมิลูน",
        type: "WATER",
        battleRole: "support",
        baseStats: { hp: 402, atk: 136, def: 144, spd: 148, spa: 190 },
        forms: [
            { rank: 0, name: "ไข่มุกจันทร์", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "หยดแสงจันทร์", icon: "🌙", color: "#cbd5e1" },
            { rank: 2, name: "ภูตคลื่นใส", icon: "🫧", color: "#7dd3fc" },
            { rank: 3, name: "ลูมิลูน", icon: "🌙", color: "#f8fafc" },
            { rank: 4, name: "นักบุญไข่มุก", icon: "🪶", color: "#e0f2fe" },
            { rank: 5, name: "มารดาแห่งคลื่นดารา", icon: "👑", color: "#bae6fd" },
        ],
        ability: ABILITY_MOON_BLESSING,
        moves: [
            { id: "lumilune-moon-splash", name: "ระลอกจันทร์", type: "WATER", category: "SPECIAL", power: 30, accuracy: 100, learnRank: 1, learnLevel: 1, displayDescription: "ปล่อยคลื่นแสงจันทร์อย่างนุ่มนวล ใช้เปิดเกมอย่างปลอดภัย", effectFamily: "STRIKE", flags: ["protectable"], roleTag: "opener" },
            { id: "lumilune-soft-glow", name: "โล่คลื่นน้ำ", type: "WATER", category: "STATUS", power: 0, accuracy: 100, learnRank: 3, learnLevel: 4, displayDescription: "ห่อตัวด้วยโล่กระแสน้ำอ่อนโยน เพิ่มพลังป้องกันและลดความเสียหายที่จะได้รับในเทิร์นถัดไป", effect: "BOOST_DEF", effectChance: 100, effectDurationTurns: 3, effectFamily: "SHIELD", flags: ["selfOnly"], roleTag: "sustain" },
            { id: "lumilune-tidal-mercy", name: "คลื่นดารา", type: "WATER", category: "SPECIAL", power: 55, accuracy: 95, learnRank: 6, learnLevel: 26, displayDescription: "ปล่อยคลื่นดาราเย็นเฉียบที่กดความเร็วของเป้าหมายลงทันที เปิดจังหวะให้ลูมิลูนคุมไฟต์ต่อเนื่อง", effect: "LOWER_SPD", effectChance: 100, effectFamily: "TEMPO_CONTROL", flags: ["pulse", "protectable"], roleTag: "control" },
        ],
    },
    {
        id: "voltshade",
        name: "โวลต์เชด",
        type: "ELECTRICITY",
        battleRole: "control",
        baseStats: { hp: 348, atk: 162, def: 124, spd: 184, spa: 184 },
        forms: [
            { rank: 0, name: "เมล็ดประจุ", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "ภูตสายไฟ", icon: "🔌", color: "#818cf8" },
            { rank: 2, name: "เงาอาร์ก", icon: "🌒", color: "#6366f1" },
            { rank: 3, name: "โวลต์เชด", icon: "⚡", color: "#4f46e5" },
            { rank: 4, name: "หมาป่าศูนย์คลื่น", icon: "🌪️", color: "#4338ca" },
            { rank: 5, name: "ทรราชสุริยคราส", icon: "🦹‍♂️", color: "#312e81" },
        ],
        ability: ABILITY_BLACKOUT_CORE,
        moves: [
            { id: "voltshade-static-bite", name: "งับประจุไฟ", type: "ELECTRICITY", category: "PHYSICAL", power: 65, accuracy: 95, learnRank: 1, learnLevel: 1, displayDescription: "งับด้วยเขี้ยวช็อกไฟฟ้าเพื่อเปิดเกมกดดันทันที เป็น opener ที่ทั้งกัดจริงและช็อกจริง", effectFamily: "STRIKE", flags: ["contact", "bite", "protectable"], roleTag: "opener" },
            { id: "voltshade-chain-shock", name: "โซ่ช็อกตรึง", type: "ELECTRICITY", category: "PHYSICAL", power: 20, accuracy: 100, learnRank: 4, learnLevel: 8, displayDescription: "แตะช็อกแล้วตรึงเป้าหมายด้วยกระแสไฟอัมพาต เป็นท่ากดจังหวะที่แม่นและน่ารำคาญ", effect: "PARALYZE", effectChance: 100, effectDurationTurns: 1, effectParalyzeFullSkip: true, effectFamily: "STRIKE_STATUS", flags: ["contact", "protectable"], roleTag: "control" },
            { id: "voltshade-night-signal", name: "วงจรคราส", type: "ELECTRICITY", category: "SPECIAL", power: 80, accuracy: 100, learnRank: 6, learnLevel: 26, displayDescription: "ปล่อยคลื่นคราสมืดเข้าปิดฉากศัตรูที่ถูกกดจังหวะจนเสียทรง เหมาะเป็นท่าปิดเกมของโวลต์เชด", effectFamily: "FINISHER", flags: ["pulse", "protectable"], roleTag: "finisher" },
        ],
    },
    {
        id: "tidemaw",
        name: "ไทด์มอว์",
        type: "WATER",
        battleRole: "bruiser",
        baseStats: { hp: 468, atk: 180, def: 148, spd: 110, spa: 124 },
        forms: [
            { rank: 0, name: "ไข่แนวปะการัง", icon: "🥚", color: "#94a3b8" },
            { rank: 1, name: "ลูกคลื่นฝั่ง", icon: "🦭", color: "#0f766e" },
            { rank: 2, name: "เขี้ยวปะการัง", icon: "🐊", color: "#0d9488" },
            { rank: 3, name: "ไทด์มอว์", icon: "🦈", color: "#0f766e" },
            { rank: 4, name: "ผู้ทำลายร่องลึก", icon: "🌊", color: "#115e59" },
            { rank: 5, name: "ไททันห้วงลึก", icon: "🐉", color: "#134e4a" },
        ],
        ability: ABILITY_TITAN_CURRENT,
        moves: [
            { id: "tidemaw-riptide-jaw", name: "งับคลื่นย้อน", type: "WATER", category: "PHYSICAL", power: 34, accuracy: 98, learnRank: 1, learnLevel: 1, displayDescription: "กัดด้วยแรงคลื่นที่ไว้ใจได้ เหมาะกับการเปิดเกมสายบวกแลก", effectFamily: "STRIKE", flags: ["bite", "contact", "protectable"], roleTag: "opener" },
            { id: "tidemaw-deep-feast", name: "เกราะคลื่นลึก", type: "WATER", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, learnLevel: 8, displayDescription: "ห่อตัวด้วยกระแสน้ำหนักจากห้วงลึก เสริมพลังป้องกันให้ไทด์มอว์แกร่งพร้อมรับแรงโจมตีทุกรอบ", effect: "BOOST_DEF", effectChance: 100, effectDurationTurns: 3, effectFamily: "SHIELD", flags: ["selfOnly"], roleTag: "sustain" },
            { id: "tidemaw-reef-guard", name: "ผู้ทำลายห้วงลึก", type: "WATER", category: "PHYSICAL", power: 85, accuracy: 100, learnRank: 6, learnLevel: 26, displayDescription: "ปล่อยแรงกระแทกจากห้วงลึกซัดเป็นคลื่นน้ำหนักมหาศาล ใช้ปิดไฟต์เมื่อไทด์มอว์คุมเกมแลกได้แล้ว", effectFamily: "FINISHER", flags: ["protectable"], roleTag: "finisher" },
        ],
    },
];

export function findSpeciesById(id: string): MonsterSpecies | undefined {
    return DEFAULT_NEGAMON_SPECIES.find((species) => species.id === id);
}

export function createDefaultNegamonSettings(): import("./types/negamon").NegamonSettings {
    return {
        enabled: false,
        allowStudentChoice: true,
        expPerPoint: 6,
        expPerAttendance: 18,
        species: DEFAULT_NEGAMON_SPECIES,
        studentMonsters: {},
    };
}
