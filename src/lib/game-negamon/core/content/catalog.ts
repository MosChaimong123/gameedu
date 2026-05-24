import type { GameItemDefinition, GameItemEffect, GameItemRarity } from "@/lib/game-core";
import type { MonsterSpecies, MonsterType, PassiveAbility, StatusEffect } from "@/lib/types/negamon";
import { getNegamonBattleItemCatalog, type NegamonBattleItemDefinition } from "../battle-items";
import { calculateNegamonBattleExpReward, calculateNegamonBattleGoldReward } from "../battle-rewards";
import { getNegamonSpeciesSkillCatalog, type NegamonSkillDefinition } from "../skills";
import { getNegamonSpeciesCatalog } from "../species";

export type NegamonMonsterRole = "attacker" | "defender" | "trickster" | "scholar" | "treasurer" | "balanced";
export type NegamonGrowthCurve = "steady" | "burst" | "late_bloom" | "support";
export type NegamonStatusStackingRule = "refresh" | "stack_intensity" | "unique";
export type NegamonStatusTickTiming = "turn_start" | "turn_end" | "on_hit" | "instant";
export type NegamonBattleDifficulty = "easy" | "normal" | "hard" | "boss";

export type NegamonTraitDefinition = {
    id: string;
    name: string;
    description: string;
    sourceAbilityId?: PassiveAbility["id"];
    appliesAt: "battle_start" | "turn_start" | "turn_end" | "reward_finalize";
};

export type NegamonEvolutionRule = {
    formRank: number;
    formName: string;
    requiredRankIndex: number;
    requiredLevel: number;
};

export type NegamonMonsterContentDefinition = {
    id: string;
    name: string;
    role: NegamonMonsterRole;
    elementTypes: MonsterType[];
    baseStats: MonsterSpecies["baseStats"];
    growthCurve: NegamonGrowthCurve;
    traits: NegamonTraitDefinition[];
    evolutionRules: NegamonEvolutionRule[];
    species: MonsterSpecies;
};

export type NegamonSkillContentDefinition = NegamonSkillDefinition & {
    contentType: "skill";
    requirements: {
        level?: number;
        rankIndex?: number;
        speciesId?: string;
        itemId?: string;
    };
};

export type NegamonItemContentDefinition = GameItemDefinition & {
    contentType: "item";
    battleCategory?: NegamonBattleItemDefinition["battleCategory"];
    requirements?: {
        level?: number;
        rankIndex?: number;
        speciesId?: string;
    };
};

export type NegamonStatusEffectDefinition = {
    id: `status_${Lowercase<StatusEffect>}`;
    sourceStatus: StatusEffect;
    label: string;
    durationTurns: number | null;
    stacking: NegamonStatusStackingRule;
    tickTiming: NegamonStatusTickTiming;
    immunities: string[];
};

export type NegamonBattleRewardTableEntry = {
    id: string;
    difficulty: NegamonBattleDifficulty;
    outcome: "win" | "loss" | "draw";
    gold: number;
    exp: number;
    itemDropIds: string[];
    unlockConditions: {
        minRankIndex?: number;
        minLevel?: number;
        requiredQuestId?: string;
    };
};

export type NegamonContentCatalog = {
    version: 1;
    monsters: NegamonMonsterContentDefinition[];
    skills: NegamonSkillContentDefinition[];
    items: NegamonItemContentDefinition[];
    statuses: NegamonStatusEffectDefinition[];
    rewardTables: NegamonBattleRewardTableEntry[];
};

const STATUS_EFFECTS: StatusEffect[] = [
    "BURN",
    "PARALYZE",
    "SLEEP",
    "POISON",
    "BADLY_POISON",
    "FREEZE",
    "CONFUSE",
    "BOOST_ATK",
    "BOOST_DEF",
    "BOOST_DEF_20",
    "BOOST_SPD",
    "BOOST_SPD_30",
    "BOOST_SPD_100",
    "BOOST_WATER_DMG",
    "LOWER_ATK",
    "LOWER_ATK_ALL",
    "LOWER_DEF",
    "LOWER_SPD",
    "LOWER_EN_REGEN",
    "HEAL_25",
    "IGNORE_DEF",
];

function statusId(status: StatusEffect): NegamonStatusEffectDefinition["id"] {
    return `status_${status.toLowerCase()}` as NegamonStatusEffectDefinition["id"];
}

