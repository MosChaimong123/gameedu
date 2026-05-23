import type { GameMonsterSnapshot, GameSkillCategory, GameSkillSnapshot } from "./types";

export type GameMonsterSkillInput = {
    id: string;
    name: string;
    category: string;
    learnRank?: number;
    energyCost?: number;
    power?: number;
    effect?: string;
};

export type CreateGameMonsterSnapshotInput = {
    studentId: string;
    speciesId: string;
    speciesName: string;
    formName: string;
    rankIndex: number;
    types: Array<string | undefined | null>;
    stats: Record<string, number>;
    unlockedMoves: GameMonsterSkillInput[];
};

export function normalizeMonsterLevel(rankIndex: number): number {
    return Math.max(1, Math.floor(rankIndex) + 1);
}

export function normalizeMonsterTypes(types: Array<string | undefined | null>): string[] {
    return types
        .map((type) => type?.trim().toUpperCase())
        .filter((type): type is string => Boolean(type));
}

export function getGameSkillCategory(move: GameMonsterSkillInput): GameSkillCategory {
    if (move.category === "HEAL") return "heal";
    if (move.category === "PHYSICAL" || move.category === "SPECIAL") return "attack";
    if (move.effect?.startsWith("LOWER_")) return "debuff";
    if (move.effect?.startsWith("BOOST_")) return "buff";
    return move.power && move.power > 0 ? "attack" : "buff";
}

export function createGameSkillSnapshot(move: GameMonsterSkillInput): GameSkillSnapshot {
    return {
        id: move.id,
        name: move.name,
        category: getGameSkillCategory(move),
        level: Math.max(1, Math.floor(move.learnRank ?? 1)),
        unlocked: true,
        energyCost: move.energyCost,
    };
}

export function createGameMonsterSnapshot(input: CreateGameMonsterSnapshotInput): GameMonsterSnapshot {
    return {
        studentId: input.studentId,
        speciesId: input.speciesId,
        formName: input.formName,
        rankIndex: Math.max(0, Math.floor(input.rankIndex)),
        level: normalizeMonsterLevel(input.rankIndex),
        types: normalizeMonsterTypes(input.types),
        stats: { ...input.stats },
        skills: input.unlockedMoves.map(createGameSkillSnapshot),
    };
}
