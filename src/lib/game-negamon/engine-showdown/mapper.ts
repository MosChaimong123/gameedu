import type { NegamonMonsterSnapshot } from "../core/monster-snapshot";
import type { NegamonSkillDefinition } from "../core/skills";
import { applyNegamonBattleItemRuntimeEffects } from "../core/item-effects";
import type { MonsterType } from "@/lib/types/negamon";
import type { NegamonBattleCombatantV4 } from "./state";
import type { NegamonInjectedBaseStats } from "./negamon-stats-rule";

export const NEGAMON_V4_CANONICAL_SPECIES_IDS = [
    "pyronox",
    "aerolisk",
    "terranoir",
    "lumilune",
    "voltshade",
    "tidemaw",
] as const;

export type NegamonV4CanonicalSpeciesId = (typeof NEGAMON_V4_CANONICAL_SPECIES_IDS)[number];

export type NegamonShowdownMoveSet = {
    id: string;
    negamonMoveId: string;
    label: string;
    name: string;
    type: NegamonSkillDefinition["elementType"];
    category: NegamonSkillDefinition["category"];
    /** Raw MonsterMove.category ("PHYSICAL" | "SPECIAL" | "HEAL") — used for damage formula split. */
    sourceCategory: string;
    power: number;
    accuracy: number;
    energyCost: number;
    priority: number;
    cooldownTurns: number;
    target: NegamonSkillDefinition["target"];
    effectFamily: NegamonSkillDefinition["effectFamily"];
    effects: NegamonSkillDefinition["effects"];
};

export type NegamonShowdownTeamSet = {
    name: string;
    species: string;
    ability: string;
    item: string;
    level: number;
    moves: string[];
    /**
     * Negamon BASE stats injected into the Showdown engine via the `negamonstatsmod` rule.
     * Showdown applies its own level scaling on top, so the roster's identity (physical vs
     * special, bulky vs frail) drives real damage instead of the proxy Pokémon's stats.
     */
    negamonBaseStats: NegamonInjectedBaseStats;
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
    specialAttack: number;
    /** Negamon BASE stats (pre-level-scaling) injected into Showdown for damage parity. */
    negamonBaseStats: NegamonInjectedBaseStats;
    types: MonsterType[];
    abilityId?: string;
    traitId?: string;
    traitName?: string;
    itemIds: string[];
    heldItemIds: string[];
    moveSet: NegamonShowdownMoveSet[];
};

export const NEGAMON_SPECIES_SHOWDOWN_SPECIES: Record<NegamonV4CanonicalSpeciesId, string> = {
    pyronox: "Houndoom",
    aerolisk: "Hawlucha",
    terranoir: "Hippowdon",
    lumilune: "Primarina",
    voltshade: "Jolteon",
    tidemaw: "Feraligatr",
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
    if (skill.id === "basic-attack") return "tackle";
    if (skill.category === "heal") return "recover";

    const statusEffect = skill.effects.find((effect) => effect.kind === "status" || effect.kind === "self_status");
    const statEffect = skill.effects.find((effect) => effect.kind === "stat_stage");
    const energyEffect = skill.effects.find((effect) => effect.kind === "energy_shift");
    const drainEffect = skill.effects.find((effect) => effect.kind === "drain");

    if (skill.id === "pyronox-hell-dive") return "inferno";
    if (skill.id === "pyronox-soulfire-brand") return "blastburn";
    if (skill.id === "aerolisk-skybreaker") return "aeroblast";
    if (skill.id === "aerolisk-apex-tempest") return "hurricane";
    if (skill.id === "terranoir-eternal-collapse") return "darkpulse";
    if (skill.id === "lumilune-stellar-aegis") return "moonlight";
    if (skill.id === "voltshade-blackhole-surge") return "boomburst";
    if (skill.id === "tidemaw-depth-annihilator") return "wavecrash";
    if (skill.id === "voltshade-chain-shock") return "nuzzle";
    if (skill.id === "lumilune-tidal-mercy") return "icywind";
    if (skill.id === "voltshade-night-tether") return "scaryface";
    if (skill.id === "voltshade-night-signal") return "darkpulse";
    if (skill.id === "terranoir-dread-mire") return "growl";
    if (skill.id === "pyronox-shadow-rend") return "crunch";
    if (skill.id === "tidemaw-shell-breaker") return "razorshell";
    if (skill.id === "terranoir-catacomb-crush") return "highhorsepower";
    if (skill.id === "tidemaw-reef-guard") return "liquidation";
    if (skill.id === "aerolisk-spark-lance") return "thunderouskick";
    if (skill.id === "pyronox-scorch-rush") return "quickattack";
    if (skill.id === "terranoir-bastion-hide") return "electroweb";
    if (skill.id === "aerolisk-gale-cut") return "wingattack";
    if (skill.id === "pyronox-ember-fang") return "firefang";
    if (skill.id === "voltshade-static-bite") return "thunderfang";

    if (statusEffect && skill.power === 0) {
        if ("effect" in statusEffect && statusEffect.effect === "PARALYZE") return "thunderwave";
        if ("effect" in statusEffect && statusEffect.effect === "SLEEP") return "hypnosis";
        if ("effect" in statusEffect && statusEffect.effect === "BURN") return "willowisp";
        return "toxic";
    }

    if (statEffect && skill.power === 0) {
        if (statEffect.stages > 0 && statEffect.stat === "attack") return "swordsdance";
        if (statEffect.stages > 0 && statEffect.stat === "defense") return "harden";
        if (statEffect.stages > 0 && statEffect.stat === "speed") return "agility";
        if (statEffect.stages < 0 && statEffect.stat === "attack") return "charm";
        if (statEffect.stages < 0 && statEffect.stat === "specialAttack") return "eerieimpulse";
        if (statEffect.stages < 0 && statEffect.stat === "defense") return "screech";
        if (statEffect.stages < 0 && statEffect.stat === "speed") return "electroweb";
    }

    if (energyEffect && skill.power === 0) return "thunderwave";

    if (drainEffect && skill.power > 0) {
        if (skill.id === "lumilune-mercy-current") return "drainingkiss";
        if (skill.id === "tidemaw-deep-feast") return "leechlife";
        return skill.category === "attack" ? "leechlife" : "gigadrain";
    }

    if (
        statEffect &&
        skill.power > 0 &&
        statEffect.stages < 0 &&
        statEffect.stat === "attack" &&
        (statEffect.target === "enemy" || statEffect.target === "allEnemies")
    ) {
        return "breakingswipe";
    }

    switch (skill.elementType) {
        case "WATER":
            return skill.category === "attack" ? "waterfall" : skill.power >= 45 ? "hydropump" : "surf";
        case "FIRE":
            return skill.category === "attack" ? "firepunch" : skill.power >= 45 ? "fireblast" : "flamethrower";
        case "GRASS":
            return skill.category === "attack" ? "woodhammer" : skill.power >= 45 ? "leafstorm" : "energyball";
        case "ELECTRICITY":
            return skill.power >= 45 ? "thunder" : "thunderbolt";
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
        sourceCategory: skill.sourceMove.category,
        power: skill.power,
        accuracy: skill.accuracy,
        energyCost: skill.energyCost,
        priority: skill.priority,
        cooldownTurns: skill.cooldownTurns,
        target: skill.target,
        effectFamily: skill.effectFamily,
        effects: skill.effects.map((effect) => ({ ...effect })),
    }));
}

