import type { MonsterType } from "@/lib/types/negamon";
import type { NegamonShowdownSideSeed } from "./mapper";

export type NegamonBattleStateV4Phase = "preview" | "choosing" | "resolving" | "ended";
export type NegamonBattleSideV4 = "player" | "opponent";
export type NegamonBattleActionKindV4 = "move" | "item" | "switch" | "run";
export type NegamonBattleChoiceReasonV4 =
    | "BATTLE_ENDED"
    | "NOT_CHOOSING"
    | "FAINTED"
    | "NO_PP"
    | "NO_ENERGY"
    | "ON_COOLDOWN"
    | "LOCKED"
    | "INVALID_TARGET";

export type NegamonBattleChoiceV4 = {
    actionId: string;
    kind: NegamonBattleActionKindV4;
    label: string;
    enabled: boolean;
    reason?: NegamonBattleChoiceReasonV4;
    moveId?: string;
    moveSlot?: number;
    targetSide?: NegamonBattleSideV4;
    cost?: {
        pp?: number;
        energy?: number;
    };
};

export type NegamonBattleActionV4 = {
    actorSide: NegamonBattleSideV4;
    kind: NegamonBattleActionKindV4;
    moveId?: string;
    moveSlot?: number;
    itemId?: string;
    targetSide?: NegamonBattleSideV4;
};

export type NegamonBattleStatStagesV4 = {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
};

export type NegamonBattleCombatantV4 = {
    id: string;
    name: string;
    speciesId: string;
    speciesName: string;
    formName: string;
    level: number;
    rankIndex: number;
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    speed: number;
    types: MonsterType[];
    statSnapshot: {
        hp: number;
        attack: number;
        defense: number;
        specialAttack: number;
        specialDefense: number;
        speed: number;
        level: number;
    };
    statStages: NegamonBattleStatStagesV4;
    activeStatusIds: string[];
    moveIds: string[];
    statusIds: string[];
    battleItemIds: string[];
    fainted: boolean;
};

export type NegamonBattleEventV4 = {
    id: string;
    turn: number;
    kind:
        | "battle_started"
        | "choice_requested"
        | "move_selected"
        | "move_resolved"
        | "damage_applied"
        | "heal_applied"
        | "status_applied"
        | "status_blocked"
        | "status_ticked"
        | "status_expired"
        | "cleanse_applied"
        | "shield_applied"
        | "shield_changed"
        | "stat_stage_changed"
        | "energy_changed"
        | "priority_applied"
        | "cooldown_applied"
        | "item_activated"
        | "trait_activated"
        | "move_missed"
        | "combatant_fainted"
        | "battle_ended";
    actorSide?: NegamonBattleSideV4;
    targetSide?: NegamonBattleSideV4;
    moveId?: string;
    effectFamily?: NegamonBattleEffectFamilyV4;
    effectKind?: NegamonBattleEffectKindV4;
    moveName?: string;
    damage?: number;
    healing?: number;
    energyDelta?: number;
    shieldDelta?: number;
    preventedDamage?: number;
    priority?: number;
    cooldownTurns?: number;
    itemId?: string;
    traitId?: string;
    missed?: boolean;
    critical?: boolean;
    effectiveness?: "immune" | "resisted" | "normal" | "effective";
    hpBefore?: number;
    hpAfter?: number;
    targetMaxHp?: number;
    statStageDelta?: {
        stat: NegamonBattleStatStageKeyV4;
        stages: number;
        resultingStage?: number;
        durationTurns?: number;
    };
    statusTimeline?: NegamonBattleStatusTimelineEventV4[];
    message: string;
};

export type NegamonBattleEffectFamilyV4 =
    | "damage"
    | "heal"
    | "shield"
    | "buff"
    | "debuff"
    | "status"
    | "cleanse"
    | "energy_gain"
    | "energy_drain"
    | "priority"
    | "cooldown";

export type NegamonBattleEffectKindV4 =
    | "damage"
    | "heal"
    | "shield"
    | "stat_stage"
    | "status"
    | "cleanse"
    | "energy_shift"
    | "priority"
    | "cooldown";

export type NegamonBattleStatStageKeyV4 =
    | "attack"
    | "defense"
    | "specialAttack"
    | "specialDefense"
    | "speed";

export type NegamonBattleStatusTimelineEventV4 = {
    status: string;
    action: "applied" | "blocked" | "ticked" | "expired" | "skipped" | "shielded" | "cleansed";
    message: string;
    damage?: number;
    preventedDamage?: number;
    durationTurns?: number | null;
    stacking?: "refresh" | "stack_intensity" | "unique";
};

