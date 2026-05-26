import type { NegamonMonsterSnapshot } from "../core/monster-snapshot";
import type { NegamonSkillDefinition } from "../core/skills";
import type { MonsterType } from "@/lib/types/negamon";
import type { NegamonBattleCombatantV4 } from "./state";

export type NegamonShowdownMoveSet = {
    id: string;
    negamonMoveId: string;
    label: string;
    name: string;
    type: NegamonSkillDefinition["elementType"];
    category: NegamonSkillDefinition["category"];
    power: number;
    accuracy: number;
    energyCost: number;
    priority: number;
    cooldownTurns: number;
    target: NegamonSkillDefinition["target"];
};

export type NegamonShowdownTeamSet = {
    name: string;
    species: string;
    ability: string;
    item: string;
    level: number;
    moves: string[];
};

export type NegamonShowdownSideSeed = {
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
    attack: number;
    defense: number;
    types: MonsterType[];
    abilityId?: string;
    itemIds: string[];
    moveSet: NegamonShowdownMoveSet[];
};

const NEGAMON_SPECIES_SHOWDOWN_SPECIES: Record<string, string> = {
    naga: "Greninja",
    garuda: "Charizard",
    singha: "Camerupt",
    kinnaree: "Togekiss",
    thotsakan: "Incineroar",
    hanuman: "Hawlucha",
    mekkala: "Jolteon",
    suvannamaccha: "Primarina",
};

const NEGAMON_ABILITY_SHOWDOWN_ABILITY: Record<string, string> = {
    acid_rain: "Torrent",
    flame_body: "Flame Body",
    iron_shell: "Shell Armor",
    tailwind: "Serene Grace",
    rage_mode: "Blaze",
    aerial_strike: "Unburden",
    volt_flow: "Volt Absorb",
    guardian_scale: "Marvel Scale",
};

const NEGAMON_ITEM_SHOWDOWN_ITEM: Record<string, string> = {
    item_minor_potion: "Oran Berry",
    item_energy_orb: "Leppa Berry",
    item_antidote_charm: "Lum Berry",
    item_flame_ward: "Occa Berry",
    item_dream_bell: "Chesto Berry",
    item_lucky_coin: "Amulet Coin",
};

function mapNegamonSkillToShowdownMoveId(skill: NegamonSkillDefinition): string {
    if (skill.category === "heal") return "recover";

    const statusEffect = skill.effects.find((effect) => effect.kind === "status" || effect.kind === "self_status");
    const statEffect = skill.effects.find((effect) => effect.kind === "stat_stage");
    const energyEffect = skill.effects.find((effect) => effect.kind === "energy_shift");

    if (statusEffect && skill.power === 0) {
        if ("effect" in statusEffect && statusEffect.effect === "PARALYZE") return "thunderwave";
        if ("effect" in statusEffect && statusEffect.effect === "SLEEP") return "hypnosis";
        if ("effect" in statusEffect && statusEffect.effect === "BURN") return "willowisp";
        return "toxic";
    }

    if (statEffect && skill.power === 0) {
        if (statEffect.stages > 0 && statEffect.stat === "attack") return "swordsdance";
        if (statEffect.stages > 0 && statEffect.stat === "defense") return "irondefense";
        if (statEffect.stages > 0 && statEffect.stat === "speed") return "agility";
        if (statEffect.stages < 0 && statEffect.stat === "attack") return "charm";
        if (statEffect.stages < 0 && statEffect.stat === "defense") return "screech";
        if (statEffect.stages < 0 && statEffect.stat === "speed") return "electroweb";
    }

    if (energyEffect && skill.power === 0) return "thunderwave";

    switch (skill.elementType) {
        case "WATER":
            return skill.category === "attack" ? "waterfall" : skill.power >= 45 ? "hydropump" : "surf";
        case "FIRE":
            return skill.category === "attack" ? "firepunch" : skill.power >= 45 ? "fireblast" : "flamethrower";
        case "EARTH":
            return skill.power >= 45 ? "earthquake" : "bulldoze";
        case "WIND":
            return skill.category === "attack" ? "aerialace" : skill.power >= 45 ? "hurricane" : "airslash";
        case "THUNDER":
            return skill.power >= 45 ? "thunder" : "thunderbolt";
        case "LIGHT":
            return skill.category === "attack" ? "playrough" : skill.power >= 45 ? "moonblast" : "dazzlinggleam";
        case "DARK":
            return skill.category === "attack" ? "crunch" : skill.power >= 45 ? "darkpulse" : "snarl";
        default:
            return skill.category === "attack" ? "quickattack" : "protect";
    }
}

