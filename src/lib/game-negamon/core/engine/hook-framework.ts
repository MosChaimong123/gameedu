import { findNegamonBattleItemDefinition } from "../battle-items";
import type { PassiveAbilityId } from "@/lib/types/negamon";
import type { GameItemEffect } from "@/lib/game-core";
import { rollPercent, type NegamonDeterministicRng } from "../rules";
import { applyRuntimeStatus, getRuntimeEnergyRegenPenalty } from "./status-runtime";
import type {
    NegamonRuntimeCombatant,
    NegamonRuntimeStatusId,
    NegamonRuntimeTimelineEvent,
} from "./runtime-types";

export type NegamonRuntimeHookTrigger =
    | "battle_start"
    | "before_move"
    | "after_move"
    | "on_damage_taken"
    | "turn_end";

export type NegamonRuntimeHookEffect =
    | { kind: "stat_multiplier"; stat: "attack" | "defense" | "speed"; multiplier: number }
    | { kind: "energy_regen"; amount: number }
    | { kind: "critical_bonus"; percent: number }
    | { kind: "status_immunity"; statusId: NegamonRuntimeStatusId }
    | { kind: "reward_bonus"; goldFlat?: number; goldMultiplier?: number; expMultiplier?: number }
    | { kind: "heal_percent"; percentOfMaxHp: number; onceWhenHpAtOrBelow?: number; flagId?: string }
    | { kind: "damage_multiplier"; multiplier: number; when: "always" | "low_hp" }
    | { kind: "incoming_damage_multiplier"; multiplier: number }
    | { kind: "apply_status_to_attacker"; statusId: NegamonRuntimeStatusId; chance: number };

export type NegamonRuntimeHook = {
    trigger: NegamonRuntimeHookTrigger;
    effect: NegamonRuntimeHookEffect;
};

export type NegamonRuntimeAbilityDefinition = {
    id: PassiveAbilityId;
    hooks: NegamonRuntimeHook[];
};

function mapItemStatus(status: string): NegamonRuntimeStatusId | null {
    const normalized = status.trim().toUpperCase();
    if (normalized === "FREEZE") return "STUN";
    if (normalized === "BURN" || normalized === "POISON" || normalized === "BADLY_POISON" || normalized === "PARALYZE" || normalized === "SLEEP" || normalized === "STUN") {
        return normalized;
    }
    return null;
}

function mapGameItemEffectToHooks(effect: GameItemEffect): NegamonRuntimeHook[] {
    if (effect.kind === "stat_boost") {
        const stat = effect.stat === "atk" ? "attack" : effect.stat === "def" ? "defense" : "speed";
        return [{ trigger: "battle_start", effect: { kind: "stat_multiplier", stat, multiplier: effect.multiplier } }];
    }
    if (effect.kind === "status_immunity") {
        const statusId = mapItemStatus(effect.status);
        if (!statusId) return [];
        const statusIds =
            statusId === "POISON"
                ? (["POISON", "BADLY_POISON"] as NegamonRuntimeStatusId[])
                : [statusId];
        return statusIds.map((mappedStatusId) => ({
            trigger: "battle_start",
            effect: { kind: "status_immunity", statusId: mappedStatusId },
        }));
    }
    if (effect.kind === "gold_bonus") {
        return [{ trigger: "battle_start", effect: { kind: "reward_bonus", goldFlat: effect.amount } }];
    }
    if (effect.kind === "gold_multiplier") {
        return [{ trigger: "battle_start", effect: { kind: "reward_bonus", goldMultiplier: effect.multiplier } }];
    }
    if (effect.kind === "exp_multiplier") {
        return [{ trigger: "battle_start", effect: { kind: "reward_bonus", expMultiplier: effect.multiplier } }];
    }
    if (effect.kind === "restore_hp") {
        return [{ trigger: "after_move", effect: { kind: "heal_percent", percentOfMaxHp: effect.percent } }];
    }
    if (effect.kind === "restore_energy") {
        return [{ trigger: "after_move", effect: { kind: "energy_regen", amount: effect.amount } }];
    }
    if (effect.kind === "crit_bonus") {
        return [{ trigger: "before_move", effect: { kind: "critical_bonus", percent: effect.percent } }];
    }
    if (effect.kind === "damage_taken_multiplier") {
        return [{ trigger: "battle_start", effect: { kind: "incoming_damage_multiplier", multiplier: effect.multiplier } }];
    }
    if (effect.kind === "energy_regen") {
        return [{ trigger: "turn_end", effect: { kind: "energy_regen", amount: effect.amount } }];
    }
    return [];
}

