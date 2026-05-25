import { applyCombatStatStages, calculateFormulaDamage } from "../rules";
import type {
    NegamonBattleActionIntentV3,
    NegamonBattleCombatantV3,
    NegamonBattleSideV3,
    NegamonBattleStateV3,
    NegamonBattleValidChoiceV3,
} from "../state";
import { getNegamonBattleValidChoicesV3 } from "./state-engine";

type ScoredChoice = {
    choice: NegamonBattleValidChoiceV3;
    score: number;
};

function getCombatant(state: NegamonBattleStateV3, side: NegamonBattleSideV3): NegamonBattleCombatantV3 {
    return side === "player" ? state.sides.player : state.sides.opponent;
}

function getOpponentSide(side: NegamonBattleSideV3): NegamonBattleSideV3 {
    return side === "player" ? "opponent" : "player";
}

function getMoveSlot(
    actor: NegamonBattleCombatantV3,
    choice: NegamonBattleValidChoiceV3
) {
    return actor.moveSlots[choice.moveSlot];
}

function getHpRatio(combatant: NegamonBattleCombatantV3): number {
    return combatant.hp / Math.max(1, combatant.stats.maxHp);
}

function getEffectiveSpeed(combatant: NegamonBattleCombatantV3): number {
    return applyCombatStatStages({
        stats: combatant.stats,
        statStages: combatant.statStages,
    }).speed;
}

function targetHasMeaningfulStatus(target: NegamonBattleCombatantV3): boolean {
    return target.statuses.some((status) =>
        ["BURN", "POISON", "BADLY_POISON", "PARALYZE", "SLEEP", "STUN"].includes(status.id)
    );
}

function actorHasBoostForRole(actor: NegamonBattleCombatantV3, slot: NegamonBattleCombatantV3["moveSlots"][number]): boolean {
    if (slot.skill.effectFamily === "SELF_BOOST") {
        return slot.skill.effects.some((effect) =>
            effect.kind === "stat_stage" &&
            effect.stages > 0 &&
            ((effect.stat === "attack" && actor.statStages.attack > 0) ||
                (effect.stat === "defense" && actor.statStages.defense > 0) ||
                (effect.stat === "speed" && actor.statStages.speed > 0))
        );
    }

    if (slot.skill.effectFamily === "SHIELD") {
        return actor.volatileStates.some((state) => state.id === "SHIELD");
    }

    return false;
}

function targetAlreadyControlled(actor: NegamonBattleCombatantV3, target: NegamonBattleCombatantV3, slot: NegamonBattleCombatantV3["moveSlots"][number]): boolean {
    if (slot.skill.effectFamily === "STRIKE_STATUS") {
        return targetHasMeaningfulStatus(target);
    }
    if (slot.skill.effectFamily === "TEMPO_CONTROL") {
        return target.statStages.speed < 0 || getEffectiveSpeed(actor) > getEffectiveSpeed(target);
    }
    if (slot.skill.effectFamily === "ENERGY_SHIFT") {
        return target.energy <= Math.max(0, Math.floor(target.maxEnergy * 0.2));
    }
    return false;
}

function getRecentMoveIds(state: NegamonBattleStateV3, side: NegamonBattleSideV3, limit = 2): string[] {
    return state.events
        .filter((event) => event.kind === "move_used" && event.actorSide === side && event.moveId)
        .slice(-limit)
        .map((event) => event.moveId as string);
}

function estimateDamageScore(input: {
    actor: NegamonBattleCombatantV3;
    target: NegamonBattleCombatantV3;
    choice: NegamonBattleValidChoiceV3;
}): number {
    const slot = getMoveSlot(input.actor, input.choice);
    if (!slot || slot.skill.power <= 0 || slot.targetSlot === "self") return 0;

    const preview = calculateFormulaDamage({
        actor: {
            level: input.actor.level,
            types: input.actor.types,
            stats: input.actor.stats,
            statStages: input.actor.statStages,
        },
        target: {
            level: input.target.level,
            types: input.target.types,
            stats: input.target.stats,
            statStages: input.target.statStages,
        },
        move: {
            id: slot.skill.id,
            type: slot.skill.elementType,
            category:
                slot.skill.sourceMove.category === "SPECIAL"
                    ? "SPECIAL"
                    : slot.skill.sourceMove.category === "PHYSICAL"
                      ? "PHYSICAL"
                      : "STATUS",
            power: slot.skill.power,
            accuracy: slot.skill.accuracy,
            priority: slot.skill.priority,
        },
        critical: false,
        randomMultiplier: 0.925,
        flatModifier: 1,
    });

    const damagePercent = preview.damage / Math.max(1, input.target.hp);
    let score = preview.damage + damagePercent * 80;
    if (preview.damage >= input.target.hp) {
        score += 120;
    }
    if (slot.skill.effectFamily === "FINISHER" && input.target.hp <= Math.max(1, Math.floor(input.target.stats.maxHp * 0.45))) {
        score += 36;
    }
    if (slot.skill.sourceMove.critBonus) {
        score += 8;
    }
    if (slot.skill.effectFamily === "PRIORITY_STRIKE" && slot.skill.priority > 0) {
        const actorSpeed = getEffectiveSpeed(input.actor);
        const targetSpeed = getEffectiveSpeed(input.target);
        score += actorSpeed <= targetSpeed ? 24 : 10;
        if (preview.damage >= input.target.hp) score += 30;
    }
    if (slot.skill.effectFamily === "STRIKE_DRAIN" && getHpRatio(input.actor) <= 0.55) {
        score += 26;
    }
    if (slot.skill.effectFamily === "ANTI_SETUP_PUNISH") {
        const targetIsBoosted = Object.values(input.target.statStages).some((stage) => stage > 0);
        const targetIsGuarded = input.target.volatileStates.some((state) => state.id === "SHIELD" || state.id === "FOCUS");
        score += targetIsBoosted || targetIsGuarded ? 70 : -8;
    }
    return score;
}

