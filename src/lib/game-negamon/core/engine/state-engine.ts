import {
    advanceDeterministicRng,
    applyCombatStatStages,
    createDeterministicRng,
    type NegamonDeterministicRng,
} from "../rules";
import { applyRuntimeHooks } from "./hook-framework";
import { resolveRuntimeSkill } from "./move-runtime";
import type { NegamonRuntimeTimelineEvent } from "./runtime-types";
import { resolveRuntimeTurnEndStatuses } from "./status-runtime";
import type {
    NegamonBattleActionIntentV3,
    NegamonBattleCombatantV3,
    NegamonBattleEventV3,
    NegamonBattleMoveSlotV3,
    NegamonBattleSideV3,
    NegamonBattleStateV3,
    NegamonBattleValidChoiceV3,
} from "../state";
import { cloneBattleStateV3, createBattleChoiceRequestIdV3 } from "../state";

type ValidationFailureCode =
    | "BATTLE_ENDED"
    | "NOT_CHOOSING"
    | "STALE_REQUEST"
    | "STALE_STATE"
    | "INVALID_SIDE"
    | "INVALID_ACTION"
    | "FAINTED"
    | "NO_PP"
    | "NO_ENERGY"
    | "ON_COOLDOWN"
    | "INVALID_TARGET";

export type NegamonBattleValidationResult =
    | { ok: true; slot: NegamonBattleMoveSlotV3 }
    | { ok: false; code: ValidationFailureCode; message: string; validChoices: NegamonBattleValidChoiceV3[] };

export type NegamonBattleTurnResolveResultV3 =
    | {
          ok: true;
          state: NegamonBattleStateV3;
          validChoices: NegamonBattleValidChoiceV3[];
      }
    | {
          ok: false;
          code: ValidationFailureCode;
          message: string;
          state: NegamonBattleStateV3;
          validChoices: NegamonBattleValidChoiceV3[];
      };

function getSideCombatant(state: NegamonBattleStateV3, side: NegamonBattleSideV3): NegamonBattleCombatantV3 {
    return side === "player" ? state.sides.player : state.sides.opponent;
}

function getOpponentSide(side: NegamonBattleSideV3): NegamonBattleSideV3 {
    return side === "player" ? "opponent" : "player";
}

function getStateRng(state: NegamonBattleStateV3): NegamonDeterministicRng {
    return createDeterministicRng(state.seed, state.rngCursor);
}

function commitStateRng(state: NegamonBattleStateV3, rng: NegamonDeterministicRng) {
    state.seed = rng.seed;
    state.rngCursor = rng.cursor;
}

function nextEventId(state: NegamonBattleStateV3): string {
    return `${state.battleId}:event:${state.events.length + 1}`;
}

function pushEvent(state: NegamonBattleStateV3, event: Omit<NegamonBattleEventV3, "id">) {
    state.events.push({
        id: nextEventId(state),
        ...event,
    });
}

function mapTimelineKind(kind: NegamonRuntimeTimelineEvent["kind"]): NegamonBattleEventV3["kind"] {
    switch (kind) {
        case "damage":
            return "damage_dealt";
        case "heal":
            return "heal_applied";
        case "status_applied":
            return "status_applied";
        case "status_blocked":
            return "status_blocked";
        case "status_tick":
            return "status_ticked";
        case "status_expired":
            return "status_expired";
        case "volatile_applied":
            return "volatile_applied";
        case "volatile_expired":
            return "volatile_expired";
        case "stat_stage_changed":
            return "stat_stage_changed";
        case "turn_skipped":
            return "turn_skipped";
        case "move_used":
        default:
            return "move_used";
    }
}

function appendTimelineEvents(
    state: NegamonBattleStateV3,
    phase: NegamonBattleEventV3["phase"],
    timeline: NegamonRuntimeTimelineEvent[]
) {
    for (const event of timeline) {
        pushEvent(state, {
            turn: state.turn,
            phase,
            kind: mapTimelineKind(event.kind),
            actorSide: event.actorSide,
            targetSide: event.targetSide,
            moveId: event.moveId,
            delta: event.amount != null ? { hp: event.kind === "damage" ? -event.amount : event.amount } : undefined,
            message: event.message,
        });
    }
}

