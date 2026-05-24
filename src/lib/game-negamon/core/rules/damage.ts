import { applyCombatStatStages } from "./stat-stages";
import { getFormulaEffectivenessLabel, getFormulaTypeMultiplier } from "./type-multiplier";
import type { NegamonFormulaCombatant, NegamonFormulaMove } from "./types";

export const NEGAMON_FORMULA_STAB_MULTIPLIER = 1.5;
export const NEGAMON_FORMULA_CRIT_MULTIPLIER = 1.5;

function getAttackValue(actor: NegamonFormulaCombatant, move: NegamonFormulaMove): number {
    const stats = applyCombatStatStages({
        stats: actor.stats,
        statStages: actor.statStages,
    });
    return move.category === "SPECIAL" ? stats.specialAttack : stats.attack;
}

function getDefenseValue(target: NegamonFormulaCombatant, move: NegamonFormulaMove): number {
    const stats = applyCombatStatStages({
        stats: target.stats,
        statStages: target.statStages,
    });
    return move.category === "SPECIAL" ? stats.specialDefense : stats.defense;
}

export function calculateFormulaDamage(input: {
    actor: NegamonFormulaCombatant;
    target: NegamonFormulaCombatant;
    move: NegamonFormulaMove;
    critical?: boolean;
    randomMultiplier?: number;
    flatModifier?: number;
}): {
    damage: number;
    stab: boolean;
    typeMultiplier: number;
    effectiveness: "immune" | "resisted" | "normal" | "effective";
    critical: boolean;
} {
    if (input.move.category === "STATUS" || input.move.power <= 0) {
        return {
            damage: 0,
            stab: false,
            typeMultiplier: 1,
            effectiveness: "normal",
            critical: Boolean(input.critical),
        };
    }

    const attack = Math.max(1, getAttackValue(input.actor, input.move));
    const defense = Math.max(1, getDefenseValue(input.target, input.move));
    const level = Math.max(1, Math.trunc(input.actor.level));
    const levelFactor = (2 * level) / 5 + 2;
    const baseDamage = ((levelFactor * input.move.power * attack) / defense) / 50 + 2;
    const stab = input.actor.types.includes(input.move.type);
    const typeMultiplier = getFormulaTypeMultiplier(input.move.type, input.target.types);
    const critMultiplier = input.critical ? NEGAMON_FORMULA_CRIT_MULTIPLIER : 1;
    const randomMultiplier = input.randomMultiplier ?? 1;
    const flatModifier = input.flatModifier ?? 1;
    const rawDamage =
        baseDamage *
        (stab ? NEGAMON_FORMULA_STAB_MULTIPLIER : 1) *
        typeMultiplier *
        critMultiplier *
        randomMultiplier *
        flatModifier;

    return {
        damage: typeMultiplier <= 0 ? 0 : Math.max(1, Math.floor(rawDamage)),
        stab,
        typeMultiplier,
        effectiveness: getFormulaEffectivenessLabel(typeMultiplier),
        critical: Boolean(input.critical),
    };
}
