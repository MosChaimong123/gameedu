import { describe, expect, it } from "vitest";
import type { MonsterMove, MonsterStats, MonsterType } from "@/lib/types/negamon";
import {
    calcGoldReward,
    resolveBattle,
    resolveOneTurn,
    resolveServerOwnedInteractiveTurn,
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

const boostSpdMove: MonsterMove = {
    id: "boost-spd",
    name: "Haste",
    type: "WIND",
    category: "STATUS",
    power: 0,
    accuracy: 100,
    learnRank: 1,
    effect: "BOOST_SPD",
};

const lowerDefMove: MonsterMove = {
    id: "lower-def",
    name: "Shatter Guard",
    type: "DARK",
    category: "STATUS",
    power: 0,
    accuracy: 100,
    learnRank: 1,
    effect: "LOWER_DEF",
};

const boostAtkMove: MonsterMove = {
    id: "boost-atk",
    name: "Rally",
    type: "FIRE",
    category: "STATUS",
    power: 0,
    accuracy: 100,
    learnRank: 1,
    effect: "BOOST_ATK",
};

const boostDefMove: MonsterMove = {
    id: "boost-def",
    name: "Fortify",
    type: "EARTH",
    category: "STATUS",
    power: 0,
    accuracy: 100,
    learnRank: 1,
    effect: "BOOST_DEF",
};

function makeFighter(overrides: Partial<BattleFighter> = {}): BattleFighter {
    return {
        studentId: "fighter-a",
        studentName: "Fighter A",
        speciesId: "test",
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
        goldMultiplier: 1,
        abilityUsed: false,
        maxEnergy: 999,
        currentEnergy: 999,
        energyRegenPerTurn: 0,
        actionMeter: 0,
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
        const controlTurn = resolveOneTurn(controlPlayer, controlOpponent, "strike", () => 0.5);
        const controlDamage = controlTurn.events.find(
            (e) => e.kind === "damage" && e.actorId === "player"
        )?.value ?? 0;

        const ignoreDefPlayer = structuredClone(basePlayer);
        const ignoreDefOpponent = structuredClone(baseOpponent);
        resolveOneTurn(ignoreDefPlayer, ignoreDefOpponent, "ignore-def", () => 0.5);
        const boostedTurn = resolveOneTurn(ignoreDefPlayer, ignoreDefOpponent, "strike", () => 0.5);
        const boostedDamage = boostedTurn.events.find(
            (e) => e.kind === "damage" && e.actorId === "player"
        )?.value ?? 0;

        expect(boostedDamage).toBeGreaterThan(controlDamage);
    });

    it("IGNORE_DEF granted by a damaging move applies to the next attack", () => {
        const pierceFollow: MonsterMove = {
            ...strikeMove,
            id: "pierce-follow",
            effect: "IGNORE_DEF",
            effectChance: 100,
        };
        const player = makeFighter({
            studentId: "player",
            moves: [pierceFollow, strikeMove],
        });
        const opponent = makeFighter({
            studentId: "opponent",
            studentName: "Opponent",
            baseStats: { hp: 100, atk: 40, def: 120, spd: 1 },
            type: "EARTH",
            moves: [],
        });

        const seqPlayer = structuredClone(player);
        const seqOpp = structuredClone(opponent);
        resolveOneTurn(seqPlayer, seqOpp, "pierce-follow", () => 0.5);
        const followTurn = resolveOneTurn(seqPlayer, seqOpp, "strike", () => 0.5);
        const followDamage =
            followTurn.events.find((e) => e.kind === "damage" && e.actorId === "player")?.value ?? 0;

        const ctrlPlayer = structuredClone(player);
        const ctrlOpp = structuredClone(opponent);
        const baselineTurn = resolveOneTurn(ctrlPlayer, ctrlOpp, "strike", () => 0.5);
        const baselineDamage =
            baselineTurn.events.find((e) => e.kind === "damage" && e.actorId === "player")?.value ?? 0;

        expect(followDamage).toBeGreaterThan(baselineDamage);
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

        expect(garuda?.baseStats).toMatchObject({ hp: 280, atk: 188, def: 104, spd: 172 });
        expect(garuda?.moves.find((move) => move.id === "garuda-strike")?.power).toBe(58);
        expect(hanuman?.baseStats).toMatchObject({ hp: 320, atk: 182, def: 130, spd: 176 });
        expect(hanuman?.moves.find((move) => move.id === "hanuman-divine-inc")?.power).toBe(58);
        expect(mekkala?.baseStats).toMatchObject({ hp: 330, atk: 170, def: 128, spd: 186 });
        expect(mekkala?.moves.find((move) => move.id === "mekkala-judgment")?.power).toBe(56);
        expect(singha?.baseStats).toMatchObject({ hp: 560, atk: 176, def: 148, spd: 82 });
        expect(singha?.moves.find((move) => move.id === "singha-blaze-claw")?.power).toBe(41);
        expect(kinnaree?.baseStats).toMatchObject({ hp: 320, atk: 162, spd: 194 });
        expect(kinnaree?.moves.find((move) => move.id === "kinnaree-radiant-slash")?.power).toBe(35);
        expect(suvanna?.baseStats).toMatchObject({ hp: 500, atk: 168, def: 146 });
        expect(suvanna?.moves.find((move) => move.id === "suvanna-blessing")?.power).toBe(52);
        for (const species of DEFAULT_NEGAMON_SPECIES) {
            expect(species.baseStats.atk).toBeGreaterThan(species.baseStats.def);
            expect(species.moves.length).toBe(4);
            expect(species.type2).toBeDefined();
            const speciesTypes = new Set<MonsterType>([species.type, species.type2!]);
            for (const move of species.moves) {
                expect(speciesTypes.has(move.type)).toBe(true);
            }
        }
    });

    it("keeps chip damage meaningful even against high defense targets", () => {
        const attacker = makeFighter({
            studentId: "attacker",
            type: "FIRE",
            baseStats: { hp: 100, atk: 120, def: 40, spd: 120 },
            moves: [strikeMove],
            actionMeter: 110,
        });
        const defender = makeFighter({
            studentId: "defender",
            studentName: "Defender",
            type: "EARTH",
            baseStats: { hp: 220, atk: 40, def: 190, spd: 10 },
            moves: [],
            actionMeter: 0,
        });

        const out = resolveOneTurn(attacker, defender, "strike", () => 0.5);
        const damage = out.events.find((e) => e.kind === "damage" && e.actorId === "attacker")?.value ?? 0;

        expect(damage).toBeGreaterThanOrEqual(8);
    });

    it("maintains mixed fight pacing across offensive and defensive archetypes", () => {
        const fastOffense = makeFighter({
            studentId: "fast-offense",
            studentName: "Fast Offense",
            type: "FIRE",
            baseStats: { hp: 280, atk: 188, def: 104, spd: 172 },
            maxHp: 280,
            currentHp: 280,
            rankIndex: 3,
            moves: [strikeMove],
        });
        const tankDefense = makeFighter({
            studentId: "tank-defense",
            studentName: "Tank Defense",
            type: "EARTH",
            baseStats: { hp: 500, atk: 168, def: 146, spd: 110 },
            maxHp: 500,
            currentHp: 500,
            rankIndex: 3,
            moves: [strikeMove],
        });

        const result = resolveBattle(structuredClone(fastOffense), structuredClone(tankDefense), 42);
        expect(result.totalTurns).toBeGreaterThanOrEqual(2);
        expect(result.totalTurns).toBeLessThanOrEqual(18);
    });

    it("can grant extra actions in a turn when speed gap is very high", () => {
        const fast = makeFighter({
            studentId: "fast",
            baseStats: { hp: 100, atk: 22, def: 40, spd: 240 },
            actionMeter: 0,
        });
        const slow = makeFighter({
            studentId: "slow",
            studentName: "Slow",
            baseStats: { hp: 240, atk: 40, def: 20, spd: 50 },
            actionMeter: 0,
        });

        const out = resolveOneTurn(fast, slow, "strike", () => 0.5);
        const fastMoveUsed = out.events.filter((e) => e.kind === "move_used" && e.actorId === "fast").length;
        expect(fastMoveUsed).toBeGreaterThanOrEqual(2);
    });

    it("priority move still wins first action when both meters are ready", () => {
        const prioMove: MonsterMove = { ...strikeMove, id: "prio", name: "Quick", priority: 1 };
        const normalMove: MonsterMove = { ...strikeMove, id: "normal", name: "Normal", priority: 0 };

        const player = makeFighter({
            studentId: "player",
            baseStats: { hp: 100, atk: 80, def: 40, spd: 80 },
            moves: [prioMove],
            actionMeter: 130,
        });
        const enemy = makeFighter({
            studentId: "enemy",
            studentName: "Enemy",
            baseStats: { hp: 100, atk: 80, def: 40, spd: 80 },
            moves: [normalMove],
            actionMeter: 130,
        });

        const out = resolveOneTurn(player, enemy, "prio", () => 0.5);
        const firstMoveEvt = out.events.find((e) => e.kind === "move_used");
        expect(firstMoveEvt?.actorId).toBe("player");
    });

    it("BOOST_SPD immediately increases action meter by SPD delta", () => {
        const player = makeFighter({
            studentId: "player",
            baseStats: { hp: 100, atk: 80, def: 40, spd: 120 },
            moves: [boostSpdMove],
            actionMeter: 10,
        });
        const enemy = makeFighter({
            studentId: "enemy",
            studentName: "Enemy",
            baseStats: { hp: 100, atk: 60, def: 40, spd: 10 },
            moves: [],
        });

        resolveOneTurn(player, enemy, "boost-spd", () => 0.5);

        // SPD 120 -> 150 after BOOST_SPD (x1.25), so meter gains +30 immediately
        expect(player.statStages.spd).toBe(1.25);
        expect(player.actionMeter).toBeGreaterThanOrEqual(40);
    });

    it("falls back to basic attack when selected move has insufficient energy", () => {
        const expensive: MonsterMove = {
            id: "expensive",
            name: "Expensive",
            type: "FIRE",
            category: "SPECIAL",
            power: 120,
            accuracy: 100,
            learnRank: 1,
            energyCost: 80,
        };
        const player = makeFighter({
            studentId: "player",
            moves: [expensive],
            currentEnergy: 10,
            actionMeter: 110,
        });
        const enemy = makeFighter({
            studentId: "enemy",
            studentName: "Enemy",
            moves: [],
            actionMeter: 0,
        });

        const out = resolveOneTurn(player, enemy, "expensive", () => 0.5);
        const noEnergy = out.events.find((e) => e.kind === "no_energy");
        const basicMoveUsed = out.events.find(
            (e) => e.kind === "move_used" && e.actorId === "player" && e.moveName === "โจมตีธรรมดา"
        );
        const basicDamage = out.events.find(
            (e) => e.kind === "damage" && e.actorId === "player" && e.moveName === "โจมตีธรรมดา"
        );

        expect(noEnergy).toBeTruthy();
        expect(basicMoveUsed).toBeTruthy();
        expect(basicDamage?.value ?? 0).toBeGreaterThan(0);
        expect(player.currentEnergy).toBe(10);
    });

    it("lets the server choose the ready opponent even when a player move is submitted", () => {
        const player = makeFighter({
            studentId: "player",
            moves: [strikeMove],
            actionMeter: 0,
        });
        const enemy = makeFighter({
            studentId: "enemy",
            studentName: "Enemy",
            moves: [strikeMove],
            actionMeter: 110,
        });

        const out = resolveServerOwnedInteractiveTurn(player, enemy, "strike", () => 0.5);
        const moveUsed = out.events.find((e) => e.kind === "move_used");

        expect(out.actorSide).toBe("opponent");
        expect(moveUsed?.actorId).toBe("enemy");
        expect(player.currentHp).toBeLessThan(player.maxHp);
    });

    it("uses the submitted player move only when the server gives the player the action", () => {
        const player = makeFighter({
            studentId: "player",
            moves: [boostAtkMove],
            actionMeter: 110,
        });
        const enemy = makeFighter({
            studentId: "enemy",
            studentName: "Enemy",
            moves: [strikeMove],
            actionMeter: 0,
        });

        const out = resolveServerOwnedInteractiveTurn(player, enemy, "boost-atk", () => 0.5);
        const boosted = out.events.find((e) => e.kind === "status_apply" && e.actorId === "player");

        expect(out.actorSide).toBe("player");
        expect(boosted?.effect).toBe("BOOST_ATK");
    });

    it("does not stack LOWER_DEF when cast repeatedly", () => {
        const attacker = makeFighter({
            studentId: "attacker",
            moves: [lowerDefMove],
            actionMeter: 110,
        });
        const defender = makeFighter({
            studentId: "defender",
            studentName: "Defender",
            moves: [],
            actionMeter: 0,
        });

        resolveOneTurn(attacker, defender, "lower-def", () => 0.5);
        const afterFirst = defender.statStages.def;
        resolveOneTurn(attacker, defender, "lower-def", () => 0.5);
        const afterSecond = defender.statStages.def;

        expect(afterFirst).toBe(0.85);
        expect(afterSecond).toBe(0.85);
    });

    it("does not stack BOOST_ATK/BOOST_DEF/BOOST_SPD when applied repeatedly in one turn", () => {
        const attacker = makeFighter({ studentId: "attacker", actionMeter: 110 });
        const enemy = makeFighter({
            studentId: "enemy",
            studentName: "Enemy",
            baseStats: { hp: 999, atk: 40, def: 40, spd: 1 },
            moves: [],
            actionMeter: 0,
        });

        resolveOneTurn(
            {
                ...structuredClone(attacker),
                moves: [boostAtkMove],
                currentHp: 999,
                maxHp: 999,
            },
            structuredClone(enemy),
            "boost-atk",
            () => 0.5
        );
        const atkA = {
            ...structuredClone(attacker),
            moves: [boostAtkMove],
            currentHp: 999,
            maxHp: 999,
        };
        const atkB = structuredClone(enemy);
        const atkOut = resolveOneTurn(atkA, atkB, "boost-atk", () => 0.5);
        const atkApplyCount = atkOut.events.filter((e) => e.kind === "status_apply" && e.effect === "BOOST_ATK").length;
        expect(atkApplyCount).toBe(1);

        const defA = {
            ...structuredClone(attacker),
            moves: [boostDefMove],
            currentHp: 999,
            maxHp: 999,
        };
        const defB = structuredClone(enemy);
        const defOut = resolveOneTurn(defA, defB, "boost-def", () => 0.5);
        const defApplyCount = defOut.events.filter((e) => e.kind === "status_apply" && e.effect === "BOOST_DEF").length;
        expect(defApplyCount).toBe(1);

        const spdA = {
            ...structuredClone(attacker),
            moves: [boostSpdMove],
            currentHp: 999,
            maxHp: 999,
        };
        const spdB = structuredClone(enemy);
        const spdOut = resolveOneTurn(spdA, spdB, "boost-spd", () => 0.5);
        const spdApplyCount = spdOut.events.filter((e) => e.kind === "status_apply" && e.effect === "BOOST_SPD").length;
        expect(spdApplyCount).toBe(1);
    });
});
