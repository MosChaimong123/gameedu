import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import {
    calculateNegamonStatsForLevel,
    createNegamonSkillDefinition,
    getUnlockedNegamonSkillDefinitions,
    simulateNegamonBalanceMatchup,
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
            const learnLevels = species.moves.map((move) => move.learnLevel);
            const moveIds = species.moves.map((move) => move.id);

            expect(moveIds).toHaveLength(5);
            expect(new Set(moveIds).size).toBe(moveIds.length);
            expect(learnLevels).toEqual([1, 4, 8, 16, 26]);
            expect(species.moves[0]).toMatchObject({ learnLevel: 1, roleTag: "opener", effectFamily: "STRIKE" });
            expect(species.moves[4]?.learnLevel).toBe(26);
            expect(species.moves.slice(0, 4).some((move) => move.power === 0 || move.category === "HEAL")).toBe(true);
            expect(species.moves.slice(0, 4).some((move) =>
                move.effectFamily !== "STRIKE" &&
                move.effectFamily !== "STRIKE_DEBUFF"
            )).toBe(true);
            expect([1, 4, 8, 16, 26].map((level) => getMoveIdsAtLevel(species.id, level).length)).toEqual([
                1,
                2,
                3,
                4,
                5,
            ]);
        }

        expect(getMoveIdsAtLevel("pyronox", 1)).toEqual(["pyronox-ember-fang"]);
        expect(getMoveIdsAtLevel("pyronox", 4)).toEqual(["pyronox-ember-fang", "pyronox-shadow-rend"]);
        expect(getMoveIdsAtLevel("pyronox", 8)).toEqual([
            "pyronox-ember-fang",
            "pyronox-shadow-rend",
            "pyronox-war-cry",
        ]);
        expect(getMoveIdsAtLevel("pyronox", 16)).toEqual([
            "pyronox-ember-fang",
            "pyronox-shadow-rend",
            "pyronox-war-cry",
            "pyronox-scorch-rush",
        ]);
    });

    it("keeps every movepool on a distinct five-slot job table before and after the finisher unlock", () => {
        for (const species of DEFAULT_NEGAMON_SPECIES) {
            const skills = species.moves.map((move) => createNegamonSkillDefinition(move, species.id));
            const earlySkills = skills.filter((skill) => (skill.unlock.level ?? 1) <= 16);
            const reliableButtons = earlySkills.filter((skill) =>
                skill.power > 0 &&
                skill.accuracy >= 95 &&
                skill.energyCost <= 35 &&
                skill.effectFamily !== "FINISHER"
            );
            const jobSignatures = skills.map((skill) => `${skill.roleTag ?? "none"}:${skill.effectFamily}`);

            expect(new Set(skills.map((skill) => skill.effectFamily)).size).toBeGreaterThanOrEqual(4);
            expect(new Set(jobSignatures).size).toBe(skills.length);
            expect(earlySkills).toHaveLength(4);
            expect(reliableButtons.length).toBeGreaterThanOrEqual(1);
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

    it("keeps support and control matchups proactive inside the balance window", () => {
        const lumiluneVsPyronox = simulateNegamonBalanceMatchup({
            player: requireSpecies("lumilune"),
            opponent: requireSpecies("pyronox"),
            rankIndex: 5,
            maxTurns: 16,
        });
        const voltshadeVsTidemaw = simulateNegamonBalanceMatchup({
            player: requireSpecies("voltshade"),
            opponent: requireSpecies("tidemaw"),
            rankIndex: 5,
            maxTurns: 16,
        });

        expect(lumiluneVsPyronox.rejectedChoices).toBe(0);
        expect(voltshadeVsTidemaw.rejectedChoices).toBe(0);
        expect(lumiluneVsPyronox.turns).toBeGreaterThanOrEqual(3);
        expect(voltshadeVsTidemaw.turns).toBeGreaterThanOrEqual(3);
        expect(lumiluneVsPyronox.maxSingleHitPercent).toBeLessThanOrEqual(0.55);
        expect(voltshadeVsTidemaw.maxSingleHitPercent).toBeLessThanOrEqual(0.55);
        expect(1 - lumiluneVsPyronox.opponentRemainingHpPercent).toBeGreaterThanOrEqual(0.12);
        expect(1 - voltshadeVsTidemaw.opponentRemainingHpPercent).toBeGreaterThanOrEqual(0.12);
    });
});
