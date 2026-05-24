import { calculateFormulaDamage } from "../rules";
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
    const slot = input.actor.moveSlots[input.choice.moveSlot];
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
    if (slot.skill.sourceMove.critBonus) {
        score += 8;
    }
    return score;
}

function estimateHealScore(actor: NegamonBattleCombatantV3, choice: NegamonBattleValidChoiceV3): number {
    const slot = actor.moveSlots[choice.moveSlot];
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

function estimateSetupScore(input: {
    actor: NegamonBattleCombatantV3;
    target: NegamonBattleCombatantV3;
    state: NegamonBattleStateV3;
    side: NegamonBattleSideV3;
    choice: NegamonBattleValidChoiceV3;
}): number {
    const slot = input.actor.moveSlots[input.choice.moveSlot];
    if (!slot) return 0;
    const move = slot.skill.sourceMove;
    const hpRatio = input.actor.hp / Math.max(1, input.actor.stats.maxHp);
    const targetHpRatio = input.target.hp / Math.max(1, input.target.stats.maxHp);

    if (move.effect?.startsWith("BOOST_") || move.selfEffect?.startsWith("BOOST_")) {
        let score = stateEarlyTurnBonus(input.state) + 20;
        if (hpRatio < 0.45) score -= 20;
        if (move.effect?.includes("DEF") || move.selfEffect?.includes("DEF")) score += 8;
        if (move.effect?.includes("ATK") || move.selfEffect?.includes("ATK")) score += 10;
        if (move.effect?.includes("SPD") || move.selfEffect?.includes("SPD")) score += 12;
        if (move.effect?.includes("DEF") && input.actor.volatileStates.some((state) => state.id === "SHIELD")) score -= 35;
        if (move.effect?.includes("SPD") && input.actor.volatileStates.some((state) => state.id === "FOCUS")) score -= 35;
        if (targetHpRatio <= 0.35) score -= 45;
        return score;
    }

    if (move.effect?.startsWith("LOWER_")) {
        let score = stateEarlyTurnBonus(input.state) + 15;
        if (targetHpRatio <= 0.35) score -= 25;
        if (move.effect.includes("DEF")) score += 14;
        if (move.effect.includes("ATK")) score += 10;
        if (move.effect.includes("SPD")) score += 12;
        return score;
    }

    if (["BURN", "POISON", "BADLY_POISON", "PARALYZE", "SLEEP", "FREEZE"].includes(move.effect ?? "")) {
        const targetAlreadyStatused = input.target.statuses.length > 0;
        let score = targetAlreadyStatused ? -25 : 36;
        if (move.effect === "PARALYZE" || move.effect === "SLEEP") score += 8;
        if (targetHpRatio <= 0.3) score -= 15;
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
    const slot = input.actor.moveSlots[input.choice.moveSlot];
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
    const slot = actor.moveSlots[choice.moveSlot];
    if (!slot) return 0;
    const remainingAfterUse = actor.energy - slot.skill.energyCost;
    return remainingAfterUse < 10 ? 8 : remainingAfterUse < 5 ? 14 : 0;
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

    return damageScore + healScore + setupScore - repeatPenalty - energyPenalty;
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