function estimateHealScore(actor: NegamonBattleCombatantV3, choice: NegamonBattleValidChoiceV3): number {
    const slot = getMoveSlot(actor, choice);
    const missingHpPercent = 1 - actor.hp / Math.max(1, actor.stats.maxHp);
    if (!slot || slot.targetSlot !== "self") return 0;
    if (slot.skill.category !== "heal" && slot.skill.sourceMove.effect !== "HEAL_25") return 0;

    let score = missingHpPercent * 130;
    if (actor.hp / Math.max(1, actor.stats.maxHp) <= 0.35) {
        score += 70;
    }
    if (actor.hp / Math.max(1, actor.stats.maxHp) >= 0.8) {
        score -= 40;
    }
    return score;
}

function estimateSustainScore(input: {
    actor: NegamonBattleCombatantV3;
    target: NegamonBattleCombatantV3;
    choice: NegamonBattleValidChoiceV3;
}): number {
    const slot = getMoveSlot(input.actor, input.choice);
    if (!slot) return 0;

    const hpRatio = getHpRatio(input.actor);
    if (slot.skill.effectFamily === "STRIKE_DRAIN") {
        let score = hpRatio <= 0.65 ? 34 : 8;
        if (hpRatio <= 0.4) score += 24;
        if (getHpRatio(input.target) <= 0.2) score -= 6;
        return score;
    }
    if (slot.skill.effectFamily === "SHIELD") {
        let score = hpRatio <= 0.6 ? 24 : 6;
        if (getEffectiveSpeed(input.actor) < getEffectiveSpeed(input.target)) score += 12;
        if (input.actor.volatileStates.some((state) => state.id === "SHIELD")) score -= 28;
        return score;
    }
    return 0;
}

function estimateSetupScore(input: {
    actor: NegamonBattleCombatantV3;
    target: NegamonBattleCombatantV3;
    state: NegamonBattleStateV3;
    side: NegamonBattleSideV3;
    choice: NegamonBattleValidChoiceV3;
}): number {
    const slot = getMoveSlot(input.actor, input.choice);
    if (!slot) return 0;
    const hpRatio = input.actor.hp / Math.max(1, input.actor.stats.maxHp);
    const targetHpRatio = input.target.hp / Math.max(1, input.target.stats.maxHp);
    const actorSpeed = getEffectiveSpeed(input.actor);
    const targetSpeed = getEffectiveSpeed(input.target);

    if (slot.skill.effectFamily === "SELF_BOOST" || slot.skill.effectFamily === "SHIELD") {
        let score = stateEarlyTurnBonus(input.state) + 22;
        if (hpRatio < 0.45) score -= 20;
        if (slot.skill.roleTag === "setup") score += 10;
        if (slot.skill.effectFamily === "SHIELD") score += actorSpeed < targetSpeed ? 18 : 8;
        if (slot.skill.effects.some((effect) => effect.kind === "stat_stage" && effect.stat === "attack")) score += 12;
        if (slot.skill.effects.some((effect) => effect.kind === "stat_stage" && effect.stat === "speed")) score += actorSpeed < targetSpeed ? 20 : 10;
        if (actorHasBoostForRole(input.actor, slot)) score -= 40;
        if (targetHpRatio <= 0.35) score -= 45;
        return score;
    }

    if (slot.skill.effectFamily === "STRIKE_DEBUFF" || slot.skill.effectFamily === "ENEMY_DEBUFF") {
        let score = stateEarlyTurnBonus(input.state) + 14;
        if (targetHpRatio <= 0.35) score -= 25;
        if (slot.skill.effects.some((effect) => effect.kind === "stat_stage" && effect.stat === "defense")) score += 16;
        if (slot.skill.effects.some((effect) => effect.kind === "stat_stage" && effect.stat === "attack")) score += 12;
        if (slot.skill.effects.some((effect) => effect.kind === "stat_stage" && effect.stat === "speed")) score += actorSpeed < targetSpeed ? 16 : 8;
        return score;
    }

    if (slot.skill.effectFamily === "STRIKE_STATUS" || slot.skill.effectFamily === "TEMPO_CONTROL" || slot.skill.effectFamily === "ENERGY_SHIFT") {
        let score = 28 + stateEarlyTurnBonus(input.state);
        if (targetAlreadyControlled(input.actor, input.target, slot)) score -= 38;
        if (slot.skill.effectFamily === "TEMPO_CONTROL" && actorSpeed < targetSpeed) score += 18;
        if (slot.skill.effectFamily === "ENERGY_SHIFT" && input.target.energy >= Math.floor(input.target.maxEnergy * 0.5)) score += 18;
        if (slot.skill.effectFamily === "STRIKE_STATUS" && !targetHasMeaningfulStatus(input.target)) score += 14;
        if (targetHpRatio <= 0.3) score -= 16;
        return score;
    }

    return 0;
}

