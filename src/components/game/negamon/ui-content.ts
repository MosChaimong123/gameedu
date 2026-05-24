import type { GameItemEffect, GameRewardResult } from "@/lib/game-core";
import type { NegamonBattleEventV3, NegamonSkillDefinition } from "@/lib/game-negamon";
import type { NegamonLiteBattleEvent, NegamonLiteStatusTimelineEvent } from "@/lib/negamon-lite";

export type NegamonUiTranslateFn = (
    key: string,
    params?: Record<string, string | number>
) => string;

function tr(
    t: NegamonUiTranslateFn,
    key: string,
    params?: Record<string, string | number>,
    fallback?: string
): string {
    const out = t(key, params);
    return out === key ? (fallback ?? key) : out;
}

export function formatNegamonSkillCategory(category: string, t: NegamonUiTranslateFn): string {
    const upper = category.toUpperCase();
    const moveKey = `monsterMoveCat_${upper}`;
    const moveOut = t(moveKey);
    if (moveOut !== moveKey) return moveOut;
    const catKey = `negamonSkillCat_${category.toLowerCase()}`;
    return tr(t, catKey, undefined, category);
}

export function formatNegamonElementType(type: string, t: NegamonUiTranslateFn): string {
    const key = `monsterType_${type}`;
    return tr(t, key, undefined, type);
}

export function formatNegamonSkillEffect(skill: NegamonSkillDefinition, t: NegamonUiTranslateFn): string {
    const parts = skill.effects
        .filter((effect) => effect.kind !== "energy_cost")
        .map((effect) => {
            if (effect.kind === "damage") {
                return tr(t, "negamonSkillEffectPower", { power: effect.power });
            }
            if (effect.kind === "heal") {
                return tr(t, "negamonSkillEffectHeal", { percent: effect.percent });
            }
            if (effect.kind === "status") {
                return tr(t, "negamonSkillEffectStatus", { effect: effect.effect, chance: effect.chance });
            }
            if (effect.kind === "self_status") {
                return tr(t, "negamonSkillEffectSelfStatus", { effect: effect.effect });
            }
            if (effect.kind === "stat_stage") {
                const sign = effect.stages > 0 ? "+" : "";
                const targetKey =
                    (effect.target ?? (effect.stages > 0 ? "self" : "enemy")) === "self"
                        ? "negamonSkillEffectTargetSelf"
                        : "negamonSkillEffectTargetEnemy";
                return tr(t, "negamonSkillEffectStatStage", {
                    target: tr(t, targetKey),
                    stat: effect.stat,
                    stages: `${sign}${effect.stages}`,
                });
            }
            if (effect.kind === "drain") {
                return tr(t, "negamonSkillEffectDrain", { percent: effect.percent });
            }
            if (effect.kind === "critical_bonus") {
                return tr(t, "negamonSkillEffectCrit", { percent: effect.percent });
            }
            return "";
        })
        .filter(Boolean);
    return parts.join(" / ") || skill.description;
}

export function formatNegamonSkillRequirement(skill: NegamonSkillDefinition, t: NegamonUiTranslateFn): string {
    const requirements = [];
    if (skill.unlock.level != null) {
        requirements.push(tr(t, "negamonSkillLevelReq", { level: skill.unlock.level }));
    }
    if (skill.unlock.rankIndex != null) {
        requirements.push(tr(t, "negamonSkillRankReq", { rank: skill.unlock.rankIndex + 1 }));
    }
    if (skill.unlock.itemId) {
        const itemKey = `shopItem_${skill.unlock.itemId}_name`;
        requirements.push(tr(t, itemKey, undefined, skill.unlock.itemId));
    }
    return requirements.length ? requirements.join(" / ") : tr(t, "negamonSkillStarter");
}

