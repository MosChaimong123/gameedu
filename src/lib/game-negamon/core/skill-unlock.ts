import { isNegamonBasicAttackMoveId } from "@/lib/negamon-basic-move";
import type { MonsterSpecies } from "@/lib/types/negamon";
import type { NegamonSkillDefinition } from "./skills";
import { getNegamonSpeciesSkillCatalog } from "./skills";
import { normalizeNegamonRankIndex } from "./monster-growth";

export const NEGAMON_SKILL_LOADOUT_MAX = 4;

export type NegamonSkillLoadoutValidation = {
    normalizedSkillIds: string[];
    rejectedSkillIds: string[];
    skills: NegamonSkillDefinition[];
};

export function getUnlockedNegamonSkillDefinitions(input: {
    species: MonsterSpecies;
    rankIndex: number;
    disabledSkillIds?: string[];
    includeBasic?: boolean;
}): NegamonSkillDefinition[] {
    const rankIndex = normalizeNegamonRankIndex(input.rankIndex);
    const disabled = new Set(input.disabledSkillIds ?? []);
    return getNegamonSpeciesSkillCatalog(input.species, { includeBasic: input.includeBasic }).filter((skill) => {
        if (disabled.has(skill.id)) return false;
        if (isNegamonBasicAttackMoveId(skill.id)) return true;
        return (skill.unlock.rankIndex ?? 0) <= rankIndex;
    });
}

export function validateNegamonSkillLoadout(input: {
    requestedSkillIds?: string[];
    unlockedSkills: NegamonSkillDefinition[];
    maxSlots?: number;
    fallbackToFirstSkills?: boolean;
}): NegamonSkillLoadoutValidation {
    const maxSlots = Math.max(1, Math.floor(input.maxSlots ?? NEGAMON_SKILL_LOADOUT_MAX));
    const unlockedById = new Map(input.unlockedSkills.map((skill) => [skill.id, skill]));
    const rejectedSkillIds: string[] = [];
    const normalizedSkillIds: string[] = [];
    const requested = input.requestedSkillIds ?? [];

    for (const rawId of requested) {
        const id = String(rawId).trim();
        if (!id || normalizedSkillIds.includes(id)) continue;
        if (!unlockedById.has(id)) {
            rejectedSkillIds.push(id);
            continue;
        }
        normalizedSkillIds.push(id);
        if (normalizedSkillIds.length >= maxSlots) break;
    }

    if (normalizedSkillIds.length === 0 && input.fallbackToFirstSkills !== false) {
        normalizedSkillIds.push(...input.unlockedSkills.slice(0, maxSlots).map((skill) => skill.id));
    }

    return {
        normalizedSkillIds,
        rejectedSkillIds,
        skills: normalizedSkillIds
            .map((id) => unlockedById.get(id))
            .filter((skill): skill is NegamonSkillDefinition => Boolean(skill)),
    };
}
