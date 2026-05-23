export type NegamonLiteType = "NORMAL" | "FIRE" | "WATER" | "EARTH" | "WIND" | "THUNDER" | "LIGHT" | "DARK";

export type NegamonLiteMoveCategory = "PHYSICAL" | "SPECIAL" | "STATUS";

export type NegamonLiteBattleSide = "player" | "opponent";

export type NegamonLiteBattlePhase = "choosing" | "resolving" | "ended";

export type NegamonLiteStats = {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
};

export type NegamonLiteMoveEffect =
    | { kind: "buff"; stat: keyof Omit<NegamonLiteStats, "hp">; stages: number }
    | { kind: "debuff"; stat: keyof Omit<NegamonLiteStats, "hp">; stages: number }
    | { kind: "heal"; percent: number };

export type NegamonLiteMove = {
    id: string;
    name: string;
    type: NegamonLiteType;
    category: NegamonLiteMoveCategory;
    power: number;
    accuracy: number;
    pp: number;
    maxPp: number;
    energyCost?: number;
    priority?: number;
    target: "opponent" | "self";
    effect?: NegamonLiteMoveEffect;
};

export type NegamonLiteCombatant = {
    id: string;
    name: string;
    speciesId: string;
    level: number;
    types: NegamonLiteType[];
    stats: NegamonLiteStats;
    hp: number;
    energy: number;
    maxEnergy: number;
    moves: NegamonLiteMove[];
    status?: "BURN" | "POISON" | "PARALYZE" | "SLEEP";
};

export type NegamonLiteBattleEvent = {
    id: string;
    turn: number;
    kind: "battle_started" | "choice_accepted" | "choice_rejected" | "turn_resolved" | "battle_ended";
    side?: NegamonLiteBattleSide;
    moveId?: string;
    targetSide?: NegamonLiteBattleSide;
    damage?: number;
    healing?: number;
    missed?: boolean;
    critical?: boolean;
    stab?: boolean;
    typeMultiplier?: number;
    effectiveness?: "immune" | "resisted" | "normal" | "effective";
    message: string;
};

export type NegamonLiteBattleState = {
    battleId: string;
    seed: number;
    turn: number;
    phase: NegamonLiteBattlePhase;
    sides: Record<NegamonLiteBattleSide, NegamonLiteCombatant>;
    events: NegamonLiteBattleEvent[];
    winner?: NegamonLiteBattleSide;
};

export type NegamonLiteChoice = {
    side: NegamonLiteBattleSide;
    kind: "move";
    moveId: string;
    targetSide?: NegamonLiteBattleSide;
};

export type NegamonLiteChoiceDisabledReason =
    | "BATTLE_ENDED"
    | "NOT_CHOOSING"
    | "FAINTED"
    | "NO_PP"
    | "NO_ENERGY"
    | "INVALID_TARGET";

export type NegamonLiteValidChoice = {
    kind: "move";
    moveId: string;
    label: string;
    targetSide: NegamonLiteBattleSide;
    enabled: boolean;
    reason?: NegamonLiteChoiceDisabledReason;
    move: NegamonLiteMove;
};

export type NegamonLiteResolvedChoice = {
    state: NegamonLiteBattleState;
    accepted: boolean;
    reason?: NegamonLiteChoiceDisabledReason | "INVALID_MOVE";
};
