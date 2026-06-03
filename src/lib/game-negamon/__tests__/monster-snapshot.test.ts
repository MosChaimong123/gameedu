import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import {
    getNegamonSettingsFromGamification,
    sanitizeGamificationSettingsNegamon,
} from "@/lib/services/classroom-settings/gamification-settings";
import type { NegamonSettings } from "@/lib/types/negamon";
import {
    calculateNegamonExpProgress,
    calculateNegamonStats,
    calculateNegamonStatsForLevel,
    createNegamonMonsterSnapshot,
    createStudentMonsterStateFromSpecies,
    findNegamonSpeciesById,
    getNegamonFormIndexFromLevel,
    getNegamonFormLevelBand,
    getNegamonLevelFromRank,
    getNegamonStatMultipliersForLevel,
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
        expect(getNegamonLevelFromRank(2)).toBe(16);
        expect(getNegamonFormIndexFromLevel(16)).toBe(2);
        expect(getNegamonFormLevelBand(4)).toMatchObject({ levelMin: 38, levelMax: 49 });
        expect(calculateNegamonStats(pyronox.baseStats, 2)).toEqual({
            hp: Math.floor(pyronox.baseStats.hp * 1.9),
            atk: Math.floor(pyronox.baseStats.atk * 1.75),
            def: Math.floor(pyronox.baseStats.def * 1.75),
            spd: Math.floor(pyronox.baseStats.spd * 1.6),
            spa: Math.floor(pyronox.baseStats.spa! * 1.75),
        });
        expect(calculateNegamonExpProgress({ points: 25, rankIndex: 2, expPerPoint: 8 })).toMatchObject({
            level: 16,
            exp: 4125,
            formIndex: 2,
            rankIndex: 2,
            evolutionStage: 2,
        });
        expect(getNegamonStatMultipliersForLevel(1)).toEqual({
            hp: 1.3,
            atk: 1.25,
            def: 1.25,
            spd: 1.2,
            spa: 1.25,
        });
        expect(getNegamonStatMultipliersForLevel(60)).toEqual({
            hp: 3,
            atk: 2.65,
            def: 2.65,
            spd: 2.3,
            spa: 2.65,
        });
        expect(calculateNegamonStatsForLevel(pyronox.baseStats, 12)).toEqual({
            hp: Math.floor(pyronox.baseStats.hp * 1.75),
            atk: Math.floor(pyronox.baseStats.atk * 1.625),
            def: Math.floor(pyronox.baseStats.def * 1.625),
            spd: Math.floor(pyronox.baseStats.spd * 1.5),
            spa: Math.floor(pyronox.baseStats.spa! * 1.625),
        });
    });

    it("keeps role-aware growth and species energy profiles aligned to battle identity", () => {
        const pyronox = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "pyronox")!;
        const aerolisk = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "aerolisk")!;
        const terranoir = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "terranoir")!;
        const lumilune = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "lumilune")!;

        const genericAerolisk = calculateNegamonStatsForLevel(aerolisk.baseStats, 60);
        const roleAwareAerolisk = calculateNegamonStatsForLevel(aerolisk.baseStats, 60, aerolisk.battleRole);
        const roleAwareTerranoir = calculateNegamonStatsForLevel(terranoir.baseStats, 60, terranoir.battleRole);
        const roleAwarePyronox = calculateNegamonStatsForLevel(pyronox.baseStats, 60, pyronox.battleRole);
        const roleAwareLumilune = calculateNegamonStatsForLevel(lumilune.baseStats, 60, lumilune.battleRole);

        expect(roleAwareAerolisk.spd).toBeGreaterThan(genericAerolisk.spd);
        expect(roleAwareTerranoir.hp).toBeGreaterThan(calculateNegamonStatsForLevel(terranoir.baseStats, 60).hp);
        expect(roleAwareTerranoir.def).toBeGreaterThan(roleAwareLumilune.def);
        expect(roleAwarePyronox.atk).toBeGreaterThan(roleAwareLumilune.atk);

        const lumiluneSnapshot = createNegamonMonsterSnapshot({
            studentId: "student-1",
            points: 25,
            levelConfig,
            negamonSettings: makeSettings({
                studentMonsters: { "student-1": "lumilune" },
            }),
        });
        const terranoirSnapshot = createNegamonMonsterSnapshot({
            studentId: "student-1",
            points: 25,
            levelConfig,
            negamonSettings: makeSettings({
                studentMonsters: { "student-1": "terranoir" },
            }),
        });

        expect(lumiluneSnapshot?.derivedStats).toMatchObject({
            maxEnergy: 90,
            energyRegen: 20,
        });
        expect(terranoirSnapshot?.derivedStats).toMatchObject({
            maxEnergy: 110,
            energyRegen: 16,
        });
    });

    it("uses default species as the authoritative catalog over custom duplicates", () => {
        const customPyronox = { ...DEFAULT_NEGAMON_SPECIES[0], name: "Custom Pyronox" };
        const catalog = getNegamonSpeciesCatalog([customPyronox]);
        const pyronox = findNegamonSpeciesById("pyronox", [customPyronox]);

        expect(catalog.some((species) => species.id === "pyronox")).toBe(true);
        expect(pyronox?.name).toBe("ไพรอน็อกซ์");
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
            speciesName: "ไพรอน็อกซ์",
            displayName: "Ada",
            rankIndex: 2,
            level: 16,
            evolutionStage: 2,
            exp: 4125,
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
            currentLevel: 16,
            next: {
                requiredRankIndex: 3,
                requiredLevel: 26,
            },
            progressPercent: 61,
        });
        expect(snapshot?.formBand).toEqual({
            levelMin: 16,
            levelMax: 25,
        });
        expect(snapshot?.nextSkillUnlock).toEqual({
            id: "pyronox-hell-dive",
            name: "เพลิงนรกถล่ม",
            level: 26,
            rankIndex: 3,
        });
        expect(snapshot?.derivedStats.maxHp).toBe(snapshot?.stats.hp);
        expect(snapshot?.derivedStats).toMatchObject({
            maxEnergy: 100,
            energyRegen: 18,
        });
        expect(snapshot?.unlockedSkillIds).toEqual([
            "basic-attack",
            "pyronox-ember-fang",
            "pyronox-war-cry",
        ]);
        expect(snapshot?.equippedSkillIds).toEqual([
            "basic-attack",
            "pyronox-ember-fang",
            "pyronox-war-cry",
        ]);
        expect(snapshot?.skillCatalog.map((skill) => skill.id)).toEqual([
            "basic-attack",
            "pyronox-ember-fang",
            "pyronox-war-cry",
        ]);
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
            speciesName: "โวลต์เชด",
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
            speciesName: "แอโรลิสก์",
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

    it("does not surface a next skill unlock once the final move is already available", () => {
        const snapshot = createNegamonMonsterSnapshot({
            studentId: "student-1",
            studentName: "Ada",
            points: 400,
            levelConfig,
            negamonSettings: makeSettings(),
        });

        expect(snapshot?.level).toBeGreaterThanOrEqual(50);
        expect(snapshot?.nextSkillUnlock).toBeNull();
    });

    it("can create the legacy state shape from a species through the V2 growth helpers", () => {
        const pyronox = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "pyronox")!;
        const state = createStudentMonsterStateFromSpecies({ species: pyronox, rankIndex: 2 });

        expect(state).toMatchObject({
            speciesId: "pyronox",
            speciesName: "ไพรอน็อกซ์",
            rankIndex: 2,
            form: pyronox.forms[2],
            ability: pyronox.ability,
        });
        expect(state.unlockedMoves.map((move) => move.id)).toEqual([
            "pyronox-ember-fang",
            "pyronox-war-cry",
        ]);
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

    it("strips stale classroom species payloads back to the canonical Plan 29 roster shape", () => {
        const sanitized = sanitizeGamificationSettingsNegamon({
            negamon: {
                enabled: true,
                allowStudentChoice: true,
                expPerPoint: 10,
                expPerAttendance: 20,
                species: [
                    {
                        ...DEFAULT_NEGAMON_SPECIES[1],
                        name: "Legacy Aerolisk",
                        baseStats: { hp: 300, atk: 178, def: 118, spd: 194 },
                        moves: [
                            {
                                id: "aerolisk-gale-cut",
                                name: "Gale Peck",
                                type: "WIND",
                                category: "PHYSICAL",
                                power: 32,
                                accuracy: 100,
                                learnRank: 3,
                            },
                        ],
                    },
                ],
                studentMonsters: {
                    "student-1": "aerolisk",
                },
            },
        }) as { negamon?: NegamonSettings };

        expect(sanitized.negamon?.species).toEqual([
            DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "aerolisk"),
        ]);
        expect(sanitized.negamon?.studentMonsters).toEqual({
            "student-1": "aerolisk",
        });
    });
});