function ensureBattleStartApplied(state: NegamonBattleStateV3) {
    let rng = getStateRng(state);
    const playerStart = applyRuntimeHooks({ trigger: "battle_start", combatant: state.sides.player, rng });
    rng = playerStart.rng;
    const opponentStart = applyRuntimeHooks({ trigger: "battle_start", combatant: state.sides.opponent, rng });
    rng = opponentStart.rng;
    appendTimelineEvents(state, "battle_start", playerStart.timeline);
    appendTimelineEvents(state, "battle_start", opponentStart.timeline);
    commitStateRng(state, rng);
}

function getEffectiveSpeed(combatant: NegamonBattleCombatantV3): number {
    return applyCombatStatStages({
        stats: combatant.stats,
        statStages: combatant.statStages,
    }).speed;
}

function createRejection(
    state: NegamonBattleStateV3,
    side: NegamonBattleSideV3,
    code: ValidationFailureCode,
    message: string
): NegamonBattleTurnResolveResultV3 {
    pushEvent(state, {
        turn: state.turn,
        phase: "action_commit",
        kind: "action_rejected",
        actorSide: side,
        message,
    });
    return {
        ok: false,
        code,
        message,
        state,
        validChoices: getNegamonBattleValidChoicesV3(state, side),
    };
}

export function getNegamonBattleValidChoicesV3(
    state: NegamonBattleStateV3,
    side: NegamonBattleSideV3
): NegamonBattleValidChoiceV3[] {
    const combatant = getSideCombatant(state, side);
    return combatant.moveSlots.map((slot) => {
        let reason: NegamonBattleValidChoiceV3["reason"];
        if (state.phase === "ended") reason = "BATTLE_ENDED";
        else if (state.phase !== "choosing") reason = "NOT_CHOOSING";
        else if (combatant.fainted || combatant.hp <= 0) reason = "FAINTED";
        else if (slot.pp <= 0) reason = "NO_PP";
        else if (combatant.energy < slot.skill.energyCost) reason = "NO_ENERGY";
        else if (slot.cooldownRemaining > 0) reason = "ON_COOLDOWN";

        return {
            moveSlot: slot.slot,
            moveId: slot.skillId,
            label: slot.label,
            targetSlot: slot.targetSlot,
            enabled: !reason,
            reason,
            cost: {
                pp: 1,
                energy: slot.skill.energyCost,
            },
            priority: slot.skill.priority,
        };
    });
}

export function validateNegamonBattleActionIntentV3(
    state: NegamonBattleStateV3,
    intent: NegamonBattleActionIntentV3
): NegamonBattleValidationResult {
    if (state.phase === "ended") {
        return { ok: false, code: "BATTLE_ENDED", message: "The battle has already ended.", validChoices: [] };
    }
    if (state.phase !== "choosing") {
        return { ok: false, code: "NOT_CHOOSING", message: "The battle is not accepting choices.", validChoices: [] };
    }
    if (intent.battleId !== state.battleId) {
        return { ok: false, code: "INVALID_ACTION", message: "Battle id does not match.", validChoices: [] };
    }
    if (intent.choiceRequestId !== state.choiceRequestId) {
        return { ok: false, code: "STALE_REQUEST", message: "Choice request is stale.", validChoices: getNegamonBattleValidChoicesV3(state, intent.side) };
    }
    if (intent.stateVersion !== state.stateVersion) {
        return { ok: false, code: "STALE_STATE", message: "State version is stale.", validChoices: getNegamonBattleValidChoicesV3(state, intent.side) };
    }
    if (intent.action.kind !== "move") {
        return { ok: false, code: "INVALID_ACTION", message: "Only move actions are supported in V3.", validChoices: [] };
    }
    const combatant = getSideCombatant(state, intent.side);
    if (combatant.fainted || combatant.hp <= 0) {
        return { ok: false, code: "FAINTED", message: "Fainted combatants cannot act.", validChoices: getNegamonBattleValidChoicesV3(state, intent.side) };
    }
    const slot = combatant.moveSlots[intent.action.moveSlot];
    if (!slot) {
        return { ok: false, code: "INVALID_ACTION", message: "Move slot is out of range.", validChoices: getNegamonBattleValidChoicesV3(state, intent.side) };
    }
    if (slot.targetSlot !== intent.action.targetSlot) {
        return { ok: false, code: "INVALID_TARGET", message: "Target slot is not legal for this move.", validChoices: getNegamonBattleValidChoicesV3(state, intent.side) };
    }
    if (slot.pp <= 0) {
        return { ok: false, code: "NO_PP", message: "The selected move has no PP remaining.", validChoices: getNegamonBattleValidChoicesV3(state, intent.side) };
    }
    if (combatant.energy < slot.skill.energyCost) {
        return { ok: false, code: "NO_ENERGY", message: "The selected move does not have enough energy.", validChoices: getNegamonBattleValidChoicesV3(state, intent.side) };
    }
    if (slot.cooldownRemaining > 0) {
        return { ok: false, code: "ON_COOLDOWN", message: "The selected move is on cooldown.", validChoices: getNegamonBattleValidChoicesV3(state, intent.side) };
    }
    return { ok: true, slot };
}

