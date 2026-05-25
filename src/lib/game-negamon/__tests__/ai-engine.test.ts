import { describe, expect, it } from "vitest";
import {
    chooseNegamonBattleAiActionV3,
    createBattleCombatantV3,
    createBattleStateV3,
    createNeutralRuntimeStatStages,
    createRuntimeCombatant,
    scoreNegamonBattleChoiceV3,
    type NegamonSkillDefinition,
} from "@/lib/game-negamon";

function makeSkill(overrides: Partial<NegamonSkillDefinition> = {}): NegamonSkillDefinition {
    return {
        id: "test-strike",
        name: "Test Strike",
        description: "Test move",
        elementType: "FIRE",
        category: "attack",
        target: "enemy",
        power: 40,
        accuracy: 100,
        energyCost: 10,
        cooldownTurns: 0,
        priority: 0,
        effectFamily: "STRIKE",
        flags: [],
        roleTag: "opener",
        effects: [{ kind: "damage", power: 40 }, { kind: "energy_cost", value: 10 }],
        unlock: { rankIndex: 1, speciesId: "pyronox" },
        sourceMove: {
            id: "test-strike",
            name: "Test Strike",
            type: "FIRE",
            category: "PHYSICAL",
            power: 40,
            accuracy: 100,
            learnRank: 1,
            energyCost: 10,
        },
        ...overrides,
    };
}

function makeBattleCombatant(input: {
    id: string;
    side: "player" | "opponent";
    name: string;
    hp?: number;
    energy?: number;
    speed?: number;
    moveSkills: NegamonSkillDefinition[];
}) {
    return createBattleCombatantV3({
        runtime: createRuntimeCombatant({
            id: input.id,
            side: input.side,
            name: input.name,
            level: 6,
            types: ["FIRE"],
            stats: {
                maxHp: 300,
                attack: 180,
                defense: 110,
                specialAttack: 180,
                specialDefense: 110,
                speed: input.speed ?? 160,
            },
            statStages: createNeutralRuntimeStatStages(),
            hp: input.hp ?? 300,
            energy: input.energy ?? 40,
            maxEnergy: 40,
        }),
        speciesId: input.name.toLowerCase(),
        speciesName: input.name,
        formName: input.name,
        rankIndex: 3,
        moveSkills: input.moveSkills,
    });
}

