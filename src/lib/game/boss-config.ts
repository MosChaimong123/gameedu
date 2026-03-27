/**
 * Boss Configuration — 8 bosses × 3 skills each, 5 difficulty tiers
 * Used by SummonBossDialog, boss API route, and idle-engine.
 */

// ─── Boss Action System (Final Fantasy-style) ─────────────────────────────────

export type BossActionType = "PHYSICAL" | "MAGIC" | "AOE_PHYSICAL" | "AOE_MAGIC" | "STATUS";
export type PlayerStatusType = "POISON" | "BIND" | "BLIND" | "VULNERABLE";

export interface BossAction {
  id: string;
  name: string;           // Thai display name
  icon: string;           // emoji
  description: string;    // shown in battle log
  type: BossActionType;
  target: "RANDOM" | "ALL";
  baseDamage: number;     // battle-HP damage (0–100 scale); 0 = status only
  statusEffect?: {
    type: PlayerStatusType;
    turns: number;
  };
  selfHealPct?: number;   // fraction of boss maxHp to restore
  phaseUnlock?: 2 | 3 | 4; // only available from this phase onwards
}

export interface PlayerBattleState {
  battleHp: number;       // 0–100
  statusEffects: { type: PlayerStatusType; remainingTurns: number }[];
}

export interface BattleLogEntry {
  id: string;
  type: "PLAYER_ATTACK" | "PLAYER_MAGIC" | "BOSS_ACTION" | "STAGGER" | "PHASE_CHANGE" | "MISS";
  text: string;
  damage?: number;
  isCrit?: boolean;
  timestamp: number;
}

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
  elementKey: string;     // Machine-readable element for weakness calc (FIRE, ICE, DARK, VOID, DEATH, LIGHT, NATURE, NONE)
  elementColor: string;   // Tailwind color class for accent
  lore: string;           // 1-line Thai lore
  baseHp: number;         // HP at NORMAL difficulty (×1)
  passiveDescription: string;
  passiveDamageMultiplier: number; // permanent incoming damage multiplier (e.g. 0.8 = take 80%)
  skills: [BossSkillConfig, BossSkillConfig, BossSkillConfig];
  actions: BossAction[];  // FF-style attack rotation
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
  // ── 1. Inferno Drake ────────────────────────────────────────────────────────
  {
    id: "inferno_drake",
    name: "มังกรเพลิง",
    image: "/assets/mobs/bosses/inferno_drake.png",
    element: "ไฟ",
    elementIcon: "🔥",
    elementKey: "FIRE",
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
    actions: [
      { id: "flame_claw",   name: "กรงเล็บเพลิง",    icon: "🔥", description: "ข่วนด้วยกรงเล็บไฟ",             type: "AOE_PHYSICAL", target: "ALL",    baseDamage: 12 },
      { id: "magma_ball",   name: "ลูกไฟแมกมา",      icon: "💣", description: "ยิงลูกไฟใส่เป้าหมาย",          type: "MAGIC",        target: "RANDOM", baseDamage: 22, statusEffect: { type: "VULNERABLE", turns: 1 } },
      { id: "fire_breath",  name: "ลมหายใจเพลิง",    icon: "🌬️", description: "พ่นไฟใส่ทุกคน",                type: "AOE_MAGIC",    target: "ALL",    baseDamage: 18, phaseUnlock: 2 },
      { id: "inferno_rage", name: "Inferno Rage",     icon: "😡", description: "คลุ้มคลั่งไฟ — ทำให้ตาบอด",   type: "STATUS",       target: "ALL",    baseDamage: 5,  statusEffect: { type: "BLIND", turns: 2 }, phaseUnlock: 3 },
    ],
  },

  // ── 3. Frost King ────────────────────────────────────────────────────────────
  {
    id: "frost_king",
    name: "ราชาน้ำแข็ง",
    image: "/assets/mobs/bosses/frost_king.png",
    element: "น้ำแข็ง",
    elementIcon: "❄️",
    elementKey: "ICE",
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
    actions: [
      { id: "ice_lance",     name: "หอกน้ำแข็ง",       icon: "🗡️", description: "ปาหอกน้ำแข็งใส่เป้าหมาย",      type: "PHYSICAL",     target: "RANDOM", baseDamage: 20 },
      { id: "frozen_grasp",  name: "กำมือแช่แข็ง",     icon: "🧊", description: "แช่แข็งเป้าหมาย ล็อคไม่ให้โจมตี", type: "STATUS",       target: "RANDOM", baseDamage: 0,  statusEffect: { type: "BIND", turns: 1 } },
      { id: "blizzard_aoe",  name: "พายุหิมะ",          icon: "🌨️", description: "พายุหิมะโจมตีทุกคน",           type: "AOE_MAGIC",    target: "ALL",    baseDamage: 15, phaseUnlock: 2 },
      { id: "frost_bite",    name: "Frost Bite",        icon: "❄️", description: "ทำให้ทุกคนติดพิษน้ำแข็ง",     type: "STATUS",       target: "ALL",    baseDamage: 8,  statusEffect: { type: "POISON", turns: 3 }, phaseUnlock: 3 },
    ],
  },

  // ── 4. Shadow Queen ──────────────────────────────────────────────────────────
  {
    id: "shadow_queen",
    name: "ราชินีเงามืด",
    image: "/assets/mobs/bosses/shadow_queen.png",
    element: "ความมืด",
    elementIcon: "🌑",
    elementKey: "DARK",
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
    actions: [
      { id: "shadow_claw",    name: "กรงเล็บเงา",       icon: "👁️", description: "โจมตีจากเงามืด",               type: "PHYSICAL",   target: "RANDOM", baseDamage: 22 },
      { id: "soul_leech",     name: "ดูดวิญญาณ",        icon: "💜", description: "ดูดพลังชีวิต — ทำให้เปราะบาง", type: "AOE_MAGIC",  target: "ALL",    baseDamage: 8,  statusEffect: { type: "VULNERABLE", turns: 2 } },
      { id: "darkness_veil",  name: "ม่านความมืด",      icon: "🌑", description: "คลุมม่านมืด — ทำให้มองไม่เห็น", type: "STATUS",     target: "ALL",    baseDamage: 0,  statusEffect: { type: "BLIND", turns: 2 }, phaseUnlock: 2 },
      { id: "death_touch",    name: "สัมผัสมรณะ",       icon: "💀", description: "สัมผัสชีวิต ดาเมจสูง",          type: "MAGIC",      target: "RANDOM", baseDamage: 35, phaseUnlock: 3 },
    ],
  },

  // ── 5. Void Watcher ──────────────────────────────────────────────────────────
  {
    id: "void_watcher",
    name: "ผู้เฝ้า Void",
    image: "/assets/mobs/bosses/void_watcher.png",
    element: "ความว่างเปล่า",
    elementIcon: "🌌",
    elementKey: "VOID",
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
    actions: [
      { id: "void_blast",      name: "Void Blast",        icon: "🌀", description: "พลังงานความว่างเปล่า",          type: "MAGIC",      target: "RANDOM", baseDamage: 20 },
      { id: "reality_warp",    name: "บิดเบือนความจริง",  icon: "🌌", description: "บิดพื้นที่ — ทำให้มองไม่เห็น", type: "AOE_MAGIC",  target: "ALL",    baseDamage: 10, statusEffect: { type: "BLIND", turns: 1 } },
      { id: "void_drain",      name: "Void Drain",        icon: "💫", description: "ดูดพลังงาน — ฟื้นฟู HP บอส",    type: "AOE_MAGIC",  target: "ALL",    baseDamage: 5,  selfHealPct: 0.03, phaseUnlock: 2 },
      { id: "dimension_slash", name: "Dimension Slash",   icon: "✂️", description: "ฟันข้ามมิติ ดาเมจสูงมาก",       type: "PHYSICAL",   target: "RANDOM", baseDamage: 38, phaseUnlock: 3 },
    ],
  },

  // ── 6. Necromancer Lord ──────────────────────────────────────────────────────
  {
    id: "necromancer_lord",
    name: "ลอร์ดนรก",
    image: "/assets/mobs/bosses/necromancer_lord.png",
    element: "ความตาย",
    elementIcon: "💀",
    elementKey: "DEATH",
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
    actions: [
      { id: "bone_slam",   name: "กระดูกถล่ม",       icon: "🦴", description: "ฝนกระดูกใส่ทุกคน",              type: "AOE_PHYSICAL", target: "ALL",    baseDamage: 10 },
      { id: "death_curse", name: "คำสาปมรณะ",        icon: "🩸", description: "สาปแช่งเป้าหมาย — ติดพิษ",      type: "STATUS",       target: "RANDOM", baseDamage: 5,  statusEffect: { type: "POISON", turns: 3 } },
      { id: "death_ray",   name: "Death Ray",         icon: "☠️", description: "รังสีแห่งความตาย",              type: "MAGIC",        target: "RANDOM", baseDamage: 28, phaseUnlock: 2 },
      { id: "mass_curse",  name: "คำสาปหมู่",         icon: "🌚", description: "สาปทุกคน — เปราะบางถ้วนหน้า",   type: "STATUS",       target: "ALL",    baseDamage: 0,  statusEffect: { type: "VULNERABLE", turns: 2 }, phaseUnlock: 3 },
    ],
  },

  // ── 7. Celestial Guardian ────────────────────────────────────────────────────
  {
    id: "celestial_guardian",
    name: "ผู้พิทักษ์สวรรค์",
    image: "/assets/mobs/bosses/celestial_guardian.png",
    element: "แสงสวรรค์",
    elementIcon: "✨",
    elementKey: "LIGHT",
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
    actions: [
      { id: "holy_smite",     name: "Holy Smite",      icon: "⚡", description: "ฟาดด้วยพลังแสง",               type: "MAGIC",       target: "RANDOM", baseDamage: 24 },
      { id: "celestial_wave", name: "คลื่นสวรรค์",    icon: "✨", description: "คลื่นพลังสวรรค์โจมตีทุกคน",   type: "AOE_MAGIC",   target: "ALL",    baseDamage: 12 },
      { id: "judgment",       name: "Judgment",        icon: "⚖️", description: "การพิพากษา — ล็อคทุกคน",       type: "STATUS",      target: "ALL",    baseDamage: 0,  statusEffect: { type: "BIND", turns: 1 }, phaseUnlock: 2 },
      { id: "divine_wrath",   name: "Divine Wrath",    icon: "🌟", description: "พิโรธสวรรค์สูงสุด",            type: "MAGIC",       target: "RANDOM", baseDamage: 42, phaseUnlock: 3 },
    ],
  },

  // ── 8. Ancient Treant ────────────────────────────────────────────────────────
  {
    id: "ancient_treant",
    name: "ต้นไม้โบราณ",
    image: "/assets/mobs/bosses/ancient_treant.png",
    element: "ธรรมชาติ",
    elementIcon: "🌿",
    elementKey: "NATURE",
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
    actions: [
      { id: "root_slam",     name: "รากทุบพื้น",      icon: "🌿", description: "รากยักษ์กระหน่ำทุกคน",          type: "AOE_PHYSICAL", target: "ALL",    baseDamage: 14 },
      { id: "vine_bind",     name: "เถาเถาวัลย์",     icon: "🌱", description: "เถาไม้รัดเป้าหมาย — ล็อค",       type: "STATUS",       target: "RANDOM", baseDamage: 5,  statusEffect: { type: "BIND", turns: 1 } },
      { id: "nature_wrath",  name: "ความพิโรธธรรมชาติ", icon: "🍃", description: "พิษธรรมชาติโจมตีทุกคน",       type: "AOE_MAGIC",    target: "ALL",    baseDamage: 16, statusEffect: { type: "POISON", turns: 2 }, phaseUnlock: 2 },
      { id: "ancient_slam",  name: "Ancient Slam",    icon: "💥", description: "ทุบพื้นด้วยพลังโบราณ",           type: "PHYSICAL",     target: "RANDOM", baseDamage: 32, phaseUnlock: 3 },
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

/** Calculate boss phase (1-4) from current HP percentage */
export function getBossPhase(currentHp: number, maxHp: number): 1 | 2 | 3 | 4 {
  const pct = currentHp / maxHp;
  if (pct > 0.75) return 1;
  if (pct > 0.50) return 2;
  if (pct > 0.25) return 3;
  return 4;
}

/** Get boss turn interval (attacks received before boss acts) by phase */
export function getBossTurnInterval(phase: 1 | 2 | 3 | 4): number {
  if (phase >= 4) return 3;
  if (phase === 3) return 4;
  return 5;
}

/** Get available actions for a given phase */
export function getActionsForPhase(actions: BossAction[], phase: number): BossAction[] {
  return actions.filter((a) => !a.phaseUnlock || a.phaseUnlock <= phase);
}

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
