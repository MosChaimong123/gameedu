import type { NegamonFormulaTypeId } from "../rules";
import type { NegamonSkillDefinition } from "../skills";
import type { NegamonRuntimeCombatant } from "../engine/runtime-types";

export type NegamonBattlePhaseV3 = "choosing" | "resolving" | "ended";
export type NegamonBattleSideV3 = "player" | "opponent";
export type NegamonBattleTargetSlotV3 = "self" | "opponent";
export type NegamonBattleMoveSlotIndexV3 = 0 | 1 | 2 | 3;

export type NegamonBattleMoveSlotV3 = {
    slot: NegamonBattleMoveSlotIndexV3;
    skillId: string;
    label: string;
    targetSlot: NegamonBattleTargetSlotV3;
    maxPp: number;
    pp: number;
    cooldownRemaining: number;
    skill: NegamonSkillDefinition;
};

export type NegamonBattleCombatantV3 = NegamonRuntimeCombatant & {
    speciesId: string;
    speciesName: string;
    formName: string;
    rankIndex: number;
    moveSlots: NegamonBattleMoveSlotV3[];
    fainted: boolean;
};

export type NegamonBattleEventV3 = {
    id: string;
    turn: number;
    phase: "battle_start" | "action_commit" | "action_resolve" | "turn_end" | "battle_end";
    kind:
        | "battle_started"
        | "action_rejected"
        | "move_used"
        | "damage_dealt"
        | "heal_applied"
        | "status_applied"
        | "status_blocked"
        | "status_ticked"
        | "status_expired"
        | "volatile_applied"
        | "volatile_expired"
        | "stat_stage_changed"
        | "turn_skipped"
        | "combatant_fainted"
        | "battle_ended";
    actorSide?: NegamonBattleSideV3;
    targetSide?: NegamonBattleSideV3;
    moveId?: string;
    delta?: {
        hp?: number;
        energy?: number;
        pp?: number;
        statStages?: Record<string, number>;
    };
    message: string;
};

export type NegamonBattleActionIntentV3 = {
    battleId: string;
    choiceRequestId: string;
    stateVersion: number;
    side: NegamonBattleSideV3;
    action: {
        kind: "move";
        moveSlot: NegamonBattleMoveSlotIndexV3;
        targetSlot: NegamonBattleTargetSlotV3;
    };
};

export type NegamonBattleValidChoiceV3 = {
    moveSlot: NegamonBattleMoveSlotIndexV3;
    moveId: string;
    label: string;
    targetSlot: NegamonBattleTargetSlotV3;
    enabled: boolean;
    reason?:
        | "BATTLE_ENDED"
        | "NOT_CHOOSING"
        | "FAINTED"
        | "NO_PP"
        | "NO_ENERGY"
        | "ON_COOLDOWN"
        | "LOCKED"
        | "INVALID_TARGET";
    cost: {
        pp: number;
        energy: number;
    };
    priority: number;
};

export type NegamonBattleFieldStateV3 = {
    weather: null;
    terrain: null;
    roomEffects: [];
};

export type NegamonBattleStateV3 = {
    battleId: string;
    engineVersion: "negamon_v3_pokemon_inspired";
    seed: number;
    rngCursor: number;
    turn: number;
    phase: NegamonBattlePhaseV3;
    sides: {
        player: NegamonBattleCombatantV3;
        opponent: NegamonBattleCombatantV3;
    };
    queue: NegamonBattleActionIntentV3[];
    field: NegamonBattleFieldStateV3;
    events: NegamonBattleEventV3[];
    winner?: NegamonBattleSideV3;
    choiceRequestId: string;
    stateVersion: number;
};

function getDefaultPpForSkill(skill: NegamonSkillDefinition): number {
    if (skill.category === "heal" || skill.category === "buff" || skill.category === "debuff" || skill.category === "status") {
        return 4;
    }
    if (skill.power >= 50) return 4;
    if (skill.power >= 35) return 5;
    return 6;
}

export function createBattleMoveSlotV3(
    skill: NegamonSkillDefinition,
    slot: NegamonBattleMoveSlotIndexV3
): NegamonBattleMoveSlotV3 {
    const maxPp = getDefaultPpForSkill(skill);
    return {
        slot,
        skillId: skill.id,
        label: skill.name,
        targetSlot: skill.target === "self" ? "self" : "opponent",
        maxPp,
        pp: maxPp,
        cooldownRemaining: 0,
        skill,
    };
}

