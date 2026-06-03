import { createGameMonsterSnapshot } from "@/lib/game-core";
import type { GameMonsterSnapshot } from "@/lib/game-core";
import {
    getCanonicalNegamonSpeciesCatalog,
    resolveCanonicalNegamonAssignment,
} from "@/lib/negamon-catalog";
import { buildBasicAttackMove } from "@/lib/negamon-basic-move";
import type { LevelConfigInput, RankEntry } from "@/lib/classroom-utils";
import type {
    MonsterMove,
    MonsterSpecies,
    MonsterStats,
    MonsterType,
    NegamonSettings,
    PassiveAbility,
    PassiveAbilityId,
    StudentMonsterState,
} from "@/lib/types/negamon";
import {
    calculateNegamonExpProgress,
    getNegamonFormLevelBand,
    calculateNegamonStatsForLevel,
    getNegamonFormIndexFromLevel,
    normalizeNegamonRankIndex,
} from "./monster-growth";
import { getEnergyProfileForSpecies } from "@/lib/negamon-energy";
import {
    createNegamonEvolutionSnapshot,
    createNegamonTraitSnapshot,
    type NegamonEvolutionProgressSnapshot,
    type NegamonMonsterTraitSnapshot,
} from "./monster-traits";
import { findNegamonSpeciesById } from "./species";
import type { NegamonSkillDefinition } from "./skills";
import { createNegamonSkillDefinition, getNegamonSpeciesSkillCatalog } from "./skills";
import { getUnlockedNegamonSkillDefinitions, validateNegamonSkillLoadout } from "./skill-unlock";

export type NegamonDerivedStats = {
    maxHp: number;
    atk: number;
    def: number;
    spd: number;
    spa: number;
    maxEnergy: number;
    energyRegen: number;
};

export type NegamonMonsterSnapshot = GameMonsterSnapshot & {
    monsterId: string;
    speciesName: string;
    displayName: string;
    formIcon: string;
    formColor: string;
    elementTypes: string[];
    exp: number;
    expToNextLevel: number;
    evolutionStage: number;
    baseStats: MonsterStats;
    derivedStats: NegamonDerivedStats;
    ability?: PassiveAbility;
    abilityId?: PassiveAbilityId;
    trait?: NegamonMonsterTraitSnapshot;
    traitId?: string;
    formBand: {
        levelMin: number;
        levelMax: number;
    };
    evolution: NegamonEvolutionProgressSnapshot;
    nextSkillUnlock: {
        id: string;
        name: string;
        level: number;
        rankIndex: number;
    } | null;
    unlockedSkillIds: string[];
    equippedSkillIds: string[];
    equippedItemIds: string[];
    skillCatalog: NegamonSkillDefinition[];
    unlockedMoves: MonsterMove[];
};

export type CreateNegamonMonsterSnapshotInput = {
    studentId: string;
    studentName?: string | null;
    points: number;
    levelConfig: LevelConfigInput;
    negamonSettings: NegamonSettings;
    equippedSkillIds?: string[];
    equippedItemIds?: string[];
};

export function getNegamonElementTypes(species: Pick<MonsterSpecies, "type" | "type2">): string[] {
    return [species.type, species.type2].filter((type): type is MonsterType => Boolean(type));
}

function parseNegamonLevelEntries(raw: LevelConfigInput): RankEntry[] {
    if (!raw) {
        return [
            { name: "Common", minScore: 5 },
            { name: "Uncommon", minScore: 10 },
            { name: "Rare", minScore: 15 },
            { name: "Epic", minScore: 20 },
            { name: "Legendary", minScore: 30 },
            { name: "Mythic", minScore: 40 },
        ];
    }
    if (Array.isArray(raw)) {
        if (raw.length === 0) return parseNegamonLevelEntries(null);
        return [...raw].sort((a, b) => a.minScore - b.minScore);
    }
    return Object.entries(raw)
        .map(([name, minScore]) => ({ name, minScore: Number(minScore) }))
        .filter((entry) => Number.isFinite(entry.minScore))
        .sort((a, b) => a.minScore - b.minScore);
}

