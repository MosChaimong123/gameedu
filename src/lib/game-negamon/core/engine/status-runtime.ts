import { rollPercent, type NegamonDeterministicRng } from "../rules";
import type {
    NegamonRuntimeCombatant,
    NegamonRuntimeStatusId,
    NegamonRuntimeStatusState,
    NegamonRuntimeTimelineEvent,
    NegamonRuntimeVolatileId,
    NegamonRuntimeVolatileState,
} from "./runtime-types";

const DEFAULT_STATUS_DURATION: Record<NegamonRuntimeStatusId, number | null> = {
    BURN: 3,
    POISON: null,
    BADLY_POISON: null,
    PARALYZE: 2,
    SLEEP: 1,
    STUN: 1,
};

const DEFAULT_VOLATILE_DURATION: Record<NegamonRuntimeVolatileId, number | null> = {
    SHIELD: 2,
    FOCUS: 2,
};

function findStatus(
    combatant: NegamonRuntimeCombatant,
    statusId: NegamonRuntimeStatusId
): NegamonRuntimeStatusState | undefined {
    return combatant.statuses.find((status) => status.id === statusId);
}

function findVolatile(
    combatant: NegamonRuntimeCombatant,
    volatileId: NegamonRuntimeVolatileId
): NegamonRuntimeVolatileState | undefined {
    return combatant.volatileStates.find((state) => state.id === volatileId);
}

export function hasRuntimeVolatile(
    combatant: NegamonRuntimeCombatant,
    volatileId: NegamonRuntimeVolatileId
): boolean {
    return Boolean(findVolatile(combatant, volatileId));
}

export function applyRuntimeStatus(input: {
    combatant: NegamonRuntimeCombatant;
    statusId: NegamonRuntimeStatusId;
    chance?: number;
    durationTurns?: number | null;
    sourceMoveId?: string;
    rng: NegamonDeterministicRng;
}): { rng: NegamonDeterministicRng; applied: boolean; timeline: NegamonRuntimeTimelineEvent[] } {
    const blockedByImmunity = (input.combatant.statusImmunities ?? []).includes(input.statusId);
    const chanceRoll = rollPercent(input.rng, input.chance ?? 100);
    if (blockedByImmunity || !chanceRoll.success) {
        return {
            rng: chanceRoll.rng,
            applied: false,
            timeline: [
                {
                    kind: "status_blocked",
                    targetSide: input.combatant.side,
                    moveId: input.sourceMoveId,
                    effectId: input.statusId,
                    message: blockedByImmunity
                        ? `${input.combatant.name} is immune to ${input.statusId}.`
                        : `${input.statusId} did not take hold.`,
                },
            ],
        };
    }

    const remainingTurns =
        input.durationTurns === undefined ? DEFAULT_STATUS_DURATION[input.statusId] : input.durationTurns;
    const existing = findStatus(input.combatant, input.statusId);
    if (existing) {
        existing.remainingTurns = remainingTurns;
        existing.sourceMoveId = input.sourceMoveId ?? existing.sourceMoveId;
        if (input.statusId === "BADLY_POISON") {
            existing.stacks = Math.min(4, (existing.stacks ?? 1) + 1);
        }
    } else {
        input.combatant.statuses.push({
            id: input.statusId,
            remainingTurns,
            sourceMoveId: input.sourceMoveId,
            stacks: input.statusId === "BADLY_POISON" ? 1 : undefined,
        });
    }

    return {
        rng: chanceRoll.rng,
        applied: true,
        timeline: [
            {
                kind: "status_applied",
                targetSide: input.combatant.side,
                moveId: input.sourceMoveId,
                effectId: input.statusId,
                message: `${input.combatant.name} gained ${input.statusId}.`,
            },
        ],
    };
}

export function applyRuntimeVolatile(input: {
    combatant: NegamonRuntimeCombatant;
    volatileId: NegamonRuntimeVolatileId;
    durationTurns?: number | null;
    sourceMoveId?: string;
    data?: Record<string, number | string | boolean>;
}): { applied: boolean; timeline: NegamonRuntimeTimelineEvent[] } {
    const existing = findVolatile(input.combatant, input.volatileId);
    const remainingTurns =
        input.durationTurns === undefined ? DEFAULT_VOLATILE_DURATION[input.volatileId] : input.durationTurns;

    if (existing) {
        existing.remainingTurns = remainingTurns;
        existing.sourceMoveId = input.sourceMoveId ?? existing.sourceMoveId;
        existing.data = input.data ?? existing.data;
    } else {
        input.combatant.volatileStates.push({
            id: input.volatileId,
            remainingTurns,
            sourceMoveId: input.sourceMoveId,
            data: input.data,
        });
    }

    return {
        applied: true,
        timeline: [
            {
                kind: "volatile_applied",
                targetSide: input.combatant.side,
                moveId: input.sourceMoveId,
                effectId: input.volatileId,
                message: `${input.combatant.name} gained ${input.volatileId}.`,
            },
        ],
    };
}

