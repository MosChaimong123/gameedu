/**
 * Numeric bonuses from item effects — must match StatCalculator.applySpecialEffects.
 */

export const EFFECT_ITEM_BONUSES: Record<
  string,
  {
    goldMultiplier?: number;
    xpMultiplier?: number;
    bossDamageMultiplier?: number;
    critAdd?: number;
  }
> = {
  GOLD_FINDER: { goldMultiplier: 0.15 },
  QUICK_LEARNER: { xpMultiplier: 0.1 },
  LUCKY_STRIKE: { critAdd: 0.05 }, // applied only if luck > 0.5 in engine
  GODS_BLESSING: {
    goldMultiplier: 0.1,
    xpMultiplier: 0.1,
    bossDamageMultiplier: 0.1,
  },
};

/** Thai display lines — must match effect-bonuses-config + flags-only effects. */
export const EFFECT_DISPLAY_TH: Record<string, { desc: string; stats: string }> = {
  GOLD_FINDER: {
    desc: "ได้รับทองเพิ่มขึ้นจากการทำกิจกรรมต่างๆ",
    stats: `💰 โบนัสทองคำ +${Math.round((EFFECT_ITEM_BONUSES.GOLD_FINDER.goldMultiplier ?? 0) * 100)}%`,
  },
  QUICK_LEARNER: {
    desc: "ได้รับค่าประสบการณ์ (EXP) เพิ่มขึ้น",
    stats: `🌟 โบนัส EXP +${Math.round((EFFECT_ITEM_BONUSES.QUICK_LEARNER.xpMultiplier ?? 0) * 100)}%`,
  },
  TOUGH_SKIN: {
    desc: "ลดความเสียหายที่ได้รับ (ใช้ในระบบต่อสู้)",
    stats: "🛡️ เอฟเฟกต์ Tough Skin (ลดดาเมจ)",
  },
  LIFESTEAL: {
    desc: "ฟื้นฟู HP ตามดาเมจที่ทำได้ในการต่อสู้",
    stats: "❤️ ดูดเลือด (เปิดใช้ใน battle)",
  },
  LUCKY_STRIKE: {
    desc: "เพิ่มโอกาสคริติคอลเมื่อ LUK สูงพอ",
    stats: `🍀 CRT +${Math.round((EFFECT_ITEM_BONUSES.LUCKY_STRIKE.critAdd ?? 0) * 100)}% (เมื่อ LUK > 50%)`,
  },
  MANA_FLOW: {
    desc: "ฟื้นฟูมานาในการต่อสู้",
    stats: "✨ Mana Flow (เปิดใช้ใน battle)",
  },
  IMMORTAL: {
    desc: "ป้องกันความตายในการต่อสู้ (ใช้ร่วมกับเอนจิน battle)",
    stats: "👼 Immortal — กันตาย 1 ครั้งต่อไฟต์ (ตามเอนจิน)",
  },
  GODS_BLESSING: {
    desc: "เพิ่มโบนัสทอง EXP และดาเมจบอส",
    stats: `⚡ ทอง +${Math.round((EFFECT_ITEM_BONUSES.GODS_BLESSING.goldMultiplier ?? 0) * 100)}%, EXP +${Math.round((EFFECT_ITEM_BONUSES.GODS_BLESSING.xpMultiplier ?? 0) * 100)}%, Boss +${Math.round((EFFECT_ITEM_BONUSES.GODS_BLESSING.bossDamageMultiplier ?? 0) * 100)}%`,
  },
  TIME_WARP: {
    desc: "ลดช่วงโจมตีของบอสในโหมด battle turn",
    stats: "⏳ Time Warp — เร่งจังหวะรอบ (ตามเอนจิน)",
  },
};

export const SET_DISPLAY_TH: Record<string, { desc: string; stats: string }> = {
  DRAGON_SET: {
    desc: "เซ็ตมังกร — โบนัสตามจำนวนชิ้นที่สวม",
    stats: "2 ชิ้น: ATK/DEF ×1.15 | 4 ชิ้น: Boss damage +30%, HP +500",
  },
  THUNDER_SET: {
    desc: "เซ็ตสายฟ้า — โบนัสตามจำนวนชิ้นที่สวม",
    stats: "2 ชิ้น: SPD ×1.2, CRT +8% | 4 ชิ้น: Chain lightning on crit",
  },
  SHADOW_SET: {
    desc: "เซ็ตเงา — โบนัสตามจำนวนชิ้นที่สวม",
    stats: "2 ชิ้น: LUK ×1.1, ทอง +20% | 4 ชิ้น: หลบ 15%, Steal gold +50%",
  },
  LEGENDARY_SET: {
    desc: "เซ็ตตำนาน — ต้องครบ 7 ชิ้นถึงจะได้โบนัสชุด",
    stats: "7 ชิ้น: สเตตส์หลัก ×1.25, XP +50%, Chosen One",
  },
};