export type NegamonShowdownCommandLogEntry =
    | { stream: "omniscient"; message: string }
    | { stream: "p1"; message: string }
    | { stream: "p2"; message: string };

export type NegamonShowdownParsedRequestSnapshot = {
    moves: Array<{ id: string; move: string; pp: number; maxpp: number; disabled: boolean; target: string }>;
    hp?: number;
    maxHp?: number;
    statusIds: string[];
    fainted: boolean;
};

export type NegamonBattleChoiceDiagnosticsV4 = {
    side: NegamonBattleSideV4;
    requestMissing: boolean;
    allChoicesUnavailable: boolean;
    usedFallbackBasicChoice: boolean;
    enabledChoiceCount: number;
    message?: string;
};

export type NegamonFormulaDamageExpectationV4 = {
    moveSlot: number;
    moveId: string;
    label: string;
    actorSide: NegamonBattleSideV4;
    targetSide: NegamonBattleSideV4;
    formulaInput: {
        level: number;
        power: number;
        attack: number;
        defense: number;
        moveType: MonsterType;
        actorTypes: MonsterType[];
        targetTypes: MonsterType[];
        category: "PHYSICAL" | "SPECIAL" | "STATUS";
        randomMultiplier: number;
        critical: false;
    };
    result: {
        damage: number;
        rawDamage: number;
        stab: boolean;
        typeMultiplier: number;
        effectiveness: "immune" | "resisted" | "normal" | "effective";
        capped: boolean;
    };
};

export type NegamonBattleStateV4 = {
    battleId: string;
    engineVersion: "negamon_v4_showdown_adapter";
    adapterKind: "showdown";
    phase: NegamonBattleStateV4Phase;
    turn: number;
    stateVersion: number;
    seed: number;
    choiceRequestId: string;
    winner?: NegamonBattleSideV4;
    sides: {
        player: NegamonBattleCombatantV4;
        opponent: NegamonBattleCombatantV4;
    };
    choices: {
        player: NegamonBattleChoiceV4[];
        opponent: NegamonBattleChoiceV4[];
    };
    queue: NegamonBattleActionV4[];
    events: NegamonBattleEventV4[];
    metadata: {
        upstream: "smogon/pokemon-showdown";
        packageName: "pokemon-showdown";
        protocolVersion: 1;
        showdown: {
            formatid: string;
            commandLog: NegamonShowdownCommandLogEntry[];
            aliases: {
                player: Array<{ moveSlot: number; negamonMoveId: string; label: string; showdownMoveId: string; energyCost: number }>;
                opponent: Array<{ moveSlot: number; negamonMoveId: string; label: string; showdownMoveId: string; energyCost: number }>;
            };
            adapterInputs: {
                playerSeed: NegamonShowdownSideSeed;
                opponentSeed: NegamonShowdownSideSeed;
            };
            parsedRequests: {
                player: NegamonShowdownParsedRequestSnapshot | null;
                opponent: NegamonShowdownParsedRequestSnapshot | null;
            };
            choiceDiagnostics: {
                player: NegamonBattleChoiceDiagnosticsV4;
                opponent: NegamonBattleChoiceDiagnosticsV4;
            };
            p1Team: unknown[];
            p2Team: unknown[];
        };
        negamonFormula: {
            resolverDecision: "showdown_resolver_with_negamon_expected_damage";
            sameTypeAttackBonus: 1.5;
            criticalMode: "disabled_in_formula_expectation";
            randomMultiplier: 1;
            maxBurstTargetHpRatio: 0.75;
            expectations: {
                player: NegamonFormulaDamageExpectationV4[];
                opponent: NegamonFormulaDamageExpectationV4[];
            };
        };
        effectRules: {
            supportedFamilies: NegamonBattleEffectFamilyV4[];
            statStage: {
                supportedStats: NegamonBattleStatStageKeyV4[];
                min: number;
                max: number;
                defaultDurationTurns: 2;
            };
            status: {
                defaultDurationTurns: 2;
                stacking: {
                    default: "refresh";
                    badlyPoison: "stack_intensity";
                };
                tickTiming: {
                    damageOverTime: "turn_end";
                    utility: "instant";
                };
            };
        };
        resources: {
            player: NegamonBattleResourceStateV4;
            opponent: NegamonBattleResourceStateV4;
        };
    };
};

export type NegamonBattleResourceStateV4 = {
    ppByMoveId: Record<string, number>;
    maxPpByMoveId: Record<string, number>;
    cooldownByMoveId: Record<string, number>;
};

export function createNegamonBattleChoiceRequestIdV4(state: Pick<NegamonBattleStateV4, "battleId" | "stateVersion" | "turn">) {
    return `${state.battleId}:v4:${state.stateVersion}:${state.turn}`;
}
