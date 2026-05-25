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
        type2: "DARK",
        battleRole: "burst",
        baseStats: { hp: 330, atk: 192, def: 108, spd: 164 },
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
            { id: "pyronox-ember-fang", name: "ขย้ำเถ้าเพลิง", type: "FIRE", category: "PHYSICAL", power: 32, accuracy: 100, learnRank: 1, learnLevel: 1, displayDescription: "กัดด้วยเปลวไฟอย่างแม่นยำ เปิดเกมบุกของไพรอน็อกซ์", effectFamily: "STRIKE", flags: ["contact", "bite", "protectable"], roleTag: "opener" },
            { id: "pyronox-shadow-rend", name: "เฉือนเงามืด", type: "DARK", category: "PHYSICAL", power: 40, accuracy: 95, learnRank: 3, learnLevel: 4, displayDescription: "ฟันทะลุแนวรับและลดพลังป้องกันของเป้าหมายเพื่อเปิดทางให้ท่าถัดไป", effect: "LOWER_DEF", effectChance: 100, effectFamily: "STRIKE_DEBUFF", flags: ["contact", "slicing", "protectable"], roleTag: "punish" },
            { id: "pyronox-war-cry", name: "คำรามนักล่า", type: "DARK", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, learnLevel: 8, displayDescription: "เปล่งคำรามปลุกสัญชาตญาณ เพิ่มพลังโจมตีก่อนเข้าปะทะรอบต่อไป", effect: "BOOST_ATK", effectChance: 100, effectFamily: "SELF_BOOST", flags: ["selfOnly", "sound"], roleTag: "setup" },
            { id: "pyronox-scorch-rush", name: "พุ่งเพลิงไว", type: "FIRE", category: "PHYSICAL", power: 28, accuracy: 100, learnRank: 5, learnLevel: 16, displayDescription: "ก้าวพุ่งด้วยเปลวเพลิง โจมตีก่อนและแย่งจังหวะเทิร์น", priority: 1, effectFamily: "PRIORITY_STRIKE", flags: ["contact", "protectable"], roleTag: "tempo" },
            { id: "pyronox-hell-dive", name: "เพลิงนรกถล่ม", type: "FIRE", category: "SPECIAL", power: 54, accuracy: 78, learnRank: 6, learnLevel: 26, displayDescription: "ทิ้งตัวลงมาพร้อมระเบิดเพลิงรุนแรง มีโอกาสทำให้เป้าหมายติดไหม้", effect: "BURN", effectChance: 100, effectFamily: "FINISHER", flags: ["protectable"], roleTag: "finisher" },
        ],
    },
    {
        id: "aerolisk",
        name: "แอโรลิสก์",
        type: "WIND",
        type2: "THUNDER",
        battleRole: "tempo",
        baseStats: { hp: 298, atk: 174, def: 116, spd: 198 },
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
            { id: "aerolisk-gale-cut", name: "จิกพายุ", type: "WIND", category: "PHYSICAL", power: 30, accuracy: 100, learnRank: 1, learnLevel: 1, displayDescription: "จู่โจมด้วยลมเร็ว รักษาความได้เปรียบในจังหวะเปิด", effectFamily: "STRIKE", flags: ["contact", "protectable"], roleTag: "opener" },
            { id: "aerolisk-spark-lance", name: "สว่านสายฟ้า", type: "THUNDER", category: "SPECIAL", power: 38, accuracy: 95, learnRank: 3, learnLevel: 4, displayDescription: "พุ่งแทงด้วยสายฟ้าหมุนเจาะ ลดพลังป้องกันของเป้าหมาย", effect: "LOWER_DEF", effectChance: 100, effectFamily: "STRIKE_DEBUFF", flags: ["protectable"], roleTag: "punish" },
            { id: "aerolisk-tail-rush", name: "กระแสลมพุ่ง", type: "WIND", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, learnLevel: 8, displayDescription: "ห่อหุ้มตัวด้วยกระแสลมแรง เพิ่มความเร็วอย่างชัดเจน", effect: "BOOST_SPD_30", effectChance: 100, effectFamily: "SELF_BOOST", flags: ["selfOnly"], roleTag: "setup" },
            { id: "aerolisk-crosswind-cut", name: "คมลมตัดขวาง", type: "WIND", category: "PHYSICAL", power: 30, accuracy: 100, learnRank: 5, learnLevel: 16, displayDescription: "ฟันด้วยลมไขว้แบบฉับพลัน โจมตีก่อนและขโมยจังหวะ", priority: 1, effectFamily: "PRIORITY_STRIKE", flags: ["slicing", "protectable"], roleTag: "tempo" },
            { id: "aerolisk-skybreaker", name: "คำพิพากษาพายุ", type: "THUNDER", category: "SPECIAL", power: 48, accuracy: 84, learnRank: 6, learnLevel: 26, displayDescription: "ปล่อยสายฟ้าพิพากษาพลังสูง เหมาะสำหรับปิดงานด้วยแรงกดดันคริติคอล", critBonus: 30, effectFamily: "FINISHER", flags: ["highCrit", "protectable"], roleTag: "finisher" },
        ],
    },
    {
        id: "terranoir",
        name: "เทอร์รานัวร์",
        type: "EARTH",
        type2: "DARK",
        battleRole: "wall",
        baseStats: { hp: 510, atk: 150, def: 162, spd: 80 },
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
            { id: "terranoir-grave-slam", name: "หมัดหลุมศพ", type: "EARTH", category: "PHYSICAL", power: 34, accuracy: 100, learnRank: 1, learnLevel: 1, displayDescription: "หมัดหินหนักแน่น เปิดเกมสายยื้อของเทอร์รานัวร์", effectFamily: "STRIKE", flags: ["contact", "protectable"], roleTag: "opener" },
            { id: "terranoir-dread-mire", name: "บึงกักวิญญาณ", type: "DARK", category: "STATUS", power: 0, accuracy: 100, learnRank: 3, learnLevel: 4, displayDescription: "ฉุดศัตรูลงในบึงมืด ลดพลังโจมตีของอีกฝ่าย", effect: "LOWER_ATK", effectChance: 100, effectFamily: "ENEMY_DEBUFF", flags: ["protectable"], roleTag: "control" },
            { id: "terranoir-bastion-hide", name: "กำแพงสุสาน", type: "EARTH", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, learnLevel: 8, displayDescription: "ยกเกราะสุสานขึ้นมาปกป้อง เพิ่มพลังป้องกันของเทอร์รานัวร์", effect: "BOOST_DEF_20", effectChance: 100, effectFamily: "SHIELD", flags: ["selfOnly"], roleTag: "sustain" },
            { id: "terranoir-tomb-tax", name: "ส่วยแห่งหลุมศพ", type: "DARK", category: "SPECIAL", power: 32, accuracy: 100, learnRank: 5, learnLevel: 16, displayDescription: "ปล่อยแรงกดดันจากสุสาน ลงโทษศัตรูที่ตั้งเกมด้วยการลดพลังโจมตีทั้งฝั่ง", effect: "LOWER_ATK_ALL", effectChance: 100, effectFamily: "ANTI_SETUP_PUNISH", flags: ["allEnemies", "sound"], roleTag: "punish" },
            { id: "terranoir-catacomb-crush", name: "ทลายคาตาคอมบ์", type: "EARTH", category: "PHYSICAL", power: 58, accuracy: 80, learnRank: 6, learnLevel: 26, displayDescription: "ระเบิดพลังหินหนักเพื่อปิดฉากเมื่อเทอร์รานัวร์ยืนระยะจนได้เปรียบแล้ว", effectFamily: "FINISHER", flags: ["protectable"], roleTag: "finisher" },
        ],
    },
    {
        id: "lumilune",
        name: "ลูมิลูน",
        type: "LIGHT",
        type2: "WATER",
        battleRole: "support",
        baseStats: { hp: 402, atk: 136, def: 144, spd: 148 },
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
            { id: "lumilune-moon-splash", name: "ระลอกจันทร์", type: "LIGHT", category: "SPECIAL", power: 30, accuracy: 100, learnRank: 1, learnLevel: 1, displayDescription: "ปล่อยคลื่นแสงจันทร์อย่างนุ่มนวล ใช้เปิดเกมอย่างปลอดภัย", effectFamily: "STRIKE", flags: ["protectable"], roleTag: "opener" },
            { id: "lumilune-soft-glow", name: "แสงปลอบประโลม", type: "LIGHT", category: "HEAL", power: 0, accuracy: 100, learnRank: 3, learnLevel: 4, displayDescription: "แสงอ่อนโยนที่ฟื้น HP และช่วยให้ลูมิลูนคุมจังหวะไฟต์ได้มั่นคงขึ้น", effect: "HEAL_25", effectFamily: "HEAL", flags: ["selfOnly"], roleTag: "sustain" },
            { id: "lumilune-prayer-veil", name: "ม่านอธิษฐาน", type: "LIGHT", category: "STATUS", power: 0, accuracy: 100, learnRank: 4, learnLevel: 8, displayDescription: "ถักทอม่านคำอธิษฐานเพื่อเพิ่มพลังป้องกันสำหรับการยืนระยะ", effect: "BOOST_DEF", effectChance: 100, effectFamily: "SHIELD", flags: ["selfOnly"], roleTag: "control" },
            { id: "lumilune-mercy-current", name: "กระแสเมตตา", type: "WATER", category: "SPECIAL", power: 38, accuracy: 88, learnRank: 5, learnLevel: 16, displayDescription: "สายน้ำอ่อนโยนที่ดูดพลังชีวิตกลับคืนให้ลูมิลูนเมื่อโจมตีโดน", drainPct: 50, effectFamily: "STRIKE_DRAIN", flags: ["protectable"], roleTag: "sustain" },
            { id: "lumilune-tidal-mercy", name: "คลื่นดารา", type: "WATER", category: "SPECIAL", power: 36, accuracy: 92, learnRank: 6, learnLevel: 26, displayDescription: "คลื่นแสงจันทร์ที่ลดความเร็วของเป้าหมายและเปิดพื้นที่ให้คุมเกม", effect: "LOWER_SPD", effectChance: 100, effectFamily: "TEMPO_CONTROL", flags: ["pulse", "protectable"], roleTag: "control" },
        ],
    },
    {
        id: "voltshade",
        name: "โวลต์เชด",
        type: "THUNDER",
        type2: "DARK",
        battleRole: "control",
        baseStats: { hp: 348, atk: 162, def: 124, spd: 184 },
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
            { id: "voltshade-static-bite", name: "งับประจุไฟ", type: "THUNDER", category: "SPECIAL", power: 31, accuracy: 100, learnRank: 1, learnLevel: 1, displayDescription: "กัดด้วยกระแสไฟคมจัด เปิดเกมคุมกวนของโวลต์เชดอย่างปลอดภัย", effectFamily: "STRIKE", flags: ["bite", "protectable"], roleTag: "opener" },
            { id: "voltshade-blackout", name: "สัญญาณดับแสง", type: "DARK", category: "STATUS", power: 0, accuracy: 100, learnRank: 3, learnLevel: 4, displayDescription: "ปล่อยคลื่นศูนย์สัญญาณ กดการฟื้น EN ของศัตรู", effect: "LOWER_EN_REGEN", effectChance: 100, effectRegenPenalty: 15, effectDurationTurns: 2, effectFamily: "ENERGY_SHIFT", flags: ["sound", "protectable"], roleTag: "control" },
            { id: "voltshade-chain-shock", name: "โซ่ช็อกตรึง", type: "THUNDER", category: "SPECIAL", power: 38, accuracy: 90, learnRank: 4, learnLevel: 8, displayDescription: "ช็อกด้วยกระแสไฟพันธนาการ มีโอกาสทำให้ศัตรูชาและเสียเทิร์น", effect: "PARALYZE", effectChance: 100, effectDurationTurns: 1, effectParalyzeFullSkip: true, effectFamily: "STRIKE_STATUS", flags: ["protectable"], roleTag: "control" },
            { id: "voltshade-night-tether", name: "สายรัดราตรี", type: "DARK", category: "STATUS", power: 0, accuracy: 100, learnRank: 5, learnLevel: 16, displayDescription: "ตรึงเป้าหมายด้วยไฟฟ้าเงามืด ลดความเร็วลงต่อเนื่อง", effect: "LOWER_SPD", effectChance: 100, effectDurationTurns: 2, effectFamily: "TEMPO_CONTROL", flags: ["sound", "protectable"], roleTag: "tempo" },
            { id: "voltshade-night-signal", name: "วงจรคราส", type: "DARK", category: "SPECIAL", power: 48, accuracy: 88, learnRank: 6, learnLevel: 26, displayDescription: "ระเบิดวงจรมืดเพื่อเก็บศัตรูที่เสียจังหวะไปแล้ว", critBonus: 15, effectFamily: "FINISHER", flags: ["pulse", "protectable"], roleTag: "finisher" },
        ],
    },
    {
        id: "tidemaw",
        name: "ไทด์มอว์",
        type: "WATER",
        type2: "EARTH",
        battleRole: "bruiser",
        baseStats: { hp: 468, atk: 180, def: 148, spd: 110 },
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
            { id: "tidemaw-shell-breaker", name: "ทุบเกราะแตก", type: "EARTH", category: "PHYSICAL", power: 38, accuracy: 92, learnRank: 3, learnLevel: 4, displayDescription: "ทำลายการ์ดของเป้าหมาย ลดพลังป้องกันเพื่อให้ทุกฮิตถัดไปเจ็บขึ้น", effect: "LOWER_DEF", effectChance: 100, effectFamily: "STRIKE_DEBUFF", flags: ["protectable"], roleTag: "punish" },
            { id: "tidemaw-deep-feast", name: "ฉลองห้วงลึก", type: "WATER", category: "SPECIAL", power: 40, accuracy: 86, learnRank: 4, learnLevel: 8, displayDescription: "ดูดพลังชีวิตกลับมาจากการปะทะ ฟื้นเลือดขณะบุก", drainPct: 50, effectFamily: "STRIKE_DRAIN", flags: ["protectable"], roleTag: "sustain" },
            { id: "tidemaw-undertow-hide", name: "ท่ายืนกระแสวน", type: "EARTH", category: "STATUS", power: 0, accuracy: 100, learnRank: 5, learnLevel: 16, displayDescription: "ตั้งท่ารับด้วยกระแสน้ำหนัก เพิ่มพลังป้องกันก่อนโดนสวนกลับ", effect: "BOOST_DEF", effectChance: 100, effectFamily: "SHIELD", flags: ["selfOnly"], roleTag: "sustain" },
            { id: "tidemaw-reef-guard", name: "ผู้ทำลายห้วงลึก", type: "WATER", category: "PHYSICAL", power: 52, accuracy: 86, learnRank: 6, learnLevel: 26, displayDescription: "พุ่งถล่มจากก้นสมุทร ใช้ปิดไฟต์เมื่อไทด์มอว์ชนะเกมแลกแล้ว", effectFamily: "FINISHER", flags: ["contact", "protectable"], roleTag: "finisher" },
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
