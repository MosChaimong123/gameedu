import type { NegamonSkillDefinition } from "../skills";
import type { NegamonFormulaCombatant, NegamonFormulaStatStages } from "../rules";
import type { PassiveAbilityId } from "@/lib/types/negamon";

export type NegamonRuntimeStatusId =
    | "BURN"
    | "POISON"
    | "BADLY_POISON"
    | "PARALYZE"
    | "SLEEP"
    | "STUN";

export type NegamonRuntimeVolatileId = "SHIELD" | "FOCUS";

export type NegamonRuntimeStatusState = {
    id: NegamonRuntimeStatusId;
    sourceMoveId?: string;
    remainingTurns: number | null;
    stacks?: number;
};

export type NegamonRuntimeVolatileState = {
    id: NegamonRuntimeVolatileId;
    sourceMoveId?: string;
    remainingTurns: number | null;
    data?: Record<string, number | string | boolean>;
};

export type NegamonRuntimeCombatant = NegamonFormulaCombatant & {
    id: string;
    side: "player" | "opponent";
    name: string;
    abilityId?: PassiveAbilityId;
    battleItemIds: string[];
    hp: number;
    energy: number;
    maxEnergy: number;
    accuracyBonusMultiplier?: number;
    critChanceBonusPercent?: number;
    outgoingDamageMultiplier?: number;
    rewardGoldBonus?: number;
    rewardGoldMultiplier?: number;
    rewardExpMultiplier?: number;
    hookFlags?: Record<string, boolean | number | string>;
    statusImmunities?: NegamonRuntimeStatusId[];
    statuses: NegamonRuntimeStatusState[];
    volatileStates: NegamonRuntimeVolatileState[];
};

export type NegamonRuntimeTimelineEvent = {
    kind:
        | "move_used"
        | "damage"
        | "heal"
        | "status_applied"
        | "status_blocked"
        | "status_tick"
        | "status_expired"
        | "turn_skipped"
        | "volatile_applied"
        | "volatile_expired"
        | "stat_stage_changed";
    actorSide?: "player" | "opponent";
    targetSide?: "player" | "opponent";
    moveId?: string;
    effectId?: string;
    amount?: number;
    message: string;
};

export type NegamonRuntimeMoveResolution = {
    actor: NegamonRuntimeCombatant;
    target: NegamonRuntimeCombatant;
    accepted: boolean;
    missed: boolean;
    critical: boolean;
    damage: number;
    healing: number;
    effectsApplied: string[];
    timeline: NegamonRuntimeTimelineEvent[];
    skill: NegamonSkillDefinition;
};

export function createRuntimeCombatant(input: {
    id: string;
    side: "player" | "opponent";
    name: string;
    level: number;
    types: NegamonFormulaCombatant["types"];
    stats: NegamonFormulaCombatant["stats"];
    statStages?: Partial<NegamonFormulaStatStages>;
    hp?: number;
    energy?: number;
    maxEnergy?: number;
    accuracyBonusMultiplier?: number;
    statusImmunities?: NegamonRuntimeStatusId[];
    statuses?: NegamonRuntimeStatusState[];
    volatileStates?: NegamonRuntimeVolatileState[];
    abilityId?: PassiveAbilityId;
    battleItemIds?: string[];
}): NegamonRuntimeCombatant {
    return {
        id: input.id,
        side: input.side,
        name: input.name,
        abilityId: input.abilityId,
        battleItemIds: [...(input.battleItemIds ?? [])],
        level: input.level,
        types: [...input.types],
        stats: { ...input.stats },
        statStages: {
            attack: input.statStages?.attack ?? 0,
            defense: input.statStages?.defense ?? 0,
            specialAttack: input.statStages?.specialAttack ?? 0,
            specialDefense: input.statStages?.specialDefense ?? 0,
            speed: input.statStages?.speed ?? 0,
            accuracy: input.statStages?.accuracy ?? 0,
            evasion: input.statStages?.evasion ?? 0,
        },
        hp: input.hp ?? input.stats.maxHp,
        energy: input.energy ?? input.maxEnergy ?? 40,
        maxEnergy: input.maxEnergy ?? 40,
        accuracyBonusMultiplier: input.accuracyBonusMultiplier,
        critChanceBonusPercent: 0,
        outgoingDamageMultiplier: 1,
        rewardGoldBonus: 0,
        rewardGoldMultiplier: 1,
        rewardExpMultiplier: 1,
        hookFlags: {},
        statusImmunities: [...(input.statusImmunities ?? [])],
        statuses: [...(input.statuses ?? [])],
        volatileStates: [...(input.volatileStates ?? [])],
    };
}
