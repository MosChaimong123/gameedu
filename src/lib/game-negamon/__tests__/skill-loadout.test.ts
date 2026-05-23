import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import {
    createNegamonSkillDefinition,
    createNegamonSkillLoadoutPlan,
    createNegamonMonsterSnapshot,
    getNegamonSpeciesSkillCatalog,
    getUnlockedNegamonSkillDefinitions,
    validateNegamonSkillLoadout,
} from "@/lib/game-negamon";

const levelConfig = [
    { name: "Common", minScore: 0 },
    { name: "Uncommon", minScore: 10 },
    { name: "Rare", minScore: 20 },
    { name: "Epic", minScore: 30 },
    { name: "Legendary", minScore: 40 },
    { name: "Mythic", minScore: 50 },
];

describe("Negamon skill catalog and loadout V2", () => {
    it("creates skill definitions with energy cost, target, cooldown, and effects", () => {
        const naga = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "naga")!;
        const tidal = naga.moves.find((move) => move.id === "naga-tidal-force")!;
        const skill = createNegamonSkillDefinition(tidal, naga.id);

        expect(skill).toMatchObject({
            id: "naga-tidal-force",
            elementType: "WATER",
            category: "special",
            target: "enemy",
            cooldownTurns: 2,
            unlock: { level: 6, rankIndex: 5, speciesId: "naga" },
        });
        expect(skill.energyCost).toBeGreaterThan(0);
        expect(skill.effects.map((effect) => effect.kind)).toEqual([
            "damage",
            "status",
            "critical_bonus",
            "energy_cost",
        ]);
    });

    it("builds a species catalog including basic attack when requested", () => {
        const naga = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "naga")!;
        const catalog = getNegamonSpeciesSkillCatalog(naga, { includeBasic: true });

        expect(catalog[0]).toMatchObject({ id: "basic-attack", energyCost: 0 });
        expect(catalog.map((skill) => skill.id)).toContain("naga-aqua-jet");
    });

    it("unlocks skills by rank and filters disabled skills", () => {
        const naga = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "naga")!;
        const unlocked = getUnlockedNegamonSkillDefinitions({
            species: naga,
            rankIndex: 3,
            includeBasic: true,
            disabledSkillIds: ["naga-aqua-jet"],
        });

        expect(unlocked.map((skill) => skill.id)).toEqual([
            "basic-attack",
            "naga-mind-snare",
        ]);
    });

    it("validates loadout ids and falls back to first unlocked skills", () => {
        const naga = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "naga")!;
        const unlocked = getUnlockedNegamonSkillDefinitions({ species: naga, rankIndex: 5, includeBasic: true });
        const result = validateNegamonSkillLoadout({
            requestedSkillIds: ["missing", "naga-tidal-force", "naga-tidal-force", "naga-aqua-jet"],
            unlockedSkills: unlocked,
            maxSlots: 2,
        });
        const fallback = validateNegamonSkillLoadout({ unlockedSkills: unlocked, maxSlots: 2 });

        expect(result.normalizedSkillIds).toEqual(["naga-tidal-force", "naga-aqua-jet"]);
        expect(result.rejectedSkillIds).toEqual(["missing"]);
        expect(fallback.normalizedSkillIds).toEqual(["basic-attack", "naga-aqua-jet"]);
    });

    it("creates a server loadout plan from a monster snapshot", () => {
        const monster = createNegamonMonsterSnapshot({
            studentId: "student-1",
            points: 50,
            levelConfig,
            negamonSettings: {
                enabled: true,
                allowStudentChoice: true,
                expPerPoint: 10,
                expPerAttendance: 20,
                species: DEFAULT_NEGAMON_SPECIES,
                studentMonsters: { "student-1": "naga" },
            },
            equippedSkillIds: ["naga-tidal-force", "missing"],
        })!;
        const plan = createNegamonSkillLoadoutPlan({ monster });

        expect(plan.skillIds).toEqual(["naga-tidal-force"]);
        expect(plan.skills[0].sourceMove.id).toBe("naga-tidal-force");
    });
});
