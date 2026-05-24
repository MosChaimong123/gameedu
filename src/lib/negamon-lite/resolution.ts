import { getValidChoices } from "./choices";
import { createSeededRng } from "./rng";
import { getEffectivenessLabel, getTypeMultiplier } from "./type-chart";
import type {
    NegamonLiteBattleEvent,
    NegamonLiteBattleSide,
    NegamonLiteBattleState,
    NegamonLiteChoice,
    NegamonLiteCombatant,
    NegamonLiteEffectStat,
    NegamonLiteMove,
    NegamonLiteResolvedChoice,
    NegamonLiteStats,
} from "./types";

const STAB_MULTIPLIER = 1.5;
const CRIT_CHANCE_PERCENT = 6.25;
const CRIT_MULTIPLIER = 1.5;
const STATUS_STAGE_STEP = 0.25;

function cloneCombatant(combatant: NegamonLiteCombatant): NegamonLiteCombatant {
    return {
        ...combatant,
        types: [...combatant.types],
        stats: { ...combatant.stats },
        moves: combatant.moves.map((move) => ({ ...move })),
        passiveTraitIds: [...(combatant.passiveTraitIds ?? [])],
        battleItemIds: [...(combatant.battleItemIds ?? [])],
        itemEffectKinds: [...(combatant.itemEffectKinds ?? [])],
    };
}

function cloneState(state: NegamonLiteBattleState): NegamonLiteBattleState {
    return {
        ...state,
        sides: {
            player: cloneCombatant(state.sides.player),
            opponent: cloneCombatant(state.sides.opponent),
        },
        events: [...state.events],
    };
}

function eventId(state: NegamonLiteBattleState, suffix: string): string {
    return `${state.battleId}:${state.turn}:${state.events.length + 1}:${suffix}`;
}

function oppositeSide(side: NegamonLiteBattleSide): NegamonLiteBattleSide {
    return side === "player" ? "opponent" : "player";
}

function resolveTargetSide(choice: NegamonLiteChoice, move: NegamonLiteMove): NegamonLiteBattleSide {
    if (choice.targetSide) return choice.targetSide;
    return move.target === "self" ? choice.side : oppositeSide(choice.side);
}

function getAttackStat(actor: NegamonLiteCombatant, move: NegamonLiteMove): number {
    return move.category === "SPECIAL" ? actor.stats.specialAttack : actor.stats.attack;
}

function getDefenseStat(target: NegamonLiteCombatant, move: NegamonLiteMove): number {
    return move.category === "SPECIAL" ? target.stats.specialDefense : target.stats.defense;
}

export function calculateDamage(input: {
    actor: NegamonLiteCombatant;
    target: NegamonLiteCombatant;
    move: NegamonLiteMove;
    critical: boolean;
}): {
    damage: number;
    stab: boolean;
    typeMultiplier: number;
    effectiveness: "immune" | "resisted" | "normal" | "effective";
} {
    if (input.move.category === "STATUS" || input.move.power <= 0) {
        return {
            damage: 0,
            stab: false,
            typeMultiplier: 1,
            effectiveness: "normal",
        };
    }

    const attack = Math.max(1, getAttackStat(input.actor, input.move));
    const defense = Math.max(1, getDefenseStat(input.target, input.move));
    const levelFactor = (2 * Math.max(1, input.actor.level)) / 5 + 2;
    const stab = input.actor.types.includes(input.move.type);
    const typeMultiplier = getTypeMultiplier(input.move.type, input.target.types);
    const criticalMultiplier = input.critical ? CRIT_MULTIPLIER : 1;
    const rawDamage = (((levelFactor * input.move.power * attack) / defense) / 50 + 2)
        * (stab ? STAB_MULTIPLIER : 1)
        * typeMultiplier
        * criticalMultiplier;

    return {
        damage: typeMultiplier <= 0 ? 0 : Math.max(1, Math.floor(rawDamage)),
        stab,
        typeMultiplier,
        effectiveness: getEffectivenessLabel(typeMultiplier),
    };
}

function applyStatEffect(stats: NegamonLiteStats, stat: Exclude<NegamonLiteEffectStat, "accuracy">, stages: number): NegamonLiteStats {
    const multiplier = Math.max(0.25, 1 + stages * STATUS_STAGE_STEP);
    return {
        ...stats,
        [stat]: Math.max(1, Math.floor(stats[stat] * multiplier)),
    };
}

function getAccuracyMultiplier(combatant: NegamonLiteCombatant): number {
    return Math.max(0.25, 1 + (combatant.accuracyStage ?? 0) * STATUS_STAGE_STEP);
}

