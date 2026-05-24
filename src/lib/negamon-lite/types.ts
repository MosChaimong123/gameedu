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

export type NegamonLiteEffectStat = keyof Omit<NegamonLiteStats, "hp"> | "accuracy";

export type NegamonLiteMoveEffect =
    | { kind: "buff"; stat: NegamonLiteEffectStat; stages: number }
    | { kind: "debuff"; stat: NegamonLiteEffectStat; stages: number }
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
    cooldownTurns?: number;
    cooldownRemaining?: number;
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
    accuracyStage?: number;
    passiveTraitIds?: string[];
    battleItemIds?: string[];
    itemEffectKinds?: string[];
    rewardGoldBonus?: number;
    rewardGoldMultiplier?: number;
    rewardExpMultiplier?: number;
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
    effect?: NegamonLiteMoveEffect;
    effectApplied?: boolean;
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
    | "ON_COOLDOWN"
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