function buildActionOrder(state: NegamonBattleStateV3, intents: NegamonBattleActionIntentV3[]): NegamonBattleActionIntentV3[] {
    let rng = getStateRng(state);
    const ordered = [...intents].sort((left, right) => {
        const leftSlot = getSideCombatant(state, left.side).moveSlots[left.action.moveSlot];
        const rightSlot = getSideCombatant(state, right.side).moveSlots[right.action.moveSlot];
        if (leftSlot.skill.priority !== rightSlot.skill.priority) {
            return rightSlot.skill.priority - leftSlot.skill.priority;
        }

        const leftSpeed = getEffectiveSpeed(getSideCombatant(state, left.side));
        const rightSpeed = getEffectiveSpeed(getSideCombatant(state, right.side));
        if (leftSpeed !== rightSpeed) {
            return rightSpeed - leftSpeed;
        }

        const tieBreak = advanceDeterministicRng(rng);
        rng = tieBreak.rng;
        return tieBreak.value01 < 0.5 ? -1 : 1;
    });
    commitStateRng(state, rng);
    return ordered;
}

function markFaintState(state: NegamonBattleStateV3, side: NegamonBattleSideV3) {
    const combatant = getSideCombatant(state, side);
    combatant.fainted = combatant.hp <= 0;
    if (combatant.fainted) {
        pushEvent(state, {
            turn: state.turn,
            phase: state.phase === "ended" ? "battle_end" : "action_resolve",
            kind: "combatant_fainted",
            targetSide: side,
            message: `${combatant.name} fainted.`,
        });
    }
}

function finalizeBattleIfNeeded(state: NegamonBattleStateV3): boolean {
    const playerFainted = state.sides.player.hp <= 0;
    const opponentFainted = state.sides.opponent.hp <= 0;
    state.sides.player.fainted = playerFainted;
    state.sides.opponent.fainted = opponentFainted;

    if (!playerFainted && !opponentFainted) return false;

    state.phase = "ended";
    state.winner = playerFainted && opponentFainted ? undefined : playerFainted ? "opponent" : "player";
    pushEvent(state, {
        turn: state.turn,
        phase: "battle_end",
        kind: "battle_ended",
        actorSide: state.winner,
        message: state.winner ? `${getSideCombatant(state, state.winner).name} won the battle.` : "The battle ended in a draw.",
    });
    return true;
}

function tickMoveCooldowns(state: NegamonBattleStateV3) {
    for (const combatant of [state.sides.player, state.sides.opponent]) {
        combatant.moveSlots = combatant.moveSlots.map((slot) => ({
            ...slot,
            cooldownRemaining: Math.max(0, slot.cooldownRemaining - 1),
        }));
    }
}

function resolveTurnEnd(state: NegamonBattleStateV3) {
    let rng = getStateRng(state);
    const playerHooks = applyRuntimeHooks({ trigger: "turn_end", combatant: state.sides.player, attacker: state.sides.opponent, rng });
    rng = playerHooks.rng;
    appendTimelineEvents(state, "turn_end", playerHooks.timeline);
    const opponentHooks = applyRuntimeHooks({ trigger: "turn_end", combatant: state.sides.opponent, attacker: state.sides.player, rng });
    rng = opponentHooks.rng;
    appendTimelineEvents(state, "turn_end", opponentHooks.timeline);
    appendTimelineEvents(state, "turn_end", resolveRuntimeTurnEndStatuses({ combatant: state.sides.player }));
    appendTimelineEvents(state, "turn_end", resolveRuntimeTurnEndStatuses({ combatant: state.sides.opponent }));
    commitStateRng(state, rng);
}

