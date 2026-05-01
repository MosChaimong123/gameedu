import type { MonsterMove } from "@/lib/types/negamon";

/** ท่าโจมตีธรรมดา — ไม่อยู่ใน `species.moves`; ฝังจากระบบทุกแรงค์ */
export const NEGAMON_BASIC_ATTACK_MOVE_ID = "basic-attack";

/** ธาตุ NORMAL = ไร้ธาตุ — ไม่เข้า type chart, ไม่ได้ STAB จากธาตุมอน */
export function buildBasicAttackMove(): MonsterMove {
    return {
        id: NEGAMON_BASIC_ATTACK_MOVE_ID,
        name: "โจมตีธรรมดา",
        type: "NORMAL",
        category: "PHYSICAL",
        power: 24,
        accuracy: 100,
        learnRank: 0,
        energyCost: 0,
    };
}

export function isNegamonBasicAttackMoveId(moveId: string): boolean {
    return moveId === NEGAMON_BASIC_ATTACK_MOVE_ID;
}
