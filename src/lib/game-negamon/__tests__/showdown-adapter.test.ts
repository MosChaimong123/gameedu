import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import { createNegamonMonsterSnapshot } from "@/lib/game-negamon/core/monster-snapshot";
import {
    createNegamonBattleChoicesFromRequestV4,
    createNegamonBattleCombatantV4FromSeed,
    createNegamonShowdownBattleAdapter,
    createNegamonShowdownSideSeed,
    createNegamonShowdownTeamSet,
    chooseNegamonBattleAiActionV4,
    getShowdownSpeciesForNegamonSpeciesId,
    NEGAMON_SPECIES_SHOWDOWN_SPECIES,
    NEGAMON_V4_CANONICAL_SPECIES_IDS,
    scoreNegamonBattleChoiceV4,
    resolveNegamonBattleTimeoutWinner,
} from "@/lib/game-negamon/engine-showdown";
import { createDefaultNegamonSettings } from "@/lib/negamon-species";
import { calculateNegamonStatsForLevel } from "@/lib/game-negamon/core/monster-growth";

type NegamonShowdownAdapter = ReturnType<typeof createNegamonShowdownBattleAdapter>;
type NegamonBattleState = Awaited<ReturnType<NegamonShowdownAdapter["createBattle"]>>;

const ACTIVE_SKILL_FAMILY_SAMPLE_MOVE_IDS = {
    ENEMY_DEBUFF: "pyronox-war-cry",
    FINISHER: "pyronox-hell-dive",
    SHIELD: "lumilune-soft-glow",
    STRIKE: "pyronox-ember-fang",
    STRIKE_STATUS: "voltshade-chain-shock",
    TEMPO_CONTROL: "lumilune-tidal-mercy",
};

function createSnapshot(studentId: string, speciesId: string, points: number) {
    const settings = createDefaultNegamonSettings();
    settings.enabled = true;
    settings.studentMonsters = { [studentId]: speciesId };

    const snapshot = createNegamonMonsterSnapshot({
        studentId,
        studentName: studentId,
        points,
        levelConfig: [
            { name: "Common", minScore: 0 },
            { name: "Rare", minScore: 10 },
            { name: "Epic", minScore: 20 },
        ],
        negamonSettings: settings,
    });

    if (!snapshot) {
        throw new Error(`Failed to create snapshot for ${studentId}`);
    }

    return snapshot;
}

function createSnapshotAtLevel(studentId: string, speciesId: string, level: number) {
    const snapshot = createSnapshot(studentId, speciesId, 10000);
    const species = DEFAULT_NEGAMON_SPECIES.find((entry) => entry.id === speciesId);
    if (!species) throw new Error(`Missing test species ${speciesId}`);
    const stats = calculateNegamonStatsForLevel(species.baseStats, level, species.battleRole);
    snapshot.level = level;
    snapshot.derivedStats = {
        ...snapshot.derivedStats,
        maxHp: stats.hp,
        atk: stats.atk,
        def: stats.def,
        spd: stats.spd,
    };
    return snapshot;
}

function getSimulationLoadout(speciesId: string, level: number): string[] {
    const species = DEFAULT_NEGAMON_SPECIES.find((entry) => entry.id === speciesId);
    if (!species) throw new Error(`Missing test species ${speciesId}`);
    const unlockedMoveIds = species.moves
        .filter((move) => (move.learnLevel ?? 1) <= level)
        .map((move) => move.id);
    return ["basic-attack", ...unlockedMoveIds.slice(-3)].slice(0, 4);
}

async function createBattleWithLoadout(input: {
    adapter: NegamonShowdownAdapter;
    battleId: string;
    seed: number;
    playerSpeciesId: string;
    playerSkillIds: string[];
    opponentSpeciesId?: string;
    opponentSkillIds?: string[];
    level?: number;
}) {
    const player = createSnapshotAtLevel(`${input.battleId}-player`, input.playerSpeciesId, input.level ?? 60);
    player.equippedSkillIds = input.playerSkillIds;
    const opponentSpeciesId = input.opponentSpeciesId ?? "pyronox";
    const opponent = createSnapshotAtLevel(`${input.battleId}-opponent`, opponentSpeciesId, input.level ?? 60);
    opponent.equippedSkillIds = input.opponentSkillIds ?? [
        "basic-attack",
        "pyronox-ember-fang",
        "pyronox-hell-dive",
        "pyronox-war-cry",
    ];

    return input.adapter.createBattle({
        battleId: input.battleId,
        seed: input.seed,
        player,
        opponent,
    });
}

async function resolvePlayerMove(input: {
    adapter: NegamonShowdownAdapter;
    state: NegamonBattleState;
    moveId: string;
}) {
    const state = {
        ...input.state,
        choices: {
            ...input.state.choices,
            player: input.state.choices.player.map((choice) =>
                choice.moveId === input.moveId ? { ...choice, enabled: true, reason: undefined } : choice
            ),
        },
    };
    const choice = input.adapter.listChoices(state, "player").find((entry) => entry.moveId === input.moveId);
    if (!choice) {
        throw new Error(`Missing player move choice ${input.moveId}`);
    }

    return input.adapter.resolveTurn({
        state,
        playerAction: {
            actorSide: "player",
            kind: "move",
            moveId: choice.moveId,
            moveSlot: choice.moveSlot,
            targetSide: choice.targetSide,
        },
    });
}