export function resolveRuntimeTurnStartStatuses(input: {
    combatant: NegamonRuntimeCombatant;
    rng: NegamonDeterministicRng;
}): { rng: NegamonDeterministicRng; skipTurn: boolean; timeline: NegamonRuntimeTimelineEvent[] } {
    const sleepLike = input.combatant.statuses.find((status) => status.id === "SLEEP" || status.id === "STUN");
    if (sleepLike) {
        return {
            rng: input.rng,
            skipTurn: true,
            timeline: [
                {
                    kind: "turn_skipped",
                    actorSide: input.combatant.side,
                    effectId: sleepLike.id,
                    message: `${input.combatant.name} could not move because of ${sleepLike.id}.`,
                },
            ],
        };
    }

    const paralyze = input.combatant.statuses.find((status) => status.id === "PARALYZE");
    if (!paralyze) {
        return { rng: input.rng, skipTurn: false, timeline: [] };
    }

    const roll = rollPercent(input.rng, 50);
    if (!roll.success) {
        return { rng: roll.rng, skipTurn: false, timeline: [] };
    }

    return {
        rng: roll.rng,
        skipTurn: true,
        timeline: [
            {
                kind: "turn_skipped",
                actorSide: input.combatant.side,
                effectId: "PARALYZE",
                message: `${input.combatant.name} was paralyzed and could not move.`,
            },
        ],
    };
}

export function applyRuntimeShieldReduction(input: {
    combatant: NegamonRuntimeCombatant;
    damage: number;
}): { damage: number; timeline: NegamonRuntimeTimelineEvent[] } {
    if (input.damage <= 0 || !hasRuntimeVolatile(input.combatant, "SHIELD")) {
        return { damage: input.damage, timeline: [] };
    }

    const prevented = Math.max(1, Math.floor(input.damage * 0.25));
    return {
        damage: Math.max(0, input.damage - prevented),
        timeline: [
            {
                kind: "volatile_applied",
                targetSide: input.combatant.side,
                effectId: "SHIELD",
                amount: prevented,
                message: `${input.combatant.name}'s shield reduced ${prevented} damage.`,
            },
        ],
    };
}

export function getRuntimeAccuracyBonusMultiplier(combatant: NegamonRuntimeCombatant): number {
    return hasRuntimeVolatile(combatant, "FOCUS") ? 1.25 : 1;
}

export function resolveRuntimeTurnEndStatuses(input: {
    combatant: NegamonRuntimeCombatant;
}): NegamonRuntimeTimelineEvent[] {
    const timeline: NegamonRuntimeTimelineEvent[] = [];
    const remainingStatuses: NegamonRuntimeStatusState[] = [];
    const remainingVolatiles: NegamonRuntimeVolatileState[] = [];

    for (const status of input.combatant.statuses) {
        if (status.id === "BURN" || status.id === "POISON" || status.id === "BADLY_POISON") {
            const rate =
                status.id === "BURN"
                    ? 0.04
                    : status.id === "POISON"
                      ? 0.03
                      : 0.02 * (status.stacks ?? 1);
            const damage = Math.max(1, Math.floor(input.combatant.stats.maxHp * rate));
            input.combatant.hp = Math.max(0, input.combatant.hp - damage);
            timeline.push({
                kind: "status_tick",
                targetSide: input.combatant.side,
                effectId: status.id,
                amount: damage,
                message: `${input.combatant.name} took ${damage} ${status.id} damage.`,
            });
        }

        const nextTurns = status.remainingTurns == null ? null : Math.max(0, status.remainingTurns - 1);
        if (nextTurns === 0) {
            timeline.push({
                kind: "status_expired",
                targetSide: input.combatant.side,
                effectId: status.id,
                message: `${status.id} wore off from ${input.combatant.name}.`,
            });
            continue;
        }

        remainingStatuses.push({ ...status, remainingTurns: nextTurns });
    }

    for (const state of input.combatant.volatileStates) {
        const nextTurns = state.remainingTurns == null ? null : Math.max(0, state.remainingTurns - 1);
        if (nextTurns === 0) {
            timeline.push({
                kind: "volatile_expired",
                targetSide: input.combatant.side,
                effectId: state.id,
                message: `${state.id} wore off from ${input.combatant.name}.`,
            });
            continue;
        }

        remainingVolatiles.push({ ...state, remainingTurns: nextTurns });
    }

    input.combatant.statuses = remainingStatuses;
    input.combatant.volatileStates = remainingVolatiles;
    return timeline;
}
