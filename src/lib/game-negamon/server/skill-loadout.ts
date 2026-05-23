import type { NegamonMonsterSnapshot } from "@/lib/game-negamon/core/monster-snapshot";
import type { NegamonSkillDefinition } from "@/lib/game-negamon/core/skills";
import { validateNegamonSkillLoadout } from "@/lib/game-negamon/core/skill-unlock";

export type NegamonSkillLoadoutPlan = {
    skillIds: string[];
    rejectedSkillIds: string[];
    skills: NegamonSkillDefinition[];
};

export function createNegamonSkillLoadoutPlan(input: {
    monster: NegamonMonsterSnapshot;
    requestedSkillIds?: string[];
    maxSlots?: number;
}): NegamonSkillLoadoutPlan {
    const result = validateNegamonSkillLoadout({
        requestedSkillIds: input.requestedSkillIds ?? input.monster.equippedSkillIds,
        unlockedSkills: input.monster.skillCatalog,
        maxSlots: input.maxSlots,
    });

    return {
        skillIds: result.normalizedSkillIds,
        rejectedSkillIds: result.rejectedSkillIds,
        skills: result.skills,
    };
}
