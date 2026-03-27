/**
 * Boss Configuration — 8 bosses × 3 skills each, 5 difficulty tiers
 * Used by SummonBossDialog, boss API route, and idle-engine.
 */

// ─── Effect Types ──────────────────────────────────────────────────────────────

export type BossEffectType =
  | "DAMAGE_REDUCTION"  // incoming damage × (1 - value)
  | "DAMAGE_AMPLIFY"    // incoming damage × (1 + value)  — Enrage
  | "HP_REGEN"          // one-time restore value% of maxHp
  | "STAMINA_DOUBLE"    // each attack costs 2 stamina for duration
  | "XP_REDUCTION"      // earned XP × (1 - value) for duration
  | "GOLD_BOOST"        // earned gold × (1 + value) for duration
  | "CRIT_IMMUNITY";    // crit multiplier = 1 for duration

export interface BossSkillConfig {
  id: string;
  name: string;
  icon: string;
  description: string;         // Thai description shown to students
  triggerHpPct: number;        // 0.75 | 0.50 | 0.25
  effectType: BossEffectType;
  effectValue: number;         // e.g. 0.4 = 40%, or regen 0.1 = 10% maxHp
  durationSeconds: number | null; // null = permanent until boss dies
}

export interface BossPresetConfig {
  id: string;
  name: string;           // Thai display name
  image: string;
  element: string;        // Thai element label
  elementIcon: string;
  elementColor: string;   // Tailwind color class for accent
  lore: string;           // 1-line Thai lore
  baseHp: number;         // HP at NORMAL difficulty (×1)
  passiveDescription: string;
  passiveDamageMultiplier: number; // permanent incoming damage multiplier (e.g. 0.8 = take 80%)
  skills: [BossSkillConfig, BossSkillConfig, BossSkillConfig];
}

// ─── Difficulty Tiers ─────────────────────────────────────────────────────────

export interface DifficultyConfig {
  id: string;
  label: string;
  labelEN: string;
  icon: string;
  color: string;        // Tailwind bg class
  textColor: string;
  borderColor: string;
  hpMultiplier: number;
  rewardMultiplier: number;
  description: string;
  suggestedStudents: string;
}

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: "BEGINNER",
    label: "ฝึกหัด",
    labelEN: "Beginner",
    icon: "🌱",
    color: "bg-emerald-100",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-300",
    hpMultiplier: 0.5,
    rewardMultiplier: 0.7,
    description: "เหมาะสำหรับห้องที่เพิ่งเริ่มเล่น",
    suggestedStudents: "10–15 คน",
  },
  {
    id: "EASY",
    label: "ง่าย",
    labelEN: "Easy",
    icon: "⚔️",
    color: "bg-sky-100",
    textColor: "text-sky-700",
    borderColor: "border-sky-300",
    hpMultiplier: 1.0,
    rewardMultiplier: 1.0,
    description: "มาตรฐานสำหรับห้องทั่วไป",
    suggestedStudents: "20–25 คน",
  },
  {
    id: "NORMAL",
    label: "ปกติ",
    labelEN: "Normal",
    icon: "⚔️⚔️",
    color: "bg-amber-100",
    textColor: "text-amber-700",
    borderColor: "border-amber-300",
    hpMultiplier: 2.0,
    rewardMultiplier: 1.5,
    description: "ท้าทายขึ้น ต้องใช้ทีม",
    suggestedStudents: "25–35 คน",
  },
  {
    id: "HARD",
    label: "ยาก",
    labelEN: "Hard",
    icon: "💀",
    color: "bg-rose-100",
    textColor: "text-rose-700",
    borderColor: "border-rose-300",
    hpMultiplier: 4.0,
    rewardMultiplier: 2.5,
    description: "สำหรับห้องที่แข็งแกร่ง",
    suggestedStudents: "35–40 คน",
  },
  {
    id: "LEGENDARY",
    label: "ตำนาน",
    labelEN: "Legendary",
    icon: "👑",
    color: "bg-purple-100",
    textColor: "text-purple-700",
    borderColor: "border-purple-300",
    hpMultiplier: 8.0,
    rewardMultiplier: 4.0,
    description: "ท้าทายสูงสุด รางวัลมหาศาล",
    suggestedStudents: "40+ คน",
  },
];

// ─── Boss Presets ─────────────────────────────────────────────────────────────

