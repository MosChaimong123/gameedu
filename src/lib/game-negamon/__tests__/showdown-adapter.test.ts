import { describe, expect, it } from "vitest";
import { createNegamonMonsterSnapshot } from "@/lib/game-negamon/core/monster-snapshot";
import { createNegamonShowdownBattleAdapter } from "@/lib/game-negamon/engine-showdown";
import { createDefaultNegamonSettings } from "@/lib/negamon-species";

function createSnapshot(studentId: string, speciesId: string, points: number) {
    const settings = createDefaultNegamonSettings();
    settings.enabled = true;
    settings.studentMonsters = { [studentId]: speciesId };

    const snapshot = createNegamonMonsterSnapshot({
        studentId,
        studentName: studentId,
        points,
        levelConfig: [
            { name: "Common", minScore: 0 },
            { name: "Rare", minScore: 10 },
            { name: "Epic", minScore: 20 },
        ],
        negamonSettings: settings,
    });

    if (!snapshot) {
        throw new Error(`Failed to create snapshot for ${studentId}`);
    }

    return snapshot;
}

describe("Negamon Showdown adapter runtime", () => {
    it("creates a V4 battle state from the real Pokemon Showdown runtime", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await adapter.createBattle({
            battleId: "battle-v4-1",
            seed: 7,
            player: createSnapshot("student-1", "naga", 18),
            opponent: createSnapshot("student-2", "garuda", 22),
        });

        expect(state.engineVersion).toBe("negamon_v4_showdown_adapter");
        expect(state.adapterKind).toBe("showdown");
        expect(state.phase).toBe("choosing");
        expect(state.choices.player.length).toBeGreaterThan(0);
        expect(state.choiceRequestId).toContain(":v4:");
        expect(state.events[0]?.kind).toBe("battle_started");
        expect(state.metadata.showdown.commandLog.length).toBeGreaterThanOrEqual(3);
    });

    it("resolves a runtime turn through Pokemon Showdown without legacy session shapes", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await adapter.createBattle({
            battleId: "battle-v4-2",
            seed: 11,
            player: createSnapshot("student-1", "singha", 26),
            opponent: createSnapshot("student-2", "mekkala", 26),
        });
        const choice = adapter.listChoices(state, "player")[0];
        const resolved = await adapter.resolveTurn({
            state,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: choice.moveId,
                moveSlot: choice.moveSlot,
                targetSide: choice.targetSide,
            },
        });

        expect(resolved.ok).toBe(true);
        expect(resolved.state.engineVersion).toBe("negamon_v4_showdown_adapter");
        expect(resolved.state.turn).toBe(2);
        expect(resolved.state.events.some((event) => event.kind === "move_resolved")).toBe(true);
        expect(resolved.state.metadata.showdown.commandLog.some((entry) => entry.message.startsWith("move "))).toBe(true);
    });
});
