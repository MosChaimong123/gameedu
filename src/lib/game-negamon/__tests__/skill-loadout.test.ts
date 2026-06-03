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
        const pyronox = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "pyronox")!;
        const finisher = pyronox.moves.find((move) => move.id === "pyronox-hell-dive")!;
        const skill = createNegamonSkillDefinition(finisher, pyronox.id);

        expect(skill).toMatchObject({
            id: "pyronox-hell-dive",
            elementType: "FIRE",
            category: "special",
            target: "enemy",
            cooldownTurns: 2,
            unlock: { level: 26, rankIndex: 3, speciesId: "pyronox" },
        });
        expect(skill.energyCost).toBeGreaterThan(0);
        expect(skill.effects.map((effect) => effect.kind)).toEqual(["damage", "status", "energy_cost"]);
    });

    it("builds a species catalog including basic attack when requested", () => {
        const pyronox = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "pyronox")!;
        const catalog = getNegamonSpeciesSkillCatalog(pyronox, { includeBasic: true });

        expect(catalog[0]).toMatchObject({ id: "basic-attack", energyCost: 0 });
        expect(catalog.map((skill) => skill.id)).toContain("pyronox-ember-fang");
    });

    it("unlocks skills by level pacing and filters disabled skills", () => {
        const pyronox = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "pyronox")!;
        const unlocked = getUnlockedNegamonSkillDefinitions({
            species: pyronox,
            rankIndex: 1,
            includeBasic: true,
            disabledSkillIds: ["pyronox-ember-fang"],
        });

        expect(unlocked.map((skill) => skill.id)).toEqual([
            "basic-attack",
            "pyronox-war-cry",
        ]);
    });

    it("validates loadout ids and falls back to first unlocked skills", () => {
        const pyronox = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "pyronox")!;
        const unlocked = getUnlockedNegamonSkillDefinitions({ species: pyronox, rankIndex: 5, includeBasic: true });
        const result = validateNegamonSkillLoadout({
            requestedSkillIds: ["missing", "pyronox-hell-dive", "pyronox-hell-dive", "pyronox-ember-fang"],
            unlockedSkills: unlocked,
            maxSlots: 2,
        });
        const fallback = validateNegamonSkillLoadout({ unlockedSkills: unlocked, maxSlots: 2 });

        expect(result.normalizedSkillIds).toEqual(["pyronox-hell-dive", "pyronox-ember-fang"]);
        expect(result.rejectedSkillIds).toEqual(["missing"]);
        expect(fallback.normalizedSkillIds).toEqual(["basic-attack", "pyronox-hell-dive"]);
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
                studentMonsters: { "student-1": "pyronox" },
            },
            equippedSkillIds: ["pyronox-hell-dive", "missing"],
        })!;
        const plan = createNegamonSkillLoadoutPlan({ monster });

        expect(plan.skillIds).toEqual(["pyronox-hell-dive"]);
        expect(plan.skills[0].sourceMove.id).toBe("pyronox-hell-dive");
    });

    it("keeps unlocked progression separate from active battle slots", () => {
        const monster = createNegamonMonsterSnapshot({
            studentId: "student-1",
            points: 10000,
            levelConfig,
            negamonSettings: {
                enabled: true,
                allowStudentChoice: true,
                expPerPoint: 10,
                expPerAttendance: 20,
                species: DEFAULT_NEGAMON_SPECIES,
                studentMonsters: { "student-1": "terranoir" },
            },
            equippedSkillIds: [
                "basic-attack",
                "terranoir-grave-slam",
                "terranoir-catacomb-crush",
                "terranoir-bastion-hide",
            ],
        })!;

        expect(monster.unlockedSkillIds).toEqual([
            "basic-attack",
            "terranoir-grave-slam",
            "terranoir-bastion-hide",
            "terranoir-catacomb-crush",
        ]);
        expect(monster.equippedSkillIds).toEqual([
            "basic-attack",
            "terranoir-grave-slam",
            "terranoir-catacomb-crush",
            "terranoir-bastion-hide",
        ]);
    });

    it("does not fallback when a saved non-empty loadout contains only locked or invalid skills", () => {
        const pyronox = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "pyronox")!;
        const unlocked = getUnlockedNegamonSkillDefinitions({ species: pyronox, rankIndex: 0, level: 1, includeBasic: true });
        const result = validateNegamonSkillLoadout({
            requestedSkillIds: ["missing", "pyronox-hell-dive"],
            unlockedSkills: unlocked,
            fallbackToFirstSkills: false,
        });

        expect(result.normalizedSkillIds).toEqual([]);
        expect(result.rejectedSkillIds).toEqual(["missing", "pyronox-hell-dive"]);
    });
});
