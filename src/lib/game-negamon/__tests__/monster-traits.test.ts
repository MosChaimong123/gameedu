import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import {
    createNegamonEvolutionSnapshot,
    createNegamonEvolutionUnlocks,
    createNegamonTraitSnapshot,
} from "@/lib/game-negamon";

const naga = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "naga")!;

describe("Negamon monster traits and evolution", () => {
    it("maps passive ability into a stable trait snapshot", () => {
        expect(createNegamonTraitSnapshot(naga.ability)).toMatchObject({
            id: "trait_acid_rain",
            sourceAbilityId: "acid_rain",
            appliesAt: "turn_end",
        });
    });

    it("creates next evolution progress from level and rank", () => {
        const evolution = createNegamonEvolutionSnapshot({
            species: naga,
            rankIndex: 2,
            level: 3,
            currentFormName: naga.forms[2].name,
        });

        expect(evolution).toMatchObject({
            currentFormRank: 2,
            currentFormName: naga.forms[2].name,
            currentLevel: 3,
            currentRankIndex: 2,
            isMaxEvolution: false,
            next: {
                formRank: 3,
                formName: naga.forms[3].name,
                requiredRankIndex: 3,
                requiredLevel: 4,
            },
        });
        expect(evolution.progressPercent).toBe(66);
    });

    it("reports max evolution when no higher form remains", () => {
        const evolution = createNegamonEvolutionSnapshot({
            species: naga,
            rankIndex: 5,
            level: 6,
            currentFormName: naga.forms[5].name,
        });

        expect(evolution.next).toBeNull();
        expect(evolution.isMaxEvolution).toBe(true);
        expect(evolution.progressPercent).toBe(100);
    });

    it("summarizes newly unlocked form ranks", () => {
        expect(createNegamonEvolutionUnlocks({ fromRankIndex: 1, toRankIndex: 3, species: naga })).toEqual([
            {
                fromRankIndex: 1,
                toRankIndex: 3,
                formRank: 2,
                formName: naga.forms[2].name,
            },
            {
                fromRankIndex: 1,
                toRankIndex: 3,
                formRank: 3,
                formName: naga.forms[3].name,
            },
        ]);
    });
});