export function getNegamonRankIndex(points: number, levelConfig: LevelConfigInput): number {
    const entries = parseNegamonLevelEntries(levelConfig);
    let rankIndex = 0;
    for (let i = 0; i < entries.length; i += 1) {
        if (points >= entries[i].minScore) rankIndex = i;
        else break;
    }
    return normalizeNegamonRankIndex(rankIndex);
}

export function getNegamonUnlockedMoves(
    species: MonsterSpecies,
    rankIndex: number,
    level?: number,
    disabledMoves: string[] = []
): MonsterMove[] {
    const normalizedRankIndex = normalizeNegamonRankIndex(rankIndex);
    const progress = calculateNegamonExpProgress({
        points: 0,
        rankIndex: normalizedRankIndex,
    });
    const normalizedLevel =
        typeof level === "number"
            ? level
            : progress.level;
    const disabled = new Set(disabledMoves);
    return species.moves.filter((move) => {
        if (disabled.has(move.id)) return false;
        const unlockLevel = createNegamonSkillDefinition(move, species.id).unlock.level ?? 1;
        return unlockLevel <= normalizedLevel;
    });
}

export function createStudentMonsterStateFromSpecies(input: {
    species: MonsterSpecies;
    rankIndex: number;
    disabledMoves?: string[];
}): StudentMonsterState {
    const rankIndex = normalizeNegamonRankIndex(input.rankIndex);
    const progress = calculateNegamonExpProgress({
        points: 0,
        rankIndex,
    });
    const stats = calculateNegamonStatsForLevel(
        input.species.baseStats,
        progress.level,
        input.species.battleRole
    );
    const unlockedMoves = getNegamonUnlockedMoves(input.species, rankIndex, progress.level, input.disabledMoves);
    const formIndex = getNegamonFormIndexFromLevel(progress.level);
    const form = input.species.forms[formIndex] ?? input.species.forms[0];

    return {
        speciesId: input.species.id,
        speciesName: input.species.name,
        type: input.species.type,
        type2: input.species.type2,
        form,
        stats,
        unlockedMoves,
        rankIndex,
        ability: input.species.ability,
    };
}