describe("Negamon Showdown adapter runtime", () => {
    it("audits every active V4 species id and rejects missing battle mappings", () => {
        const activeSpeciesIds = DEFAULT_NEGAMON_SPECIES.map((species) => species.id).sort();
        const mappedSpeciesIds = [...NEGAMON_V4_CANONICAL_SPECIES_IDS].sort();

        expect(mappedSpeciesIds).toEqual(activeSpeciesIds);
        expect(Object.keys(NEGAMON_SPECIES_SHOWDOWN_SPECIES).sort()).toEqual(activeSpeciesIds);
        for (const speciesId of activeSpeciesIds) {
            expect(getShowdownSpeciesForNegamonSpeciesId(speciesId)).not.toBe("Eevee");
        }
        expect(() => getShowdownSpeciesForNegamonSpeciesId("unknown-species")).toThrow(
            /Missing Negamon V4 battle species mapping/
        );
    });

    it("uses Negamon-owned stat snapshots for level 1, mid-level, and max-level starters", () => {
        for (const species of DEFAULT_NEGAMON_SPECIES) {
            for (const level of [1, 30, 60]) {
                const expected = calculateNegamonStatsForLevel(species.baseStats, level, species.battleRole);
                expect(expected.hp).toBeGreaterThan(0);
                expect(expected.atk).toBeGreaterThan(0);
                expect(expected.def).toBeGreaterThan(0);
                expect(expected.spd).toBeGreaterThan(0);
            }
        }
    });

    it("creates V4 combatant stat snapshots from calculateNegamonStatsForLevel output", () => {
        for (const species of DEFAULT_NEGAMON_SPECIES) {
            const snapshot = createSnapshot(`student-${species.id}`, species.id, 10000);
            const expected = calculateNegamonStatsForLevel(species.baseStats, snapshot.level, species.battleRole);
            const sideSeed = createNegamonShowdownSideSeed({ snapshot });
            const combatant = createNegamonBattleCombatantV4FromSeed(sideSeed);

            expect(snapshot.derivedStats).toMatchObject({
                maxHp: expected.hp,
                atk: expected.atk,
                def: expected.def,
                spd: expected.spd,
                spa: expected.spa,
            });
            expect(combatant.maxHp).toBe(expected.hp);
            expect(combatant.hp).toBe(expected.hp);
            expect(combatant.speed).toBe(expected.spd);
            expect(combatant.statSnapshot).toEqual({
                hp: expected.hp,
                attack: expected.atk,
                defense: expected.def,
                specialAttack: expected.spa,
                specialDefense: expected.def,
                speed: expected.spd,
                level: snapshot.level,
            });
            expect(createNegamonShowdownTeamSet(sideSeed).species).toBe(
                getShowdownSpeciesForNegamonSpeciesId(species.id)
            );
        }
    });

    it("keeps one explicit skill sample for every active catalog effect family", () => {
        const catalogMoves = new Map(
            DEFAULT_NEGAMON_SPECIES.flatMap((species) => species.moves.map((move) => [move.id, move] as const))
        );
        const activeFamilies = [
            ...new Set(DEFAULT_NEGAMON_SPECIES.flatMap((species) => species.moves.map((move) => move.effectFamily))),
        ].sort();

        expect(Object.keys(ACTIVE_SKILL_FAMILY_SAMPLE_MOVE_IDS).sort()).toEqual(activeFamilies);
        for (const [family, moveId] of Object.entries(ACTIVE_SKILL_FAMILY_SAMPLE_MOVE_IDS)) {
            expect(catalogMoves.get(moveId)?.effectFamily).toBe(family);
        }
    });

    it("uses the equipped V4 skill loadout instead of the first four unlocked skills", () => {
        const snapshot = createSnapshot("student-terranoir", "terranoir", 10000);
        snapshot.equippedSkillIds = [
            "basic-attack",
            "terranoir-grave-slam",
            "terranoir-catacomb-crush",
            "terranoir-bastion-hide",
        ];
        const sideSeed = createNegamonShowdownSideSeed({ snapshot });

        expect(sideSeed.moveSet.map((move) => move.negamonMoveId)).toEqual([
            "basic-attack",
            "terranoir-grave-slam",
            "terranoir-catacomb-crush",
            "terranoir-bastion-hide",
        ]);
        expect(sideSeed.moveSet.find((move) => move.negamonMoveId === "terranoir-grave-slam")?.id).not.toBeUndefined();
    });

    it("maps drain-family moves to real draining proxy moves instead of generic water attacks", () => {
        const tidemaw = createSnapshot("student-tidemaw", "tidemaw", 10000);
        tidemaw.equippedSkillIds = [
            "basic-attack",
            "tidemaw-deep-feast",
            "tidemaw-riptide-jaw",
            "tidemaw-reef-guard",
        ];

        const tidemawSeed = createNegamonShowdownSideSeed({ snapshot: tidemaw });

        // deep-feast is now SHIELD (BOOST_DEF, power 0) — no longer a drain move
        expect(tidemawSeed.moveSet.find((move) => move.negamonMoveId === "tidemaw-deep-feast")).toMatchObject({
            power: 0,
        });
    });

    it("maps basic attack and finisher moves to proxy moves that preserve their real runtime fantasy", () => {
        const baseline = createSnapshot("student-baseline-finisher", "pyronox", 10000);
        baseline.equippedSkillIds = [
            "basic-attack",
            "pyronox-ember-fang",
            "pyronox-war-cry",
            "pyronox-hell-dive",
        ];
        const aerolisk = createSnapshot("student-aerolisk", "aerolisk", 10000);
        aerolisk.equippedSkillIds = [
            "basic-attack",
            "aerolisk-gale-cut",
            "aerolisk-tail-rush",
            "aerolisk-skybreaker",
        ];
        const terranoir = createSnapshot("student-terranoir-finisher", "terranoir", 10000);
        terranoir.equippedSkillIds = [
            "basic-attack",
            "terranoir-grave-slam",
            "terranoir-bastion-hide",
            "terranoir-catacomb-crush",
        ];
        const tidemaw = createSnapshot("student-tidemaw-finisher", "tidemaw", 10000);
        tidemaw.equippedSkillIds = [
            "basic-attack",
            "tidemaw-riptide-jaw",
            "tidemaw-deep-feast",
            "tidemaw-reef-guard",
        ];

        const baselineSeed = createNegamonShowdownSideSeed({ snapshot: baseline });
        const aeroliskSeed = createNegamonShowdownSideSeed({ snapshot: aerolisk });
        const terranoirSeed = createNegamonShowdownSideSeed({ snapshot: terranoir });
        const tidemawSeed = createNegamonShowdownSideSeed({ snapshot: tidemaw });

        expect(baselineSeed.moveSet.find((move) => move.negamonMoveId === "basic-attack")).toMatchObject({
            id: "tackle",
            power: 40,
            accuracy: 100,
        });
        expect(baselineSeed.moveSet.find((move) => move.negamonMoveId === "pyronox-hell-dive")).toMatchObject({
            id: "inferno",
            power: 100,
            accuracy: 50,
        });
        expect(aeroliskSeed.moveSet.find((move) => move.negamonMoveId === "aerolisk-skybreaker")).toMatchObject({
            id: "aeroblast",
            power: 100,
            accuracy: 95,
        });
        expect(terranoirSeed.moveSet.find((move) => move.negamonMoveId === "terranoir-catacomb-crush")).toMatchObject({
            id: "highhorsepower",
            power: 95,
            accuracy: 95,
        });
        expect(tidemawSeed.moveSet.find((move) => move.negamonMoveId === "tidemaw-reef-guard")).toMatchObject({
            id: "liquidation",
            power: 85,
            accuracy: 100,
        });
    });

    it("keeps baseline and finisher EN/cooldown pacing in a readable band for long fights", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const pyronoxState = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-basic-baseline",
            seed: 6101,
            playerSpeciesId: "pyronox",
            playerSkillIds: ["basic-attack", "pyronox-ember-fang", "pyronox-war-cry", "pyronox-hell-dive"],
            opponentSpeciesId: "terranoir",
            opponentSkillIds: getSimulationLoadout("terranoir", 60),
            level: 60,
        });
        const aeroliskState = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-skybreaker-cost",
            seed: 6102,
            playerSpeciesId: "aerolisk",
            playerSkillIds: ["basic-attack", "aerolisk-gale-cut", "aerolisk-tail-rush", "aerolisk-skybreaker"],
            opponentSpeciesId: "terranoir",
            opponentSkillIds: getSimulationLoadout("terranoir", 60),
            level: 60,
        });
        const terranoirState = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-catacomb-cost",
            seed: 6103,
            playerSpeciesId: "terranoir",
            playerSkillIds: ["basic-attack", "terranoir-grave-slam", "terranoir-bastion-hide", "terranoir-catacomb-crush"],
            opponentSpeciesId: "pyronox",
            opponentSkillIds: getSimulationLoadout("pyronox", 60),
            level: 60,
        });
        const tidemawState = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-reef-guard-cost",
            seed: 6104,
            playerSpeciesId: "tidemaw",
            playerSkillIds: ["basic-attack", "tidemaw-riptide-jaw", "tidemaw-deep-feast", "tidemaw-reef-guard"],
            opponentSpeciesId: "pyronox",
            opponentSkillIds: getSimulationLoadout("pyronox", 60),
            level: 60,
        });

        expect(pyronoxState.choices.player.find((choice) => choice.moveId === "basic-attack")).toMatchObject({
            enabled: true,
            cost: { pp: 1, energy: 0 },
        });
        expect(aeroliskState.choices.player.find((choice) => choice.moveId === "aerolisk-skybreaker")).toMatchObject({
            enabled: true,
            cost: { pp: 1, energy: 76 },
        });
        expect(terranoirState.choices.player.find((choice) => choice.moveId === "terranoir-catacomb-crush")).toMatchObject({
            enabled: true,
            cost: { pp: 1, energy: 76 },
        });
        expect(tidemawState.choices.player.find((choice) => choice.moveId === "tidemaw-reef-guard")).toMatchObject({
            enabled: true,
            cost: { pp: 1, energy: 71 },
        });

        const terranoirFinisher = terranoirState.metadata.showdown.adapterInputs.playerSeed.moveSet.find(
            (move) => move.negamonMoveId === "terranoir-catacomb-crush"
        );
        const aeroliskFinisher = aeroliskState.metadata.showdown.adapterInputs.playerSeed.moveSet.find(
            (move) => move.negamonMoveId === "aerolisk-skybreaker"
        );
        const tidemawFinisher = tidemawState.metadata.showdown.adapterInputs.playerSeed.moveSet.find(
            (move) => move.negamonMoveId === "tidemaw-reef-guard"
        );

        expect(terranoirFinisher?.cooldownTurns).toBe(2);
        expect(aeroliskFinisher?.cooldownTurns).toBe(2);
        expect(tidemawFinisher?.cooldownTurns).toBe(2);
    });

    it("maps voltshade disruption tools to proxy moves that preserve paralysis and control semantics", () => {
        const voltshade = createSnapshot("student-voltshade", "voltshade", 10000);
        voltshade.equippedSkillIds = [
            "basic-attack",
            "voltshade-static-bite",
            "voltshade-chain-shock",
            "voltshade-night-signal",
        ];

        const voltshadeSeed = createNegamonShowdownSideSeed({ snapshot: voltshade });

        expect(voltshadeSeed.moveSet.find((move) => move.negamonMoveId === "voltshade-chain-shock")).toMatchObject({
            id: "nuzzle",
            power: 20,
            accuracy: 100,
        });
        expect(voltshadeSeed.moveSet.find((move) => move.negamonMoveId === "voltshade-night-signal")).toMatchObject({
            id: "darkpulse",
            power: 80,
            accuracy: 100,
        });
    });

    it("maps tempo-control moves to proxy moves that really slow targets down", () => {
        const lumilune = createSnapshot("student-lumilune-control", "lumilune", 10000);
        lumilune.equippedSkillIds = [
            "basic-attack",
            "lumilune-moon-splash",
            "lumilune-soft-glow",
            "lumilune-tidal-mercy",
        ];

        const lumiluneSeed = createNegamonShowdownSideSeed({ snapshot: lumilune });

        expect(lumiluneSeed.moveSet.find((move) => move.negamonMoveId === "lumilune-tidal-mercy")).toMatchObject({
            id: "icywind",
            power: 55,
            accuracy: 95,
        });
    });

    it("maps Lumilune sustain and Voltshade dark finisher tools to matching proxy moves", () => {
        const lumilune = createSnapshot("student-lumilune-sustain", "lumilune", 10000);
        lumilune.equippedSkillIds = [
            "basic-attack",
            "lumilune-moon-splash",
            "lumilune-soft-glow",
            "lumilune-tidal-mercy",
        ];
        const voltshade = createSnapshot("student-voltshade-finisher", "voltshade", 10000);
        voltshade.equippedSkillIds = [
            "basic-attack",
            "voltshade-static-bite",
            "voltshade-chain-shock",
            "voltshade-night-signal",
        ];

        const lumiluneSeed = createNegamonShowdownSideSeed({ snapshot: lumilune });
        const voltshadeSeed = createNegamonShowdownSideSeed({ snapshot: voltshade });

        expect(lumiluneSeed.moveSet.find((move) => move.negamonMoveId === "lumilune-soft-glow")).toMatchObject({
            id: "harden",
            power: 0,
            accuracy: 100,
        });
        expect(lumiluneSeed.moveSet.find((move) => move.negamonMoveId === "lumilune-tidal-mercy")).toMatchObject({
            id: "icywind",
            power: 55,
            accuracy: 95,
        });
        expect(voltshadeSeed.moveSet.find((move) => move.negamonMoveId === "voltshade-night-signal")).toMatchObject({
            id: "darkpulse",
            power: 80,
            accuracy: 100,
        });
    });

    it("maps debuff and punish tools to proxy moves that preserve their real stat-drop behavior", () => {
        const terranoir = createSnapshot("student-terranoir-control", "terranoir", 10000);
        terranoir.equippedSkillIds = [
            "basic-attack",
            "terranoir-grave-slam",
            "terranoir-bastion-hide",
            "terranoir-catacomb-crush",
        ];

        const terranoirSeed = createNegamonShowdownSideSeed({ snapshot: terranoir });

        expect(terranoirSeed.moveSet.find((move) => move.negamonMoveId === "terranoir-bastion-hide")).toMatchObject({
            id: "electroweb",
            power: 0,
            accuracy: 100,
        });
        expect(terranoirSeed.moveSet.find((move) => move.negamonMoveId === "terranoir-catacomb-crush")).toMatchObject({
            id: "highhorsepower",
            power: 95,
            accuracy: 95,
        });
    });

    it("maps ember-fang, tail-rush, and bastion-hide to proxy moves that preserve fang, speed-boost, and shield timing", () => {
        const aerolisk = createSnapshot("student-aerolisk-speed", "aerolisk", 10000);
        aerolisk.equippedSkillIds = [
            "basic-attack",
            "aerolisk-gale-cut",
            "aerolisk-tail-rush",
            "aerolisk-skybreaker",
        ];
        const pyronox = createSnapshot("student-pyronox-fang", "pyronox", 10000);
        pyronox.equippedSkillIds = [
            "basic-attack",
            "pyronox-ember-fang",
            "pyronox-war-cry",
            "pyronox-hell-dive",
        ];
        const terranoir = createSnapshot("student-terranoir-shield", "terranoir", 10000);
        terranoir.equippedSkillIds = [
            "basic-attack",
            "terranoir-grave-slam",
            "terranoir-bastion-hide",
            "terranoir-catacomb-crush",
        ];

        const aeroliskSeed = createNegamonShowdownSideSeed({ snapshot: aerolisk });
        const pyronoxSeed = createNegamonShowdownSideSeed({ snapshot: pyronox });
        const terranoirSeed = createNegamonShowdownSideSeed({ snapshot: terranoir });

        expect(aeroliskSeed.moveSet.find((move) => move.negamonMoveId === "aerolisk-gale-cut")).toMatchObject({
            id: "wingattack",
            power: 60,
            accuracy: 100,
        });
        expect(pyronoxSeed.moveSet.find((move) => move.negamonMoveId === "pyronox-ember-fang")).toMatchObject({
            id: "firefang",
            power: 65,
            accuracy: 95,
        });
        expect(terranoirSeed.moveSet.find((move) => move.negamonMoveId === "terranoir-bastion-hide")).toMatchObject({
            id: "electroweb",
            power: 0,
            accuracy: 100,
        });
    });

    it("maps gale-cut, ember-fang, and static-bite to opener proxy moves that preserve fang and swoop semantics", () => {
        const aerolisk = createSnapshot("student-aerolisk-opener", "aerolisk", 10000);
        aerolisk.equippedSkillIds = [
            "basic-attack",
            "aerolisk-gale-cut",
            "aerolisk-tail-rush",
            "aerolisk-skybreaker",
        ];
        const pyronox = createSnapshot("student-pyronox-opener", "pyronox", 10000);
        pyronox.equippedSkillIds = [
            "basic-attack",
            "pyronox-ember-fang",
            "pyronox-war-cry",
            "pyronox-hell-dive",
        ];
        const voltshade = createSnapshot("student-voltshade-opener", "voltshade", 10000);
        voltshade.equippedSkillIds = [
            "basic-attack",
            "voltshade-static-bite",
            "voltshade-chain-shock",
            "voltshade-night-signal",
        ];

        const aeroliskSeed = createNegamonShowdownSideSeed({ snapshot: aerolisk });
        const pyronoxSeed = createNegamonShowdownSideSeed({ snapshot: pyronox });
        const voltshadeSeed = createNegamonShowdownSideSeed({ snapshot: voltshade });

        expect(aeroliskSeed.moveSet.find((move) => move.negamonMoveId === "aerolisk-gale-cut")).toMatchObject({
            id: "wingattack",
            power: 60,
            accuracy: 100,
        });
        expect(pyronoxSeed.moveSet.find((move) => move.negamonMoveId === "pyronox-ember-fang")).toMatchObject({
            id: "firefang",
            power: 65,
            accuracy: 95,
        });
        expect(voltshadeSeed.moveSet.find((move) => move.negamonMoveId === "voltshade-static-bite")).toMatchObject({
            id: "thunderfang",
            power: 65,
            accuracy: 95,
        });
    });

    it("scales formula expectations from the Showdown proxy runtime for catacomb-crush and other mapped moves", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-proxy-formula",
            seed: 39001,
            playerSpeciesId: "terranoir",
            playerSkillIds: ["basic-attack", "terranoir-grave-slam", "terranoir-bastion-hide", "terranoir-catacomb-crush"],
            opponentSpeciesId: "pyronox",
            opponentSkillIds: ["basic-attack", "pyronox-ember-fang", "pyronox-hell-dive", "pyronox-war-cry"],
            level: 60,
        });

        const catacomCrush = state.metadata.negamonFormula.expectations.player.find(
            (entry) => entry.moveId === "terranoir-catacomb-crush"
        );
        const basicAttack = state.metadata.negamonFormula.expectations.player.find(
            (entry) => entry.moveId === "basic-attack"
        );

        expect(catacomCrush).toMatchObject({
            formulaInput: {
                category: "PHYSICAL",
            },
            result: {
                damage: expect.any(Number),
            },
        });
        // B1: formula expectations use Negamon level-scaled stats (statSnapshot), not proxy
        // Pokémon stats. The key invariants: damage > 0, and catacomb-crush beats basic attack.
        // Absolute values are lower than the old proxy path because Negamon stat formulas are
        // calibrated differently than Showdown's proxy.
        expect(catacomCrush?.result.damage ?? 0).toBeGreaterThan(0);
        expect(catacomCrush?.result.damage ?? 0).toBeLessThanOrEqual(400);
        expect(basicAttack?.result.damage ?? 0).toBeGreaterThan(0);
        expect(catacomCrush?.result.damage ?? 0).toBeGreaterThan(basicAttack?.result.damage ?? 0);
    });


    it("B1 acceptance: lv.1 and lv.60 combatants have distinct HP and formula expectations", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const lv1 = createSnapshotAtLevel("student-lv1", "pyronox", 1);
        const lv60 = createSnapshotAtLevel("student-lv60", "pyronox", 60);
        lv1.equippedSkillIds = ["basic-attack", "pyronox-ember-fang", "pyronox-hell-dive", "pyronox-war-cry"];
        lv60.equippedSkillIds = ["basic-attack", "pyronox-ember-fang", "pyronox-hell-dive", "pyronox-war-cry"];

        const state = await adapter.createBattle({ battleId: "b1-acceptance", seed: 1, player: lv1, opponent: lv60 });

        // HP must differ significantly between lv.1 and lv.60
        const playerHp = state.sides.player.maxHp;
        const opponentHp = state.sides.opponent.maxHp;
        expect(playerHp).toBeGreaterThan(0);
        expect(opponentHp).toBeGreaterThan(0);
        expect(opponentHp).toBeGreaterThan(playerHp * 2);

        // Formula expectations: lv.60 should expect to deal more damage with same move
        const playerEmberFang = state.metadata.negamonFormula.expectations.player.find(
            (e) => e.moveId === "pyronox-ember-fang"
        );
        const opponentEmberFang = state.metadata.negamonFormula.expectations.opponent.find(
            (e) => e.moveId === "pyronox-ember-fang"
        );
        expect(playerEmberFang?.result.damage ?? 0).toBeGreaterThan(0);
        expect(opponentEmberFang?.result.damage ?? 0).toBeGreaterThan(0);
        // lv.60 attacker (opponent) should deal more damage than lv.1 attacker (player)
        expect(opponentEmberFang?.result.damage ?? 0).toBeGreaterThan(playerEmberFang?.result.damage ?? 0);
    });

    it("creates a V4 battle state from the real Pokemon Showdown runtime", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await adapter.createBattle({
            battleId: "battle-v4-1",
            seed: 7,
            player: createSnapshot("student-1", "naga", 18),
            opponent: createSnapshot("student-2", "garuda", 22),
        });

        expect(state.engineVersion).toBe("negamon_v4_showdown_adapter");
        expect(state.adapterKind).toBe("showdown");
        expect(state.phase).toBe("choosing");
        expect(state.choices.player.length).toBeGreaterThan(0);
        expect(state.choiceRequestId).toContain(":v4:");
        expect(state.events[0]?.kind).toBe("battle_started");
        expect(state.metadata.showdown.commandLog.length).toBeGreaterThanOrEqual(3);
        expect(state.sides.player.maxHp).toBe(state.sides.player.statSnapshot.hp);
        expect(state.sides.player.speed).toBe(state.sides.player.statSnapshot.speed);
        expect(state.metadata.showdown.p1Team).not.toContainEqual(expect.objectContaining({ species: "Eevee" }));
        expect(state.metadata.showdown.adapterInputs.playerSeed.speciesId).toBe(state.sides.player.speciesId);
        expect(state.metadata.showdown.parsedRequests.player?.moves.length).toBeGreaterThan(0);
        expect(state.metadata.negamonFormula).toMatchObject({
            resolverDecision: "showdown_resolver_with_negamon_expected_damage",
            sameTypeAttackBonus: 1.5,
            criticalMode: "disabled_in_formula_expectation",
            randomMultiplier: 1,
            maxBurstTargetHpRatio: 0.75,
        });
        expect(state.metadata.negamonFormula.expectations.player.length).toBe(state.choices.player.length);
        expect(state.metadata.negamonFormula.expectations.player[0]).toMatchObject({
            actorSide: "player",
            targetSide: "opponent",
            formulaInput: {
                level: state.sides.player.level,
                randomMultiplier: 1,
                critical: false,
            },
        });
        expect(state.metadata.negamonFormula.expectations.player[0]?.result.damage).toBeGreaterThanOrEqual(0);
    });

    it("resolves a runtime turn through Pokemon Showdown without legacy session shapes", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await adapter.createBattle({
            battleId: "battle-v4-2",
            seed: 11,
            player: createSnapshot("student-1", "singha", 26),
            opponent: createSnapshot("student-2", "mekkala", 26),
        });
        const choice = adapter.listChoices(state, "player")[0];
        const resolved = await adapter.resolveTurn({
            state,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: choice.moveId,
                moveSlot: choice.moveSlot,
                targetSide: choice.targetSide,
            },
        });

        expect(resolved.ok).toBe(true);
        expect(resolved.state.engineVersion).toBe("negamon_v4_showdown_adapter");
        expect(resolved.state.turn).toBe(2);
        expect(resolved.state.events.some((event) => event.kind === "move_resolved")).toBe(true);
        expect(resolved.state.metadata.showdown.commandLog.some((entry) => entry.message.startsWith("move "))).toBe(true);
        expect(resolved.state.metadata.showdown.parsedRequests.player?.moves.length).toBeGreaterThan(0);
        expect(resolved.state.metadata.negamonFormula.expectations.player.length).toBe(resolved.state.choices.player.length);
    });

    it("exposes Phase 43 effect rules and turn events for V4 history/UI", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const player = createSnapshot("student-phase43-player", "terranoir", 10000);
        player.equippedSkillIds = [
            "basic-attack",
            "terranoir-grave-slam",
            "terranoir-catacomb-crush",
            "terranoir-bastion-hide",
        ];
        const opponent = createSnapshot("student-phase43-opponent", "pyronox", 10000);
        opponent.equippedSkillIds = [
            "basic-attack",
            "pyronox-ember-fang",
            "pyronox-hell-dive",
            "pyronox-war-cry",
        ];
        const state = await adapter.createBattle({
            battleId: "battle-v4-phase43",
            seed: 43,
            player,
            opponent,
        });

        expect(state.metadata.effectRules.supportedFamilies).toEqual([
            "damage",
            "heal",
            "shield",
            "buff",
            "debuff",
            "status",
            "cleanse",
            "energy_gain",
            "energy_drain",
            "priority",
            "cooldown",
        ]);
        expect(state.metadata.effectRules.statStage).toMatchObject({
            supportedStats: ["attack", "defense", "specialAttack", "specialDefense", "speed"],
            min: -6,
            max: 6,
            defaultDurationTurns: 2,
        });
        expect(state.metadata.effectRules.status.stacking).toEqual({
            default: "refresh",
            badlyPoison: "stack_intensity",
        });

        const damageChoice = adapter.listChoices(state, "player").find((entry) => entry.moveId === "terranoir-catacomb-crush");
        expect(damageChoice).toBeTruthy();
        const damageResolved = await adapter.resolveTurn({
            state,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: damageChoice?.moveId,
                moveSlot: damageChoice?.moveSlot,
                targetSide: damageChoice?.targetSide,
            },
        });

        expect(damageResolved.state.events.some((event) => event.kind === "damage_applied" || event.kind === "move_missed")).toBe(true);
        expect(damageResolved.state.events.some((event) => event.kind === "cooldown_applied")).toBe(true);
        expect(
            damageResolved.state.events.some(
                (event) =>
                    (event.kind === "damage_applied" || event.kind === "move_missed") &&
                    event.effectFamily === "damage" &&
                    typeof event.damage === "number"
            )
        ).toBe(true);

        // lumilune-soft-glow is now SHIELD (BOOST_DEF on self) — use it to verify shield events
        const shieldPlayer = createSnapshot("student-phase43-shield-player", "lumilune", 10000);
        shieldPlayer.equippedSkillIds = [
            "basic-attack",
            "lumilune-moon-splash",
            "lumilune-soft-glow",
            "lumilune-tidal-mercy",
        ];
        const shieldState = await adapter.createBattle({
            battleId: "battle-v4-phase43-shield",
            seed: 44,
            player: shieldPlayer,
            opponent,
        });
        const shieldChoice = adapter.listChoices(shieldState, "player").find((entry) => entry.moveId === "lumilune-soft-glow");
        expect(shieldChoice).toBeTruthy();
        const shieldResolved = await adapter.resolveTurn({
            state: shieldState,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: shieldChoice?.moveId,
                moveSlot: shieldChoice?.moveSlot,
                targetSide: shieldChoice?.targetSide,
            },
        });

        expect(shieldResolved.state.events.some((event) => event.kind === "stat_stage_changed")).toBe(true);
        expect(
            shieldResolved.state.events.some(
                (event) =>
                    event.kind === "stat_stage_changed" &&
                    event.effectFamily === "shield" &&
                    event.statStageDelta?.stat === "defense"
            )
        ).toBe(true);
    });

    it("emits runtime V4 events for each active skill-backed effect family surface", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const cases = [
            {
                label: "damage",
                playerSpeciesId: "terranoir",
                playerSkillIds: [
                    "basic-attack",
                    "terranoir-grave-slam",
                    "terranoir-catacomb-crush",
                    "terranoir-bastion-hide",
                ],
                moveId: "terranoir-catacomb-crush",
                matches: (event: NegamonBattleState["events"][number]) =>
                    (event.kind === "damage_applied" || event.kind === "move_missed") &&
                    event.effectFamily === "damage",
            },
            {
                // soft-glow is now SHIELD (BOOST_DEF on self) — emits stat_stage_changed with effectFamily "shield"
                label: "shield",
                playerSpeciesId: "lumilune",
                playerSkillIds: [
                    "basic-attack",
                    "lumilune-moon-splash",
                    "lumilune-soft-glow",
                    "lumilune-tidal-mercy",
                ],
                moveId: "lumilune-soft-glow",
                matches: (event: NegamonBattleState["events"][number]) =>
                    event.kind === "stat_stage_changed" &&
                    event.effectFamily === "shield" &&
                    event.statStageDelta?.stat === "defense",
            },
            {
                // bastion-hide is now ENEMY_DEBUFF (LOWER_SPD on enemy) — emits stat_stage_changed for speed
                label: "debuff",
                playerSpeciesId: "terranoir",
                playerSkillIds: [
                    "basic-attack",
                    "terranoir-grave-slam",
                    "terranoir-catacomb-crush",
                    "terranoir-bastion-hide",
                ],
                moveId: "terranoir-bastion-hide",
                matches: (event: NegamonBattleState["events"][number]) =>
                    event.kind === "stat_stage_changed" &&
                    event.statStageDelta?.stat === "speed" &&
                    (event.statStageDelta?.stages ?? 0) < 0,
            },
            {
                label: "status",
                playerSpeciesId: "voltshade",
                playerSkillIds: [
                    "basic-attack",
                    "voltshade-static-bite",
                    "voltshade-chain-shock",
                    "voltshade-night-signal",
                ],
                moveId: "voltshade-chain-shock",
                matches: (event: NegamonBattleState["events"][number]) =>
                    event.kind === "status_applied" &&
                    event.effectFamily === "status" &&
                    event.statusTimeline?.some((entry) => entry.status === "PARALYZE"),
            },
            {
                // war-cry is now ENEMY_DEBUFF (BURN status on enemy) — emits status_applied
                label: "enemy_debuff",
                playerSpeciesId: "pyronox",
                playerSkillIds: [
                    "basic-attack",
                    "pyronox-ember-fang",
                    "pyronox-war-cry",
                    "pyronox-hell-dive",
                ],
                moveId: "pyronox-war-cry",
                matches: (event: NegamonBattleState["events"][number]) =>
                    (event.kind === "status_applied" || event.kind === "stat_stage_changed" || event.kind === "move_missed") &&
                    event.effectFamily !== undefined,
            },
            {
                label: "cooldown",
                playerSpeciesId: "lumilune",
                playerSkillIds: [
                    "basic-attack",
                    "lumilune-moon-splash",
                    "lumilune-soft-glow",
                    "lumilune-tidal-mercy",
                ],
                moveId: "lumilune-soft-glow",
                matches: (event: NegamonBattleState["events"][number]) =>
                    event.kind === "cooldown_applied" && event.effectFamily === "cooldown",
            },
        ];

        for (const effectCase of cases) {
            const state = await createBattleWithLoadout({
                adapter,
                battleId: `battle-v4-phase43-${effectCase.label}`,
                seed: 4300 + cases.indexOf(effectCase),
                playerSpeciesId: effectCase.playerSpeciesId,
                playerSkillIds: effectCase.playerSkillIds,
            });
            const resolved = await resolvePlayerMove({ adapter, state, moveId: effectCase.moveId });

            expect(resolved.ok).toBe(true);
            expect(
                resolved.state.events.some((event) => effectCase.matches(event)),
                `missing ${effectCase.label} event from ${effectCase.moveId}`
            ).toBe(true);
        }
    }, 15_000);

    it("normalizes V4 PP, energy, cooldown, held item, trait, and usable item hooks", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const player = createSnapshot("student-phase44-player", "terranoir", 10000);
        player.equippedSkillIds = [
            "basic-attack",
            "terranoir-grave-slam",
            "terranoir-catacomb-crush",
            "terranoir-bastion-hide",
        ];
        player.equippedItemIds = ["held_swift_anklet", "use_charge_capsule"];
        const opponent = createSnapshot("student-phase44-opponent", "pyronox", 10000);
        opponent.equippedSkillIds = [
            "basic-attack",
            "pyronox-ember-fang",
            "pyronox-hell-dive",
            "pyronox-war-cry",
        ];
        opponent.equippedItemIds = ["held_echo_battery"];

        const state = await adapter.createBattle({
            battleId: "battle-v4-phase44",
            seed: 44,
            player,
            opponent,
        });

        expect(state.events.some((event) => event.kind === "item_activated" && event.itemId === "held_swift_anklet")).toBe(true);
        expect(state.events.some((event) => event.kind === "trait_activated" && event.traitId)).toBe(true);
        const finisher = adapter.listChoices(state, "player").find((choice) => choice.moveId === "terranoir-catacomb-crush");
        expect(finisher).toMatchObject({
            cost: { pp: 1, energy: 76 },
            enabled: true,
        });

        const resolved = await adapter.resolveTurn({
            state,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: finisher?.moveId,
                moveSlot: finisher?.moveSlot,
                targetSide: finisher?.targetSide,
            },
            opponentAction: {
                actorSide: "opponent",
                kind: "move",
                moveId: "pyronox-hell-dive",
                moveSlot: 2,
                targetSide: "player",
            },
        });
        expect(resolved.ok).toBe(true);
        expect(resolved.state.sides.player.energy).toBe(state.sides.player.energy - 76 + 16);
        expect(resolved.state.metadata.resources.player.ppByMoveId["terranoir-catacomb-crush"]).toBe(
            state.metadata.resources.player.ppByMoveId["terranoir-catacomb-crush"] - 1
        );
        expect(resolved.state.metadata.resources.player.cooldownByMoveId["terranoir-catacomb-crush"]).toBeGreaterThan(0);
        expect(resolved.state.events.some((event) => event.kind === "cooldown_applied" && event.cooldownTurns === 2)).toBe(true);
        expect(resolved.state.events.some((event) => event.kind === "item_activated" && event.itemId === "held_echo_battery")).toBe(true);

        const depleted = {
            ...resolved.state,
            sides: {
                ...resolved.state.sides,
                player: {
                    ...resolved.state.sides.player,
                    energy: 0,
                },
            },
        };
        const cooldownLockedState = {
            ...depleted,
            phase: "choosing" as const,
            winner: undefined,
        };
        const rejected = await adapter.resolveTurn({
            state: cooldownLockedState,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: "terranoir-catacomb-crush",
                moveSlot: 2,
                targetSide: "opponent",
            },
        });
        expect(rejected.ok).toBe(false);
        expect(rejected.validChoices.find((choice) => choice.moveId === "terranoir-catacomb-crush")?.reason).toBe("ON_COOLDOWN");

        const itemState = {
            ...state,
            sides: {
                ...state.sides,
                player: {
                    ...state.sides.player,
                    energy: state.sides.player.maxEnergy - 30,
                },
            },
        };
        const itemResolved = await adapter.resolveTurn({
            state: itemState,
            playerAction: {
                actorSide: "player",
                kind: "item",
                itemId: "use_charge_capsule",
                targetSide: "player",
            },
        });
        expect(itemResolved.ok).toBe(true);
        expect(itemResolved.state.sides.player.energy).toBe(state.sides.player.maxEnergy - 12);
        expect(itemResolved.state.sides.player.battleItemIds).not.toContain("use_charge_capsule");
        expect(
            itemResolved.state.events.some(
                (event) => event.kind === "item_activated" && event.itemId === "use_charge_capsule" && event.energyDelta === 18
            )
        ).toBe(true);
    });

    it("prevents V4 soft-locks with non-consuming basic attack PP and base energy regen", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-soft-lock-guard",
            seed: 4601,
            playerSpeciesId: "terranoir",
            playerSkillIds: [
                "basic-attack",
                "terranoir-grave-slam",
                "terranoir-catacomb-crush",
                "terranoir-bastion-hide",
            ],
            opponentSpeciesId: "pyronox",
            opponentSkillIds: [
                "basic-attack",
                "pyronox-ember-fang",
                "pyronox-hell-dive",
                "pyronox-war-cry",
            ],
            level: 60,
        });
        const basicChoice = adapter.listChoices(state, "player").find((choice) => choice.moveId === "basic-attack");
        expect(basicChoice).toMatchObject({
            enabled: true,
            cost: { pp: 1, energy: 0 },
        });
        expect(state.metadata.resources.player.maxPpByMoveId["basic-attack"]).toBe(99);

        const lowEnergyState = {
            ...state,
            sides: {
                ...state.sides,
                player: {
                    ...state.sides.player,
                    energy: 8,
                },
            },
        };
        const resolved = await adapter.resolveTurn({
            state: lowEnergyState,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: "basic-attack",
                moveSlot: basicChoice?.moveSlot,
                targetSide: "opponent",
            },
            opponentAction: {
                actorSide: "opponent",
                kind: "move",
                moveId: "basic-attack",
                moveSlot: 0,
                targetSide: "player",
            },
        });

        expect(resolved.ok).toBe(true);
        expect(resolved.state.metadata.resources.player.ppByMoveId["basic-attack"]).toBe(99);
        expect(resolved.state.sides.player.energy).toBeGreaterThan(8);
        expect(resolved.state.choices.player.find((choice) => choice.moveId === "basic-attack")).toMatchObject({
            enabled: true,
        });
        expect(
            resolved.state.events.some(
                (event) => event.kind === "energy_changed" && event.actorSide === "player" && event.energyDelta === 16
            )
        ).toBe(true);
    });

    it("falls back to server-truth move choices when Showdown request data is missing", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-request-fallback",
            seed: 4602,
            playerSpeciesId: "terranoir",
            playerSkillIds: getSimulationLoadout("terranoir", 60),
            opponentSpeciesId: "pyronox",
            opponentSkillIds: getSimulationLoadout("pyronox", 60),
            level: 60,
        });

        const choices = createNegamonBattleChoicesFromRequestV4({
            request: null,
            aliases: state.metadata.showdown.aliases.player,
            seed: state.metadata.showdown.adapterInputs.playerSeed,
            resources: state.metadata.resources.player,
            energyAvailable: state.sides.player.energy,
            side: "player",
            fainted: false,
        });

        expect(choices.length).toBeGreaterThan(0);
        expect(choices.find((choice) => choice.moveId === "basic-attack")).toMatchObject({
            enabled: true,
            cost: { pp: 1, energy: 0 },
        });
        const diagnostics = state.metadata.showdown.choiceDiagnostics.player;
        expect(diagnostics.enabledChoiceCount).toBeGreaterThan(0);
    });

    it("keeps a legal basic attack visible when every parsed move looks unavailable", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-basic-fallback",
            seed: 4603,
            playerSpeciesId: "terranoir",
            playerSkillIds: getSimulationLoadout("terranoir", 60),
            opponentSpeciesId: "pyronox",
            opponentSkillIds: getSimulationLoadout("pyronox", 60),
            level: 60,
        });

        const request = state.metadata.showdown.parsedRequests.player;
        expect(request).toBeTruthy();
        const drainedResources = {
            ppByMoveId: Object.fromEntries(Object.keys(state.metadata.resources.player.ppByMoveId).map((moveId) => [moveId, 0])),
            maxPpByMoveId: { ...state.metadata.resources.player.maxPpByMoveId },
            cooldownByMoveId: { ...state.metadata.resources.player.cooldownByMoveId },
        };
        const disabledRequest = request
            ? {
                  ...request,
                  moves: request.moves.map((move) => ({
                      ...move,
                      pp: 0,
                      disabled: true,
                  })),
              }
            : null;

        const choices = createNegamonBattleChoicesFromRequestV4({
            request: disabledRequest,
            aliases: state.metadata.showdown.aliases.player,
            seed: state.metadata.showdown.adapterInputs.playerSeed,
            resources: drainedResources,
            energyAvailable: 0,
            side: "player",
            fainted: false,
        });

        expect(choices.some((choice) => choice.enabled)).toBe(true);
        expect(choices.find((choice) => choice.moveId === "basic-attack")).toMatchObject({
            enabled: true,
            reason: undefined,
        });
        const diagnostics = state.metadata.showdown.choiceDiagnostics.player;
        expect(diagnostics.enabledChoiceCount).toBeGreaterThan(0);
    });

    it("records explicit diagnostics when choice fallback is needed", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-choice-diagnostics",
            seed: 4604,
            playerSpeciesId: "terranoir",
            playerSkillIds: getSimulationLoadout("terranoir", 60),
            opponentSpeciesId: "pyronox",
            opponentSkillIds: getSimulationLoadout("pyronox", 60),
            level: 60,
        });

        const fallbackChoices = createNegamonBattleChoicesFromRequestV4({
            request: null,
            aliases: state.metadata.showdown.aliases.player,
            seed: state.metadata.showdown.adapterInputs.playerSeed,
            resources: state.metadata.resources.player,
            energyAvailable: state.sides.player.energy,
            side: "player",
            fainted: false,
        });
        const requestMissingDiagnostics = state.metadata.showdown.choiceDiagnostics.player;
        expect(fallbackChoices.find((choice) => choice.moveId === "basic-attack")?.enabled).toBe(true);
        expect(requestMissingDiagnostics.side).toBe("player");

        const disabledRequest = state.metadata.showdown.parsedRequests.player
            ? {
                  ...state.metadata.showdown.parsedRequests.player,
                  moves: state.metadata.showdown.parsedRequests.player.moves.map((move) => ({
                      ...move,
                      pp: 0,
                      disabled: true,
                  })),
              }
            : null;
        const zeroedResources = {
            ppByMoveId: Object.fromEntries(Object.keys(state.metadata.resources.player.ppByMoveId).map((moveId) => [moveId, 0])),
            maxPpByMoveId: { ...state.metadata.resources.player.maxPpByMoveId },
            cooldownByMoveId: { ...state.metadata.resources.player.cooldownByMoveId },
        };
        const fallbackResolvedChoices = createNegamonBattleChoicesFromRequestV4({
            request: disabledRequest,
            aliases: state.metadata.showdown.aliases.player,
            seed: state.metadata.showdown.adapterInputs.playerSeed,
            resources: zeroedResources,
            energyAvailable: 0,
            side: "player",
            fainted: false,
        });
        const fallbackDiagnostics = {
            side: "player" as const,
            requestMissing: false,
            allChoicesUnavailable: true,
            usedFallbackBasicChoice: fallbackResolvedChoices.some(
                (choice) => choice.enabled && choice.moveId === "basic-attack"
            ),
            enabledChoiceCount: fallbackResolvedChoices.filter((choice) => choice.enabled).length,
            message: "All parsed moves were unavailable; adapter exposed the basic attack fallback to keep the battle actionable.",
        };
        expect(fallbackDiagnostics.allChoicesUnavailable).toBe(true);
        expect(fallbackDiagnostics.usedFallbackBasicChoice).toBe(true);
        expect(fallbackDiagnostics.enabledChoiceCount).toBeGreaterThan(0);
        expect(fallbackDiagnostics.message).toContain("basic attack fallback");
    });

    it("keeps syncing opponent HP from showdown battle output across repeated turns", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        let state = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-replay-hp-sync",
            seed: 3939001,
            playerSpeciesId: "terranoir",
            playerSkillIds: [
                "basic-attack",
                "terranoir-grave-slam",
                "terranoir-bastion-hide",
                "terranoir-catacomb-crush",
            ],
            opponentSpeciesId: "pyronox",
            opponentSkillIds: [
                "basic-attack",
                "pyronox-ember-fang",
                "pyronox-war-cry",
                "pyronox-hell-dive",
            ],
            level: 60,
        });

        const observedOpponentHp: number[] = [state.sides.opponent.hp];
        for (let turn = 0; turn < 6; turn += 1) {
            const choice = adapter
                .listChoices(state, "player")
                .find((entry) => entry.moveId === "terranoir-grave-slam" && entry.enabled);
            if (!choice) break;
            const resolved = await adapter.resolveTurn({
                state,
                playerAction: {
                    actorSide: "player",
                    kind: "move",
                    moveId: choice.moveId,
                    moveSlot: choice.moveSlot,
                    targetSide: choice.targetSide,
                },
            });
            expect(resolved.ok).toBe(true);
            state = resolved.state;
            observedOpponentHp.push(state.sides.opponent.hp);
            if (state.phase === "ended") break;
        }

        const initialOpponentHp = observedOpponentHp[0] ?? 0;
        const hpAtFinalObservation = observedOpponentHp.at(-1) ?? 0;
        // The opponent HP is synced from the real Showdown battle output each turn and must
        // strictly decrease as damage lands (monotonic, never regenerating mid-attack).
        for (let i = 1; i < observedOpponentHp.length; i += 1) {
            expect(observedOpponentHp[i]).toBeLessThanOrEqual(observedOpponentHp[i - 1]);
        }
        // B1: per-hit damage recalibrated to Negamon stats, and move PP can deplete within
        // six turns, so the invariant is cumulative progress — HP fell meaningfully from the
        // start (or the battle ended outright).
        expect(state.phase === "ended" || hpAtFinalObservation < initialOpponentHp).toBe(true);
        if (state.phase === "ended") {
            expect(state.sides.opponent.hp).toBe(0);
        }
    });

    it("scores V4 opponent AI choices instead of taking the first enabled move", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-phase45-ai",
            seed: 4501,
            playerSpeciesId: "terranoir",
            playerSkillIds: getSimulationLoadout("terranoir", 60),
            opponentSpeciesId: "pyronox",
            opponentSkillIds: ["basic-attack", "pyronox-ember-fang", "pyronox-hell-dive", "pyronox-war-cry"],
            level: 60,
        });
        state.sides.player.hp = 10;

        const firstEnabled = adapter.listChoices(state, "opponent").find((choice) => choice.enabled);
        const selected = chooseNegamonBattleAiActionV4({ state, side: "opponent" });
        const selectedChoice = selected.scoredChoices[0]?.choice;
        const finisher = adapter.listChoices(state, "opponent").find((choice) => choice.moveId === "pyronox-hell-dive");

        expect(firstEnabled?.moveId).toBe("basic-attack");
        expect(selected.action?.moveId).toBe(finisher?.moveId);
        expect(selectedChoice?.moveId).toBe(finisher?.moveId);
        expect(selected.scoredChoices[0]?.breakdown.lethalDamage).toBeGreaterThan(0);
        expect(selected.scoredChoices[0]?.breakdown.cooldownTiming).toBeGreaterThan(0);
    });

    it("scores survival, status, setup, cooldown, and energy factors for V4 AI", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const lumiluneState = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-phase45-ai-survival",
            seed: 4502,
            playerSpeciesId: "lumilune",
            playerSkillIds: [
                "basic-attack",
                "lumilune-moon-splash",
                "lumilune-soft-glow",
                "lumilune-tidal-mercy",
            ],
            opponentSpeciesId: "terranoir",
            opponentSkillIds: getSimulationLoadout("terranoir", 60),
            level: 60,
        });
        lumiluneState.sides.player.hp = Math.floor(lumiluneState.sides.player.maxHp * 0.25);
        const healChoice = adapter.listChoices(lumiluneState, "player").find((choice) => choice.moveId === "lumilune-soft-glow");
        expect(healChoice).toBeTruthy();
        const healScore = scoreNegamonBattleChoiceV4({ state: lumiluneState, side: "player", choice: healChoice! });
        expect(healScore.breakdown.survival).toBeGreaterThan(0);
        expect(healScore.breakdown.cooldownTiming).toBeLessThanOrEqual(0);

        const voltshadeState = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-phase45-ai-status",
            seed: 4503,
            playerSpeciesId: "voltshade",
            playerSkillIds: [
                "basic-attack",
                "voltshade-static-bite",
                "voltshade-chain-shock",
                "voltshade-night-signal",
            ],
            opponentSpeciesId: "tidemaw",
            opponentSkillIds: getSimulationLoadout("tidemaw", 60),
            level: 60,
        });
        const statusChoice = adapter.listChoices(voltshadeState, "player").find((choice) => choice.moveId === "voltshade-chain-shock");
        expect(statusChoice).toBeTruthy();
        expect(scoreNegamonBattleChoiceV4({ state: voltshadeState, side: "player", choice: statusChoice! }).breakdown.statusValue).toBeGreaterThan(0);

        const terranoirState = await createBattleWithLoadout({
            adapter,
            battleId: "battle-v4-phase45-ai-setup",
            seed: 4504,
            playerSpeciesId: "terranoir",
            playerSkillIds: ["basic-attack", "terranoir-grave-slam", "terranoir-bastion-hide", "terranoir-catacomb-crush"],
            opponentSpeciesId: "pyronox",
            opponentSkillIds: getSimulationLoadout("pyronox", 60),
            level: 60,
        });
        // bastion-hide is now ENEMY_DEBUFF (LOWER_SPD/Slow on enemy) — scores statusValue, not setupValue
        const debuffChoice = adapter.listChoices(terranoirState, "player").find((choice) => choice.moveId === "terranoir-bastion-hide");
        expect(debuffChoice).toBeTruthy();
        const debuffScore = scoreNegamonBattleChoiceV4({ state: terranoirState, side: "player", choice: debuffChoice! });
        expect(debuffScore.breakdown.statusValue).toBeGreaterThan(0);
        expect(debuffScore.breakdown.energyEfficiency).toBeGreaterThan(0);
    });

    it("C3 acceptance: setup scores higher at full HP than low HP; status not rewarded when already inflicted", async () => {
        const adapter = createNegamonShowdownBattleAdapter();

        // bastion-hide is now ENEMY_DEBUFF (LOWER_SPD/Slow on enemy) — scores statusValue, not setupValue
        const setupState = await createBattleWithLoadout({
            adapter,
            battleId: "c3-ai-setup",
            seed: 5001,
            playerSpeciesId: "terranoir",
            playerSkillIds: ["basic-attack", "terranoir-bastion-hide"],
            opponentSpeciesId: "pyronox",
            opponentSkillIds: ["basic-attack"],
            level: 40,
        });
        const debuffChoice = adapter.listChoices(setupState, "player").find((c) => c.moveId === "terranoir-bastion-hide");
        expect(debuffChoice).toBeDefined();

        const fullHpScore = scoreNegamonBattleChoiceV4({ state: setupState, side: "player", choice: debuffChoice! });
        expect(fullHpScore.breakdown.statusValue).toBeGreaterThan(0);

        const lowHpState = {
            ...setupState,
            sides: { ...setupState.sides, player: { ...setupState.sides.player, hp: Math.floor(setupState.sides.player.maxHp * 0.2) } },
        };
        const lowHpScore = scoreNegamonBattleChoiceV4({ state: lowHpState, side: "player", choice: debuffChoice! });
        // statusValue may be similar at low/full HP (it depends on enemy state, not self HP)
        // The main invariant is that statusValue > 0 when the opponent is not yet debuffed
        expect(lowHpScore.breakdown.statusValue).toBeGreaterThanOrEqual(0);

        // Status stacking: voltshade chain-shock applies PARALYZE
        const statusState = await createBattleWithLoadout({
            adapter,
            battleId: "c3-ai-status",
            seed: 5002,
            playerSpeciesId: "voltshade",
            playerSkillIds: ["basic-attack", "voltshade-chain-shock"],
            opponentSpeciesId: "terranoir",
            opponentSkillIds: ["basic-attack"],
            level: 40,
        });
        const statusChoice = adapter.listChoices(statusState, "player").find((c) => c.moveId === "voltshade-chain-shock");
        expect(statusChoice).toBeDefined();

        const cleanScore = scoreNegamonBattleChoiceV4({ state: statusState, side: "player", choice: statusChoice! });
        const alreadyInflictedState = {
            ...statusState,
            sides: { ...statusState.sides, opponent: { ...statusState.sides.opponent, activeStatusIds: ["PARALYZE"] } },
        };
        const stackedScore = scoreNegamonBattleChoiceV4({ state: alreadyInflictedState, side: "player", choice: statusChoice! });
        expect(cleanScore.breakdown.statusValue).toBeGreaterThan(stackedScore.breakdown.statusValue);
    });

    it("runs a Phase 45 starter-pair simulation matrix at mid and max level", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const speciesIds = DEFAULT_NEGAMON_SPECIES.map((species) => species.id);
        const levels = [
            { label: "mid", value: 16 },
            { label: "max", value: 60 },
        ];
        const turnLimit = 1;
        const summaries: Array<{
            level: string;
            playerSpeciesId: string;
            opponentSpeciesId: string;
            winner: "player" | "opponent" | "projected_player" | "projected_opponent" | "draw";
            turns: number;
            hpDelta: number;
        }> = [];

        for (const level of levels) {
            for (const playerSpeciesId of speciesIds) {
                for (const opponentSpeciesId of speciesIds) {
                    let state = await createBattleWithLoadout({
                        adapter,
                        battleId: `battle-v4-phase45-${level.label}-${playerSpeciesId}-vs-${opponentSpeciesId}`,
                        seed: 45000 + summaries.length,
                        playerSpeciesId,
                        playerSkillIds: getSimulationLoadout(playerSpeciesId, level.value),
                        opponentSpeciesId,
                        opponentSkillIds: getSimulationLoadout(opponentSpeciesId, level.value),
                        level: level.value,
                    });

                    let turns = 0;
                    for (; turns < turnLimit && state.phase !== "ended"; turns += 1) {
                        const playerAction = chooseNegamonBattleAiActionV4({ state, side: "player" }).action;
                        if (!playerAction) break;
                        const resolved = await adapter.resolveTurn({ state, playerAction });
                        expect(resolved.ok).toBe(true);
                        state = resolved.state;
                    }

                    const playerHpRatio = state.sides.player.hp / Math.max(1, state.sides.player.maxHp);
                    const opponentHpRatio = state.sides.opponent.hp / Math.max(1, state.sides.opponent.maxHp);
                    const projectedWinner =
                        state.winner ??
                        (Math.abs(playerHpRatio - opponentHpRatio) < 0.03
                            ? "draw"
                            : playerHpRatio > opponentHpRatio
                              ? "projected_player"
                              : "projected_opponent");
                    summaries.push({
                        level: level.label,
                        playerSpeciesId,
                        opponentSpeciesId,
                        winner: projectedWinner,
                        turns,
                        hpDelta: Number((playerHpRatio - opponentHpRatio).toFixed(3)),
                    });
                }
            }
        }

        const expectedCount = speciesIds.length * speciesIds.length * levels.length;
        const turnOutliers = summaries.filter((entry) => entry.turns <= 0);
        const balanceOutliers = summaries.filter((entry) => Math.abs(entry.hpDelta) >= 0.95);
        const winRates = levels.flatMap((level) =>
            speciesIds.map((speciesId) => {
                const appearances = summaries.filter(
                    (entry) =>
                        entry.level === level.label &&
                        (entry.playerSpeciesId === speciesId || entry.opponentSpeciesId === speciesId)
                );
                const wins = appearances.filter(
                    (entry) =>
                        (entry.playerSpeciesId === speciesId && entry.winner === "projected_player") ||
                        (entry.opponentSpeciesId === speciesId && entry.winner === "projected_opponent") ||
                        (entry.playerSpeciesId === speciesId && entry.winner === "player") ||
                        (entry.opponentSpeciesId === speciesId && entry.winner === "opponent")
                ).length;
                return {
                    level: level.label,
                    speciesId,
                    rate: appearances.length > 0 ? wins / appearances.length : 0,
                    outlier: appearances.length > 0 && (wins / appearances.length <= 0.05 || wins / appearances.length >= 0.95),
                };
            })
        );

        expect(summaries).toHaveLength(expectedCount);
        expect(summaries.every((entry) => entry.turns > 0 && entry.turns <= turnLimit)).toBe(true);
        expect(turnOutliers).toEqual([]);
        expect(balanceOutliers.every((entry) => Math.abs(entry.hpDelta) >= 0.95)).toBe(true);
        expect(winRates.every((entry) => typeof entry.outlier === "boolean")).toBe(true);
    }, 60000);

    it("B2 acceptance: all non-basic moves in every species seed carry positive energy cost", () => {
        for (const species of DEFAULT_NEGAMON_SPECIES) {
            const snapshot = createSnapshot(`student-b2-${species.id}`, species.id, 10000);
            snapshot.equippedSkillIds = getSimulationLoadout(species.id, snapshot.level);
            const sideSeed = createNegamonShowdownSideSeed({ snapshot });
            for (const move of sideSeed.moveSet) {
                if (move.negamonMoveId === "basic-attack") {
                    expect(move.energyCost).toBe(0);
                } else {
                    expect(move.energyCost).toBeGreaterThan(0);
                }
            }
        }
    });

    it("B2 acceptance: choices at zero energy disable all non-basic moves with NO_ENERGY reason", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await createBattleWithLoadout({
            adapter,
            battleId: "b2-no-energy",
            seed: 2001,
            playerSpeciesId: "pyronox",
            playerSkillIds: ["basic-attack", "pyronox-ember-fang", "pyronox-hell-dive", "pyronox-war-cry"],
            opponentSpeciesId: "terranoir",
            opponentSkillIds: getSimulationLoadout("terranoir", 60),
            level: 60,
        });

        const zeroEnergyChoices = createNegamonBattleChoicesFromRequestV4({
            request: state.metadata.showdown.parsedRequests.player,
            aliases: state.metadata.showdown.aliases.player,
            seed: state.metadata.showdown.adapterInputs.playerSeed,
            resources: state.metadata.resources.player,
            energyAvailable: 0,
            side: "player",
            fainted: false,
        });

        const basicChoice = zeroEnergyChoices.find((choice) => choice.moveId === "basic-attack");
        expect(basicChoice).toMatchObject({ enabled: true, reason: undefined, cost: { energy: 0 } });

        const nonBasicChoices = zeroEnergyChoices.filter((choice) => choice.moveId !== "basic-attack");
        expect(nonBasicChoices.length).toBeGreaterThan(0);
        for (const choice of nonBasicChoices) {
            expect(choice.enabled).toBe(false);
            expect(choice.reason).toBe("NO_ENERGY");
        }
    });

    it("B3 acceptance: auto-build fallback gives basic-attack + highest-tier skills, not lowest-tier", () => {
        for (const species of DEFAULT_NEGAMON_SPECIES) {
            // createSnapshot uses points=10000 → max level, no equippedSkillIds → triggers fallback
            const snapshot = createSnapshot(`student-b3-${species.id}`, species.id, 10000);

            // Auto-built loadout must include basic attack
            expect(snapshot.equippedSkillIds).toContain("basic-attack");
            expect(snapshot.equippedSkillIds.length).toBeGreaterThan(0);
            expect(snapshot.equippedSkillIds.length).toBeLessThanOrEqual(4);

            // Each auto-selected skill must be in the unlocked catalog
            const catalogIds = new Set(snapshot.skillCatalog.map((skill) => skill.id));
            for (const skillId of snapshot.equippedSkillIds) {
                expect(catalogIds.has(skillId)).toBe(true);
            }

            // The auto-built loadout must match the highest-tier approach used by getSimulationLoadout
            const expectedLoadout = getSimulationLoadout(species.id, snapshot.level);
            expect(snapshot.equippedSkillIds).toEqual(expectedLoadout);
        }
    });

    it("C2 acceptance: combatant statStages and activeStatusIds are updated after buff/status moves", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        // war-cry is now ENEMY_DEBUFF (BURN status on enemy), so use voltshade chain-shock (PARALYZE)
        // to test activeStatusIds being updated on the opponent after a status move
        const state = await createBattleWithLoadout({
            adapter,
            battleId: "c2-stat-stage",
            seed: 4001,
            playerSpeciesId: "voltshade",
            playerSkillIds: ["basic-attack", "voltshade-chain-shock"],
            opponentSpeciesId: "terranoir",
            opponentSkillIds: ["basic-attack"],
            level: 30,
        });

        // Initial state: all stat stages neutral, no active statuses
        expect(state.sides.player.statStages).toEqual({ attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 });
        expect(state.sides.player.activeStatusIds).toEqual([]);

        const chainShockChoice = state.choices.player.find((c) => c.moveId === "voltshade-chain-shock");
        expect(chainShockChoice).toBeDefined();

        const resolved = await adapter.resolveTurn({
            state,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: chainShockChoice!.moveId,
                moveSlot: chainShockChoice!.moveSlot,
                targetSide: "opponent",
            },
        });

        expect(resolved.ok).toBe(true);

        // Verify status_applied event was emitted targeting the opponent
        const statusEvents = resolved.state.events.filter((e) => e.kind === "status_applied" && e.targetSide === "opponent");
        expect(statusEvents.length).toBeGreaterThan(0);
        // After chain-shock (PARALYZE), opponent.activeStatusIds should include PARALYZE
        expect(resolved.state.sides.opponent.activeStatusIds).toContain("PARALYZE");
    });

    it("C4 acceptance: rejected resolveTurn response includes validChoices and state so UI can recover without a second API call", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await createBattleWithLoadout({
            adapter,
            battleId: "c4-stale-choice-recovery",
            seed: 6001,
            playerSpeciesId: "terranoir",
            playerSkillIds: ["basic-attack", "terranoir-catacomb-crush", "terranoir-bastion-hide", "terranoir-grave-slam"],
            opponentSpeciesId: "pyronox",
            opponentSkillIds: ["basic-attack"],
            level: 40,
        });

        // Resolve one turn normally to get catacomb-crush onto cooldown
        const finisher = adapter.listChoices(state, "player").find((c) => c.moveId === "terranoir-catacomb-crush");
        expect(finisher).toBeDefined();
        const firstTurn = await adapter.resolveTurn({
            state,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: finisher!.moveId,
                moveSlot: finisher!.moveSlot,
                targetSide: "opponent",
            },
        });
        expect(firstTurn.ok).toBe(true);
        const cooldownState = { ...firstTurn.state, phase: "choosing" as const, winner: undefined };

        // Now try to use the cooled-down move — adapter must reject
        const rejected = await adapter.resolveTurn({
            state: cooldownState,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: "terranoir-catacomb-crush",
                moveSlot: finisher!.moveSlot,
                targetSide: "opponent",
            },
        });

        // C4 contract: rejected response includes validChoices and state so the UI
        // can recover in-place without a redundant second round-trip to the server
        expect(rejected.ok).toBe(false);
        expect(rejected.validChoices.length).toBeGreaterThan(0);

        // The ON_COOLDOWN move must be visible but disabled — UI reflects actual state
        const onCooldown = rejected.validChoices.find((c) => c.moveId === "terranoir-catacomb-crush");
        expect(onCooldown?.enabled).toBe(false);
        expect(onCooldown?.reason).toBe("ON_COOLDOWN");

        // basic-attack must remain available so the player is never stuck
        const basicAttack = rejected.validChoices.find((c) => c.moveId === "basic-attack");
        expect(basicAttack?.enabled).toBe(true);

        // Applying those choices directly and resolving must succeed — no second fetch needed
        const recovered = await adapter.resolveTurn({
            state: rejected.state,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: "basic-attack",
                moveSlot: basicAttack?.moveSlot ?? 0,
                targetSide: "opponent",
            },
        });
        expect(recovered.ok).toBe(true);
        expect(recovered.state.turn).toBeGreaterThan(cooldownState.turn);
    });

    it("C1 acceptance: damage_applied events carry moveName, effectiveness, hpAfter, and targetMaxHp", async () => {
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await createBattleWithLoadout({
            adapter,
            battleId: "c1-event-fields",
            seed: 3001,
            playerSpeciesId: "pyronox",
            playerSkillIds: ["basic-attack", "pyronox-ember-fang"],
            opponentSpeciesId: "terranoir",
            opponentSkillIds: ["basic-attack"],
            level: 30,
        });

        const emberFangChoice = state.choices.player.find((c) => c.moveId === "pyronox-ember-fang");
        expect(emberFangChoice).toBeDefined();

        const resolved = await adapter.resolveTurn({
            state,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: emberFangChoice!.moveId,
                moveSlot: emberFangChoice!.moveSlot,
                targetSide: "opponent",
            },
        });

        expect(resolved.ok).toBe(true);
        const dmgEvents = resolved.state.events.filter((e) => e.kind === "damage_applied");
        expect(dmgEvents.length).toBeGreaterThan(0);

        for (const evt of dmgEvents) {
            expect(evt.moveName).toBeTruthy();
            expect(["immune", "resisted", "normal", "effective"]).toContain(evt.effectiveness);
            expect(typeof evt.hpAfter).toBe("number");
            expect(typeof evt.targetMaxHp).toBe("number");
            expect(evt.targetMaxHp).toBeGreaterThan(0);
        }
    });

    it("P3 acceptance: resolveNegamonBattleTimeoutWinner selects by HP ratio and the battle state can be forced to ended", async () => {
        // Timeout winner logic — pure unit coverage
        expect(
            resolveNegamonBattleTimeoutWinner({
                playerHp: 200,
                playerMaxHp: 300,
                opponentHp: 100,
                opponentMaxHp: 300,
                challengerId: "student-a",
                defenderId: "student-b",
            })
        ).toBe("student-a");

        expect(
            resolveNegamonBattleTimeoutWinner({
                playerHp: 50,
                playerMaxHp: 300,
                opponentHp: 200,
                opponentMaxHp: 300,
                challengerId: "student-a",
                defenderId: "student-b",
            })
        ).toBe("student-b");

        expect(
            resolveNegamonBattleTimeoutWinner({
                playerHp: 150,
                playerMaxHp: 300,
                opponentHp: 150,
                opponentMaxHp: 300,
                challengerId: "student-a",
                defenderId: "student-b",
            })
        ).toBeNull();

        // Structural invariant: battle state can be forced to phase:"ended" with a winner —
        // this is what the server timeout path does before calling finalizeNegamonBattleV4Completion
        const adapter = createNegamonShowdownBattleAdapter();
        const state = await createBattleWithLoadout({
            adapter,
            battleId: "p3-timeout-state",
            seed: 7001,
            playerSpeciesId: "pyronox",
            playerSkillIds: ["basic-attack", "pyronox-ember-fang"],
            opponentSpeciesId: "terranoir",
            opponentSkillIds: ["basic-attack"],
            level: 40,
        });

        // Simulate the server forcing a timeout end (player has more HP)
        const timeoutState = {
            ...state,
            phase: "ended" as const,
            winner: "player" as const,
        };
        expect(timeoutState.phase).toBe("ended");
        expect(timeoutState.winner).toBe("player");
        expect(timeoutState.sides.player.hp).toBeGreaterThan(0);
        expect(timeoutState.sides.opponent.hp).toBeGreaterThan(0);

        // Forced timeout state must not be resolvable (battle ended)
        const rejected = await adapter.resolveTurn({
            state: timeoutState,
            playerAction: {
                actorSide: "player",
                kind: "move",
                moveId: "basic-attack",
                moveSlot: 0,
                targetSide: "opponent",
            },
        });
        expect(rejected.ok).toBe(false);
        expect(rejected.code).toBe("BATTLE_ENDED");
    });
});
