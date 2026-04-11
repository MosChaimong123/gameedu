/**
 * Rough damage range for UI copy — mirrors battle-engine formula shape without crit RNG roll.
 * Sync multipliers with `battle-engine.ts` (BASIC_ATTACK_DAMAGE_MULT / SKILL_DAMAGE_MULT).
 */
/** พลังท่า “ตีธรรมดา” ในเอนจิน — ใช้โชว์ตัวอย่างเท่านั้น */
export const NEGAMON_BASIC_ATTACK_PREVIEW_POWER = 24;

const BASIC_ATTACK_DAMAGE_MULT = 0.02;
const SKILL_DAMAGE_MULT = 0.018;
const VARIANCE_MIN = 0.9;
const VARIANCE_MAX = 1.1;
const CRIT_MULT = 1.5;

export type NegamonDamagePreviewInput = {
    /** Effective ATK (หลังสเตจ — โปรไฟล์ใช้ค่า stats ตรงๆ) */
    atk: number;
    /** DEF ของเป้าหมายจำลอง */
    defenderDef: number;
    movePower: number;
    /** ตีธรรมดา → ใช้ตัวคูณ basic */
    isBasicAttack: boolean;
    /** คูณธาตุรวม (ค่าเริ่มต้น 1) */
    typeMult?: number;
    /** STAB 1.5 หรือ 1 */
    stabMult?: number;
};

function floorDamage(
    atkDefDelta: number,
    power: number,
    typeMult: number,
    stabMult: number,
    variance: number,
    crit: boolean,
    isBasicAttack: boolean
): number {
    const moveClassMult = isBasicAttack ? BASIC_ATTACK_DAMAGE_MULT : SKILL_DAMAGE_MULT;
    const critMult = crit ? CRIT_MULT : 1;
    const delta = Math.max(1, atkDefDelta);
    return Math.max(
        1,
        Math.floor(delta * power * typeMult * stabMult * variance * critMult * moveClassMult)
    );
}

/** ช่วงตัวเลขโดยไม่คริ (min–max variance) และกรณีคริ ×1.5 */
export function negamonDamageApproxRange(input: NegamonDamagePreviewInput): {
    min: number;
    max: number;
    minCrit: number;
    maxCrit: number;
} {
    const typeMult = input.typeMult ?? 1;
    const stabMult = input.stabMult ?? 1;
    const atkDefDelta = Math.max(1, input.atk - Math.max(1, input.defenderDef));

    return {
        min: floorDamage(atkDefDelta, input.movePower, typeMult, stabMult, VARIANCE_MIN, false, input.isBasicAttack),
        max: floorDamage(atkDefDelta, input.movePower, typeMult, stabMult, VARIANCE_MAX, false, input.isBasicAttack),
        minCrit: floorDamage(atkDefDelta, input.movePower, typeMult, stabMult, VARIANCE_MIN, true, input.isBasicAttack),
        maxCrit: floorDamage(atkDefDelta, input.movePower, typeMult, stabMult, VARIANCE_MAX, true, input.isBasicAttack),
    };
}