export function createNegamonMonsterSnapshotFromState(input: {
    studentId: string;
    studentName?: string | null;
    monster: StudentMonsterState;
    species: MonsterSpecies;
    speciesBaseStats?: MonsterStats;
    disabledSkillIds?: string[];
    points?: number;
    expPerPoint?: number;
    equippedSkillIds?: string[];
    equippedItemIds?: string[];
}): NegamonMonsterSnapshot {
    const rankIndex = normalizeNegamonRankIndex(input.monster.rankIndex);
    const progress = calculateNegamonExpProgress({
        points: input.points ?? 0,
        rankIndex,
        expPerPoint: input.expPerPoint,
    });
    const resolvedBaseStats = input.speciesBaseStats ?? input.species.baseStats;
    const resolvedBattleStats = calculateNegamonStatsForLevel(
        input.species.baseStats,
        progress.level,
        input.species.battleRole
    );
    const energyProfile = getEnergyProfileForSpecies(input.monster.speciesId);
    const elementTypes = getNegamonElementTypes(input.monster);
    const basicMove = buildBasicAttackMove();
    const unlockedSkillCatalog = getUnlockedNegamonSkillDefinitions({
        species: input.species,
        rankIndex,
        level: progress.level,
        includeBasic: true,
        disabledSkillIds: input.disabledSkillIds,
    });
    const fullSkillCatalog = getNegamonSpeciesSkillCatalog(input.species, { includeBasic: true });
    const skillCatalog = unlockedSkillCatalog.length > 0
        ? unlockedSkillCatalog
        : [createNegamonSkillDefinition(basicMove, input.monster.speciesId)];
    const nextSkill = fullSkillCatalog.find(
        (skill) =>
            skill.id !== basicMove.id &&
            (skill.unlock.level ?? 1) > progress.level
    );
    const loadout = validateNegamonSkillLoadout({
        requestedSkillIds: input.equippedSkillIds,
        unlockedSkills: skillCatalog,
        fallbackToFirstSkills: !input.equippedSkillIds || input.equippedSkillIds.length === 0,
    });
    const unlockedMoves = skillCatalog
        .map((skill) => skill.sourceMove)
        .filter((move) => move.id !== basicMove.id);
    const gameSnapshot = createGameMonsterSnapshot({
        studentId: input.studentId,
        speciesId: input.monster.speciesId,
        speciesName: input.monster.speciesName,
        formName: input.monster.form.name,
        rankIndex,
        level: progress.level,
        types: elementTypes,
        stats: resolvedBattleStats,
        unlockedMoves,
    });
    const trait = createNegamonTraitSnapshot(input.monster.ability);
    const evolution = createNegamonEvolutionSnapshot({
        species: input.species,
        rankIndex,
        level: progress.level,
        currentFormName: input.monster.form.name,
    });
    const formBand = getNegamonFormLevelBand(progress.formIndex);

    return {
        ...gameSnapshot,
        monsterId: `${input.studentId}:${input.monster.speciesId}`,
        speciesName: input.monster.speciesName,
        displayName: input.studentName?.trim() || input.monster.form.name,
        formIcon: input.monster.form.icon,
        formColor: input.monster.form.color,
        elementTypes,
        exp: progress.exp,
        expToNextLevel: progress.expToNextLevel,
        evolutionStage: progress.evolutionStage,
        baseStats: resolvedBaseStats,
        derivedStats: {
            maxHp: resolvedBattleStats.hp,
            atk: resolvedBattleStats.atk,
            def: resolvedBattleStats.def,
            spd: resolvedBattleStats.spd,
            spa: resolvedBattleStats.spa ?? resolvedBattleStats.atk,
            maxEnergy: energyProfile.maxEnergy,
            energyRegen: energyProfile.regenPerTurn,
        },
        ability: input.monster.ability,
        abilityId: input.monster.ability?.id,
        trait,
        traitId: trait?.id,
        formBand: {
            levelMin: formBand.levelMin,
            levelMax: formBand.levelMax,
        },
        evolution,
        nextSkillUnlock: nextSkill
            ? {
                  id: nextSkill.id,
                  name: nextSkill.name,
                  level: nextSkill.unlock.level ?? 1,
                  rankIndex: nextSkill.unlock.rankIndex ?? 0,
              }
            : null,
        unlockedSkillIds: skillCatalog.map((skill) => skill.id),
        equippedSkillIds: loadout.normalizedSkillIds,
        equippedItemIds: input.equippedItemIds ?? [],
        skillCatalog,
        unlockedMoves,
    };
}

export function createNegamonMonsterSnapshot(input: CreateNegamonMonsterSnapshotInput): NegamonMonsterSnapshot | null {
    const speciesCatalog = getCanonicalNegamonSpeciesCatalog(input.negamonSettings.species);
    const speciesId = resolveCanonicalNegamonAssignment({
        rawSpeciesId: input.negamonSettings.studentMonsters?.[input.studentId],
        allowStudentChoice: input.negamonSettings.allowStudentChoice,
        speciesCatalog,
    });
    const species = findNegamonSpeciesById(speciesId, speciesCatalog);
    if (!species) return null;

    const rankIndex = getNegamonRankIndex(input.points, input.levelConfig);
    const monster = createStudentMonsterStateFromSpecies({
        species,
        rankIndex,
        disabledMoves: input.negamonSettings.disabledMoves,
    });

    return createNegamonMonsterSnapshotFromState({
        studentId: input.studentId,
        studentName: input.studentName,
        monster,
        species,
        speciesBaseStats: species.baseStats,
        disabledSkillIds: input.negamonSettings.disabledMoves,
        points: input.points,
        expPerPoint: input.negamonSettings.expPerPoint,
        equippedSkillIds: input.equippedSkillIds,
        equippedItemIds: input.equippedItemIds,
    });
}
