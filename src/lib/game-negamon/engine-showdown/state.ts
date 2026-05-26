import type { MonsterType } from "@/lib/types/negamon";

export type NegamonBattleStateV4Phase = "preview" | "choosing" | "resolving" | "ended";
export type NegamonBattleSideV4 = "player" | "opponent";
export type NegamonBattleActionKindV4 = "move" | "switch" | "run";
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
    targetSide?: NegamonBattleSideV4;
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
        | "combatant_fainted"
        | "battle_ended";
    actorSide?: NegamonBattleSideV4;
    targetSide?: NegamonBattleSideV4;
    moveId?: string;
    message: string;
};

export type NegamonShowdownCommandLogEntry =
    | { stream: "omniscient"; message: string }
    | { stream: "p1"; message: string }
    | { stream: "p2"; message: string };

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
                player: Array<{ moveSlot: number; negamonMoveId: string; label: string; showdownMoveId: string }>;
                opponent: Array<{ moveSlot: number; negamonMoveId: string; label: string; showdownMoveId: string }>;
            };
            p1Team: unknown[];
            p2Team: unknown[];
        };
    };
};

export function createNegamonBattleChoiceRequestIdV4(state: Pick<NegamonBattleStateV4, "battleId" | "stateVersion" | "turn">) {
    return `${state.battleId}:v4:${state.stateVersion}:${state.turn}`;
}