export const BOSS_PRESETS: BossPresetConfig[] = [
  // ── 1. Lethargy Dragon ──────────────────────────────────────────────────────
  {
    id: "lethargy_dragon",
    name: "มังกรเกียจคร้าน",
    image: "/assets/monsters/lethargy_dragon.png",
    element: "สมดุล",
    elementIcon: "⚖️",
    elementColor: "text-slate-600",
    lore: "มังกรโบราณที่หลับใหลมานาน ตื่นขึ้นด้วยความโกรธ",
    baseHp: 2000,
    passiveDescription: "ไม่มีความสามารถพิเศษถาวร — เหมาะสำหรับผู้เริ่มต้น",
    passiveDamageMultiplier: 1.0,
    skills: [
      {
        id: "drowsiness",
        name: "Drowsiness",
        icon: "💤",
        description: "บอสหลับตาเพื่อปกป้องตัวเอง ลดดาเมจที่รับ 30% เป็นเวลา 60 วินาที",
        triggerHpPct: 0.75,
        effectType: "DAMAGE_REDUCTION",
        effectValue: 0.30,
        durationSeconds: 60,
      },
      {
        id: "slumber_field",
        name: "Slumber Field",
        icon: "🌀",
        description: "คลื่นง่วงนอนทำให้นักเรียนเหนื่อยล้า — การโจมตีแต่ละครั้งต้องใช้ Stamina ×2 เป็นเวลา 45 วินาที",
        triggerHpPct: 0.50,
        effectType: "STAMINA_DOUBLE",
        effectValue: 2,
        durationSeconds: 45,
      },
      {
        id: "dragon_enrage",
        name: "Dragon Enrage",
        icon: "🔥",
        description: "มังกรโกรธจัด! รับดาเมจเพิ่มขึ้น 60% จนกว่าจะถูกสังหาร",
        triggerHpPct: 0.25,
        effectType: "DAMAGE_AMPLIFY",
        effectValue: 0.60,
        durationSeconds: null,
      },
    ],
  },

  // ── 2. Inferno Drake ────────────────────────────────────────────────────────
  {
    id: "inferno_drake",
    name: "มังกรเพลิง",
    image: "/assets/mobs/bosses/inferno_drake.png",
    element: "ไฟ",
    elementIcon: "🔥",
    elementColor: "text-orange-600",
    lore: "มังกรแห่งเปลวไฟที่อยู่ในภูเขาไฟ — ทุกลมหายใจคือความร้อนแรง",
    baseHp: 1800,
    passiveDescription: "Flame Aura — ทน HP สูง แต่เมื่อ Enrage ดาเมจที่รับเพิ่มทันที",
    passiveDamageMultiplier: 1.0,
    skills: [
      {
        id: "flame_shield",
        name: "Flame Shield",
        icon: "🛡️",
        description: "เกราะเปลวไฟปกคลุม — ลดดาเมจที่รับ 40% เป็นเวลา 90 วินาที",
        triggerHpPct: 0.75,
        effectType: "DAMAGE_REDUCTION",
        effectValue: 0.40,
        durationSeconds: 90,
      },
      {
        id: "inferno_blast",
        name: "Inferno Blast",
        icon: "💥",
        description: "ระเบิดไฟครั้งใหญ่ — การโจมตีทุกครั้งต้องใช้ Stamina ×2 เป็นเวลา 60 วินาที",
        triggerHpPct: 0.50,
        effectType: "STAMINA_DOUBLE",
        effectValue: 2,
        durationSeconds: 60,
      },
      {
        id: "berserker_fire",
        name: "Berserker Fire",
        icon: "⚡",
        description: "ไฟบ้าคลั่ง! รับดาเมจเพิ่ม 80% ถาวร — Enrage Mode!",
        triggerHpPct: 0.25,
        effectType: "DAMAGE_AMPLIFY",
        effectValue: 0.80,
        durationSeconds: null,
      },
    ],
  },

  // ── 3. Frost King ────────────────────────────────────────────────────────────
  {
    id: "frost_king",
    name: "ราชาน้ำแข็ง",
    image: "/assets/mobs/bosses/frost_king.png",
    element: "น้ำแข็ง",
    elementIcon: "❄️",
    elementColor: "text-blue-500",
    lore: "ราชาผู้ปกครองดินแดนน้ำแข็ง — HP มหาศาล แต่เย็นชาและโหดร้าย",
    baseHp: 3000,
    passiveDescription: "Permafrost — HP สูงสุดในบรรดาบอสทั้งหมด แต่ไม่มีการลดดาเมจถาวร",
    passiveDamageMultiplier: 1.0,
    skills: [
      {
        id: "blizzard",
        name: "Blizzard",
        icon: "🌨️",
        description: "พายุหิมะรุนแรง — ลดดาเมจที่รับ 50% เป็นเวลา 90 วินาที",
        triggerHpPct: 0.75,
        effectType: "DAMAGE_REDUCTION",
        effectValue: 0.50,
        durationSeconds: 90,
      },
      {
        id: "crit_immunity",
        name: "Frost Armor",
        icon: "🧊",
        description: "เกราะน้ำแข็งหนา — การโจมตีคริติคอลไม่ทำงานเป็นเวลา 75 วินาที",
        triggerHpPct: 0.50,
        effectType: "CRIT_IMMUNITY",
        effectValue: 1,
        durationSeconds: 75,
      },
      {
        id: "frost_enrage",
        name: "Frozen Fury",
        icon: "💢",
        description: "น้ำแข็งแตกพร้อมความโกรธ! รับดาเมจเพิ่ม 70% ถาวร",
        triggerHpPct: 0.25,
        effectType: "DAMAGE_AMPLIFY",
        effectValue: 0.70,
        durationSeconds: null,
      },
    ],
  },

  // ── 4. Shadow Queen ──────────────────────────────────────────────────────────
  {
    id: "shadow_queen",
    name: "ราชินีเงามืด",
    image: "/assets/mobs/bosses/shadow_queen.png",
    element: "ความมืด",
    elementIcon: "🌑",
    elementColor: "text-purple-700",
    lore: "ราชินีแห่งเงามืด — ลดค่าประสบการณ์ของนักเรียนด้วยคำสาป",
    baseHp: 1600,
    passiveDescription: "Shadow Veil — ลดดาเมจที่รับถาวร 15% (เงามืดปกป้อง)",
    passiveDamageMultiplier: 0.85,
    skills: [
      {
        id: "shadow_cloak",
        name: "Shadow Cloak",
        icon: "🕸️",
        description: "ผ้าคลุมเงา — ลดดาเมจที่รับเพิ่มอีก 45% เป็นเวลา 60 วินาที",
        triggerHpPct: 0.75,
        effectType: "DAMAGE_REDUCTION",
        effectValue: 0.45,
        durationSeconds: 60,
      },
      {
        id: "soul_drain",
        name: "Soul Drain",
        icon: "💜",
        description: "ดูดวิญญาณ — EXP ที่ได้รับจากการโจมตีลดลง 50% เป็นเวลา 90 วินาที",
        triggerHpPct: 0.50,
        effectType: "XP_REDUCTION",
        effectValue: 0.50,
        durationSeconds: 90,
      },
      {
        id: "nights_embrace",
        name: "Night's Embrace",
        icon: "🌙",
        description: "โอบกอดแห่งราตรี — Enrage! รับดาเมจเพิ่ม 100% ถาวร",
        triggerHpPct: 0.25,
        effectType: "DAMAGE_AMPLIFY",
        effectValue: 1.00,
        durationSeconds: null,
      },
    ],
  },

  // ── 5. Void Watcher ──────────────────────────────────────────────────────────
  {
    id: "void_watcher",
    name: "ผู้เฝ้า Void",
    image: "/assets/mobs/bosses/void_watcher.png",
    element: "ความว่างเปล่า",
    elementIcon: "🌌",
    elementColor: "text-indigo-600",
    lore: "ผู้เฝ้าจากมิติอื่น — ดูดซับพลังงานและความเป็นจริง",
    baseHp: 2200,
    passiveDescription: "Void Presence — ลดดาเมจที่รับถาวร 10%",
    passiveDamageMultiplier: 0.90,
    skills: [
      {
        id: "void_shield",
        name: "Void Shield",
        icon: "🔮",
        description: "โล่จากความว่างเปล่า — ลดดาเมจที่รับ 60% เป็นเวลา 45 วินาที",
        triggerHpPct: 0.75,
        effectType: "DAMAGE_REDUCTION",
        effectValue: 0.60,
        durationSeconds: 45,
      },
      {
        id: "reality_tear",
        name: "Reality Tear",
        icon: "🌀",
        description: "ฉีกความเป็นจริง — ฟื้นฟู HP 15% ของค่าสูงสุดทันที",
        triggerHpPct: 0.50,
        effectType: "HP_REGEN",
        effectValue: 0.15,
        durationSeconds: null,
      },
      {
        id: "void_collapse",
        name: "Void Collapse",
        icon: "💫",
        description: "Void พังทลาย — Enrage! รับดาเมจเพิ่ม 90% ถาวร",
        triggerHpPct: 0.25,
        effectType: "DAMAGE_AMPLIFY",
        effectValue: 0.90,
        durationSeconds: null,
      },
    ],
  },

  // ── 6. Necromancer Lord ──────────────────────────────────────────────────────
  {
    id: "necromancer_lord",
    name: "ลอร์ดนรก",
    image: "/assets/mobs/bosses/necromancer_lord.png",
    element: "ความตาย",
    elementIcon: "💀",
    elementColor: "text-gray-700",
    lore: "ลอร์ดผู้ควบคุมวิญญาณ — ฟื้นคืนชีพและคำสาปแช่งนักเรียน",
    baseHp: 2400,
    passiveDescription: "Undying Will — เมื่อ HP ถึง 50% จะฟื้นฟู HP 10% ครั้งเดียว",
    passiveDamageMultiplier: 1.0,
    skills: [
      {
        id: "death_shroud",
        name: "Death Shroud",
        icon: "⚰️",
        description: "ผ้าคลุมมรณะ — ลดดาเมจที่รับ 35% เป็นเวลา 90 วินาที",
        triggerHpPct: 0.75,
        effectType: "DAMAGE_REDUCTION",
        effectValue: 0.35,
        durationSeconds: 90,
      },
      {
        id: "xp_curse",
        name: "XP Curse",
        icon: "🩸",
        description: "คำสาป EXP — EXP ที่ได้รับลดลง 60% เป็นเวลา 75 วินาที",
        triggerHpPct: 0.50,
        effectType: "XP_REDUCTION",
        effectValue: 0.60,
        durationSeconds: 75,
      },
      {
        id: "undying_enrage",
        name: "Undying Rage",
        icon: "☠️",
        description: "ความโกรธแห่งความตาย — Enrage! รับดาเมจเพิ่ม 75% ถาวร",
        triggerHpPct: 0.25,
        effectType: "DAMAGE_AMPLIFY",
        effectValue: 0.75,
        durationSeconds: null,
      },
    ],
  },

  // ── 7. Celestial Guardian ────────────────────────────────────────────────────
  {
    id: "celestial_guardian",
    name: "ผู้พิทักษ์สวรรค์",
    image: "/assets/mobs/bosses/celestial_guardian.png",
    element: "แสงสวรรค์",
    elementIcon: "✨",
    elementColor: "text-yellow-500",
    lore: "ผู้พิทักษ์จากสรวงสวรรค์ — ป้องกันตัวเองด้วยเกราะศักดิ์สิทธิ์",
    baseHp: 2600,
    passiveDescription: "Holy Barrier — ลดดาเมจที่รับถาวร 20% (เกราะแสงสวรรค์)",
    passiveDamageMultiplier: 0.80,
    skills: [
      {
        id: "holy_shield",
        name: "Holy Shield",
        icon: "🛡️",
        description: "โล่ศักดิ์สิทธิ์ — ลดดาเมจที่รับเพิ่มอีก 60% เป็นเวลา 45 วินาที",
        triggerHpPct: 0.75,
        effectType: "DAMAGE_REDUCTION",
        effectValue: 0.60,
        durationSeconds: 45,
      },
      {
        id: "divine_blessing",
        name: "Divine Blessing",
        icon: "🌟",
        description: "พรจากสวรรค์ — Gold ที่ได้รับจากการโจมตีเพิ่มขึ้น 50% เป็นเวลา 90 วินาที",
        triggerHpPct: 0.50,
        effectType: "GOLD_BOOST",
        effectValue: 0.50,
        durationSeconds: 90,
      },
      {
        id: "celestial_fury",
        name: "Celestial Fury",
        icon: "⚡",
        description: "พิโรธแห่งสวรรค์ — Enrage! รับดาเมจเพิ่ม 120% ถาวร (สูงสุด!)",
        triggerHpPct: 0.25,
        effectType: "DAMAGE_AMPLIFY",
        effectValue: 1.20,
        durationSeconds: null,
      },
    ],
  },

  // ── 8. Ancient Treant ────────────────────────────────────────────────────────
  {
    id: "ancient_treant",
    name: "ต้นไม้โบราณ",
    image: "/assets/mobs/bosses/ancient_treant.png",
    element: "ธรรมชาติ",
    elementIcon: "🌿",
    elementColor: "text-green-600",
    lore: "ต้นไม้อายุนับพันปีที่ตื่นขึ้น — รากฐานที่ลึกและการฟื้นฟูที่ไม่หยุดหย่อน",
    baseHp: 2800,
    passiveDescription: "Deep Roots — ลดดาเมจที่รับถาวร 10% และฟื้นฟู HP ได้เมื่อใช้สกิล",
    passiveDamageMultiplier: 0.90,
    skills: [
      {
        id: "bark_shield",
        name: "Bark Shield",
        icon: "🪵",
        description: "เกราะเปลือกไม้ — ลดดาเมจที่รับ 35% เป็นเวลา 120 วินาที (ยาวที่สุด)",
        triggerHpPct: 0.75,
        effectType: "DAMAGE_REDUCTION",
        effectValue: 0.35,
        durationSeconds: 120,
      },
      {
        id: "root_strike_regen",
        name: "Nature's Grasp",
        icon: "🌱",
        description: "รากดูดพลังงาน — ฟื้นฟู HP 12% ของค่าสูงสุดทันที",
        triggerHpPct: 0.50,
        effectType: "HP_REGEN",
        effectValue: 0.12,
        durationSeconds: null,
      },
      {
        id: "ancient_wrath",
        name: "Ancient Wrath",
        icon: "🌪️",
        description: "ความพิโรธโบราณ — Enrage! รับดาเมจเพิ่ม 65% ถาวร",
        triggerHpPct: 0.25,
        effectType: "DAMAGE_AMPLIFY",
        effectValue: 0.65,
        durationSeconds: null,
      },
    ],
  },
];

