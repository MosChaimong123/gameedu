import {
    calculateDamage,
    getValidChoices,
    resolveChoice,
} from "@/lib/negamon-lite";
import type {
    NegamonBattleChoice,
    NegamonBattleCombatant,
    NegamonBattleResolvedChoice,
    NegamonBattleSide,
    NegamonBattleStateV2,
    NegamonBattleValidChoice,
} from "./battle-state";
import type { NegamonBattleMove } from "./battle-state";
import { cloneNegamonBattleState } from "./battle-state";

export type NegamonBattleDamageResult = ReturnType<typeof calculateDamage>;

export function getNegamonBattleValidChoices(
    state: NegamonBattleStateV2,
    side: NegamonBattleSide
): NegamonBattleValidChoice[] {
    return getValidChoices(state, side);
}

export function resolveNegamonBattleChoice(
    state: NegamonBattleStateV2,
    choice: NegamonBattleChoice
): NegamonBattleResolvedChoice {
    return resolveChoice(state, choice);
}

export function previewNegamonBattleDamage(input: {
    actor: NegamonBattleCombatant;
    target: NegamonBattleCombatant;
    move: NegamonBattleMove;
    critical?: boolean;
}): NegamonBattleDamageResult {
    return calculateDamage({
        actor: input.actor,
        target: input.target,
        move: input.move,
        critical: Boolean(input.critical),
    });
}

export function advanceNegamonBattleTurnWithoutMutation(input: {
    state: NegamonBattleStateV2;
    choice: NegamonBattleChoice;
}): NegamonBattleResolvedChoice {
    return resolveNegamonBattleChoice(cloneNegamonBattleState(input.state), input.choice);
}
