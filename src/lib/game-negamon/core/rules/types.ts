export type NegamonFormulaTypeId =
    | "NORMAL"
    | "FIRE"
    | "WATER"
    | "GRASS"
    | "ELECTRICITY";

export type NegamonFormulaCategory = "PHYSICAL" | "SPECIAL" | "STATUS";

export type NegamonFormulaStats = {
    maxHp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
};

export type NegamonFormulaStatStageKey =
    | "attack"
    | "defense"
    | "specialAttack"
    | "specialDefense"
    | "speed"
    | "accuracy"
    | "evasion";

export type NegamonFormulaStatStages = Record<NegamonFormulaStatStageKey, number>;

export type NegamonFormulaMove = {
    id: string;
    type: NegamonFormulaTypeId;
    category: NegamonFormulaCategory;
    power: number;
    accuracy: number;
    priority: number;
};

export type NegamonFormulaCombatant = {
    level: number;
    types: NegamonFormulaTypeId[];
    stats: NegamonFormulaStats;
    statStages: NegamonFormulaStatStages;
};
