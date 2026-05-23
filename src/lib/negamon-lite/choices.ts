import type {
    NegamonLiteBattleSide,
    NegamonLiteBattleState,
    NegamonLiteChoiceDisabledReason,
    NegamonLiteCombatant,
    NegamonLiteMove,
    NegamonLiteValidChoice,
} from "./types";

function oppositeSide(side: NegamonLiteBattleSide): NegamonLiteBattleSide {
    return side === "player" ? "opponent" : "player";
}

function getTargetSide(side: NegamonLiteBattleSide, move: NegamonLiteMove): NegamonLiteBattleSide {
    return move.target === "self" ? side : oppositeSide(side);
}

function getDisabledReason(
    state: NegamonLiteBattleState,
    actor: NegamonLiteCombatant,
    target: NegamonLiteCombatant,
    move: NegamonLiteMove
): NegamonLiteChoiceDisabledReason | undefined {
    if (state.phase === "ended") return "BATTLE_ENDED";
    if (state.phase !== "choosing") return "NOT_CHOOSING";
    if (actor.hp <= 0) return "FAINTED";
    if (target.hp <= 0 && move.target === "opponent") return "INVALID_TARGET";
    if (move.pp <= 0) return "NO_PP";
    if ((move.energyCost ?? 0) > actor.energy) return "NO_ENERGY";
    return undefined;
}

export function getValidChoices(
    state: NegamonLiteBattleState,
    side: NegamonLiteBattleSide
): NegamonLiteValidChoice[] {
    const actor = state.sides[side];

    return actor.moves.map((move) => {
        const targetSide = getTargetSide(side, move);
        const target = state.sides[targetSide];
        const reason = getDisabledReason(state, actor, target, move);

        return {
            kind: "move",
            moveId: move.id,
            label: move.name,
            targetSide,
            enabled: !reason,
            reason,
            move,
        };
    });
}