export function formatNegamonItemEffect(effect: GameItemEffect, t: NegamonUiTranslateFn): string {
    if (effect.kind === "stat_boost") {
        return tr(t, "negamonItemEffectStatBoost", {
            stat: effect.stat.toUpperCase(),
            multiplier: effect.multiplier,
        });
    }
    if (effect.kind === "status_immunity") {
        return tr(t, "negamonItemEffectImmune", { status: effect.status });
    }
    if (effect.kind === "gold_bonus") {
        return tr(t, "negamonItemEffectGoldBonus", { amount: effect.amount });
    }
    if (effect.kind === "gold_multiplier") {
        return tr(t, "negamonItemEffectGoldMult", { multiplier: effect.multiplier });
    }
    if (effect.kind === "exp_multiplier") {
        return tr(t, "negamonItemEffectExpMult", { multiplier: effect.multiplier });
    }
    if (effect.kind === "restore_hp") {
        return tr(t, "negamonItemEffectRestoreHp", { percent: effect.percent });
    }
    if (effect.kind === "restore_energy") {
        return tr(t, "negamonItemEffectRestoreEn", { amount: effect.amount });
    }
    if (effect.kind === "crit_bonus") {
        return tr(t, "negamonItemEffectCrit", { percent: effect.percent });
    }
    if (effect.kind === "damage_taken_multiplier") {
        return tr(t, "negamonItemEffectDamageTaken", { multiplier: effect.multiplier });
    }
    if (effect.kind === "energy_regen") {
        return tr(t, "negamonItemEffectEnRegen", { amount: effect.amount });
    }
    return tr(t, "negamonItemEffectUnlockSkill", { skillId: effect.skillId });
}

export function formatNegamonItemRarity(rarity: string, t: NegamonUiTranslateFn): string {
    const key = `negamonRarity_${rarity}`;
    return tr(t, key, undefined, rarity);
}

export function formatNegamonTraitTiming(appliesAt: string, t: NegamonUiTranslateFn): string {
    const timingKey = `negamonTraitTiming_${appliesAt}`;
    const timing = tr(t, timingKey, undefined, appliesAt.replaceAll("_", " "));
    return tr(t, "negamonTraitTimingLabel", { timing });
}

export function formatNegamonStatusTimeline(event: NegamonLiteStatusTimelineEvent): string {
    if (event.action === "applied") return `${event.status} applied`;
    if (event.action === "blocked") return `${event.status} blocked`;
    if (event.action === "ticked") return `${event.status} dealt ${event.damage ?? 0} damage`;
    if (event.action === "expired") return `${event.status} expired`;
    if (event.action === "skipped") return `${event.status} stopped the move`;
    if (event.action === "shielded") return `Shield reduced ${event.preventedDamage ?? 0} damage`;
    return event.message;
}

export function summarizeNegamonBattleEvent(event: NegamonLiteBattleEvent | NegamonBattleEventV3): string {
    const statusLine = "statusTimeline" in event ? event.statusTimeline?.map(formatNegamonStatusTimeline).join(" / ") : null;
    if (statusLine) return statusLine;
    if ("missed" in event && event.missed) return "Move missed";
    if ("damage" in event && event.damage) return `Damage ${event.damage}${event.critical ? " / critical" : ""}`;
    if ("healing" in event && event.healing) return `Healed ${event.healing} HP`;
    return event.message;
}

export function summarizeNegamonReward(reward: GameRewardResult): string[] {
    const lines = [];
    if (reward.gold > 0) lines.push(`Gold +${reward.gold}`);
    if (reward.exp > 0) lines.push(`EXP +${reward.exp}`);
    if (reward.grantedItemIds.length > 0) lines.push(`Items ${reward.grantedItemIds.length}`);
    if (reward.levelUps.length > 0) lines.push(`Level ups ${reward.levelUps.length}`);
    if (reward.unlockedSkillIds.length > 0) lines.push(`Skills ${reward.unlockedSkillIds.length}`);
    if (reward.blockedReason) lines.push(`Blocked: ${reward.blockedReason}`);
    return lines;
}
