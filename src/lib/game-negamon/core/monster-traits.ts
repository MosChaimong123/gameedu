import type { PassiveAbility, MonsterSpecies } from "@/lib/types/negamon";
import { normalizeNegamonRankIndex } from "./monster-growth";

export type NegamonTraitApplyTiming = "battle_start" | "turn_start" | "turn_end" | "reward_finalize";

export type NegamonMonsterTraitSnapshot = {
    id: string;
    name: string;
    description: string;
    sourceAbilityId?: PassiveAbility["id"];
    appliesAt: NegamonTraitApplyTiming;
};

export type NegamonEvolutionRequirement = {
    formRank: number;
    formName: string;
    requiredRankIndex: number;
    requiredLevel: number;
};

export type NegamonEvolutionProgressSnapshot = {
    currentFormRank: number;
    currentFormName: string;
    currentLevel: number;
    currentRankIndex: number;
    next: NegamonEvolutionRequirement | null;
    progressPercent: number;
    isMaxEvolution: boolean;
};

export type NegamonEvolutionUnlockSummary = {
    fromRankIndex: number;
    toRankIndex: number;
    formRank: number;
    formName?: string;
};

export function getNegamonTraitId(ability: PassiveAbility): string {
    return `trait_${ability.id}`;
}

export function getNegamonTraitApplyTiming(ability: PassiveAbility): NegamonTraitApplyTiming {
    return ability.id === "volt_flow" || ability.id === "acid_rain" ? "turn_end" : "battle_start";
}

export function createNegamonTraitSnapshot(
    ability: PassiveAbility | undefined
): NegamonMonsterTraitSnapshot | undefined {
    if (!ability) return undefined;
    return {
        id: getNegamonTraitId(ability),
        name: ability.name,
        description: ability.desc,
        sourceAbilityId: ability.id,
        appliesAt: getNegamonTraitApplyTiming(ability),
    };
}

export function createNegamonEvolutionRules(species: MonsterSpecies): NegamonEvolutionRequirement[] {
    return species.forms
        .map((form) => ({
            formRank: form.rank,
            formName: form.name,
            requiredRankIndex: form.rank,
            requiredLevel: form.rank + 1,
        }))
        .sort((a, b) => a.formRank - b.formRank);
}

export function createNegamonEvolutionSnapshot(input: {
    species?: MonsterSpecies;
    rankIndex: number;
    level: number;
    currentFormName: string;
}): NegamonEvolutionProgressSnapshot {
    const currentRankIndex = normalizeNegamonRankIndex(input.rankIndex);
    const currentLevel = Math.max(1, Math.floor(input.level));
    const currentRule = input.species
        ? createNegamonEvolutionRules(input.species)
              .filter((rule) => rule.requiredRankIndex <= currentRankIndex && rule.requiredLevel <= currentLevel)
              .at(-1)
        : undefined;
    const rules = input.species ? createNegamonEvolutionRules(input.species) : [];
    const next =
        rules.find(
            (rule) => rule.requiredRankIndex > currentRankIndex || rule.requiredLevel > currentLevel
        ) ?? null;
    const progressPercent = next
        ? Math.max(
              0,
              Math.min(
                  100,
                  Math.floor(
                      Math.min(currentRankIndex / Math.max(1, next.requiredRankIndex), currentLevel / next.requiredLevel) *
                          100
                  )
              )
          )
        : 100;

    return {
        currentFormRank: currentRule?.formRank ?? currentRankIndex,
        currentFormName: currentRule?.formName ?? input.currentFormName,
        currentLevel,
        currentRankIndex,
        next,
        progressPercent,
        isMaxEvolution: next === null,
    };
}

export function createNegamonEvolutionUnlocks(input: {
    fromRankIndex: number;
    toRankIndex: number;
    species?: MonsterSpecies;
}): NegamonEvolutionUnlockSummary[] {
    const fromRankIndex = normalizeNegamonRankIndex(input.fromRankIndex);
    const toRankIndex = normalizeNegamonRankIndex(input.toRankIndex);
    if (toRankIndex <= fromRankIndex) return [];

    const rules = input.species ? createNegamonEvolutionRules(input.species) : [];
    const unlocks: NegamonEvolutionUnlockSummary[] = [];
    for (let rank = fromRankIndex + 1; rank <= toRankIndex; rank += 1) {
        const rule = rules.find((candidate) => candidate.requiredRankIndex === rank);
        unlocks.push({
            fromRankIndex,
            toRankIndex,
            formRank: rank,
            formName: rule?.formName,
        });
    }
    return unlocks;
}
