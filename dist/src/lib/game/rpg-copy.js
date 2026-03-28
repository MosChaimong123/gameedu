"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPG_COPY = exports.SET_DISPLAY_TH = exports.EFFECT_DISPLAY_TH = void 0;
const effect_bonuses_config_1 = require("./effect-bonuses-config");
Object.defineProperty(exports, "EFFECT_DISPLAY_TH", { enumerable: true, get: function () { return effect_bonuses_config_1.EFFECT_DISPLAY_TH; } });
Object.defineProperty(exports, "SET_DISPLAY_TH", { enumerable: true, get: function () { return effect_bonuses_config_1.SET_DISPLAY_TH; } });
exports.RPG_COPY = {
    shop: {
        duplicateItem: "คุณมีไอเทมชิ้นนี้อยู่แล้ว",
        insufficientGold: "ทองไม่พอซื้อไอเทมชิ้นนี้",
        insufficientPoints: "แต้มพฤติกรรมไม่พอซื้อไอเทมชิ้นนี้",
    },
    inventory: {
        unusableItem: "ไอเทมชิ้นนี้ไม่สามารถใช้งานได้",
        insufficientQuantity: "จำนวนไอเทมไม่เพียงพอ",
        transmuteRequirement: (cost) => `ต้องมีวัสดุ COMMON อย่างน้อย ${cost} ชิ้นเพื่อใช้ Transmute Stone`,
        useSuccess: (itemName, quantity) => `ใช้งาน ${itemName} จำนวน ${quantity} ชิ้นสำเร็จ`,
        staminaRecovered: (stamina) => `ฟื้นฟู Stamina เป็น ${stamina}`,
        manaRecovered: (mana) => `ฟื้นฟู Mana เป็น ${mana}`,
        hpRecovered: (amount) => `ฟื้นฟู HP +${amount.toLocaleString()}`,
        hpBuffQueued: (percent) => `ได้รับบัฟ HP +${Math.round(percent * 100)}% ในการต่อสู้ครั้งถัดไป`,
        phoenixQueued: "จะชุบชีวิตพร้อม HP 50% เมื่อแพ้ในการต่อสู้ครั้งถัดไป",
        statBuffQueued: (parts) => `ได้รับบัฟ ${parts} ในการต่อสู้ครั้งถัดไป`,
        goldBoostQueued: (minutes) => `ได้รับบัฟ Gold x2 เป็นเวลา ${minutes} นาที`,
        xpBoostQueued: (minutes) => `ได้รับบัฟ XP x2 เป็นเวลา ${minutes} นาที`,
        transmuteSuccess: (from, to) => `แปลง 5x ${from} เป็น 1x ${to} สำเร็จ`,
        levelUpSuccess: (level) => `เลเวลอัปสำเร็จ ตอนนี้เป็น Lv.${level}`,
    },
    farming: {
        loading: "กำลังตามล่ามอนสเตอร์...",
        emptyState: "ยังไม่มีมอนสเตอร์ให้ฟาร์ม",
        autoStoppedTitle: "Stamina หมด!",
        autoStoppedDescription: "ระบบโจมตีอัตโนมัติหยุดทำงานแล้ว",
        diedTitle: "ล้มแล้ว!",
        diedDescription: (wave) => `ถอยกลับไปด่าน ${wave}`,
        healTitle: "ฟื้นฟู HP",
        defeatedTitle: "มอนสเตอร์พ่ายแพ้!",
        attackFailed: "โจมตีไม่สำเร็จ",
        skillFailed: "ใช้ทักษะไม่สำเร็จ",
        useFailed: "ใช้งานไม่สำเร็จ",
        useItemTitle: (itemName) => `ใช้ ${itemName}`,
        recoveryItems: "ไอเทมฟื้นฟู",
        noRecoveryItems: "ยังไม่มีไอเทมฟื้นฟู",
        skills: "ทักษะ",
        noSkills: "ยังไม่มีทักษะ เลื่อนเลเวลเพื่อปลดล็อกเพิ่ม",
        wave: (wave) => `ด่าน ${wave}`,
    },
};
