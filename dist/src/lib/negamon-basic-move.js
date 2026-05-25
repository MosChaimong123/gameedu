"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEGAMON_BASIC_ATTACK_MOVE_ID = void 0;
exports.buildBasicAttackMove = buildBasicAttackMove;
exports.isNegamonBasicAttackMoveId = isNegamonBasicAttackMoveId;
/** ท่าโจมตีธรรมดา — ไม่อยู่ใน `species.moves`; ฝังจากระบบทุกแรงค์ */
exports.NEGAMON_BASIC_ATTACK_MOVE_ID = "basic-attack";
/** ธาตุ NORMAL = ไร้ธาตุ — ไม่เข้า type chart, ไม่ได้ STAB จากธาตุมอน */
function buildBasicAttackMove() {
    return {
        id: exports.NEGAMON_BASIC_ATTACK_MOVE_ID,
        name: "โจมตีธรรมดา",
        type: "NORMAL",
        category: "PHYSICAL",
        power: 24,
        accuracy: 100,
        learnRank: 0,
        energyCost: 0,
    };
}
function isNegamonBasicAttackMoveId(moveId) {
    return moveId === exports.NEGAMON_BASIC_ATTACK_MOVE_ID;
}
