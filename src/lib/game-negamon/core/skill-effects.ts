import type {
    NegamonLiteMove,
    NegamonLiteMoveCategory,
    NegamonLiteEffectStat,
    NegamonLiteMoveEffect,
    NegamonLiteType,
} from "@/lib/negamon-lite";
import type { PassiveAbility } from "@/lib/types/negamon";
import type { NegamonMonsterSnapshot } from "./monster-snapshot";
import type { NegamonSkillDefinition, NegamonSkillEffect } from "./skills";
import { getPrimaryLiteEffectForSkill, mapNegamonSkillEffectToLiteEffect } from "./status-effects";

export type NegamonSkillRuntimeEffect =
    | { kind: "damage"; power: number }
    | { kind: "heal"; percent: number }
    | { kind: "buff"; stat: NegamonLiteEffectStat; stages: number; target: "self" | "opponent" }
    | { kind: "debuff"; stat: NegamonLiteEffectStat; stages: number; target: "self" | "opponent" }
    | { kind: "energy_cost"; value: number };

export type NegamonPassiveRuntimeEffect =
    | { kind: "stat_multiplier"; stat: "attack" | "defense" | "speed"; multiplier: number; traitId: string }
    | { kind: "energy_regen"; amount: number; traitId: string }
    | { kind: "critical_bonus"; percent: number; traitId: string };

function mapLiteMoveCategory(skill: NegamonSkillDefinition): NegamonLiteMoveCategory {
    if (skill.category === "heal" || skill.category === "status" || skill.category === "buff" || skill.category === "debuff") {
        return "STATUS";
    }
    return skill.sourceMove.category === "SPECIAL" ? "SPECIAL" : "PHYSICAL";
}

function mapStatStageEffect(effect: Extract<NegamonSkillEffect, { kind: "stat_stage" }>): NegamonLiteMoveEffect {
    const kind = effect.stages >= 0 ? "buff" : "debuff";
    return {
        kind,
        stat: effect.stat,
        stages: Math.abs(effect.stages),
    };
}

export function resolveNegamonSkillRuntimeEffects(skill: NegamonSkillDefinition): NegamonSkillRuntimeEffect[] {
    const effects: NegamonSkillRuntimeEffect[] = [];
    for (const effect of skill.effects) {
        if (effect.kind === "damage") {
            effects.push({ kind: "damage", power: effect.power });
            continue;
        }
        if (effect.kind === "heal") {
            effects.push({ kind: "heal", percent: effect.percent });
            continue;
        }
        if (effect.kind === "energy_cost") {
            effects.push({ kind: "energy_cost", value: effect.value });
            continue;
        }
        if (effect.kind === "stat_stage") {
            effects.push({
                kind: effect.stages >= 0 ? "buff" : "debuff",
                stat: effect.stat,
                stages: Math.abs(effect.stages),
                target: (effect.target ?? (effect.stages > 0 ? "self" : "enemy")) === "self" ? "self" : "opponent",
            });
            continue;
        }
        const liteEffect = mapNegamonSkillEffectToLiteEffect(effect);
        if (liteEffect?.kind === "heal") {
            effects.push({ kind: "heal", percent: liteEffect.percent });
        } else if (liteEffect?.kind === "buff") {
            effects.push({ kind: "buff", stat: liteEffect.stat, stages: liteEffect.stages, target: "self" });
        } else if (liteEffect?.kind === "debuff") {
            effects.push({ kind: "debuff", stat: liteEffect.stat, stages: liteEffect.stages, target: "opponent" });
        }
    }
    return effects;
}

export function getPrimaryLiteEffectForSkillRuntime(skill: NegamonSkillDefinition): NegamonLiteMoveEffect | undefined {
    const statStageEffect = skill.effects.find(
        (effect): effect is Extract<NegamonSkillEffect, { kind: "stat_stage" }> => effect.kind === "stat_stage"
    );
    if (statStageEffect) return mapStatStageEffect(statStageEffect);
    return getPrimaryLiteEffectForSkill(skill);
}

export function mapNegamonSkillToLiteMove(skill: NegamonSkillDefinition): NegamonLiteMove {
    return {
        id: skill.id,
        name: skill.name,
        type: skill.elementType as NegamonLiteType,
        category: mapLiteMoveCategory(skill),
        power: skill.power,
        accuracy: skill.accuracy,
        pp: 8,
        maxPp: 8,
        energyCost: skill.energyCost,
        priority: skill.priority,
        cooldownTurns: skill.cooldownTurns,
        target: skill.target === "self" ? "self" : "opponent",
        effect: getPrimaryLiteEffectForSkillRuntime(skill),
    };
}

export function resolveNegamonPassiveRuntimeEffects(
    ability: PassiveAbility | undefined
): NegamonPassiveRuntimeEffect[] {
    switch (ability?.id) {
        case "iron_shell":
            return [{ kind: "stat_multiplier", stat: "defense", multiplier: 1.1, traitId: "trait_iron_shell" }];
        case "tailwind":
            return [{ kind: "stat_multiplier", stat: "speed", multiplier: 1.1, traitId: "trait_tailwind" }];
        case "aerial_strike":
            return [{ kind: "critical_bonus", percent: 20, traitId: "trait_aerial_strike" }];
        case "volt_flow":
            return [{ kind: "energy_regen", amount: 15, traitId: "trait_volt_flow" }];
        default:
            return [];
    }
}

export function applyNegamonPassiveRuntimeEffects(monster: NegamonMonsterSnapshot) {
    const effects = resolveNegamonPassiveRuntimeEffects(monster.ability);
    const stats = { ...monster.derivedStats };
    let maxEnergy = stats.maxEnergy;
    const passiveTraitIds: string[] = [];

    for (const effect of effects) {
        passiveTraitIds.push(effect.traitId);
        if (effect.kind === "stat_multiplier") {
            if (effect.stat === "defense") stats.def = Math.max(1, Math.floor(stats.def * effect.multiplier));
            if (effect.stat === "attack") stats.atk = Math.max(1, Math.floor(stats.atk * effect.multiplier));
            if (effect.stat === "speed") stats.spd = Math.max(1, Math.floor(stats.spd * effect.multiplier));
        }
        if (effect.kind === "energy_regen") {
            maxEnergy += effect.amount;
        }
    }

    return {
        stats,
        maxEnergy,
        effects,
        passiveTraitIds,
    };
}
