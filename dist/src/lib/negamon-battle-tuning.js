"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveNegamonTuning = resolveNegamonTuning;
const game_1 = require("./types/game");
function clampNumber(value, min, max, fallback) {
    const n = typeof value === "number" && Number.isFinite(value) ? value : Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, n));
}
/** รวมค่าจาก settings กับค่าเริ่ม — ใช้ทั้งใน NegamonBattleEngine และฝั่ง UI */
function resolveNegamonTuning(settings) {
    var _a;
    const d = game_1.DEFAULT_NEGAMON_BATTLE_TUNING;
    const n = (_a = settings.negamonBattle) !== null && _a !== void 0 ? _a : {};
    return {
        startHp: clampNumber(n.startHp, 10, 500, d.startHp),
        roundSeconds: clampNumber(n.roundSeconds, 5, 120, d.roundSeconds),
        betweenSeconds: clampNumber(n.betweenSeconds, 1, 30, d.betweenSeconds),
        fastAnswerSeconds: clampNumber(n.fastAnswerSeconds, 1, 30, d.fastAnswerSeconds),
        movePower: clampNumber(n.movePower, 5, 200, d.movePower),
        attackerAtk: clampNumber(n.attackerAtk, 1, 200, d.attackerAtk),
        defenderDef: clampNumber(n.defenderDef, 1, 200, d.defenderDef),
    };
}