// ─── Reward Config ─────────────────────────────────────────────────────────────

/** Base gold reward per difficulty (before teacher adjustment) */
export const DIFFICULTY_BASE_GOLD: Record<string, number> = {
  BEGINNER:  300,
  EASY:      600,
  NORMAL:    1200,
  HARD:      2500,
  LEGENDARY: 5000,
};

/** XP is always 50% of gold reward */
export const XP_FROM_GOLD_RATIO = 0.5;

/** Materials given on boss kill per difficulty */
export const DIFFICULTY_MATERIALS: Record<string, { type: string; quantity: number }[]> = {
  BEGINNER:  [{ type: "Stone Fragment", quantity: 1 }],
  EASY:      [{ type: "Iron Ore", quantity: 1 }, { type: "Wolf Fang", quantity: 1 }],
  NORMAL:    [{ type: "Dragon Scale", quantity: 1 }, { type: "Iron Ore", quantity: 2 }],
  HARD:      [{ type: "Dragon Scale", quantity: 2 }, { type: "Thunder Crystal", quantity: 1 }],
  LEGENDARY: [{ type: "Phoenix Feather", quantity: 1 }, { type: "Dragon Scale", quantity: 2 }, { type: "Void Shard", quantity: 1 }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getBossPreset(id: string): BossPresetConfig | undefined {
  return BOSS_PRESETS.find((b) => b.id === id);
}

export function getDifficulty(id: string): DifficultyConfig | undefined {
  return DIFFICULTIES.find((d) => d.id === id);
}

export function computeBossHp(bossId: string, difficultyId: string): number {
  const boss = getBossPreset(bossId);
  const diff = getDifficulty(difficultyId);
  if (!boss || !diff) return 1000;
  return Math.round(boss.baseHp * diff.hpMultiplier);
}

export function computeRewardGold(difficultyId: string, multiplier = 1.0): number {
  const base = DIFFICULTY_BASE_GOLD[difficultyId] ?? 600;
  return Math.round(base * multiplier);
}

/**
 * Check which boss skills should trigger given HP crossing from prevHp → newHp.
 * Returns skill IDs that cross their threshold in this damage event.
 */
export function getTriggeredSkills(
  bossId: string,
  maxHp: number,
  prevHp: number,
  newHp: number,
  alreadyTriggered: string[]
): BossSkillConfig[] {
  const boss = getBossPreset(bossId);
  if (!boss) return [];

  return boss.skills.filter((skill) => {
    if (alreadyTriggered.includes(skill.id)) return false;
    const thresholdHp = maxHp * skill.triggerHpPct;
    return prevHp > thresholdHp && newHp <= thresholdHp;
  });
}