export function getRuntimeAbilityDefinition(
    abilityId: PassiveAbilityId | undefined
): NegamonRuntimeAbilityDefinition | null {
    if (!abilityId) return null;

    const definitions: Record<PassiveAbilityId, NegamonRuntimeAbilityDefinition> = {
        acid_rain: {
            id: "acid_rain",
            hooks: [{ trigger: "turn_end", effect: { kind: "apply_status_to_attacker", statusId: "POISON", chance: 100 } }],
        },
        flame_body: {
            id: "flame_body",
            hooks: [{ trigger: "on_damage_taken", effect: { kind: "apply_status_to_attacker", statusId: "BURN", chance: 25 } }],
        },
        iron_shell: {
            id: "iron_shell",
            hooks: [{ trigger: "battle_start", effect: { kind: "stat_multiplier", stat: "defense", multiplier: 1.1 } }],
        },
        tailwind: {
            id: "tailwind",
            hooks: [{ trigger: "battle_start", effect: { kind: "stat_multiplier", stat: "speed", multiplier: 1.1 } }],
        },
        rage_mode: {
            id: "rage_mode",
            hooks: [{ trigger: "before_move", effect: { kind: "damage_multiplier", multiplier: 1.25, when: "low_hp" } }],
        },
        aerial_strike: {
            id: "aerial_strike",
            hooks: [{ trigger: "before_move", effect: { kind: "critical_bonus", percent: 20 } }],
        },
        volt_flow: {
            id: "volt_flow",
            hooks: [{ trigger: "turn_end", effect: { kind: "energy_regen", amount: 15 } }],
        },
        guardian_scale: {
            id: "guardian_scale",
            hooks: [
                {
                    trigger: "turn_end",
                    effect: {
                        kind: "heal_percent",
                        percentOfMaxHp: 15,
                        onceWhenHpAtOrBelow: 0.3,
                        flagId: "guardian_scale_once",
                    },
                },
            ],
        },
    };

    return definitions[abilityId] ?? null;
}

export function getRuntimeItemHooks(itemIds: string[]): NegamonRuntimeHook[] {
    return itemIds.flatMap((itemId) => {
        const definition = findNegamonBattleItemDefinition(itemId);
        if (!definition) return [];
        return definition.effects.flatMap(mapGameItemEffectToHooks);
    });
}

function collectHooks(combatant: NegamonRuntimeCombatant): NegamonRuntimeHook[] {
    return [
        ...(getRuntimeAbilityDefinition(combatant.abilityId)?.hooks ?? []),
        ...getRuntimeItemHooks(combatant.battleItemIds),
    ];
}

