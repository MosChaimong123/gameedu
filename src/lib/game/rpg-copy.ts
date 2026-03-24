import { EFFECT_DISPLAY_TH, SET_DISPLAY_TH } from "./effect-bonuses-config";

export { EFFECT_DISPLAY_TH, SET_DISPLAY_TH };

export const RPG_COPY = {
  shop: {
    duplicateItem: "คุณมีไอเทมชิ้นนี้อยู่แล้ว",
    insufficientGold: "ทองไม่พอซื้อไอเทมชิ้นนี้",
    insufficientPoints: "แต้มพฤติกรรมไม่พอซื้อไอเทมชิ้นนี้",
  },
  inventory: {
    unusableItem: "ไอเทมชิ้นนี้ไม่สามารถใช้งานได้",
    insufficientQuantity: "จำนวนไอเทมไม่เพียงพอ",
    transmuteRequirement: (cost: number) =>
      `ต้องมีวัสดุ COMMON อย่างน้อย ${cost} ชิ้นเพื่อใช้ Transmute Stone`,
    useSuccess: (itemName: string, quantity: number) =>
      `ใช้งาน ${itemName} จำนวน ${quantity} ชิ้นสำเร็จ`,
    staminaRecovered: (stamina: number) => `ฟื้นฟู Stamina เป็น ${stamina}`,
    manaRecovered: (mana: number) => `ฟื้นฟู Mana เป็น ${mana}`,
    hpRecovered: (amount: number) => `ฟื้นฟู HP +${amount.toLocaleString()}`,
    hpBuffQueued: (percent: number) =>
      `ได้รับบัฟ HP +${Math.round(percent * 100)}% ในการต่อสู้ครั้งถัดไป`,
    phoenixQueued: "จะชุบชีวิตพร้อม HP 50% เมื่อแพ้ในการต่อสู้ครั้งถัดไป",
    statBuffQueued: (parts: string) => `ได้รับบัฟ ${parts} ในการต่อสู้ครั้งถัดไป`,
    goldBoostQueued: (minutes: number) => `ได้รับบัฟ Gold x2 เป็นเวลา ${minutes} นาที`,
    xpBoostQueued: (minutes: number) => `ได้รับบัฟ XP x2 เป็นเวลา ${minutes} นาที`,
    transmuteSuccess: (from: string, to: string) =>
      `แปลง 5x ${from} เป็น 1x ${to} สำเร็จ`,
    levelUpSuccess: (level: number | string) => `เลเวลอัปสำเร็จ ตอนนี้เป็น Lv.${level}`,
  },
  farming: {
    loading: "กำลังตามล่ามอนสเตอร์...",
    emptyState: "ยังไม่มีมอนสเตอร์ให้ฟาร์ม",
    autoStoppedTitle: "Stamina หมด!",
    autoStoppedDescription: "ระบบโจมตีอัตโนมัติหยุดทำงานแล้ว",
    diedTitle: "ล้มแล้ว!",
    diedDescription: (wave: number) => `ถอยกลับไปด่าน ${wave}`,
    healTitle: "ฟื้นฟู HP",
    defeatedTitle: "มอนสเตอร์พ่ายแพ้!",
    attackFailed: "โจมตีไม่สำเร็จ",
    skillFailed: "ใช้ทักษะไม่สำเร็จ",
    useFailed: "ใช้งานไม่สำเร็จ",
    useItemTitle: (itemName: string) => `ใช้ ${itemName}`,
    recoveryItems: "ไอเทมฟื้นฟู",
    noRecoveryItems: "ยังไม่มีไอเทมฟื้นฟู",
    skills: "ทักษะ",
    noSkills: "ยังไม่มีทักษะ เลื่อนเลเวลเพื่อปลดล็อกเพิ่ม",
    wave: (wave: number) => `ด่าน ${wave}`,
  },
} as const;
