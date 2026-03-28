"use strict";
/**
 * RPG System Shared Constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILLS = void 0;
exports.SKILLS = [
    {
        id: "HEAL",
        name: "Heal (รักษา)",
        description: "ฟื้นฟูพลังชีวิต (HP) ของคุณทันที",
        icon: "💉",
        manaCost: 20,
        type: "HEAL",
        color: "rose"
    },
    {
        id: "POWER_STRIKE",
        name: "Power Strike (โจมตีหนัก)",
        description: "สร้างความเสียหาย 2 เท่าใส่บอสปัจจุบัน",
        icon: "🔥",
        manaCost: 35,
        type: "BOSS_DAMAGE",
        color: "amber",
        value: 2.0
    },
    {
        id: "GOLD_SCENT",
        name: "Gold Scent (สัมผัสทอง)",
        description: "เพิ่มอัตราการได้รับทองเป็น 2 เท่าชั่วคราว",
        icon: "✨",
        manaCost: 50,
        type: "GOLD_BUFF",
        color: "yellow",
        duration: 60
    }
];
