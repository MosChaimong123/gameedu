import type { GameItemEffect, GameRewardResult } from "@/lib/game-core";
import type { NegamonBattleEventV3, NegamonBattleEventV4, NegamonSkillDefinition } from "@/lib/game-negamon";

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

export function formatNegamonSkillRoleTag(roleTag: string | null | undefined, t: NegamonUiTranslateFn): string {
    if (!roleTag) return tr(t, "negamonSkillRole_unknown", undefined, "Skill");
    return tr(t, `negamonSkillRole_${roleTag}`, undefined, roleTag);
}

export function formatNegamonSkillTarget(target: string, t: NegamonUiTranslateFn): string {
    return tr(t, `negamonSkillTarget_${target}`, undefined, target);
}

export function formatNegamonSkillFamily(effectFamily: string, t: NegamonUiTranslateFn): string {
    return tr(t, `negamonSkillFamily_${effectFamily}`, undefined, effectFamily.replaceAll("_", " "));
}

export function formatNegamonSkillPriority(priority: number, t: NegamonUiTranslateFn): string | null {
    if (!priority) return null;
    return tr(t, "negamonSkillPriority", {
        value: priority > 0 ? `+${priority}` : priority,
    });
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
                const resolvedTarget = effect.target ?? (effect.stages > 0 ? "self" : "enemy");
                const targetKey =
                    resolvedTarget === "self"
                        ? "negamonSkillEffectTargetSelf"
                        : resolvedTarget === "allEnemies"
                          ? "negamonSkillEffectTargetAllEnemies"
                          : "negamonSkillEffectTargetEnemy";
                return tr(t, "negamonSkillEffectStatStage", {
                    target: tr(t, targetKey),
                    stat: effect.stat,
                    stages: `${sign}${effect.stages}`,
                });
            }
            if (effect.kind === "energy_shift") {
                const targetKey = effect.target === "self" ? "negamonSkillEffectTargetSelf" : "negamonSkillEffectTargetEnemy";
                return tr(t, "negamonSkillEffectEnergyShift", {
                    target: tr(t, targetKey),
                    amount: Math.abs(effect.amount),
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

type NegamonStatusTimelineEvent = {
    status: string;
    action: "applied" | "blocked" | "ticked" | "expired" | "skipped" | "shielded" | "cleansed";
    message: string;
    damage?: number;
    preventedDamage?: number;
};

type NegamonBattleEventWithStatusTimeline = {
    statusTimeline?: NegamonStatusTimelineEvent[];
    missed?: boolean;
    damage?: number;
    healing?: number;
    critical?: boolean;
    message: string;
};

function formatBattleStatusLabel(status: string): string {
    const normalized = status.trim().toUpperCase();
    const labels: Record<string, string> = {
        BURN: "ไหม้",
        PARALYZE: "อัมพาต",
        POISON: "พิษ",
        BADLY_POISON: "พิษสะสม",
        SLEEP: "หลับ",
        STUN: "มึนงง",
        SHIELD: "โล่",
        FOCUS: "โฟกัส",
    };
    return labels[normalized] ?? status;
}

export function formatNegamonStatusTimeline(event: NegamonStatusTimelineEvent): string {
    const statusLabel = formatBattleStatusLabel(event.status);
    if (event.action === "applied") return `${statusLabel} ติดสถานะ`;
    if (event.action === "blocked") return `${statusLabel} ถูกป้องกัน`;
    if (event.action === "ticked") return `${statusLabel} สร้างความเสียหาย ${event.damage ?? 0}`;
    if (event.action === "expired") return `${statusLabel} หมดผล`;
    if (event.action === "skipped") return `${statusLabel} ทำให้ใช้ท่าไม่ได้`;
    if (event.action === "shielded") return `โล่ลดความเสียหาย ${event.preventedDamage ?? 0}`;
    if (event.action === "cleansed") return `${statusLabel} ถูกล้างออก`;
    return event.message;
}

export function summarizeNegamonBattleEvent(
    event: NegamonBattleEventWithStatusTimeline | NegamonBattleEventV3 | NegamonBattleEventV4
): string {
    const statusLine = "statusTimeline" in event ? event.statusTimeline?.map(formatNegamonStatusTimeline).join(" / ") : null;
    if (statusLine) return statusLine;

    if ("missed" in event && event.missed) {
        const moveName = "moveName" in event ? event.moveName : undefined;
        return moveName ? `${moveName} — พลาดเป้า` : "ท่าพลาดเป้า";
    }

    if ("kind" in event && event.kind === "damage_applied" && "damage" in event && event.damage) {
        const v4 = event as NegamonBattleEventV4;
        const parts: string[] = [];
        if (v4.moveName) parts.push(v4.moveName);
        const dmgText = `${v4.damage} dmg${v4.critical ? " Crit!" : ""}`;
        parts.push(dmgText);
        if (v4.effectiveness === "effective") parts.push("(super effective!)");
        else if (v4.effectiveness === "resisted") parts.push("(not very effective)");
        else if (v4.effectiveness === "immune") parts.push("(immune)");
        if (v4.hpAfter !== undefined && v4.targetMaxHp !== undefined) {
            parts.push(`HP ${v4.hpAfter}/${v4.targetMaxHp}`);
        }
        return parts.join(" — ");
    }

    if ("damage" in event && event.damage) return `ความเสียหาย ${event.damage}${event.critical ? " / คริติคอล" : ""}`;
    if ("healing" in event && event.healing) {
        const moveName = "moveName" in event ? event.moveName : undefined;
        return moveName ? `${moveName} — ฟื้นฟู HP ${event.healing}` : `ฟื้นฟู HP ${event.healing}`;
    }
    return event.message;
}

export function summarizeNegamonReward(reward: GameRewardResult): string[] {
    const lines = [];
    if (reward.gold > 0) lines.push(`ทอง +${reward.gold}`);
    if (reward.exp > 0) lines.push(`EXP +${reward.exp}`);
    if (reward.grantedItemIds.length > 0) lines.push(`ไอเท็ม ${reward.grantedItemIds.length}`);
    if (reward.levelUps.length > 0) {
        const lastLevel = reward.levelUps[reward.levelUps.length - 1]?.toLevel;
        lines.push(lastLevel ? `เลเวล ${lastLevel}` : `เลเวลอัป ${reward.levelUps.length}`);
    }
    if (reward.unlockedSkillIds.length > 0) lines.push(`สกิลใหม่ ${reward.unlockedSkillIds.length}`);
    if (reward.blockedReason) lines.push(`รางวัลถูกพัก: ${reward.blockedReason}`);
    return lines;
}
