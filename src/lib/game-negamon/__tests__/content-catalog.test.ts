import { describe, expect, it } from "vitest";
import {
    buildNegamonContentCatalog,
    createNegamonExtraItemDefinition,
    findNegamonContentItem,
    NEGAMON_BATTLE_REWARD_TABLE,
    NEGAMON_STATUS_EFFECT_CATALOG,
} from "@/lib/game-negamon";

function expectUnique(ids: string[]) {
    expect(new Set(ids).size).toBe(ids.length);
}

describe("Negamon content catalog foundation", () => {
    it("builds one canonical catalog for monsters, skills, items, statuses, and rewards", () => {
        const catalog = buildNegamonContentCatalog();

        expect(catalog.version).toBe(1);
        expect(catalog.monsters.length).toBeGreaterThan(0);
        expect(catalog.skills.length).toBeGreaterThan(0);
        expect(catalog.items.length).toBeGreaterThan(0);
        expect(catalog.statuses.length).toBeGreaterThan(0);
        expect(catalog.rewardTables.length).toBeGreaterThan(0);

        expect(catalog.monsters.map((monster) => monster.id)).toContain("pyronox");
        expect(catalog.skills.map((skill) => skill.id)).toContain("basic-attack");
        expect(catalog.items.map((item) => item.id)).toContain("reward_lucky_coin");
        expect(catalog.items.map((item) => item.id)).toContain("use_vital_vial");
        expect(catalog.statuses.map((status) => status.id)).toContain("status_burn");
        expect(catalog.rewardTables.map((entry) => entry.id)).toContain("reward_normal_win");
    });

    it("keeps stable ids unique inside each content group", () => {
        const catalog = buildNegamonContentCatalog();

        expectUnique(catalog.monsters.map((monster) => monster.id));
        expectUnique(catalog.items.map((item) => item.id));
        expectUnique(catalog.statuses.map((status) => status.id));
        expectUnique(catalog.rewardTables.map((entry) => entry.id));
        expect(catalog.skills.every((skill) => skill.id.trim().length > 0)).toBe(true);
    });

    it("normalizes monster species into content definitions with roles, traits, and evolution rules", () => {
        const pyronox = buildNegamonContentCatalog().monsters.find((monster) => monster.id === "pyronox");

        expect(pyronox).toMatchObject({
            id: "pyronox",
            role: expect.any(String),
            growthCurve: expect.any(String),
            elementTypes: ["FIRE", "DARK"],
            baseStats: expect.objectContaining({
                hp: expect.any(Number),
                atk: expect.any(Number),
                def: expect.any(Number),
                spd: expect.any(Number),
            }),
        });
        expect(pyronox?.traits[0]).toMatchObject({
            id: "trait_rage_mode",
            sourceAbilityId: "rage_mode",
        });
        expect(pyronox?.evolutionRules).toHaveLength(pyronox?.species.forms.length ?? 0);
        expect(pyronox?.evolutionRules[0]).toMatchObject({
            requiredRankIndex: 0,
            requiredLevel: 1,
        });
    });

    it("defines a first content pack with attacker, defender, support, and control roles", () => {
        const catalog = buildNegamonContentCatalog();
        const roles = new Set(catalog.monsters.map((monster) => monster.role));
        const byId = new Map(catalog.monsters.map((monster) => [monster.id, monster]));

        expect([...roles]).toEqual(expect.arrayContaining(["attacker", "defender", "support", "control"]));
        expect(byId.get("pyronox")).toMatchObject({ role: "attacker" });
        expect(byId.get("terranoir")).toMatchObject({ role: "defender" });
        expect(byId.get("lumilune")).toMatchObject({ role: "support" });
        expect(byId.get("voltshade")).toMatchObject({ role: "control" });

        for (const monster of catalog.monsters) {
            expect(monster.species.moves.length).toBeGreaterThanOrEqual(4);
            expect(monster.evolutionRules).toHaveLength(6);
            expect(monster.traits.length).toBeGreaterThanOrEqual(1);
        }
    });

    it("normalizes skill requirements and item effects for battle runtime phases", () => {
        const catalog = buildNegamonContentCatalog();
        const skill = catalog.skills.find((item) => item.id === "pyronox-ember-fang");
        const luckyCoin = findNegamonContentItem(catalog, "reward_lucky_coin");

        expect(skill).toMatchObject({
            contentType: "skill",
            category: "attack",
            target: "enemy",
            requirements: {
                speciesId: "pyronox",
                rankIndex: 0,
            },
        });
        expect(skill?.effects.some((effect) => effect.kind === "damage")).toBe(true);
        expect(luckyCoin).toMatchObject({
            contentType: "item",
            itemType: "material",
            battleCategory: "reward",
            allowedInBattle: false,
        });
        expect(luckyCoin?.effects).toContainEqual({ kind: "gold_bonus", amount: 15 });
    });

    it("adds restore, immunity, stat, and reward battle items with valid runtime effects", () => {
        const catalog = buildNegamonContentCatalog();
        const byId = new Map(catalog.items.map((item) => [item.id, item]));

        expect(catalog.items.length).toBeGreaterThanOrEqual(8);
        expect(byId.get("use_vital_vial")).toMatchObject({
            battleCategory: "usable",
            effects: [{ kind: "restore_hp", percent: 25 }],
        });
        expect(byId.get("use_charge_capsule")).toMatchObject({
            battleCategory: "usable",
            effects: [{ kind: "restore_energy", amount: 18 }],
        });
        expect(byId.get("held_clear_mind_charm")).toMatchObject({
            battleCategory: "held",
        });
        expect(byId.get("held_scope_prism")?.effects).toContainEqual({ kind: "crit_bonus", percent: 18 });
        expect(byId.get("reward_lucky_coin")?.effects).toContainEqual({ kind: "gold_bonus", amount: 15 });
    });

    it("defines status metadata and battle reward tables for future runtime resolvers", () => {
        expect(NEGAMON_STATUS_EFFECT_CATALOG.find((status) => status.id === "status_burn")).toMatchObject({
            sourceStatus: "BURN",
            tickTiming: "turn_end",
            stacking: "refresh",
            immunities: ["BURN"],
        });
        expect(NEGAMON_STATUS_EFFECT_CATALOG.find((status) => status.id === "status_heal_25")).toMatchObject({
            sourceStatus: "HEAL_25",
            durationTurns: 0,
            immunities: [],
        });

        expect(NEGAMON_BATTLE_REWARD_TABLE.find((entry) => entry.id === "reward_hard_win")).toMatchObject({
            difficulty: "hard",
            outcome: "win",
            itemDropIds: ["reward_lucky_coin", "held_clear_mind_charm"],
            unlockConditions: { minRankIndex: 2 },
        });
    });

    it("keeps reward item drops pointed at existing item ids", () => {
        const catalog = buildNegamonContentCatalog();
        const itemIds = new Set(catalog.items.map((item) => item.id));

        for (const reward of catalog.rewardTables) {
            for (const itemId of reward.itemDropIds) {
                expect(itemIds.has(itemId)).toBe(true);
            }
        }

        expect(catalog.rewardTables.find((entry) => entry.id === "reward_easy_win")?.itemDropIds).toEqual([
            "use_vital_vial",
        ]);
        expect(catalog.rewardTables.find((entry) => entry.id === "reward_normal_win")?.itemDropIds).toEqual([
            "use_charge_capsule",
            "held_clear_mind_charm",
        ]);
    });

    it("allows future DB-backed or event-backed items to merge without replacing the static shop catalog", () => {
        const potion = createNegamonExtraItemDefinition({
            id: "use_vital_vial",
            rarity: "common",
            priceGold: 150,
            effects: [{ kind: "restore_hp", percent: 25 }],
        });
        const catalog = buildNegamonContentCatalog({ extraItems: [potion] });

        expect(findNegamonContentItem(catalog, "use_vital_vial")).toMatchObject({
            id: "use_vital_vial",
            contentType: "item",
            effects: [{ kind: "restore_hp", percent: 25 }],
        });
        expect(findNegamonContentItem(catalog, "reward_lucky_coin")).not.toBeNull();
    });
});