export function applyRuntimeHooks(input: {
    trigger: NegamonRuntimeHookTrigger;
    combatant: NegamonRuntimeCombatant;
    attacker?: NegamonRuntimeCombatant;
    rng: NegamonDeterministicRng;
}): { rng: NegamonDeterministicRng; timeline: NegamonRuntimeTimelineEvent[] } {
    let rng = input.rng;
    const timeline: NegamonRuntimeTimelineEvent[] = [];

    if (input.trigger === "battle_start") {
        const key = "system:battle_start_applied";
        if (input.combatant.hookFlags?.[key]) {
            return { rng, timeline };
        }
        input.combatant.hookFlags = { ...(input.combatant.hookFlags ?? {}), [key]: true };
    }

    for (const hook of collectHooks(input.combatant)) {
        if (hook.trigger !== input.trigger) continue;

        const effect = hook.effect;
        if (effect.kind === "stat_multiplier") {
            if (effect.stat === "attack") input.combatant.stats.attack = Math.max(1, Math.floor(input.combatant.stats.attack * effect.multiplier));
            if (effect.stat === "defense") input.combatant.stats.defense = Math.max(1, Math.floor(input.combatant.stats.defense * effect.multiplier));
            if (effect.stat === "speed") input.combatant.stats.speed = Math.max(1, Math.floor(input.combatant.stats.speed * effect.multiplier));
            timeline.push({
                kind: "stat_stage_changed",
                targetSide: input.combatant.side,
                amount: effect.multiplier,
                message: `${input.combatant.name} gained a ${effect.stat} multiplier.`,
            });
            continue;
        }
        if (effect.kind === "energy_regen") {
            const penalty = getRuntimeEnergyRegenPenalty(input.combatant);
            const restored = Math.max(0, effect.amount - penalty);
            input.combatant.energy = Math.min(input.combatant.maxEnergy, input.combatant.energy + restored);
            timeline.push({
                kind: "heal",
                targetSide: input.combatant.side,
                amount: restored,
                message:
                    penalty > 0
                        ? `${input.combatant.name} restored ${restored} energy after a ${penalty} energy drain penalty.`
                        : `${input.combatant.name} restored ${restored} energy.`,
            });
            continue;
        }
        if (effect.kind === "critical_bonus") {
            input.combatant.critChanceBonusPercent = (input.combatant.critChanceBonusPercent ?? 0) + effect.percent;
            continue;
        }
        if (effect.kind === "status_immunity") {
            input.combatant.statusImmunities = [...new Set([...(input.combatant.statusImmunities ?? []), effect.statusId])];
            continue;
        }
        if (effect.kind === "reward_bonus") {
            input.combatant.rewardGoldBonus = (input.combatant.rewardGoldBonus ?? 0) + (effect.goldFlat ?? 0);
            input.combatant.rewardGoldMultiplier = (input.combatant.rewardGoldMultiplier ?? 1) * (effect.goldMultiplier ?? 1);
            input.combatant.rewardExpMultiplier = (input.combatant.rewardExpMultiplier ?? 1) * (effect.expMultiplier ?? 1);
            continue;
        }
        if (effect.kind === "heal_percent") {
            if (
                effect.onceWhenHpAtOrBelow != null &&
                input.combatant.hp / Math.max(1, input.combatant.stats.maxHp) > effect.onceWhenHpAtOrBelow
            ) {
                continue;
            }
            if (effect.flagId && input.combatant.hookFlags?.[effect.flagId]) {
                continue;
            }
            const amount = Math.max(1, Math.floor(input.combatant.stats.maxHp * (effect.percentOfMaxHp / 100)));
            input.combatant.hp = Math.min(input.combatant.stats.maxHp, input.combatant.hp + amount);
            if (effect.flagId) {
                input.combatant.hookFlags = { ...(input.combatant.hookFlags ?? {}), [effect.flagId]: true };
            }
            timeline.push({
                kind: "heal",
                targetSide: input.combatant.side,
                amount,
                message: `${input.combatant.name} restored ${amount} HP.`,
            });
            continue;
        }
        if (effect.kind === "damage_multiplier") {
            const hpRatio = input.combatant.hp / Math.max(1, input.combatant.stats.maxHp);
            if (effect.when === "low_hp" && hpRatio >= 0.5) {
                continue;
            }
            input.combatant.outgoingDamageMultiplier = (input.combatant.outgoingDamageMultiplier ?? 1) * effect.multiplier;
            continue;
        }
        if (effect.kind === "incoming_damage_multiplier") {
            input.combatant.hookFlags = {
                ...(input.combatant.hookFlags ?? {}),
                "system:incoming_damage_multiplier": effect.multiplier,
            };
            continue;
        }
        if (effect.kind === "apply_status_to_attacker" && input.attacker) {
            const result = applyRuntimeStatus({
                combatant: input.attacker,
                statusId: effect.statusId,
                chance: effect.chance,
                rng,
            });
            rng = result.rng;
            timeline.push(...result.timeline);
        }
    }

    return { rng, timeline };
}
