import type { NegamonLiteEffectStat, NegamonLiteMoveEffect } from "@/lib/negamon-lite";
import type { NegamonSkillDefinition, NegamonSkillEffect } from "./skills";

export type NegamonBattleStatusEffect = NegamonSkillEffect;

const STATUS_TO_LITE_STAT: Partial<Record<string, NegamonLiteEffectStat>> = {
    BOOST_ATK: "attack",
    BOOST_DEF: "defense",
    BOOST_DEF_20: "defense",
    BOOST_SPD: "speed",
    BOOST_SPD_30: "speed",
    BOOST_SPD_100: "speed",
    LOWER_ATK: "attack",
    LOWER_ATK_ALL: "attack",
    LOWER_DEF: "defense",
    LOWER_SPD: "speed",
};

export function mapNegamonSkillEffectToLiteEffect(
    effect: NegamonSkillEffect
): NegamonLiteMoveEffect | undefined {
    if (effect.kind === "heal") {
        return { kind: "heal", percent: effect.percent };
    }
    if (effect.kind !== "status" && effect.kind !== "self_status") return undefined;

    const stat = STATUS_TO_LITE_STAT[effect.effect];
    if (!stat) return undefined;
    const stages = effect.effect.startsWith("BOOST_") ? 1 : -1;
    return stages > 0
        ? { kind: "buff", stat, stages }
        : { kind: "debuff", stat, stages: Math.abs(stages) };
}

export function getPrimaryLiteEffectForSkill(
    skill: NegamonSkillDefinition
): NegamonLiteMoveEffect | undefined {
    for (const effect of skill.effects) {
        const liteEffect = mapNegamonSkillEffectToLiteEffect(effect);
        if (liteEffect) return liteEffect;
    }
    return undefined;
}
