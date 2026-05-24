import { describe, expect, it } from "vitest";
import {
    createBattleCombatantV3,
    createBattleStateV3,
    createNeutralRuntimeStatStages,
    createRuntimeCombatant,
    getNegamonBattleValidChoicesV3,
    resolveNegamonBattleTurnV3,
    validateNegamonBattleActionIntentV3,
    type NegamonSkillDefinition,
} from "@/lib/game-negamon";

function makeSkill(overrides: Partial<NegamonSkillDefinition> = {}): NegamonSkillDefinition {
    return {
        id: "test-strike",
        name: "Test Strike",
        description: "Simple strike",
        elementType: "FIRE",
        category: "attack",
        target: "enemy",
        power: 40,
        accuracy: 100,
        energyCost: 10,
        cooldownTurns: 0,
        priority: 0,
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
    abilityId?: ReturnType<typeof createRuntimeCombatant>["abilityId"];
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
            abilityId: input.abilityId,
        }),
        speciesId: input.name.toLowerCase(),
        speciesName: input.name,
        formName: input.name,
        rankIndex: 3,
        moveSkills: input.moveSkills,
    });
}

describe("Negamon V3 battle state engine", () => {
    it("rejects stale choice requests with current valid choices attached", () => {
        const player = makeBattleCombatant({
            id: "p1",
            side: "player",
            name: "Pyronox",
            moveSkills: [makeSkill()],
        });
        const opponent = makeBattleCombatant({
            id: "o1",
            side: "opponent",
            name: "Terranoir",
            moveSkills: [makeSkill({ id: "enemy-hit", sourceMove: { id: "enemy-hit", name: "Enemy Hit", type: "EARTH", category: "PHYSICAL", power: 30, accuracy: 100, learnRank: 1, energyCost: 8 } })],
        });
        const state = createBattleStateV3({ battleId: "battle-1", seed: 11, player, opponent });

        const result = validateNegamonBattleActionIntentV3(state, {
            battleId: state.battleId,
            choiceRequestId: "battle-1:old:request",
            stateVersion: state.stateVersion,
            side: "player",
            action: { kind: "move", moveSlot: 0, targetSlot: "opponent" },
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe("STALE_REQUEST");
            expect(result.validChoices[0]?.enabled).toBe(true);
        }
    });

    it("orders actions by priority and ends the battle when the target faints", () => {
        const player = makeBattleCombatant({
            id: "p1",
            side: "player",
            name: "Aerolisk",
            speed: 140,
            moveSkills: [
                makeSkill({
                    id: "priority-burst",
                    name: "Priority Burst",
                    power: 400,
                    priority: 1,
                    sourceMove: {
                        id: "priority-burst",
                        name: "Priority Burst",
                        type: "THUNDER",
                        category: "SPECIAL",
                        power: 400,
                        accuracy: 100,
                        learnRank: 1,
                        energyCost: 10,
                        priority: 1,
                    },
                }),
            ],
        });
        const opponent = makeBattleCombatant({
            id: "o1",
            side: "opponent",
            name: "Voltshade",
            hp: 1,
            speed: 220,
            moveSkills: [makeSkill({ id: "slow-hit", name: "Slow Hit", sourceMove: { id: "slow-hit", name: "Slow Hit", type: "DARK", category: "PHYSICAL", power: 40, accuracy: 100, learnRank: 1, energyCost: 10 } })],
        });
        const state = createBattleStateV3({ battleId: "battle-2", seed: 7, player, opponent });

        const result = resolveNegamonBattleTurnV3({
            state,
            playerAction: {
                battleId: state.battleId,
                choiceRequestId: state.choiceRequestId,
                stateVersion: state.stateVersion,
                side: "player",
                action: { kind: "move", moveSlot: 0, targetSlot: "opponent" },
            },
            opponentAction: {
                battleId: state.battleId,
                choiceRequestId: state.choiceRequestId,
                stateVersion: state.stateVersion,
                side: "opponent",
                action: { kind: "move", moveSlot: 0, targetSlot: "opponent" },
            },
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.state.phase).toBe("ended");
            expect(result.state.winner).toBe("player");
            expect(result.state.sides.opponent.fainted).toBe(true);
            const resolveEvents = result.state.events.filter((event) => event.phase === "action_resolve");
            expect(resolveEvents[0]?.kind).toBe("move_used");
            expect(result.state.events).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ kind: "combatant_fainted", targetSide: "opponent" }),
                    expect.objectContaining({ kind: "battle_ended", actorSide: "player" }),
                ])
            );
        }
    });

    it("returns updated valid choices with cooldown and energy rules after a full turn", () => {
        const cooldownSkill = makeSkill({
            id: "charged-surge",
            name: "Charged Surge",
            power: 45,
            cooldownTurns: 1,
            energyCost: 12,
            sourceMove: {
                id: "charged-surge",
                name: "Charged Surge",
                type: "THUNDER",
                category: "SPECIAL",
                power: 45,
                accuracy: 100,
                learnRank: 1,
                energyCost: 12,
            },
        });
        const player = makeBattleCombatant({
            id: "p1",
            side: "player",
            name: "Voltshade",
            moveSkills: [cooldownSkill],
        });
        const opponent = makeBattleCombatant({
            id: "o1",
            side: "opponent",
            name: "Lumilune",
            moveSkills: [makeSkill({ id: "support-tap", power: 10, sourceMove: { id: "support-tap", name: "Support Tap", type: "LIGHT", category: "SPECIAL", power: 10, accuracy: 100, learnRank: 1, energyCost: 6 } })],
        });
        const state = createBattleStateV3({ battleId: "battle-3", seed: 5, player, opponent });

        const result = resolveNegamonBattleTurnV3({
            state,
            playerAction: {
                battleId: state.battleId,
                choiceRequestId: state.choiceRequestId,
                stateVersion: state.stateVersion,
                side: "player",
                action: { kind: "move", moveSlot: 0, targetSlot: "opponent" },
            },
            opponentAction: {
                battleId: state.battleId,
                choiceRequestId: state.choiceRequestId,
                stateVersion: state.stateVersion,
                side: "opponent",
                action: { kind: "move", moveSlot: 0, targetSlot: "opponent" },
            },
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.state.phase).toBe("choosing");
            expect(result.state.turn).toBe(2);
            expect(result.state.stateVersion).toBe(2);
            expect(result.state.sides.player.moveSlots[0]?.pp).toBeLessThan(result.state.sides.player.moveSlots[0]?.maxPp ?? 99);
            const choices = getNegamonBattleValidChoicesV3(result.state, "player");
            expect(choices[0]).toMatchObject({
                enabled: false,
                reason: "ON_COOLDOWN",
            });
        }
    });
});