function applyMoveEffect(args: {
    state: NegamonLiteBattleState;
    side: NegamonLiteBattleSide;
    targetSide: NegamonLiteBattleSide;
    move: NegamonLiteMove;
}): { healing: number; effectApplied: boolean } {
    const effect = args.move.effect;
    if (!effect) return { healing: 0, effectApplied: false };

    if (effect.kind === "heal") {
        const target = args.state.sides[args.targetSide];
        const healing = Math.max(1, Math.floor(target.stats.hp * (effect.percent / 100)));
        target.hp = Math.min(target.stats.hp, target.hp + healing);
        return { healing, effectApplied: true };
    }

    if (effect.kind === "buff") {
        const target = args.state.sides[args.targetSide];
        if (effect.stat === "accuracy") {
            target.accuracyStage = (target.accuracyStage ?? 0) + Math.abs(effect.stages);
        } else {
            target.stats = applyStatEffect(target.stats, effect.stat, Math.abs(effect.stages));
        }
        return { healing: 0, effectApplied: true };
    }

    const target = args.state.sides[args.targetSide];
    if (effect.stat === "accuracy") {
        target.accuracyStage = (target.accuracyStage ?? 0) - Math.abs(effect.stages);
    } else {
        target.stats = applyStatEffect(target.stats, effect.stat, -Math.abs(effect.stages));
    }
    return { healing: 0, effectApplied: true };
}

function pushEvent(state: NegamonLiteBattleState, event: Omit<NegamonLiteBattleEvent, "id" | "turn"> & { idSuffix: string }) {
    const { idSuffix, ...rest } = event;
    state.events.push({
        id: eventId(state, idSuffix),
        turn: state.turn,
        ...rest,
    });
}

export function resolveChoice(state: NegamonLiteBattleState, choice: NegamonLiteChoice): NegamonLiteResolvedChoice {
    const nextState = cloneState(state);
    const validChoice = getValidChoices(nextState, choice.side).find((candidate) => candidate.moveId === choice.moveId);

    if (!validChoice) {
        pushEvent(nextState, {
            idSuffix: "choice-rejected",
            kind: "choice_rejected",
            side: choice.side,
            moveId: choice.moveId,
            message: "Move is not available.",
        });
        return { state: nextState, accepted: false, reason: "INVALID_MOVE" };
    }

    if (!validChoice.enabled) {
        pushEvent(nextState, {
            idSuffix: "choice-rejected",
            kind: "choice_rejected",
            side: choice.side,
            moveId: choice.moveId,
            message: `Move rejected: ${validChoice.reason}`,
        });
        return { state: nextState, accepted: false, reason: validChoice.reason };
    }

    const rng = createSeededRng(nextState.seed);
    const actor = nextState.sides[choice.side];
    const move = actor.moves.find((candidate) => candidate.id === choice.moveId);
    if (!move) return { state: nextState, accepted: false, reason: "INVALID_MOVE" };

    const targetSide = resolveTargetSide(choice, move);
    const target = nextState.sides[targetSide];
    move.pp = Math.max(0, move.pp - 1);
    actor.energy = Math.max(0, actor.energy - (move.energyCost ?? 0));
    move.cooldownRemaining = Math.max(0, Math.floor(move.cooldownTurns ?? 0));

    const effectiveAccuracy = Math.max(0, Math.min(100, Math.floor(move.accuracy * getAccuracyMultiplier(actor))));
    const missed = !rng.chance(effectiveAccuracy);
    const critical = !missed && move.category !== "STATUS" && rng.chance(CRIT_CHANCE_PERCENT);
    const damageResult = missed
        ? { damage: 0, stab: false, typeMultiplier: 1, effectiveness: "normal" as const }
        : calculateDamage({ actor, target, move, critical });

    if (damageResult.damage > 0) {
        target.hp = Math.max(0, target.hp - damageResult.damage);
    }

    const effectResult = missed
        ? { healing: 0, effectApplied: false }
        : applyMoveEffect({ state: nextState, side: choice.side, targetSide, move });

    nextState.seed = rng.seed;
    pushEvent(nextState, {
        idSuffix: "turn-resolved",
        kind: "turn_resolved",
        side: choice.side,
        moveId: move.id,
        targetSide,
        damage: damageResult.damage,
        healing: effectResult.healing,
        effect: move.effect,
        effectApplied: effectResult.effectApplied,
        missed,
        critical,
        stab: damageResult.stab,
        typeMultiplier: damageResult.typeMultiplier,
        effectiveness: damageResult.effectiveness,
        message: missed
            ? `${actor.name} used ${move.name}, but it missed.`
            : `${actor.name} used ${move.name}.`,
    });

    if (target.hp <= 0 && targetSide !== choice.side) {
        nextState.phase = "ended";
        nextState.winner = choice.side;
        pushEvent(nextState, {
            idSuffix: "battle-ended",
            kind: "battle_ended",
            side: choice.side,
            targetSide,
            message: `${actor.name} wins.`,
        });
        return { state: nextState, accepted: true };
    }

    nextState.turn += 1;
    nextState.phase = "choosing";
    return { state: nextState, accepted: true };
}
