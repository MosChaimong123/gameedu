import {
    calculateFormulaDamage,
    createNeutralStatStages,
    getCriticalChancePercent,
    getEffectiveAccuracy,
    rollDamageBand,
    rollPercent,
    type NegamonDeterministicRng,
} from "../rules";
import type { NegamonSkillDefinition, NegamonSkillEffect } from "../skills";
import { applyRuntimeHooks } from "./hook-framework";
import {
    applyRuntimeShieldReduction,
    applyRuntimeStatus,
    applyRuntimeVolatile,
    getRuntimeAccuracyBonusMultiplier,
    resolveRuntimeTurnEndStatuses,
    resolveRuntimeTurnStartStatuses,
} from "./status-runtime";
import type {
    NegamonRuntimeCombatant,
    NegamonRuntimeMoveResolution,
    NegamonRuntimeStatusId,
    NegamonRuntimeVolatileId,
} from "./runtime-types";

function cloneRuntimeCombatant(combatant: NegamonRuntimeCombatant): NegamonRuntimeCombatant {
    return {
        ...combatant,
        types: [...combatant.types],
        stats: { ...combatant.stats },
        statStages: { ...combatant.statStages },
        statusImmunities: [...(combatant.statusImmunities ?? [])],
        statuses: combatant.statuses.map((status) => ({ ...status, data: status.data ? { ...status.data } : undefined })),
        volatileStates: combatant.volatileStates.map((state) => ({ ...state, data: state.data ? { ...state.data } : undefined })),
    };
}

function mapStatusId(effect: NegamonSkillEffect): NegamonRuntimeStatusId | null {
    if (effect.kind !== "status" && effect.kind !== "self_status") return null;
    switch (effect.effect) {
        case "BURN":
        case "POISON":
        case "BADLY_POISON":
        case "PARALYZE":
        case "SLEEP":
            return effect.effect;
        case "FREEZE":
            return "STUN";
        default:
            return null;
    }
}

function mapVolatileId(effect: NegamonSkillEffect): NegamonRuntimeVolatileId | null {
    if (effect.kind !== "status" && effect.kind !== "self_status") return null;
    switch (effect.effect) {
        case "BOOST_DEF":
        case "BOOST_DEF_20":
            return "SHIELD";
        case "BOOST_ATK":
        case "BOOST_SPD":
            return "FOCUS";
        default:
            return null;
    }
}