export function createBattleCombatantV3(input: {
    runtime: NegamonRuntimeCombatant;
    speciesId: string;
    speciesName: string;
    formName: string;
    rankIndex: number;
    moveSkills: NegamonSkillDefinition[];
}): NegamonBattleCombatantV3 {
    return {
        ...input.runtime,
        types: [...input.runtime.types] as NegamonFormulaTypeId[],
        stats: { ...input.runtime.stats },
        statStages: { ...input.runtime.statStages },
        statuses: input.runtime.statuses.map((status) => ({ ...status })),
        volatileStates: input.runtime.volatileStates.map((state) => ({
            ...state,
            data: state.data ? { ...state.data } : undefined,
        })),
        statusImmunities: [...(input.runtime.statusImmunities ?? [])],
        battleItemIds: [...input.runtime.battleItemIds],
        hookFlags: { ...(input.runtime.hookFlags ?? {}) },
        speciesId: input.speciesId,
        speciesName: input.speciesName,
        formName: input.formName,
        rankIndex: input.rankIndex,
        moveSlots: input.moveSkills.slice(0, 4).map((skill, index) => createBattleMoveSlotV3(skill, index as NegamonBattleMoveSlotIndexV3)),
        fainted: input.runtime.hp <= 0,
    };
}

export function createBattleChoiceRequestIdV3(state: Pick<NegamonBattleStateV3, "battleId" | "stateVersion" | "turn">): string {
    return `${state.battleId}:${state.stateVersion}:${state.turn}`;
}

export function createBattleStateV3(input: {
    battleId: string;
    seed: number;
    player: NegamonBattleCombatantV3;
    opponent: NegamonBattleCombatantV3;
}): NegamonBattleStateV3 {
    const state: NegamonBattleStateV3 = {
        battleId: input.battleId,
        engineVersion: "negamon_v3_pokemon_inspired",
        seed: input.seed,
        rngCursor: 0,
        turn: 1,
        phase: "choosing",
        sides: {
            player: input.player,
            opponent: input.opponent,
        },
        queue: [],
        field: {
            weather: null,
            terrain: null,
            roomEffects: [],
        },
        events: [],
        stateVersion: 1,
        choiceRequestId: "",
    };
    state.choiceRequestId = createBattleChoiceRequestIdV3(state);
    state.events.push({
        id: `${state.battleId}:event:1`,
        turn: 1,
        phase: "battle_start",
        kind: "battle_started",
        message: `${state.sides.player.name} challenged ${state.sides.opponent.name}.`,
    });
    return state;
}

export function cloneBattleStateV3(state: NegamonBattleStateV3): NegamonBattleStateV3 {
    const player = createBattleCombatantV3({
        runtime: state.sides.player,
        speciesId: state.sides.player.speciesId,
        speciesName: state.sides.player.speciesName,
        formName: state.sides.player.formName,
        rankIndex: state.sides.player.rankIndex,
        moveSkills: state.sides.player.moveSlots.map((slot) => slot.skill),
    });
    player.moveSlots = state.sides.player.moveSlots.map((slot) => ({
        ...slot,
        skill: { ...slot.skill, effects: slot.skill.effects.map((effect) => ({ ...effect })), unlock: { ...slot.skill.unlock }, sourceMove: { ...slot.skill.sourceMove } },
    }));
    const opponent = createBattleCombatantV3({
        runtime: state.sides.opponent,
        speciesId: state.sides.opponent.speciesId,
        speciesName: state.sides.opponent.speciesName,
        formName: state.sides.opponent.formName,
        rankIndex: state.sides.opponent.rankIndex,
        moveSkills: state.sides.opponent.moveSlots.map((slot) => slot.skill),
    });
    opponent.moveSlots = state.sides.opponent.moveSlots.map((slot) => ({
        ...slot,
        skill: { ...slot.skill, effects: slot.skill.effects.map((effect) => ({ ...effect })), unlock: { ...slot.skill.unlock }, sourceMove: { ...slot.skill.sourceMove } },
    }));

    return {
        ...state,
        queue: state.queue.map((intent) => ({
            ...intent,
            action: { ...intent.action },
        })),
        field: {
            weather: state.field.weather,
            terrain: state.field.terrain,
            roomEffects: [...state.field.roomEffects],
        },
        sides: {
            player,
            opponent,
        },
        events: state.events.map((event) => ({
            ...event,
            delta: event.delta ? { ...event.delta, statStages: event.delta.statStages ? { ...event.delta.statStages } : undefined } : undefined,
        })),
    };
}
