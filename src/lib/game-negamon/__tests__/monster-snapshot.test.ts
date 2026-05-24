import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
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
        studentMonsters: { "student-1": "naga" },
        ...overrides,
    };
}

describe("Negamon character and monster contracts", () => {
    it("normalizes rank, level, stats, and exp progress", () => {
        const naga = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "naga")!;

        expect(normalizeNegamonRankIndex(-1)).toBe(0);
        expect(normalizeNegamonRankIndex(9)).toBe(5);
        expect(getNegamonLevelFromRank(2)).toBe(3);
        expect(calculateNegamonStats(naga.baseStats, 2)).toEqual({
            hp: Math.floor(naga.baseStats.hp * 1.9),
            atk: Math.floor(naga.baseStats.atk * 1.75),
            def: Math.floor(naga.baseStats.def * 1.75),
            spd: Math.floor(naga.baseStats.spd * 1.6),
        });
        expect(calculateNegamonExpProgress({ points: 25, rankIndex: 2, expPerPoint: 8 })).toMatchObject({
            level: 3,
            exp: 200,
            rankIndex: 2,
            evolutionStage: 2,
        });
    });

    it("uses default species as the authoritative catalog over custom duplicates", () => {
        const customNaga = { ...DEFAULT_NEGAMON_SPECIES[0], name: "Custom Naga" };
        const catalog = getNegamonSpeciesCatalog([customNaga]);
        const naga = findNegamonSpeciesById("naga", [customNaga]);

        expect(catalog.some((species) => species.id === "naga")).toBe(true);
        expect(naga?.name).toBe("พญานาค");
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
            monsterId: "student-1:naga",
            speciesId: "naga",
            speciesName: "พญานาค",
            displayName: "Ada",
            rankIndex: 2,
            level: 3,
            evolutionStage: 2,
            exp: 250,
            elementTypes: ["WATER", "DARK"],
            abilityId: "acid_rain",
            traitId: "trait_acid_rain",
        });
        expect(snapshot?.trait).toMatchObject({
            id: "trait_acid_rain",
            appliesAt: "turn_end",
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
        expect(snapshot?.unlockedSkillIds).toContain("naga-aqua-jet");
        expect(snapshot?.equippedSkillIds).toEqual(["basic-attack", "naga-aqua-jet"]);
        expect(snapshot?.skillCatalog.map((skill) => skill.id)).toEqual(["basic-attack", "naga-aqua-jet"]);
    });

    it("respects disabled moves and equipped skill validation", () => {
        const snapshot = createNegamonMonsterSnapshot({
            studentId: "student-1",
            points: 50,
            levelConfig,
            negamonSettings: makeSettings({ disabledMoves: ["naga-aqua-jet"] }),
            equippedSkillIds: ["naga-aqua-jet", "naga-tidal-force"],
            equippedItemIds: ["item_potion"],
        });

        expect(snapshot?.unlockedSkillIds).not.toContain("naga-aqua-jet");
        expect(snapshot?.equippedSkillIds).toEqual(["naga-tidal-force"]);
        expect(snapshot?.equippedItemIds).toEqual(["item_potion"]);
    });

    it("can create the legacy state shape from a species through the V2 growth helpers", () => {
        const naga = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "naga")!;
        const state = createStudentMonsterStateFromSpecies({ species: naga, rankIndex: 2 });

        expect(state).toMatchObject({
            speciesId: "naga",
            speciesName: "พญานาค",
            rankIndex: 2,
            form: naga.forms[2],
            ability: naga.ability,
        });
        expect(state.unlockedMoves.map((move) => move.id)).toEqual(["naga-aqua-jet"]);
    });
});