function stateEarlyTurnBonus(state: NegamonBattleStateV3): number {
    return state.turn <= 2 ? 18 : state.turn <= 4 ? 8 : 0;
}

function estimateRepeatPenalty(input: {
    state: NegamonBattleStateV3;
    side: NegamonBattleSideV3;
    choice: NegamonBattleValidChoiceV3;
    actor: NegamonBattleCombatantV3;
}): number {
    const slot = getMoveSlot(input.actor, input.choice);
    if (!slot) return 0;
    const recent = getRecentMoveIds(input.state, input.side, 2);
    if (recent.length === 0) return 0;

    const repeatedOnce = recent[recent.length - 1] === slot.skillId;
    const repeatedTwice = repeatedOnce && recent.length >= 2 && recent[recent.length - 2] === slot.skillId;
    if (!repeatedOnce) return 0;

    if (slot.skill.power > 0) {
        return repeatedTwice ? 12 : 6;
    }
    return repeatedTwice ? 75 : 30;
}

function estimateEnergyPenalty(actor: NegamonBattleCombatantV3, choice: NegamonBattleValidChoiceV3): number {
    const slot = getMoveSlot(actor, choice);
    if (!slot) return 0;
    const remainingAfterUse = actor.energy - slot.skill.energyCost;
    let penalty = remainingAfterUse < 5 ? 18 : remainingAfterUse < 10 ? 10 : 0;
    if (slot.skill.effectFamily === "FINISHER" && getHpRatio(actor) > 0.65 && remainingAfterUse < 12) penalty += 8;
    return penalty;
}

export function scoreNegamonBattleChoiceV3(input: {
    state: NegamonBattleStateV3;
    side: NegamonBattleSideV3;
    choice: NegamonBattleValidChoiceV3;
}): number {
    if (!input.choice.enabled) return Number.NEGATIVE_INFINITY;

    const actor = getCombatant(input.state, input.side);
    const target = getCombatant(input.state, getOpponentSide(input.side));

    const damageScore = estimateDamageScore({ actor, target, choice: input.choice });
    const healScore = estimateHealScore(actor, input.choice);
    const sustainScore = estimateSustainScore({ actor, target, choice: input.choice });
    const setupScore = estimateSetupScore({
        actor,
        target,
        state: input.state,
        side: input.side,
        choice: input.choice,
    });
    const repeatPenalty = estimateRepeatPenalty({
        state: input.state,
        side: input.side,
        choice: input.choice,
        actor,
    });
    const energyPenalty = estimateEnergyPenalty(actor, input.choice);

    return damageScore + healScore + sustainScore + setupScore - repeatPenalty - energyPenalty;
}

export function chooseNegamonBattleAiActionV3(input: {
    state: NegamonBattleStateV3;
    side: NegamonBattleSideV3;
}): {
    action: NegamonBattleActionIntentV3;
    scoredChoices: ScoredChoice[];
} {
    const validChoices = getNegamonBattleValidChoicesV3(input.state, input.side).filter((choice) => choice.enabled);
    const scoredChoices = validChoices
        .map((choice) => ({
            choice,
            score: scoreNegamonBattleChoiceV3({
                state: input.state,
                side: input.side,
                choice,
            }),
        }))
        .sort((left, right) => right.score - left.score || left.choice.moveSlot - right.choice.moveSlot);

    const selected = scoredChoices[0]?.choice ?? getNegamonBattleValidChoicesV3(input.state, input.side)[0];
    if (!selected) {
        throw new Error(`NO_VALID_AI_ACTION:${input.side}`);
    }

    return {
        action: {
            battleId: input.state.battleId,
            choiceRequestId: input.state.choiceRequestId,
            stateVersion: input.state.stateVersion,
            side: input.side,
            action: {
                kind: "move",
                moveSlot: selected.moveSlot,
                targetSlot: selected.targetSlot,
            },
        },
        scoredChoices,
    };
}
