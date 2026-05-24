import { createGameMonsterSnapshot } from "@/lib/game-core";
import type { GameMonsterSnapshot } from "@/lib/game-core";
import { buildBasicAttackMove } from "@/lib/negamon-basic-move";
import type { LevelConfigInput, RankEntry } from "@/lib/classroom-utils";
import type {
    MonsterMove,
    MonsterSpecies,
    MonsterStats,
    MonsterType,
    NegamonSettings,
    PassiveAbility,
    StudentMonsterState,
} from "@/lib/types/negamon";
import {
    NEGAMON_BASE_ENERGY,
    NEGAMON_BASE_ENERGY_REGEN,
    calculateNegamonExpProgress,
    calculateNegamonStats,
    normalizeNegamonRankIndex,
} from "./monster-growth";
import {
    createNegamonEvolutionSnapshot,
    createNegamonTraitSnapshot,
    type NegamonEvolutionProgressSnapshot,
    type NegamonMonsterTraitSnapshot,
} from "./monster-traits";
import { findNegamonSpeciesById } from "./species";
import type { NegamonSkillDefinition } from "./skills";
import { createNegamonSkillDefinition } from "./skills";
import { getUnlockedNegamonSkillDefinitions, validateNegamonSkillLoadout } from "./skill-unlock";

export type NegamonDerivedStats = {
    maxHp: number;
    atk: number;
    def: number;
    spd: number;
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
    abilityId?: string;
    trait?: NegamonMonsterTraitSnapshot;
    traitId?: string;
    evolution: NegamonEvolutionProgressSnapshot;
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
    disabledMoves: string[] = []
): MonsterMove[] {
    const normalizedRankIndex = normalizeNegamonRankIndex(rankIndex);
    if (normalizedRankIndex < 2) return [];
    const disabled = new Set(disabledMoves);
    const threshold = normalizedRankIndex + 1;
    return species.moves.filter((move) => move.learnRank <= threshold && !disabled.has(move.id));
}

export function createStudentMonsterStateFromSpecies(input: {
    species: MonsterSpecies;
    rankIndex: number;
    disabledMoves?: string[];
}): StudentMonsterState {
    const rankIndex = normalizeNegamonRankIndex(input.rankIndex);
    const form = input.species.forms[rankIndex] ?? input.species.forms[0];
    const stats = calculateNegamonStats(input.species.baseStats, rankIndex);
    const unlockedMoves = getNegamonUnlockedMoves(input.species, rankIndex, input.disabledMoves);

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
    species?: MonsterSpecies;
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
    const elementTypes = getNegamonElementTypes(input.monster);
    const basicMove = buildBasicAttackMove();
    const skillCatalog = input.species
        ? getUnlockedNegamonSkillDefinitions({
              species: input.species,
              rankIndex,
              includeBasic: true,
              disabledSkillIds: input.disabledSkillIds,
          })
        : [basicMove, ...input.monster.unlockedMoves].map((move) =>
              createNegamonSkillDefinition(move, input.monster.speciesId)
          );
    const fallbackSkillCatalog =
        skillCatalog.length > 0
            ? skillCatalog
            : [createNegamonSkillDefinition(basicMove, input.monster.speciesId)];
    const loadout = validateNegamonSkillLoadout({
        requestedSkillIds: input.equippedSkillIds,
        unlockedSkills: fallbackSkillCatalog,
    });
    const unlockedMoves = fallbackSkillCatalog
        .map((skill) => skill.sourceMove)
        .filter((move) => move.id !== basicMove.id);
    const gameSnapshot = createGameMonsterSnapshot({
        studentId: input.studentId,
        speciesId: input.monster.speciesId,
        speciesName: input.monster.speciesName,
        formName: input.monster.form.name,
        rankIndex,
        types: elementTypes,
        stats: input.monster.stats,
        unlockedMoves,
    });
    const trait = createNegamonTraitSnapshot(input.monster.ability);
    const evolution = createNegamonEvolutionSnapshot({
        species: input.species,
        rankIndex,
        level: progress.level,
        currentFormName: input.monster.form.name,
    });

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
        baseStats: input.speciesBaseStats ?? input.monster.stats,
        derivedStats: {
            maxHp: input.monster.stats.hp,
            atk: input.monster.stats.atk,
            def: input.monster.stats.def,
            spd: input.monster.stats.spd,
            maxEnergy: NEGAMON_BASE_ENERGY,
            energyRegen: NEGAMON_BASE_ENERGY_REGEN,
        },
        ability: input.monster.ability,
        abilityId: input.monster.ability?.id,
        trait,
        traitId: trait?.id,
        evolution,
        unlockedSkillIds: fallbackSkillCatalog.map((skill) => skill.id),
        equippedSkillIds: loadout.normalizedSkillIds,
        equippedItemIds: input.equippedItemIds ?? [],
        skillCatalog: fallbackSkillCatalog,
        unlockedMoves,
    };
}

export function createNegamonMonsterSnapshot(input: CreateNegamonMonsterSnapshotInput): NegamonMonsterSnapshot | null {
    const speciesId = input.negamonSettings.studentMonsters?.[input.studentId];
    const species = findNegamonSpeciesById(speciesId, input.negamonSettings.species);
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