export function createNegamonShowdownMoveSet(skills: NegamonSkillDefinition[]): NegamonShowdownMoveSet[] {
    return skills.slice(0, 4).map((skill) => ({
        id: mapNegamonSkillToShowdownMoveId(skill),
        negamonMoveId: skill.id,
        label: skill.name,
        name: skill.name,
        type: skill.elementType,
        category: skill.category,
        power: skill.power,
        accuracy: skill.accuracy,
        energyCost: skill.energyCost,
        priority: skill.priority,
        cooldownTurns: skill.cooldownTurns,
        target: skill.target,
    }));
}

export function createNegamonShowdownSideSeed(input: {
    snapshot: NegamonMonsterSnapshot;
    name?: string;
}): NegamonShowdownSideSeed {
    const moveSet = createNegamonShowdownMoveSet(input.snapshot.skillCatalog);
    return {
        id: input.snapshot.studentId,
        name: input.name?.trim() || input.snapshot.displayName,
        speciesId: input.snapshot.speciesId,
        speciesName: input.snapshot.speciesName,
        formName: input.snapshot.formName,
        level: input.snapshot.level,
        rankIndex: input.snapshot.rankIndex,
        hp: input.snapshot.derivedStats.maxHp,
        maxHp: input.snapshot.derivedStats.maxHp,
        energy: input.snapshot.derivedStats.maxEnergy,
        maxEnergy: input.snapshot.derivedStats.maxEnergy,
        speed: input.snapshot.derivedStats.spd,
        attack: input.snapshot.derivedStats.atk,
        defense: input.snapshot.derivedStats.def,
        types: [...input.snapshot.elementTypes] as MonsterType[],
        abilityId: input.snapshot.abilityId,
        itemIds: input.snapshot.equippedItemIds,
        moveSet,
    };
}

export function createNegamonShowdownTeamSet(seed: NegamonShowdownSideSeed): NegamonShowdownTeamSet {
    return {
        name: seed.name,
        species: NEGAMON_SPECIES_SHOWDOWN_SPECIES[seed.speciesId] ?? "Eevee",
        ability: NEGAMON_ABILITY_SHOWDOWN_ABILITY[seed.abilityId ?? ""] ?? "Adaptability",
        item: NEGAMON_ITEM_SHOWDOWN_ITEM[seed.itemIds[0] ?? ""] ?? "Oran Berry",
        level: Math.max(1, Math.min(100, seed.level)),
        moves: seed.moveSet.map((move) => move.id),
    };
}

export function createNegamonBattleCombatantV4FromSeed(seed: NegamonShowdownSideSeed): NegamonBattleCombatantV4 {
    return {
        id: seed.id,
        name: seed.name,
        speciesId: seed.speciesId,
        speciesName: seed.speciesName,
        formName: seed.formName,
        level: seed.level,
        rankIndex: seed.rankIndex,
        hp: seed.hp,
        maxHp: seed.maxHp,
        energy: seed.energy,
        maxEnergy: seed.maxEnergy,
        speed: seed.speed,
        types: [...seed.types],
        moveIds: seed.moveSet.map((move) => move.negamonMoveId),
        statusIds: [],
        battleItemIds: [...seed.itemIds],
        fainted: seed.hp <= 0,
    };
}
