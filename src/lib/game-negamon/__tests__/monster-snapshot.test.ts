import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import { getNegamonSettingsFromGamification } from "@/lib/services/classroom-settings/gamification-settings";
import type { NegamonSettings } from "@/lib/types/negamon";
import {
    calculateNegamonExpProgress,
    calculateNegamonStats,
    createNegamonMonsterSnapshot,
    createStudentMonsterStateFromSpecies,
    findNegamonSpeciesById,
    getNegamonLevelFromRank,
    getNegamonSpeciesCatalog,
    normalizeNegamonRankIndex,
} from "@/lib/game-negamon";

const levelConfig = [
    { name: "Common", minScore: 0 },
    { name: "Uncommon", minScore: 10 },
    { name: "Rare", minScore: 20 },
    { name: "Epic", minScore: 30 },
    { name: "Legendary", minScore: 40 },
    { name: "Mythic", minScore: 50 },
];

function makeSettings(overrides: Partial<NegamonSettings> = {}): NegamonSettings {
    return {
        enabled: true,
        allowStudentChoice: true,
        expPerPoint: 10,
        expPerAttendance: 20,
        species: DEFAULT_NEGAMON_SPECIES,
        studentMonsters: { "student-1": "pyronox" },
        ...overrides,
    };
}

describe("Negamon character and monster contracts", () => {
    it("normalizes rank, level, stats, and exp progress", () => {
        const pyronox = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "pyronox")!;

        expect(normalizeNegamonRankIndex(-1)).toBe(0);
        expect(normalizeNegamonRankIndex(9)).toBe(5);
        expect(getNegamonLevelFromRank(2)).toBe(3);
        expect(calculateNegamonStats(pyronox.baseStats, 2)).toEqual({
            hp: Math.floor(pyronox.baseStats.hp * 1.9),
            atk: Math.floor(pyronox.baseStats.atk * 1.75),
            def: Math.floor(pyronox.baseStats.def * 1.75),
            spd: Math.floor(pyronox.baseStats.spd * 1.6),
        });
        expect(calculateNegamonExpProgress({ points: 25, rankIndex: 2, expPerPoint: 8 })).toMatchObject({
            level: 3,
            exp: 200,
            rankIndex: 2,
            evolutionStage: 2,
        });
    });

    it("uses default species as the authoritative catalog over custom duplicates", () => {
        const customPyronox = { ...DEFAULT_NEGAMON_SPECIES[0], name: "Custom Pyronox" };
        const catalog = getNegamonSpeciesCatalog([customPyronox]);
        const pyronox = findNegamonSpeciesById("pyronox", [customPyronox]);

        expect(catalog.some((species) => species.id === "pyronox")).toBe(true);
        expect(pyronox?.name).toBe("Pyronox");
    });

    it("creates a V2 monster snapshot from current classroom monster settings", () => {
        const snapshot = createNegamonMonsterSnapshot({
            studentId: "student-1",
            studentName: "Ada",
            points: 25,
            levelConfig,
            negamonSettings: makeSettings(),
        });

        expect(snapshot).toMatchObject({
            studentId: "student-1",
            monsterId: "student-1:pyronox",
            speciesId: "pyronox",
            speciesName: "Pyronox",
            displayName: "Ada",
            rankIndex: 2,
            level: 3,
            evolutionStage: 2,
            exp: 250,
            elementTypes: ["FIRE", "DARK"],
            abilityId: "rage_mode",
            traitId: "trait_rage_mode",
        });
        expect(snapshot?.trait).toMatchObject({
            id: "trait_rage_mode",
            appliesAt: "battle_start",
        });
        expect(snapshot?.evolution).toMatchObject({
            currentRankIndex: 2,
            currentLevel: 3,
            next: {
                requiredRankIndex: 3,
                requiredLevel: 4,
            },
            progressPercent: 66,
        });
        expect(snapshot?.derivedStats.maxHp).toBe(snapshot?.stats.hp);
        expect(snapshot?.unlockedSkillIds).toContain("pyronox-ember-fang");
        expect(snapshot?.equippedSkillIds).toEqual(["basic-attack", "pyronox-ember-fang"]);
        expect(snapshot?.skillCatalog.map((skill) => skill.id)).toEqual(["basic-attack", "pyronox-ember-fang"]);
    });

    it("remaps legacy classroom species ids into the new roster at runtime", () => {
        const legacySettings = makeSettings({
            species: [
                {
                    ...DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "voltshade")!,
                    id: "mekkala",
                    name: "Legacy Mekkala",
                },
            ],
            studentMonsters: { "student-1": "mekkala" },
        });

        const snapshot = createNegamonMonsterSnapshot({
            studentId: "student-1",
            points: 25,
            levelConfig,
            negamonSettings: legacySettings,
        });

        expect(snapshot).toMatchObject({
            speciesId: "voltshade",
            speciesName: "Voltshade",
            monsterId: "student-1:voltshade",
        });
    });

    it("drops unsupported legacy assignments when student choice is enabled", () => {
        const snapshot = createNegamonMonsterSnapshot({
            studentId: "student-1",
            points: 25,
            levelConfig,
            negamonSettings: makeSettings({
                species: [],
                studentMonsters: { "student-1": "unknown-legacy-species" },
            }),
        });

        expect(snapshot).toBeNull();
    });

    it("falls back to the first allowed species when selection is locked", () => {
        const aerolisk = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "aerolisk")!;
        const snapshot = createNegamonMonsterSnapshot({
            studentId: "student-1",
            points: 25,
            levelConfig,
            negamonSettings: makeSettings({
                allowStudentChoice: false,
                species: [aerolisk],
                studentMonsters: { "student-1": "unknown-legacy-species" },
            }),
        });

        expect(snapshot).toMatchObject({
            speciesId: "aerolisk",
            speciesName: "Aerolisk",
        });
    });

    it("respects disabled moves and equipped skill validation", () => {
        const snapshot = createNegamonMonsterSnapshot({
            studentId: "student-1",
            points: 50,
            levelConfig,
            negamonSettings: makeSettings({ disabledMoves: ["pyronox-ember-fang"] }),
            equippedSkillIds: ["pyronox-ember-fang", "pyronox-hell-dive"],
            equippedItemIds: ["item_potion"],
        });

        expect(snapshot?.unlockedSkillIds).not.toContain("pyronox-ember-fang");
        expect(snapshot?.equippedSkillIds).toEqual(["pyronox-hell-dive"]);
        expect(snapshot?.equippedItemIds).toEqual(["item_potion"]);
    });

    it("can create the legacy state shape from a species through the V2 growth helpers", () => {
        const pyronox = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "pyronox")!;
        const state = createStudentMonsterStateFromSpecies({ species: pyronox, rankIndex: 2 });

        expect(state).toMatchObject({
            speciesId: "pyronox",
            speciesName: "Pyronox",
            rankIndex: 2,
            form: pyronox.forms[2],
            ability: pyronox.ability,
        });
        expect(state.unlockedMoves.map((move) => move.id)).toEqual(["pyronox-ember-fang"]);
    });

    it("normalizes classroom negamon settings before downstream consumers read them", () => {
        const settings = getNegamonSettingsFromGamification({
            negamon: {
                enabled: true,
                allowStudentChoice: true,
                expPerPoint: 10,
                expPerAttendance: 20,
                species: [
                    { ...DEFAULT_NEGAMON_SPECIES[0], id: "thotsakan", name: "Legacy Thotsakan" },
                    { ...DEFAULT_NEGAMON_SPECIES[1], id: "garuda", name: "Legacy Garuda" },
                ],
                studentMonsters: {
                    "student-1": "thotsakan",
                    "student-2": "garuda",
                },
            },
        });

        expect(settings?.species.map((species) => species.id)).toEqual(["pyronox", "aerolisk"]);
        expect(settings?.studentMonsters).toEqual({
            "student-1": "pyronox",
            "student-2": "aerolisk",
        });
    });
});