function hasBattleEnded(state: NegamonBattleStateV3) {
    return state.sides.player.hp <= 0 || state.sides.opponent.hp <= 0 || state.phase === "ended";
}

export function resolveNegamonBattleTurnV3(input: {
    state: NegamonBattleStateV3;
    playerAction: NegamonBattleActionIntentV3;
    opponentAction: NegamonBattleActionIntentV3;
}): NegamonBattleTurnResolveResultV3 {
    const state = cloneBattleStateV3(input.state);
    ensureBattleStartApplied(state);

    const playerValidation = validateNegamonBattleActionIntentV3(state, input.playerAction);
    if (!playerValidation.ok) {
        return createRejection(state, "player", playerValidation.code, playerValidation.message);
    }
    const opponentValidation = validateNegamonBattleActionIntentV3(state, input.opponentAction);
    if (!opponentValidation.ok) {
        return createRejection(state, "opponent", opponentValidation.code, opponentValidation.message);
    }

    state.phase = "resolving";
    state.queue = [input.playerAction, input.opponentAction];
    const ordered = buildActionOrder(state, state.queue);

    for (const intent of ordered) {
        if (hasBattleEnded(state)) break;

        const actor = getSideCombatant(state, intent.side);
        const targetSide = getOpponentSide(intent.side);
        const target = getSideCombatant(state, targetSide);
        const slot = actor.moveSlots[intent.action.moveSlot];

        if (actor.fainted || actor.hp <= 0 || target.fainted || target.hp <= 0) {
            continue;
        }

        const result = resolveRuntimeSkill({
            actor,
            target,
            skill: slot.skill,
            rng: getStateRng(state),
            processTurnEnd: false,
        });
        commitStateRng(state, result.rng);
        if (intent.side === "player") {
            state.sides.player = {
                ...state.sides.player,
                ...result.resolution.actor,
                moveSlots: state.sides.player.moveSlots,
            };
            state.sides.opponent = {
                ...state.sides.opponent,
                ...result.resolution.target,
                moveSlots: state.sides.opponent.moveSlots,
            };
        } else {
            state.sides.opponent = {
                ...state.sides.opponent,
                ...result.resolution.actor,
                moveSlots: state.sides.opponent.moveSlots,
            };
            state.sides.player = {
                ...state.sides.player,
                ...result.resolution.target,
                moveSlots: state.sides.player.moveSlots,
            };
        }

        slot.pp = Math.max(0, slot.pp - 1);
        slot.cooldownRemaining = slot.skill.cooldownTurns > 0 ? slot.skill.cooldownTurns + 1 : 0;

        appendTimelineEvents(state, "action_resolve", result.resolution.timeline);
        const latestTarget = getSideCombatant(state, targetSide);
        const latestActor = getSideCombatant(state, intent.side);
        if (latestTarget.hp <= 0) {
            markFaintState(state, targetSide);
        }
        if (latestActor.hp <= 0) {
            markFaintState(state, intent.side);
        }
        if (finalizeBattleIfNeeded(state)) {
            break;
        }
    }

    if (!hasBattleEnded(state)) {
        resolveTurnEnd(state);
        finalizeBattleIfNeeded(state);
    }

    state.queue = [];
    state.stateVersion += 1;

    if (hasBattleEnded(state)) {
        state.phase = "ended";
        state.choiceRequestId = createBattleChoiceRequestIdV3(state);
        return {
            ok: true,
            state,
            validChoices: [],
        };
    }

    tickMoveCooldowns(state);
    state.turn += 1;
    state.phase = "choosing";
    state.choiceRequestId = createBattleChoiceRequestIdV3(state);

    return {
        ok: true,
        state,
        validChoices: getNegamonBattleValidChoicesV3(state, "player"),
    };
}