function applySkillEffect(input: {
    actor: NegamonRuntimeCombatant;
    target: NegamonRuntimeCombatant;
    effect: NegamonSkillEffect;
    skill: NegamonSkillDefinition;
    rng: NegamonDeterministicRng;
}): { rng: NegamonDeterministicRng; applied: boolean; timeline: NegamonRuntimeMoveResolution["timeline"]; effectsApplied: string[]; healing: number } {
    const timeline: NegamonRuntimeMoveResolution["timeline"] = [];
    const effectsApplied: string[] = [];
    let healing = 0;

    if (input.effect.kind === "heal") {
        const amount = Math.max(1, Math.floor(input.actor.stats.maxHp * (input.effect.percent / 100)));
        input.actor.hp = Math.min(input.actor.stats.maxHp, input.actor.hp + amount);
        healing += amount;
        timeline.push({
            kind: "heal",
            actorSide: input.actor.side,
            targetSide: input.actor.side,
            moveId: input.skill.id,
            amount,
            message: `${input.actor.name} restored ${amount} HP.`,
        });
        effectsApplied.push("heal");
        return { rng: input.rng, applied: true, timeline, effectsApplied, healing };
    }

    if (input.effect.kind === "stat_stage") {
        const recipientTarget = input.effect.target ?? (input.effect.stages >= 0 ? "self" : "enemy");
        const recipient = recipientTarget === "self"
            ? input.actor
            : input.target;
        const previous = recipient.statStages[input.effect.stat] ?? 0;
        const next = Math.max(
            -6,
            Math.min(6, previous + input.effect.stages)
        );
        const appliedStages = next - previous;
        recipient.statStages[input.effect.stat] = next;
        if (appliedStages === 0) {
            return { rng: input.rng, applied: false, timeline, effectsApplied, healing };
        }
        if (input.effect.durationTurns != null && input.effect.durationTurns > 0) {
            const volatile = applyRuntimeVolatile({
                combatant: recipient,
                volatileId: "STAT_STAGE_MOD",
                durationTurns: input.effect.durationTurns,
                sourceMoveId: input.skill.id,
                data: {
                    stat: input.effect.stat,
                    appliedStages,
                },
            });
            timeline.push(...volatile.timeline);
        }
        timeline.push({
            kind: "stat_stage_changed",
            actorSide: input.actor.side,
            targetSide: recipient.side,
            moveId: input.skill.id,
            effectId: input.effect.stat,
            amount: appliedStages,
            message: `${recipient.name} ${input.effect.stat} stage changed by ${appliedStages}.`,
        });
        effectsApplied.push(`stage:${input.effect.stat}`);
        return { rng: input.rng, applied: true, timeline, effectsApplied, healing };
    }

    if (input.effect.kind === "energy_shift") {
        const recipient = (input.effect.target ?? "enemy") === "self" ? input.actor : input.target;
        const before = recipient.energy;
        recipient.energy = Math.max(0, Math.min(recipient.maxEnergy, recipient.energy + input.effect.amount));
        const appliedAmount = recipient.energy - before;
        if (appliedAmount !== 0) {
            timeline.push({
                kind: "heal",
                actorSide: input.actor.side,
                targetSide: recipient.side,
                moveId: input.skill.id,
                amount: appliedAmount,
                message:
                    appliedAmount > 0
                        ? `${recipient.name} restored ${appliedAmount} energy.`
                        : `${recipient.name} lost ${Math.abs(appliedAmount)} energy.`,
            });
            effectsApplied.push("energy");
        }
        if (input.effect.regenPenalty != null && input.effect.regenPenalty > 0) {
            const volatile = applyRuntimeVolatile({
                combatant: recipient,
                volatileId: "ENERGY_REGEN_DOWN",
                durationTurns: input.effect.durationTurns,
                sourceMoveId: input.skill.id,
                data: {
                    penalty: input.effect.regenPenalty,
                },
            });
            timeline.push(...volatile.timeline);
            effectsApplied.push("energy_regen_down");
        }
        return { rng: input.rng, applied: appliedAmount !== 0 || (input.effect.regenPenalty ?? 0) > 0, timeline, effectsApplied, healing };
    }

    const statusId = mapStatusId(input.effect);
    if (statusId) {
        const durationTurns = "durationTurns" in input.effect ? input.effect.durationTurns : undefined;
        const result = applyRuntimeStatus({
            combatant: input.effect.kind === "self_status" ? input.actor : input.target,
            statusId,
            chance: input.effect.kind === "status" ? input.effect.chance : 100,
            durationTurns,
            sourceMoveId: input.skill.id,
            data: {
                ...(("fullSkip" in input.effect && input.effect.fullSkip) ? { fullSkip: true } : {}),
                ...(("dotRate" in input.effect && typeof input.effect.dotRate === "number") ? { dotRate: input.effect.dotRate } : {}),
            },
            rng: input.rng,
        });
        if (result.applied) effectsApplied.push(`status:${statusId}`);
        return {
            rng: result.rng,
            applied: result.applied,
            timeline: result.timeline,
            effectsApplied,
            healing,
        };
    }

    const volatileId = mapVolatileId(input.effect);
    if (volatileId) {
        const recipient = input.effect.kind === "self_status" ? input.actor : input.target;
        const durationTurns = "durationTurns" in input.effect ? input.effect.durationTurns : undefined;
        const result = applyRuntimeVolatile({
            combatant: recipient,
            volatileId,
            durationTurns,
            sourceMoveId: input.skill.id,
        });
        if (result.applied) effectsApplied.push(`volatile:${volatileId}`);
        return { rng: input.rng, applied: result.applied, timeline: result.timeline, effectsApplied, healing };
    }

    return { rng: input.rng, applied: false, timeline, effectsApplied, healing };
}

