import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import {
    buildNegamonContentCatalog,
    simulateNegamonBalanceMatchup,
} from "@/lib/game-negamon";

const speciesById = new Map(DEFAULT_NEGAMON_SPECIES.map((species) => [species.id, species]));

function species(id: string) {
    const found = speciesById.get(id);
    if (!found) throw new Error(`Missing species ${id}`);
    return found;
}

describe("Negamon battle balance pass 1", () => {
    it("simulates content-pack role matchups inside the classroom battle length target", () => {
        const matchups = [
            ["pyronox", "terranoir"],
            ["terranoir", "voltshade"],
            ["lumilune", "pyronox"],
            ["voltshade", "tidemaw"],
        ] as const;

        for (const [playerId, opponentId] of matchups) {
            const summary = simulateNegamonBalanceMatchup({
                player: species(playerId),
                opponent: species(opponentId),
                rankIndex: 5,
                maxTurns: 16,
            });

            expect(summary.rejectedChoices).toBe(0);
            expect(summary.turns).toBeGreaterThanOrEqual(3);
            expect(summary.turns).toBeLessThanOrEqual(16);
            expect(summary.maxSingleHitPercent).toBeLessThanOrEqual(0.55);
            const totalHpPressure =
                (1 - summary.playerRemainingHpPercent) +
                (1 - summary.opponentRemainingHpPercent);
            expect(
                summary.ended ||
                summary.playerRemainingHpPercent < 0.45 ||
                summary.opponentRemainingHpPercent < 0.45 ||
                totalHpPressure >= 0.09
            , JSON.stringify(summary)).toBe(true);
        }
    });

    it("keeps ultimate and high-impact skills gated by energy and cooldowns", () => {
        const catalog = buildNegamonContentCatalog();
        const highImpactSkills = catalog.skills.filter((skill) =>
            (skill.unlock.rankIndex ?? 0) >= 5 ||
            skill.effects.some((effect) =>
                effect.kind === "status" &&
                (effect.effect === "PARALYZE" || effect.effect === "SLEEP" || effect.effect === "FREEZE")
            )
        );

        expect(highImpactSkills.length).toBeGreaterThan(0);
        for (const skill of highImpactSkills) {
            expect(skill.energyCost).toBeGreaterThanOrEqual(26);
            if ((skill.unlock.rankIndex ?? 0) >= 5) {
                expect(skill.energyCost).toBeGreaterThanOrEqual(60);
                expect(skill.cooldownTurns).toBeGreaterThanOrEqual(2);
            }
        }
    });

    it("keeps item restore amounts and stat multipliers within pass-1 guardrails", () => {
        const catalog = buildNegamonContentCatalog();
        const itemEffects = catalog.items.flatMap((item) => item.effects.map((effect) => ({ item, effect })));

        expect(itemEffects.length).toBeGreaterThan(0);
        for (const { effect } of itemEffects) {
            if (effect.kind === "stat_boost") {
                expect(effect.multiplier).toBeGreaterThanOrEqual(1.05);
                expect(effect.multiplier).toBeLessThanOrEqual(1.28);
            }
            if (effect.kind === "restore_hp") {
                expect(effect.percent).toBeGreaterThanOrEqual(20);
                expect(effect.percent).toBeLessThanOrEqual(35);
            }
            if (effect.kind === "restore_energy") {
                expect(effect.amount).toBeGreaterThanOrEqual(12);
                expect(effect.amount).toBeLessThanOrEqual(25);
            }
            if (effect.kind === "gold_multiplier") {
                expect(effect.multiplier).toBeLessThanOrEqual(1.25);
            }
        }
    });

    it("keeps reward table output in the pass-1 classroom range", () => {
        const catalog = buildNegamonContentCatalog();
        const winRewards = catalog.rewardTables.filter((entry) => entry.outcome === "win");

        expect(winRewards.length).toBeGreaterThan(0);
        for (const reward of winRewards) {
            expect(reward.gold).toBeGreaterThanOrEqual(20);
            expect(reward.gold).toBeLessThanOrEqual(90);
            expect(reward.exp).toBeGreaterThanOrEqual(10);
            expect(reward.exp).toBeLessThanOrEqual(120);
            expect(reward.itemDropIds.length).toBeLessThanOrEqual(2);
        }
    });
});