export function getShowdownSpeciesForNegamonSpeciesId(speciesId: string): string {
    if (speciesId in NEGAMON_SPECIES_SHOWDOWN_SPECIES) {
        return NEGAMON_SPECIES_SHOWDOWN_SPECIES[speciesId as NegamonV4CanonicalSpeciesId];
    }

    throw new Error(`Missing Negamon V4 battle species mapping for "${speciesId}".`);
}

export function createNegamonShowdownSideSeed(input: {
    snapshot: NegamonMonsterSnapshot;
    name?: string;
}): NegamonShowdownSideSeed {
    const skillById = new Map(input.snapshot.skillCatalog.map((skill) => [skill.id, skill]));
    const activeSkills = input.snapshot.equippedSkillIds
        .map((skillId) => skillById.get(skillId))
        .filter((skill): skill is NegamonSkillDefinition => Boolean(skill));
    const moveSet = createNegamonShowdownMoveSet(activeSkills);
    const itemRuntime = applyNegamonBattleItemRuntimeEffects({ monster: input.snapshot });
    return {
        id: input.snapshot.studentId,
        name: input.name?.trim() || input.snapshot.displayName,
        speciesId: input.snapshot.speciesId,
        speciesName: input.snapshot.speciesName,
        formName: input.snapshot.formName,
        level: input.snapshot.level,
        rankIndex: input.snapshot.rankIndex,
        hp: itemRuntime.stats.maxHp,
        maxHp: itemRuntime.stats.maxHp,
        energy: input.snapshot.derivedStats.maxEnergy,
        maxEnergy: input.snapshot.derivedStats.maxEnergy,
        speed: itemRuntime.stats.spd,
        attack: itemRuntime.stats.atk,
        defense: itemRuntime.stats.def,
        specialAttack: itemRuntime.stats.spa ?? itemRuntime.stats.atk,
        // Negamon BASE stats (Showdown re-scales by level). Note the axis remap:
        // Negamon `spd` is SPEED → Showdown `spe`; the single Negamon defense feeds
        // both Showdown `def` and `spd` (special defense).
        negamonBaseStats: {
            hp: input.snapshot.baseStats.hp,
            atk: input.snapshot.baseStats.atk,
            def: input.snapshot.baseStats.def,
            spa: input.snapshot.baseStats.spa ?? input.snapshot.baseStats.atk,
            spd: input.snapshot.baseStats.def,
            spe: input.snapshot.baseStats.spd,
        },
        types: [...input.snapshot.elementTypes] as MonsterType[],
        abilityId: input.snapshot.abilityId,
        traitId: input.snapshot.trait?.id,
        traitName: input.snapshot.trait?.name,
        itemIds: itemRuntime.plan.itemIds,
        heldItemIds: itemRuntime.plan.items.filter((item) => item.battleKind === "held").map((item) => item.id),
        moveSet,
    };
}

export function createNegamonShowdownTeamSet(seed: NegamonShowdownSideSeed): NegamonShowdownTeamSet {
    return {
        name: seed.name,
        species: getShowdownSpeciesForNegamonSpeciesId(seed.speciesId),
        ability: NEGAMON_ABILITY_SHOWDOWN_ABILITY[seed.abilityId ?? ""] ?? "Adaptability",
        item: NEGAMON_ITEM_SHOWDOWN_ITEM[seed.itemIds[0] ?? ""] ?? "Oran Berry",
        level: Math.max(1, Math.min(100, seed.level)),
        moves: seed.moveSet.map((move) => move.id),
        negamonBaseStats: seed.negamonBaseStats,
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
        statSnapshot: {
            hp: seed.maxHp,
            attack: seed.attack,
            defense: seed.defense,
            specialAttack: seed.specialAttack,
            specialDefense: seed.defense,
            speed: seed.speed,
            level: seed.level,
        },
        types: [...seed.types],
        statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
        activeStatusIds: [],
        moveIds: seed.moveSet.map((move) => move.negamonMoveId),
        statusIds: [],
        battleItemIds: [...seed.itemIds],
        fainted: seed.hp <= 0,
    };
}