export function resolveRuntimeSkill(input: {
    actor: NegamonRuntimeCombatant;
    target: NegamonRuntimeCombatant;
    skill: NegamonSkillDefinition;
    rng: NegamonDeterministicRng;
    processTurnEnd?: boolean;
}): { rng: NegamonDeterministicRng; resolution: NegamonRuntimeMoveResolution } {
    const actor = cloneRuntimeCombatant(input.actor);
    const target = cloneRuntimeCombatant(input.target);
    let rng = input.rng;
    const processTurnEnd = input.processTurnEnd ?? true;
    const timeline: NegamonRuntimeMoveResolution["timeline"] = [];
    const effectsApplied: string[] = [];

    const actorBattleStart = applyRuntimeHooks({ trigger: "battle_start", combatant: actor, rng });
    rng = actorBattleStart.rng;
    timeline.push(...actorBattleStart.timeline);
    const targetBattleStart = applyRuntimeHooks({ trigger: "battle_start", combatant: target, rng });
    rng = targetBattleStart.rng;
    timeline.push(...targetBattleStart.timeline);

    const start = resolveRuntimeTurnStartStatuses({ combatant: actor, rng });
    rng = start.rng;
    timeline.push(...start.timeline);
    if (start.skipTurn) {
        if (processTurnEnd) {
            timeline.push(...resolveRuntimeTurnEndStatuses({ combatant: actor }));
            timeline.push(...resolveRuntimeTurnEndStatuses({ combatant: target }));
        }
        return {
            rng,
            resolution: {
                actor,
                target,
                accepted: true,
                missed: false,
                critical: false,
                damage: 0,
                healing: 0,
                effectsApplied,
                timeline,
                skill: input.skill,
            },
        };
    }

    actor.energy = Math.max(0, actor.energy - input.skill.energyCost);
    timeline.push({
        kind: "move_used",
        actorSide: actor.side,
        targetSide: target.side,
        moveId: input.skill.id,
        message: `${actor.name} used ${input.skill.name}.`,
    });

    const effectiveAccuracy = getEffectiveAccuracy({
        baseAccuracy: input.skill.accuracy,
        accuracyStage: actor.statStages.accuracy,
        evasionStage: target.statStages.evasion,
        bonusMultiplier: getRuntimeAccuracyBonusMultiplier(actor) * (actor.accuracyBonusMultiplier ?? 1),
    });
    const beforeMoveHooks = applyRuntimeHooks({ trigger: "before_move", combatant: actor, attacker: target, rng });
    rng = beforeMoveHooks.rng;
    timeline.push(...beforeMoveHooks.timeline);
    const hitRoll = rollPercent(rng, effectiveAccuracy);
    rng = hitRoll.rng;
    const missed = !hitRoll.success;

    let critical = false;
    let damage = 0;
    let healing = 0;
    const drainEffect = input.skill.effects.find(
        (effect): effect is Extract<NegamonSkillEffect, { kind: "drain" }> => effect.kind === "drain"
    );

    if (!missed && input.skill.power > 0) {
        const critPercent = getCriticalChancePercent(
            input.skill.sourceMove.critBonus ? 1 : 0
        ) + (actor.critChanceBonusPercent ?? 0);
        const critRoll = rollPercent(rng, critPercent);
        rng = critRoll.rng;
        critical = critRoll.success;

        const damageBand = rollDamageBand(rng);
        rng = damageBand.rng;

        const damageResult = calculateFormulaDamage({
            actor: {
                level: actor.level,
                types: actor.types,
                stats: actor.stats,
                statStages: actor.statStages,
            },
            target: {
                level: target.level,
                types: target.types,
                stats: target.stats,
                statStages: target.statStages,
            },
            move: {
                id: input.skill.id,
                type: input.skill.elementType,
                category: input.skill.sourceMove.category === "SPECIAL" ? "SPECIAL" : input.skill.sourceMove.category === "PHYSICAL" ? "PHYSICAL" : "STATUS",
                power: input.skill.power,
                accuracy: input.skill.accuracy,
                priority: input.skill.priority,
            },
            critical,
            randomMultiplier: damageBand.multiplier,
            flatModifier: actor.outgoingDamageMultiplier ?? 1,
        });

        const passiveIncomingMultiplier = Number(target.hookFlags?.["system:incoming_damage_multiplier"] ?? 1);
        const incomingAdjustedDamage = Math.max(1, Math.floor(damageResult.damage * passiveIncomingMultiplier));
        const punishMultiplier =
            input.skill.effectFamily === "ANTI_SETUP_PUNISH" &&
            (
                Object.values(target.statStages).some((stage) => stage > 0) ||
                target.volatileStates.some((state) => state.id === "SHIELD" || state.id === "FOCUS")
            )
                ? 1.5
                : 1;
        const punishedDamage = Math.max(1, Math.floor(incomingAdjustedDamage * punishMultiplier));
        if (punishMultiplier > 1) {
            timeline.push({
                kind: "move_used",
                actorSide: actor.side,
                targetSide: target.side,
                moveId: input.skill.id,
                message: `${input.skill.name} punished the target's setup.`,
            });
        }
        const reduced = applyRuntimeShieldReduction({ combatant: target, damage: punishedDamage });
        damage = reduced.damage;
        target.hp = Math.max(0, target.hp - damage);
        timeline.push(...reduced.timeline);
        const onDamageHooks = applyRuntimeHooks({
            trigger: "on_damage_taken",
            combatant: target,
            attacker: actor,
            rng,
        });
        rng = onDamageHooks.rng;
        timeline.push(...onDamageHooks.timeline);
        timeline.push({
            kind: "damage",
            actorSide: actor.side,
            targetSide: target.side,
            moveId: input.skill.id,
            amount: damage,
            message: `${target.name} took ${damage} damage.`,
        });
        if (drainEffect && damage > 0) {
            const drained = Math.max(1, Math.floor(damage * (drainEffect.percent / 100)));
            const actualHealing = Math.min(actor.stats.maxHp - actor.hp, drained);
            if (actualHealing > 0) {
                actor.hp += actualHealing;
                healing += actualHealing;
                timeline.push({
                    kind: "heal",
                    actorSide: actor.side,
                    targetSide: actor.side,
                    moveId: input.skill.id,
                    amount: actualHealing,
                    message: `${actor.name} drained ${actualHealing} HP.`,
                });
                effectsApplied.push("drain");
            }
        }
    }

    if (missed) {
        timeline.push({
            kind: "move_used",
            actorSide: actor.side,
            targetSide: target.side,
            moveId: input.skill.id,
            message: `${actor.name} used ${input.skill.name}, but it missed.`,
        });
    } else {
        for (const effect of input.skill.effects) {
            if (effect.kind === "damage" || effect.kind === "energy_cost" || effect.kind === "critical_bonus" || effect.kind === "drain") {
                continue;
            }
            const applied = applySkillEffect({ actor, target, effect, skill: input.skill, rng });
            rng = applied.rng;
            healing += applied.healing;
            effectsApplied.push(...applied.effectsApplied);
            timeline.push(...applied.timeline);
        }
    }

    const afterMoveHooks = applyRuntimeHooks({ trigger: "after_move", combatant: actor, attacker: target, rng });
    rng = afterMoveHooks.rng;
    timeline.push(...afterMoveHooks.timeline);
    if (processTurnEnd) {
        const actorTurnEndHooks = applyRuntimeHooks({ trigger: "turn_end", combatant: actor, attacker: target, rng });
        rng = actorTurnEndHooks.rng;
        timeline.push(...actorTurnEndHooks.timeline);
        const targetTurnEndHooks = applyRuntimeHooks({ trigger: "turn_end", combatant: target, attacker: actor, rng });
        rng = targetTurnEndHooks.rng;
        timeline.push(...targetTurnEndHooks.timeline);
        timeline.push(...resolveRuntimeTurnEndStatuses({ combatant: actor }));
        timeline.push(...resolveRuntimeTurnEndStatuses({ combatant: target }));
    }

    return {
        rng,
        resolution: {
            actor,
            target,
            accepted: true,
            missed,
            critical,
            damage,
            healing,
            effectsApplied,
            timeline,
            skill: input.skill,
        },
    };
}

export function createNeutralRuntimeStatStages() {
    return createNeutralStatStages();
}
