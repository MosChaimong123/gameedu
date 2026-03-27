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
  GOLD_FINDER:   { goldMultiplier: 0.15 },
  QUICK_LEARNER: { xpMultiplier: 0.1 },
  LUCKY_STRIKE:  { critAdd: 0.05 },
  HUNTER_MARK:   { bossDamageMultiplier: 0.15 },
  GODS_BLESSING: { goldMultiplier: 0.1, xpMultiplier: 0.1, bossDamageMultiplier: 0.1 },
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
  // New archetype effects
  TITAN_WILL: {
    desc: "เมื่อ HP เหลือต่ำกว่า 30% จะเพิ่ม DEF ×1.5 ชั่วคราว",
    stats: "🪨 Titan Will — HP < 30% → DEF ×1.5",
  },
  HOLY_FURY: {
    desc: "เมื่อ HP เหลือต่ำกว่า 30% จะเพิ่ม ATK ×1.4 ชั่วคราว",
    stats: "🔥 Holy Fury — HP < 30% → ATK ×1.4",
  },
  ARCANE_SURGE: {
    desc: "เมื่อใช้สกิลเวทมนตร์ ดาเมจเพิ่มขึ้น 10%",
    stats: "🔮 Arcane Surge — MAG skill dmg +10%",
  },
  DARK_PACT: {
    desc: "เพิ่มดาเมจ +20% แต่ทุกครั้งที่โจมตีจะเสีย HP 5% ของค่าสูงสุด",
    stats: "💀 Dark Pact — Damage +20%, หลังโจมตี: HP -5%",
  },
  HAWK_EYE: {
    desc: "เพิ่มดาเมจจากการโจมตีคริติคอล 30%",
    stats: "🦅 Hawk Eye — CRT damage ×1.3",
  },
  HUNTER_MARK: {
    desc: "เพิ่มดาเมจต่อบอส 15%",
    stats: "🎯 Hunter Mark — Boss DMG +15%",
  },
  SHADOW_VEIL: {
    desc: "มีโอกาสหลบการโจมตี 15% และการโจมตีครั้งถัดไปแรงขึ้น 20% หลังหลบสำเร็จ",
    stats: "👻 Shadow Veil — Dodge 15%, หลังหลบ: Next hit ×1.2",
  },
  BLADE_DANCE: {
    desc: "ทุก 10 SPD เพิ่ม CRT 1%",
    stats: "💃 Blade Dance — ทุก 10 SPD → CRT +1%",
  },
  // ── New effects ─────────────────────────────────────────────────────────────
  SWIFT_STRIKE: {
    desc: "ทุก 10 SPD เพิ่ม ATK 1% (passive)",
    stats: "⚡ Swift Strike — ทุก 10 SPD → ATK +1%",
  },
  BERSERKER_RAGE: {
    desc: "เมื่อ HP เหลือต่ำกว่า 50% จะเพิ่ม ATK ×1.20 ในการต่อสู้",
    stats: "😤 Berserker Rage — HP < 50% → ATK ×1.20",
  },
  BATTLE_FOCUS: {
    desc: "เมื่อ HP เหลือต่ำกว่า 50% โอกาสคริติคอลจะเพิ่มเป็น 2 เท่า",
    stats: "🎯 Battle Focus — HP < 50% → CRIT ×2",
  },
  ECHO_STRIKE: {
    desc: "มีโอกาส 30% ที่การโจมตีจะถูกสะท้อนซ้ำ ทำดาเมจ 50% ของต้นฉบับ",
    stats: "🌀 Echo Strike — 30% chance: ตีซ้ำ 50% DMG",
  },
  DRAGON_BLOOD: {
    desc: "ฟื้นฟู HP 2% ของค่าสูงสุดทุกครั้งที่บอสโจมตี",
    stats: "🐉 Dragon Blood — regen 2% maxHP/boss tick",
  },
  CELESTIAL_GRACE: {
    desc: "เพิ่มสเตตส์ทั้งหมด 5% และ EXP ที่ได้รับ 15% (passive)",
    stats: "✨ Celestial Grace — ทุก stat +5%, EXP +15%",
  },
  VOID_WALKER: {
    desc: "มีโอกาสหลบ 25% และโจมตีตอบโต้ 50% ATK หลังหลบสำเร็จ",
    stats: "🌌 Void Walker — Dodge 25%, โจมตีตอบ 50% ATK",
  },
  SOUL_EATER: {
    desc: "เมื่อกำจัดมอนสเตอร์ได้ ฟื้นฟู HP 15% ของค่าสูงสุด",
    stats: "💀 Soul Eater — Kill → regen 15% maxHP",
  },
};

export const SET_DISPLAY_TH: Record<string, { desc: string; stats: string; icon: string }> = {
  // New archetype sets
  TITAN_SET: {
    icon: "🛡️",
    desc: "ชุดไทแทน (นักรบ/แทงค์) — ครบ 5 ชิ้น",
    stats: "3 ชิ้น: DEF ×1.12, HP ×1.08 | 5 ชิ้น: ATK ×1.10 + เปิด IMMORTAL passive",
  },
  ARCANE_SET: {
    icon: "🔮",
    desc: "ชุดอาร์เคน (นักเวทย์/นักบำบัด) — ครบ 5 ชิ้น",
    stats: "3 ชิ้น: MAG ×1.15, MP ×1.12 | 5 ชิ้น: CRT +6% + เปิด MANA_FLOW passive",
  },
  HUNT_SET: {
    icon: "🏹",
    desc: "ชุดนักล่า (นักธนู/สไนเปอร์) — ครบ 5 ชิ้น",
    stats: "3 ชิ้น: CRT +6%, SPD ×1.10 | 5 ชิ้น: ATK ×1.15, LUK ×1.10 + LUCKY_STRIKE",
  },
  SHADOW_SET: {
    icon: "🌑",
    desc: "ชุดเงามืด (โจร/นักสังหาร) — ครบ 5 ชิ้น",
    stats: "3 ชิ้น: CRT +8%, LUK ×1.12 | 5 ชิ้น: SPD ×1.15, หลบ 12% + LIFESTEAL",
  },
  LEGENDARY_SET: {
    icon: "⭐",
    desc: "ชุดตำนาน (ทุกอาชีพ) — ต้องครบ 7 ชิ้น",
    stats: "7 ชิ้น: สเตตส์หลัก ×1.25, XP +50%, Chosen One",
  },
  // Legacy sets (items no longer in shop but kept for display)
  DRAGON_SET: {
    icon: "🐉",
    desc: "ชุดมังกร — โบนัสตามจำนวนชิ้น",
    stats: "2 ชิ้น: ATK/DEF ×1.15 | 4 ชิ้น: Boss +30%, HP +25%",
  },
  THUNDER_SET: {
    icon: "⚡",
    desc: "ชุดสายฟ้า — โบนัสตามจำนวนชิ้น",
    stats: "2 ชิ้น: SPD ×1.2, CRT +8% | 4 ชิ้น: Chain lightning on crit",
  },
};
