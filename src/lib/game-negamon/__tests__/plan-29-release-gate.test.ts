import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import {
    calculateNegamonStatsForLevel,
    createNegamonSkillDefinition,
    getUnlockedNegamonSkillDefinitions,
} from "@/lib/game-negamon";

const speciesById = new Map(DEFAULT_NEGAMON_SPECIES.map((species) => [species.id, species]));

function requireSpecies(id: string) {
    const found = speciesById.get(id);
    if (!found) throw new Error(`Missing species ${id}`);
    return found;
}

function getMoveIdsAtLevel(speciesId: string, level: number) {
    const species = requireSpecies(speciesId);
    return getUnlockedNegamonSkillDefinitions({
        species,
        level,
        rankIndex: 5,
        includeBasic: false,
    }).map((skill) => skill.id);
}

describe("Plan 29 release gate", () => {
    it("keeps the six-species roster on the canonical unlock curve", () => {
        expect(DEFAULT_NEGAMON_SPECIES).toHaveLength(6);

        for (const species of DEFAULT_NEGAMON_SPECIES) {
            const moveIds = species.moves.map((move) => move.id);

            expect(moveIds).toHaveLength(3);
            expect(new Set(moveIds).size).toBe(moveIds.length);
            // Opener at Lv1, mid-game move at an intermediate level, finisher at Lv26
            expect(species.moves[0]).toMatchObject({ learnLevel: 1, roleTag: "opener", effectFamily: "STRIKE" });
            expect(species.moves[2]?.learnLevel).toBe(26);
            // Mid-game move unlocks between Lv1 and Lv26
            expect((species.moves[1]?.learnLevel ?? 0)).toBeGreaterThan(1);
            expect((species.moves[1]?.learnLevel ?? 0)).toBeLessThan(26);
            // At least one non-STRIKE move before the finisher
            expect(species.moves.slice(0, 2).some((move) =>
                move.effectFamily !== "STRIKE"
            )).toBe(true);
            // At Lv1: 1 move; at full level (≥26): all 3 moves
            expect(getMoveIdsAtLevel(species.id, 1).length).toBe(1);
            expect(getMoveIdsAtLevel(species.id, 26).length).toBe(3);
        }

        expect(getMoveIdsAtLevel("pyronox", 1)).toEqual(["pyronox-ember-fang"]);
        expect(getMoveIdsAtLevel("pyronox", 8)).toEqual(["pyronox-ember-fang", "pyronox-war-cry"]);
        expect(getMoveIdsAtLevel("pyronox", 26)).toEqual([
            "pyronox-ember-fang",
            "pyronox-war-cry",
            "pyronox-hell-dive",
        ]);
    });

    it("keeps every movepool on a distinct three-slot job table before and after the finisher unlock", () => {
        for (const species of DEFAULT_NEGAMON_SPECIES) {
            const skills = species.moves.map((move) => createNegamonSkillDefinition(move, species.id));
            const earlySkills = skills.filter((skill) => (skill.unlock.level ?? 1) <= 16);
            const jobSignatures = skills.map((skill) => `${skill.roleTag ?? "none"}:${skill.effectFamily}`);

            expect(new Set(skills.map((skill) => skill.effectFamily)).size).toBeGreaterThanOrEqual(2);
            expect(new Set(jobSignatures).size).toBe(skills.length);
            expect(earlySkills).toHaveLength(2);
            expect(skills.at(-1)?.unlock.level).toBe(26);
            expect(skills.at(-1)?.power).toBeGreaterThanOrEqual(36);
            expect(skills.at(-1)?.effectFamily).not.toBe(skills[0]?.effectFamily);
        }
    });

    it("preserves the approved role anchors in late-game stat growth", () => {
        const lateGame = Object.fromEntries(
            DEFAULT_NEGAMON_SPECIES.map((species) => [
                species.id,
                calculateNegamonStatsForLevel(species.baseStats, 60, species.battleRole),
            ])
        );
        const midGame = Object.fromEntries(
            DEFAULT_NEGAMON_SPECIES.map((species) => [
                species.id,
                calculateNegamonStatsForLevel(species.baseStats, 38, species.battleRole),
            ])
        );

        expect(lateGame.aerolisk.spd).toBeGreaterThan(lateGame.voltshade.spd);
        expect(lateGame.voltshade.spd).toBeGreaterThan(lateGame.pyronox.spd);
        expect(lateGame.pyronox.atk).toBeGreaterThan(lateGame.lumilune.atk);
        expect(lateGame.terranoir.hp).toBeGreaterThan(lateGame.pyronox.hp);
        expect(lateGame.terranoir.def).toBeGreaterThan(lateGame.aerolisk.def);
        expect(lateGame.tidemaw.hp).toBeGreaterThan(lateGame.voltshade.hp);
        expect(lateGame.tidemaw.atk).toBeGreaterThan(lateGame.terranoir.atk);

        expect(midGame.aerolisk.spd).toBeGreaterThan(midGame.pyronox.spd);
        expect(midGame.terranoir.hp).toBeGreaterThan(midGame.lumilune.hp);
        expect(midGame.tidemaw.def).toBeGreaterThan(midGame.pyronox.def);
    });

    it("keeps support and control movepools proactive inside the canonical unlock curve", () => {
        const lumilune = requireSpecies("lumilune");
        const voltshade = requireSpecies("voltshade");

        expect(lumilune.moves.some((move) => move.category === "HEAL")).toBe(true);
        expect(lumilune.moves.some((move) => move.effectFamily === "TEMPO_CONTROL")).toBe(true);
        expect(voltshade.moves.some((move) => move.effect === "PARALYZE")).toBe(true);
        expect(voltshade.moves.some((move) => move.effectFamily === "STRIKE_STATUS")).toBe(true);
        expect(lumilune.moves.at(-1)?.learnLevel).toBe(26);
        expect(voltshade.moves.at(-1)?.learnLevel).toBe(26);
    });
});
