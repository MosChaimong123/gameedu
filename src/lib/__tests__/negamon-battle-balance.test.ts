import { describe, expect, it } from "vitest";
import type { MonsterMove, MonsterStats } from "@/lib/types/negamon";
import {
    calcGoldReward,
    resolveBattle,
    resolveOneTurn,
    type BattleFighter,
} from "@/lib/battle-engine";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import { DEFAULT_NEGAMON_BATTLE_TUNING } from "@/lib/types/game";

const stats: MonsterStats = { hp: 100, atk: 80, def: 40, spd: 50 };

const strikeMove: MonsterMove = {
    id: "strike",
    name: "Strike",
    type: "FIRE",
    category: "PHYSICAL",
    power: 40,
    accuracy: 100,
    learnRank: 1,
};

const ignoreDefMove: MonsterMove = {
    id: "ignore-def",
    name: "Pierce",
    type: "FIRE",
    category: "STATUS",
    power: 0,
    accuracy: 100,
    learnRank: 1,
    effect: "IGNORE_DEF",
};

function makeFighter(overrides: Partial<BattleFighter> = {}): BattleFighter {
    return {
        studentId: "fighter-a",
        studentName: "Fighter A",
        formIcon: "A",
        formName: "Alpha",
        speciesName: "Alpha",
        type: "FIRE",
        maxHp: 100,
        currentHp: 100,
        baseStats: { ...stats },
        statStages: { atk: 1, def: 1, spd: 1, waterDmg: 1, ignoreDef: false },
        effects: [],
        moves: [strikeMove],
        rankIndex: 1,
        badlyPoisonTick: 0,
        immunities: [],
        activeItems: [],
        goldBonus: 0,
        abilityUsed: false,
        ...overrides,
    };
}

describe("Negamon battle balance patch", () => {
    it("makes IGNORE_DEF reduce defender mitigation on the next attack", () => {
        const basePlayer = makeFighter({
            studentId: "player",
            moves: [ignoreDefMove, strikeMove],
        });
        const baseOpponent = makeFighter({
            studentId: "opponent",
            studentName: "Opponent",
            baseStats: { hp: 100, atk: 40, def: 120, spd: 1 },
            type: "EARTH",
            moves: [],
        });

        const controlPlayer = structuredClone(basePlayer);
        const controlOpponent = structuredClone(baseOpponent);
        resolveOneTurn(controlPlayer, controlOpponent, "strike", () => 0.5);
        const controlDamage = controlOpponent.maxHp - controlOpponent.currentHp;

        const ignoreDefPlayer = structuredClone(basePlayer);
        const ignoreDefOpponent = structuredClone(baseOpponent);
        resolveOneTurn(ignoreDefPlayer, ignoreDefOpponent, "ignore-def", () => 0.5);
        resolveOneTurn(ignoreDefPlayer, ignoreDefOpponent, "strike", () => 0.5);
        const boostedDamage = ignoreDefOpponent.maxHp - ignoreDefOpponent.currentHp;

        expect(boostedDamage).toBeGreaterThan(controlDamage);
    });

    it("does not increase gold reward just because the winner already has a higher rank", () => {
        const lowerRankWinner = makeFighter({ rankIndex: 1, goldBonus: 4 });
        const higherRankWinner = makeFighter({ rankIndex: 5, goldBonus: 4 });
        const loser = makeFighter({ rankIndex: 1 });

        expect(calcGoldReward(lowerRankWinner, loser)).toBe(34);
        expect(calcGoldReward(higherRankWinner, loser)).toBe(34);
    });

    it("does not always award exact-draw battles to the first fighter", () => {
        const winners = new Set<string>();
        for (const seed of [1, 2, 3, 4, 5, 6]) {
            const result = resolveBattle(
                makeFighter({ studentId: "f1", moves: [] }),
                makeFighter({ studentId: "f2", studentName: "Fighter B", moves: [] }),
                seed
            );
            winners.add(result.winnerId);
        }

        expect(winners.has("f1")).toBe(true);
        expect(winners.has("f2")).toBe(true);
    });

    it("uses slower default classroom battle tuning", () => {
        expect(DEFAULT_NEGAMON_BATTLE_TUNING.fastAnswerSeconds).toBe(4);
        expect(DEFAULT_NEGAMON_BATTLE_TUNING.movePower).toBe(40);
        expect(DEFAULT_NEGAMON_BATTLE_TUNING.attackerAtk).toBe(52);
        expect(DEFAULT_NEGAMON_BATTLE_TUNING.defenderDef).toBe(36);
    });

    it("rebalances high-pressure species and props up slower archetypes conservatively", () => {
        const garuda = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "garuda");
        const hanuman = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "hanuman");
        const mekkala = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "mekkala");
        const singha = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "singha");
        const kinnaree = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "kinnaree");
        const suvanna = DEFAULT_NEGAMON_SPECIES.find((species) => species.id === "suvannamaccha");

        expect(garuda?.baseStats).toMatchObject({ atk: 148, def: 72, spd: 148 });
        expect(garuda?.moves.find((move) => move.id === "garuda-strike")?.power).toBe(140);
        expect(hanuman?.baseStats).toMatchObject({ atk: 138, def: 78, spd: 152 });
        expect(hanuman?.moves.find((move) => move.id === "hanuman-sacred-fist")?.power).toBe(110);
        expect(mekkala?.baseStats).toMatchObject({ atk: 108, def: 88, spd: 160 });
        expect(mekkala?.moves.find((move) => move.id === "mekkala-judgment")?.power).toBe(138);
        expect(singha?.baseStats).toMatchObject({ atk: 108, def: 150, spd: 50 });
        expect(singha?.moves.find((move) => move.id === "singha-quake")?.power).toBe(95);
        expect(kinnaree?.baseStats).toMatchObject({ hp: 285, atk: 112, spd: 182 });
        expect(kinnaree?.moves.find((move) => move.id === "kinnaree-feather-storm")?.power).toBe(75);
        expect(suvanna?.baseStats).toMatchObject({ hp: 400, atk: 88, def: 128 });
        expect(suvanna?.moves.find((move) => move.id === "suvanna-blessing")?.power).toBe(132);
    });
});
