import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import {
    createNegamonEvolutionSnapshot,
    createNegamonEvolutionUnlocks,
    createNegamonTraitSnapshot,
} from "@/lib/game-negamon";

const pyronox = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "pyronox")!;

describe("Negamon monster traits and evolution", () => {
    it("maps passive ability into a stable trait snapshot", () => {
        expect(createNegamonTraitSnapshot(pyronox.ability)).toMatchObject({
            id: "trait_rage_mode",
            sourceAbilityId: "rage_mode",
            appliesAt: "battle_start",
        });
    });

    it("creates next evolution progress from level and rank", () => {
        const evolution = createNegamonEvolutionSnapshot({
            species: pyronox,
            rankIndex: 2,
            level: 16,
            currentFormName: pyronox.forms[2].name,
        });

        expect(evolution).toMatchObject({
            currentFormRank: 2,
            currentFormName: pyronox.forms[2].name,
            currentLevel: 16,
            currentRankIndex: 2,
            isMaxEvolution: false,
            next: {
                formRank: 3,
                formName: pyronox.forms[3].name,
                requiredRankIndex: 3,
                requiredLevel: 26,
            },
        });
        expect(evolution.progressPercent).toBe(61);
    });

    it("reports max evolution when no higher form remains", () => {
        const evolution = createNegamonEvolutionSnapshot({
            species: pyronox,
            rankIndex: 5,
            level: 50,
            currentFormName: pyronox.forms[5].name,
        });

        expect(evolution.next).toBeNull();
        expect(evolution.isMaxEvolution).toBe(true);
        expect(evolution.progressPercent).toBe(100);
    });

    it("summarizes newly unlocked form ranks", () => {
        expect(createNegamonEvolutionUnlocks({ fromRankIndex: 1, toRankIndex: 3, species: pyronox })).toEqual([
            {
                fromRankIndex: 1,
                toRankIndex: 3,
                formRank: 2,
                formName: pyronox.forms[2].name,
            },
            {
                fromRankIndex: 1,
                toRankIndex: 3,
                formRank: 3,
                formName: pyronox.forms[3].name,
            },
        ]);
    });
});