function humanizeId(id: string): string {
    return id
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function inferMonsterRole(species: MonsterSpecies): NegamonMonsterRole {
    const { atk, def, spd } = species.baseStats;
    if (species.ability?.id === "volt_flow" || species.ability?.id === "aerial_strike") return "trickster";
    if (species.ability?.id === "guardian_scale") return "scholar";
    if (atk >= def + 8) return "attacker";
    if (def >= atk + 8) return "defender";
    if (spd >= atk && spd >= def) return "trickster";
    return "balanced";
}

function inferGrowthCurve(species: MonsterSpecies): NegamonGrowthCurve {
    const role = inferMonsterRole(species);
    if (role === "attacker") return "burst";
    if (role === "defender") return "late_bloom";
    if (role === "scholar") return "support";
    return "steady";
}

function mapAbilityToTrait(ability: PassiveAbility | undefined): NegamonTraitDefinition[] {
    if (!ability) return [];
    return [
        {
            id: `trait_${ability.id}`,
            name: ability.name,
            description: ability.desc,
            sourceAbilityId: ability.id,
            appliesAt: ability.id === "volt_flow" || ability.id === "acid_rain" ? "turn_end" : "battle_start",
        },
    ];
}

function createMonsterContentDefinition(species: MonsterSpecies): NegamonMonsterContentDefinition {
    return {
        id: species.id,
        name: species.name,
        role: inferMonsterRole(species),
        elementTypes: [species.type, species.type2].filter((type): type is MonsterType => Boolean(type)),
        baseStats: species.baseStats,
        growthCurve: inferGrowthCurve(species),
        traits: mapAbilityToTrait(species.ability),
        evolutionRules: species.forms.map((form) => ({
            formRank: form.rank,
            formName: form.name,
            requiredRankIndex: form.rank,
            requiredLevel: form.rank + 1,
        })),
        species,
    };
}

function createSkillContentDefinition(skill: NegamonSkillDefinition): NegamonSkillContentDefinition {
    return {
        ...skill,
        contentType: "skill",
        requirements: { ...skill.unlock },
    };
}

function createItemContentDefinition(item: NegamonBattleItemDefinition): NegamonItemContentDefinition {
    return {
        ...item,
        contentType: "item",
        requirements: item.requirements,
    };
}

function createStatusEffectDefinition(status: StatusEffect): NegamonStatusEffectDefinition {
    const isBoost = status.startsWith("BOOST_");
    const isLower = status.startsWith("LOWER_");
    const isInstant = status === "HEAL_25";
    return {
        id: statusId(status),
        sourceStatus: status,
        label: humanizeId(status),
        durationTurns: isInstant ? 0 : status === "POISON" || status === "BADLY_POISON" ? null : 2,
        stacking: status === "BADLY_POISON" ? "stack_intensity" : "refresh",
        tickTiming: status === "BURN" || status === "POISON" || status === "BADLY_POISON" ? "turn_end" : "instant",
        immunities: isBoost || isLower || isInstant ? [] : [status],
    };
}

function createRewardTableEntry(input: {
    difficulty: NegamonBattleDifficulty;
    outcome: "win" | "loss" | "draw";
    baseGold: number;
    turnCount: number;
    itemDropIds?: string[];
    minRankIndex?: number;
}): NegamonBattleRewardTableEntry {
    return {
        id: `reward_${input.difficulty}_${input.outcome}`,
        difficulty: input.difficulty,
        outcome: input.outcome,
        gold: input.outcome === "win" ? calculateNegamonBattleGoldReward({ baseGold: input.baseGold }) : 0,
        exp: calculateNegamonBattleExpReward({ outcome: input.outcome, turnCount: input.turnCount }),
        itemDropIds: input.itemDropIds ?? [],
        unlockConditions: {
            minRankIndex: input.minRankIndex,
        },
    };
}

export const NEGAMON_STATUS_EFFECT_CATALOG: NegamonStatusEffectDefinition[] =
    STATUS_EFFECTS.map(createStatusEffectDefinition);

export const NEGAMON_BATTLE_REWARD_TABLE: NegamonBattleRewardTableEntry[] = [
    createRewardTableEntry({ difficulty: "easy", outcome: "win", baseGold: 20, turnCount: 2 }),
    createRewardTableEntry({ difficulty: "normal", outcome: "win", baseGold: 30, turnCount: 4 }),
    createRewardTableEntry({
        difficulty: "hard",
        outcome: "win",
        baseGold: 45,
        turnCount: 6,
        itemDropIds: ["item_lucky_coin"],
        minRankIndex: 2,
    }),
    createRewardTableEntry({
        difficulty: "boss",
        outcome: "win",
        baseGold: 60,
        turnCount: 8,
        itemDropIds: ["item_merchants_sigil"],
        minRankIndex: 4,
    }),
    createRewardTableEntry({ difficulty: "normal", outcome: "draw", baseGold: 0, turnCount: 4 }),
    createRewardTableEntry({ difficulty: "normal", outcome: "loss", baseGold: 0, turnCount: 4 }),
];

export function buildNegamonContentCatalog(input: {
    species?: MonsterSpecies[];
    battleItems?: NegamonBattleItemDefinition[];
    extraItems?: NegamonItemContentDefinition[];
} = {}): NegamonContentCatalog {
    const monsters = getNegamonSpeciesCatalog(input.species).map(createMonsterContentDefinition);
    const skills = monsters.flatMap((monster) =>
        getNegamonSpeciesSkillCatalog(monster.species, { includeBasic: true }).map(createSkillContentDefinition)
    );
    const itemMap = new Map<string, NegamonItemContentDefinition>();
    for (const item of input.battleItems ?? getNegamonBattleItemCatalog()) {
        itemMap.set(item.id, createItemContentDefinition(item));
    }
    for (const item of input.extraItems ?? []) {
        itemMap.set(item.id, item);
    }

    return {
        version: 1,
        monsters,
        skills,
        items: [...itemMap.values()],
        statuses: NEGAMON_STATUS_EFFECT_CATALOG,
        rewardTables: NEGAMON_BATTLE_REWARD_TABLE,
    };
}

export function findNegamonContentItem(
    catalog: NegamonContentCatalog,
    itemId: string
): NegamonItemContentDefinition | null {
    return catalog.items.find((item) => item.id === itemId) ?? null;
}

export function createNegamonExtraItemDefinition(input: {
    id: string;
    rarity: GameItemRarity;
    itemType?: NegamonItemContentDefinition["itemType"];
    priceGold?: number;
    sellGold?: number;
    stackable?: boolean;
    allowedInBattle?: boolean;
    effects: GameItemEffect[];
}): NegamonItemContentDefinition {
    return {
        id: input.id,
        contentType: "item",
        rarity: input.rarity,
        itemType: input.itemType ?? "battle",
        priceGold: input.priceGold,
        sellGold: input.sellGold,
        stackable: input.stackable ?? true,
        allowedInBattle: input.allowedInBattle ?? true,
        effects: input.effects,
    };
}
