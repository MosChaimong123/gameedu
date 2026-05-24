import type {
    NegamonLiteBattleSide,
    NegamonLiteCombatant,
    NegamonLiteStatus,
    NegamonLiteStatusInstance,
    NegamonLiteStatusTimelineEvent,
} from "./types";
import type { NegamonLiteRng } from "./rng";

const DEFAULT_STATUS_DURATION: Record<NegamonLiteStatus, number | null> = {
    BURN: 3,
    POISON: null,
    BADLY_POISON: null,
    PARALYZE: 2,
    SLEEP: 1,
    STUN: 1,
    SHIELD: 2,
    FOCUS: 2,
};

function getStatuses(combatant: NegamonLiteCombatant): NegamonLiteStatusInstance[] {
    const statuses = [...(combatant.statuses ?? [])];
    if (combatant.status && !statuses.some((entry) => entry.status === combatant.status)) {
        statuses.push({
            status: combatant.status,
            remainingTurns: DEFAULT_STATUS_DURATION[combatant.status],
        });
    }
    return statuses;
}

function isLegacyPrimaryStatus(
    status: NegamonLiteStatus
): status is NonNullable<NegamonLiteCombatant["status"]> {
    return status === "BURN" || status === "POISON" || status === "PARALYZE" || status === "SLEEP";
}

function syncLegacyPrimaryStatus(combatant: NegamonLiteCombatant, statuses: NegamonLiteStatusInstance[]) {
    combatant.status = undefined;
    for (const entry of statuses) {
        if (isLegacyPrimaryStatus(entry.status)) {
            combatant.status = entry.status;
            return;
        }
    }
}

export function hasNegamonLiteStatus(combatant: NegamonLiteCombatant, status: NegamonLiteStatus): boolean {
    return getStatuses(combatant).some((entry) => entry.status === status);
}

export function getNegamonLiteStatusAccuracyBonus(combatant: NegamonLiteCombatant): number {
    return hasNegamonLiteStatus(combatant, "FOCUS") ? 0.25 : 0;
}

export function applyNegamonLiteStatus(input: {
    combatant: NegamonLiteCombatant;
    side: NegamonLiteBattleSide;
    status: NegamonLiteStatus;
    chance?: number;
    durationTurns?: number | null;
    sourceMoveId?: string;
    rng: NegamonLiteRng;
}): { applied: boolean; timeline: NegamonLiteStatusTimelineEvent[] } {
    const chance = input.chance ?? 100;
    const blockedByChance = !input.rng.chance(chance);
    const blockedByImmunity = (input.combatant.statusImmunities ?? []).includes(input.status);
    if (blockedByChance || blockedByImmunity) {
        return {
            applied: false,
            timeline: [
                {
                    side: input.side,
                    status: input.status,
                    action: "blocked",
                    sourceMoveId: input.sourceMoveId,
                    message: blockedByImmunity
                        ? `${input.combatant.name} is immune to ${input.status}.`
                        : `${input.status} did not take hold.`,
                },
            ],
        };
    }

    const statuses = getStatuses(input.combatant);
    const remainingTurns =
        input.durationTurns === undefined ? DEFAULT_STATUS_DURATION[input.status] : input.durationTurns;
    const existing = statuses.find((entry) => entry.status === input.status);
    if (existing) {
        existing.remainingTurns = remainingTurns;
        existing.sourceMoveId = input.sourceMoveId ?? existing.sourceMoveId;
        if (input.status === "BADLY_POISON") {
            existing.stacks = Math.min(4, (existing.stacks ?? 1) + 1);
        }
    } else {
        statuses.push({
            status: input.status,
            remainingTurns,
            stacks: input.status === "BADLY_POISON" ? 1 : undefined,
            sourceMoveId: input.sourceMoveId,
        });
    }
    input.combatant.statuses = statuses;
    syncLegacyPrimaryStatus(input.combatant, statuses);

    return {
        applied: true,
        timeline: [
            {
                side: input.side,
                status: input.status,
                action: "applied",
                remainingTurns,
                stacks: existing?.stacks,
                sourceMoveId: input.sourceMoveId,
                message: `${input.combatant.name} gained ${input.status}.`,
            },
        ],
    };
}

