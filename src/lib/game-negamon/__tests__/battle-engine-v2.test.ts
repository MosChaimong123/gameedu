import { describe, expect, it } from "vitest";
import { createNegamonLiteBattleState } from "@/lib/negamon-lite/session";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import {
    advanceNegamonBattleTurnWithoutMutation,
    createNegamonBattleReplaySummary,
    getNegamonBattleValidChoices,
    getNegamonEffectivenessLabel,
    getNegamonTypeMultiplier,
    previewNegamonBattleDamage,
    resolveNegamonBattleChoice,
} from "@/lib/game-negamon";

const levelConfig = [
    { name: "Common", minScore: 0 },
    { name: "Uncommon", minScore: 10 },
    { name: "Rare", minScore: 20 },
    { name: "Epic", minScore: 30 },
    { name: "Legendary", minScore: 40 },
    { name: "Mythic", minScore: 50 },
];

function makeState() {
    const state = createNegamonLiteBattleState({
        battleId: "battle-v2-1",
        classId: "class-1",
        challenger: { id: "student-1", name: "A", behaviorPoints: 50 },
        defender: { id: "student-2", name: "B", behaviorPoints: 50 },
        levelConfig,
        negamonSettings: {
            enabled: true,
            allowStudentChoice: true,
            expPerPoint: 10,
            expPerAttendance: 20,
            species: DEFAULT_NEGAMON_SPECIES,
            studentMonsters: {
                "student-1": "naga",
                "student-2": "garuda",
            },
        },
        nowMs: 1234,
    });
    if (!state) throw new Error("Expected battle state");
    return state;
}

describe("Negamon Battle Engine V2", () => {
    it("exposes type chart helpers through game-negamon core", () => {
        expect(getNegamonTypeMultiplier("WATER", ["FIRE"])).toBe(2);
        expect(getNegamonEffectivenessLabel(2)).toBe("effective");
        expect(getNegamonEffectivenessLabel(0.5)).toBe("resisted");
    });

    it("returns valid choices from V2 battle state", () => {
        const state = makeState();
        const choices = getNegamonBattleValidChoices(state, "player");

        expect(choices[0]).toMatchObject({
            kind: "move",
            moveId: "basic-attack",
            enabled: true,
        });
        expect(choices.map((choice) => choice.moveId)).toContain("naga-astral-surge");
    });

    it("previews damage and resolves choices without mutating input", () => {
        const state = makeState();
        const move = state.sides.player.moves.find((candidate) => candidate.id === "naga-astral-surge")!;
        const preview = previewNegamonBattleDamage({
            actor: state.sides.player,
            target: state.sides.opponent,
            move,
        });
        const resolved = advanceNegamonBattleTurnWithoutMutation({
            state,
            choice: { side: "player", kind: "move", moveId: move.id },
        });

        expect(preview.damage).toBeGreaterThan(0);
        expect(resolved.accepted).toBe(true);
        expect(resolved.state.events.some((event) => event.kind === "turn_resolved")).toBe(true);
        expect(state.turn).toBe(1);
        expect(state.events).toHaveLength(1);
    });

    it("creates replay summaries from battle state", () => {
        const state = makeState();
        const resolved = resolveNegamonBattleChoice(state, {
            side: "player",
            kind: "move",
            moveId: "basic-attack",
        });
        const summary = createNegamonBattleReplaySummary(resolved.state);

        expect(summary).toMatchObject({
            battleId: "battle-v2-1",
            status: "active",
            turn: 2,
            eventCount: 2,
        });
    });
});