describe("Negamon V3 AI engine", () => {
    it("prefers healing when low HP instead of a normal attack", () => {
        const heal = makeSkill({
            id: "soft-glow",
            name: "Tender Glow",
            category: "heal",
            target: "self",
            power: 0,
            effects: [{ kind: "heal", percent: 25 }, { kind: "energy_cost", value: 12 }],
            sourceMove: {
                id: "soft-glow",
                name: "Tender Glow",
                type: "LIGHT",
                category: "HEAL",
                power: 0,
                accuracy: 100,
                learnRank: 1,
                energyCost: 12,
            },
        });
        const attack = makeSkill();
        const player = makeBattleCombatant({ id: "p1", side: "player", name: "Pyronox", moveSkills: [attack] });
        const opponent = makeBattleCombatant({
            id: "o1",
            side: "opponent",
            name: "Lumilune",
            hp: 70,
            moveSkills: [heal, attack],
        });
        const state = createBattleStateV3({ battleId: "ai-1", seed: 1, player, opponent });

        const decision = chooseNegamonBattleAiActionV3({ state, side: "opponent" });
        expect(decision.action.action.moveSlot).toBe(0);
        expect(decision.scoredChoices[0]?.choice.moveId).toBe("soft-glow");
    });

    it("prefers a finishing blow when it can KO the target", () => {
        const finisher = makeSkill({
            id: "hell-dive",
            name: "Hellfall",
            power: 140,
            energyCost: 12,
            sourceMove: {
                id: "hell-dive",
                name: "Hellfall",
                type: "FIRE",
                category: "SPECIAL",
                power: 140,
                accuracy: 100,
                learnRank: 1,
                energyCost: 12,
            },
        });
        const debuff = makeSkill({
            id: "war-cry",
            name: "Predator Roar",
            power: 0,
            category: "buff",
            effects: [{ kind: "self_status", effect: "BOOST_ATK", durationTurns: 2 }, { kind: "energy_cost", value: 8 }],
            sourceMove: {
                id: "war-cry",
                name: "Predator Roar",
                type: "DARK",
                category: "STATUS",
                power: 0,
                accuracy: 100,
                learnRank: 1,
                energyCost: 8,
                effect: "BOOST_ATK",
            },
        });
        const player = makeBattleCombatant({ id: "p1", side: "player", name: "Voltshade", hp: 25, moveSkills: [makeSkill()] });
        const opponent = makeBattleCombatant({ id: "o1", side: "opponent", name: "Pyronox", moveSkills: [debuff, finisher] });
        const state = createBattleStateV3({ battleId: "ai-2", seed: 2, player, opponent });

        const decision = chooseNegamonBattleAiActionV3({ state, side: "opponent" });
        expect(decision.action.action.moveSlot).toBe(1);
        expect(decision.scoredChoices[0]?.choice.moveId).toBe("hell-dive");
    });

    it("penalizes repeating the same setup move and prefers an attack", () => {
        const setup = makeSkill({
            id: "tail-rush",
            name: "Jetstream",
            power: 0,
            category: "buff",
            effects: [{ kind: "self_status", effect: "BOOST_SPD", durationTurns: 2 }, { kind: "energy_cost", value: 8 }],
            sourceMove: {
                id: "tail-rush",
                name: "Jetstream",
                type: "WIND",
                category: "STATUS",
                power: 0,
                accuracy: 100,
                learnRank: 1,
                energyCost: 8,
                effect: "BOOST_SPD",
            },
        });
        const attack = makeSkill({
            id: "gale-cut",
            name: "Gale Peck",
            power: 55,
            sourceMove: {
                id: "gale-cut",
                name: "Gale Peck",
                type: "WIND",
                category: "PHYSICAL",
                power: 55,
                accuracy: 100,
                learnRank: 1,
                energyCost: 10,
            },
        });
        const player = makeBattleCombatant({ id: "p1", side: "player", name: "Terranoir", moveSkills: [makeSkill()] });
        const opponent = makeBattleCombatant({ id: "o1", side: "opponent", name: "Aerolisk", moveSkills: [setup, attack] });
        const state = createBattleStateV3({ battleId: "ai-3", seed: 3, player, opponent });
        state.events.push(
            {
                id: "e1",
                turn: 1,
                phase: "action_resolve",
                kind: "move_used",
                actorSide: "opponent",
                targetSide: "opponent",
                moveId: "tail-rush",
                message: "Aerolisk used Jetstream.",
            },
            {
                id: "e2",
                turn: 2,
                phase: "action_resolve",
                kind: "move_used",
                actorSide: "opponent",
                targetSide: "opponent",
                moveId: "tail-rush",
                message: "Aerolisk used Jetstream.",
            }
        );

        const choices = state.sides.opponent.moveSlots.map((slot, index) => ({
            moveSlot: index as 0 | 1 | 2 | 3,
            moveId: slot.skillId,
            label: slot.label,
            targetSlot: slot.targetSlot,
            enabled: true,
            cost: { pp: 1, energy: slot.skill.energyCost },
            priority: slot.skill.priority,
        }));

        const setupScore = scoreNegamonBattleChoiceV3({ state, side: "opponent", choice: choices[0]! });
        const attackScore = scoreNegamonBattleChoiceV3({ state, side: "opponent", choice: choices[1]! });
        const decision = chooseNegamonBattleAiActionV3({ state, side: "opponent" });

        expect(attackScore).toBeGreaterThan(setupScore);
        expect(decision.action.action.moveSlot).toBe(1);
    });

    it("treats priority damage as tempo when the actor is slower", () => {
        const priorityStrike = makeSkill({
            id: "scorch-rush",
            name: "Scorch Rush",
            power: 32,
            priority: 1,
            effectFamily: "PRIORITY_STRIKE",
            roleTag: "tempo",
            sourceMove: {
                id: "scorch-rush",
                name: "Scorch Rush",
                type: "FIRE",
                category: "PHYSICAL",
                power: 32,
                accuracy: 100,
                learnRank: 1,
                energyCost: 10,
                priority: 1,
            },
        });
        const heavyStrike = makeSkill({
            id: "heavy-burst",
            name: "Heavy Burst",
            power: 40,
            effectFamily: "STRIKE",
            roleTag: "punish",
            sourceMove: {
                id: "heavy-burst",
                name: "Heavy Burst",
                type: "FIRE",
                category: "PHYSICAL",
                power: 40,
                accuracy: 100,
                learnRank: 1,
                energyCost: 10,
            },
        });

        const player = makeBattleCombatant({ id: "p1", side: "player", name: "Aerolisk", hp: 45, speed: 220, moveSkills: [makeSkill()] });
        const opponent = makeBattleCombatant({ id: "o1", side: "opponent", name: "Pyronox", speed: 140, moveSkills: [heavyStrike, priorityStrike] });
        const state = createBattleStateV3({ battleId: "ai-4", seed: 4, player, opponent });

        const decision = chooseNegamonBattleAiActionV3({ state, side: "opponent" });
        expect(decision.action.action.moveSlot).toBe(1);
        expect(decision.scoredChoices[0]?.choice.moveId).toBe("scorch-rush");
    });

    it("prefers setup early when healthy and the target is still sturdy", () => {
        const setup = makeSkill({
            id: "predator-roar",
            name: "Predator Roar",
            power: 0,
            category: "buff",
            effectFamily: "SELF_BOOST",
            roleTag: "setup",
            target: "self",
            effects: [
                { kind: "stat_stage", stat: "attack", stages: 1, target: "self", durationTurns: 2 },
                { kind: "energy_cost", value: 8 },
            ],
            sourceMove: {
                id: "predator-roar",
                name: "Predator Roar",
                type: "DARK",
                category: "STATUS",
                power: 0,
                accuracy: 100,
                learnRank: 1,
                energyCost: 8,
                effect: "BOOST_ATK",
            },
        });
        const attack = makeSkill({
            id: "cinder-snap",
            name: "Cinder Snap",
            power: 30,
            effectFamily: "STRIKE",
            roleTag: "opener",
            sourceMove: {
                id: "cinder-snap",
                name: "Cinder Snap",
                type: "FIRE",
                category: "PHYSICAL",
                power: 30,
                accuracy: 100,
                learnRank: 1,
                energyCost: 8,
            },
        });
        const player = makeBattleCombatant({ id: "p1", side: "player", name: "Terranoir", hp: 300, moveSkills: [makeSkill()] });
        const opponent = makeBattleCombatant({ id: "o1", side: "opponent", name: "Pyronox", hp: 300, moveSkills: [setup, attack] });
        const state = createBattleStateV3({ battleId: "ai-5", seed: 5, player, opponent });

        const decision = chooseNegamonBattleAiActionV3({ state, side: "opponent" });
        expect(decision.action.action.moveSlot).toBe(0);
        expect(decision.scoredChoices[0]?.choice.moveId).toBe("predator-roar");
    });

    it("avoids wasting control into already-controlled targets and punishes boosted enemies", () => {
        const control = makeSkill({
            id: "night-tether",
            name: "Night Tether",
            power: 0,
            category: "debuff",
            effectFamily: "TEMPO_CONTROL",
            roleTag: "control",
            effects: [
                { kind: "stat_stage", stat: "speed", stages: -2, target: "enemy", durationTurns: 2 },
                { kind: "energy_cost", value: 10 },
            ],
            sourceMove: {
                id: "night-tether",
                name: "Night Tether",
                type: "DARK",
                category: "STATUS",
                power: 0,
                accuracy: 100,
                learnRank: 1,
                energyCost: 10,
                effect: "LOWER_SPD",
            },
        });
        const punish = makeSkill({
            id: "tomb-tax",
            name: "Tomb Tax",
            power: 36,
            effectFamily: "ANTI_SETUP_PUNISH",
            roleTag: "punish",
            effects: [
                { kind: "damage", power: 36 },
                { kind: "stat_stage", stat: "attack", stages: -1, target: "enemy", durationTurns: 2 },
                { kind: "energy_cost", value: 10 },
            ],
            sourceMove: {
                id: "tomb-tax",
                name: "Tomb Tax",
                type: "DARK",
                category: "SPECIAL",
                power: 36,
                accuracy: 100,
                learnRank: 1,
                energyCost: 10,
                effect: "LOWER_ATK_ALL",
            },
        });
        const player = makeBattleCombatant({ id: "p1", side: "player", name: "Aerolisk", speed: 180, moveSkills: [makeSkill()] });
        player.statStages.attack = 1;
        player.statStages.speed = 1;
        const opponent = makeBattleCombatant({ id: "o1", side: "opponent", name: "Terranoir", speed: 120, moveSkills: [control, punish] });
        const state = createBattleStateV3({ battleId: "ai-6", seed: 6, player, opponent });

        const choices = state.sides.opponent.moveSlots.map((slot, index) => ({
            moveSlot: index as 0 | 1 | 2 | 3,
            moveId: slot.skillId,
            label: slot.label,
            targetSlot: slot.targetSlot,
            enabled: true,
            cost: { pp: 1, energy: slot.skill.energyCost },
            priority: slot.skill.priority,
        }));

        const controlScore = scoreNegamonBattleChoiceV3({ state, side: "opponent", choice: choices[0]! });
        const punishScore = scoreNegamonBattleChoiceV3({ state, side: "opponent", choice: choices[1]! });
        const decision = chooseNegamonBattleAiActionV3({ state, side: "opponent" });

        expect(punishScore).toBeGreaterThan(controlScore);
        expect(decision.action.action.moveSlot).toBe(1);
    });
});
