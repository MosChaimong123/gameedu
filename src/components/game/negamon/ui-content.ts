import type { GameItemEffect, GameRewardResult } from "@/lib/game-core";
import type { NegamonSkillDefinition } from "@/lib/game-negamon";
import type { NegamonLiteBattleEvent, NegamonLiteStatusTimelineEvent } from "@/lib/negamon-lite";

export function formatNegamonSkillEffect(skill: NegamonSkillDefinition): string {
    const parts = skill.effects
        .filter((effect) => effect.kind !== "energy_cost")
        .map((effect) => {
            if (effect.kind === "damage") return `Power ${effect.power}`;
            if (effect.kind === "heal") return `Heal ${effect.percent}% HP`;
            if (effect.kind === "status") return `${effect.effect} ${effect.chance}%`;
            if (effect.kind === "self_status") return `Self ${effect.effect}`;
            if (effect.kind === "stat_stage") {
                const sign = effect.stages > 0 ? "+" : "";
                const target = (effect.target ?? (effect.stages > 0 ? "self" : "enemy")) === "self" ? "Self" : "Enemy";
                return `${target} ${effect.stat} ${sign}${effect.stages}`;
            }
            if (effect.kind === "drain") return `Drain ${effect.percent}%`;
            if (effect.kind === "critical_bonus") return `Crit +${effect.percent}%`;
            return "";
        })
        .filter(Boolean);
    return parts.join(" / ") || skill.description;
}

export function formatNegamonSkillRequirement(skill: NegamonSkillDefinition): string {
    const requirements = [];
    if (skill.unlock.level != null) requirements.push(`Level ${skill.unlock.level}`);
    if (skill.unlock.rankIndex != null) requirements.push(`Rank ${skill.unlock.rankIndex + 1}`);
    if (skill.unlock.itemId) requirements.push(`Item ${skill.unlock.itemId}`);
    return requirements.length ? requirements.join(" / ") : "Starter skill";
}

export function formatNegamonItemEffect(effect: GameItemEffect): string {
    if (effect.kind === "stat_boost") return `${effect.stat.toUpperCase()} x${effect.multiplier}`;
    if (effect.kind === "status_immunity") return `Immune ${effect.status}`;
    if (effect.kind === "gold_bonus") return `Gold +${effect.amount}`;
    if (effect.kind === "gold_multiplier") return `Gold x${effect.multiplier}`;
    if (effect.kind === "restore_hp") return `HP +${effect.percent}%`;
    if (effect.kind === "restore_energy") return `Energy +${effect.amount}`;
    return `Unlock ${effect.skillId}`;
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

export function summarizeNegamonBattleEvent(event: NegamonLiteBattleEvent): string {
    const statusLine = event.statusTimeline?.map(formatNegamonStatusTimeline).join(" / ");
    if (statusLine) return statusLine;
    if (event.missed) return "Move missed";
    if (event.damage) return `Damage ${event.damage}${event.critical ? " / critical" : ""}`;
    if (event.healing) return `Healed ${event.healing} HP`;
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
