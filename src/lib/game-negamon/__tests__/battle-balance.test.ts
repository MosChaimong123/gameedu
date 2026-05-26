import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import {
    buildNegamonContentCatalog,
} from "@/lib/game-negamon";

const speciesById = new Map(DEFAULT_NEGAMON_SPECIES.map((species) => [species.id, species]));

function species(id: string) {
    const found = speciesById.get(id);
    if (!found) throw new Error(`Missing species ${id}`);
    return found;
}

describe("Negamon battle balance pass 1", () => {
    it("keeps the roster role spread available for classroom balance review", () => {
        const catalog = buildNegamonContentCatalog();
        const roles = new Set(catalog.monsters.map((monster) => monster.role));

        expect(roles.has("attacker")).toBe(true);
        expect(roles.has("defender")).toBe(true);
        expect(roles.has("support")).toBe(true);
        expect(roles.has("control")).toBe(true);
        expect(species("pyronox").battleRole).toBe("burst");
        expect(species("terranoir").battleRole).toBe("wall");
    });

    it("keeps ultimate and high-impact skills gated by energy and cooldowns", () => {
        const catalog = buildNegamonContentCatalog();
        const highImpactSkills = catalog.skills.filter((skill) =>
            (skill.unlock.level ?? 1) >= 26 ||
            skill.effects.some((effect) =>
                effect.kind === "status" &&
                (effect.effect === "PARALYZE" || effect.effect === "SLEEP" || effect.effect === "FREEZE")
            )
        );

        expect(highImpactSkills.length).toBeGreaterThan(0);
        for (const skill of highImpactSkills) {
            expect(skill.energyCost).toBeGreaterThanOrEqual(26);
            if ((skill.unlock.level ?? 1) >= 26) {
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