export function resolveNegamonLiteTurnStartStatuses(input: {
    combatant: NegamonLiteCombatant;
    side: NegamonLiteBattleSide;
    rng: NegamonLiteRng;
}): { skipTurn: boolean; timeline: NegamonLiteStatusTimelineEvent[] } {
    const statuses = getStatuses(input.combatant);
    input.combatant.statuses = statuses;
    const timeline: NegamonLiteStatusTimelineEvent[] = [];
    const sleep = statuses.find((entry) => entry.status === "SLEEP" || entry.status === "STUN");
    if (sleep) {
        timeline.push({
            side: input.side,
            status: sleep.status,
            action: "skipped",
            remainingTurns: sleep.remainingTurns,
            message: `${input.combatant.name} could not move because of ${sleep.status}.`,
        });
        return { skipTurn: true, timeline };
    }

    const paralyze = statuses.find((entry) => entry.status === "PARALYZE");
    if (paralyze && input.rng.chance(50)) {
        timeline.push({
            side: input.side,
            status: "PARALYZE",
            action: "skipped",
            remainingTurns: paralyze.remainingTurns,
            message: `${input.combatant.name} was paralyzed and could not move.`,
        });
        return { skipTurn: true, timeline };
    }

    return { skipTurn: false, timeline };
}

export function applyNegamonLiteShieldDamageReduction(input: {
    combatant: NegamonLiteCombatant;
    side: NegamonLiteBattleSide;
    damage: number;
}): { damage: number; timeline: NegamonLiteStatusTimelineEvent[] } {
    if (input.damage <= 0 || !hasNegamonLiteStatus(input.combatant, "SHIELD")) {
        return { damage: input.damage, timeline: [] };
    }
    const preventedDamage = Math.max(1, Math.floor(input.damage * 0.25));
    return {
        damage: Math.max(0, input.damage - preventedDamage),
        timeline: [
            {
                side: input.side,
                status: "SHIELD",
                action: "shielded",
                preventedDamage,
                message: `${input.combatant.name}'s shield reduced ${preventedDamage} damage.`,
            },
        ],
    };
}

export function resolveNegamonLiteTurnEndStatuses(input: {
    combatant: NegamonLiteCombatant;
    side: NegamonLiteBattleSide;
}): NegamonLiteStatusTimelineEvent[] {
    const statuses = getStatuses(input.combatant);
    const timeline: NegamonLiteStatusTimelineEvent[] = [];
    const remaining: NegamonLiteStatusInstance[] = [];

    for (const status of statuses) {
        if (status.status === "BURN" || status.status === "POISON" || status.status === "BADLY_POISON") {
            const rate = status.status === "BURN" ? 0.04 : status.status === "POISON" ? 0.03 : 0.02 * (status.stacks ?? 1);
            const damage = Math.max(1, Math.floor(input.combatant.stats.hp * rate));
            input.combatant.hp = Math.max(0, input.combatant.hp - damage);
            timeline.push({
                side: input.side,
                status: status.status,
                action: "ticked",
                damage,
                remainingTurns: status.remainingTurns,
                stacks: status.stacks,
                message: `${input.combatant.name} took ${damage} ${status.status} damage.`,
            });
        }

        const nextTurns = status.remainingTurns == null ? null : Math.max(0, status.remainingTurns - 1);
        if (nextTurns === 0) {
            timeline.push({
                side: input.side,
                status: status.status,
                action: "expired",
                remainingTurns: 0,
                message: `${status.status} wore off from ${input.combatant.name}.`,
            });
            continue;
        }
        remaining.push({ ...status, remainingTurns: nextTurns });
    }

    input.combatant.statuses = remaining;
    syncLegacyPrimaryStatus(input.combatant, remaining);
    return timeline;
}
