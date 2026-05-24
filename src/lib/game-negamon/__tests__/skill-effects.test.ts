import { describe, expect, it } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import type { PassiveAbility } from "@/lib/types/negamon";
import {
    applyNegamonPassiveRuntimeEffects,
    buildNegamonContentCatalog,
    createNegamonMonsterSnapshot,
    mapNegamonSkillToLiteMove,
    resolveNegamonSkillRuntimeEffects,
    type NegamonMonsterSnapshot,
    type NegamonSkillDefinition,
} from "@/lib/game-negamon";
import { getValidChoices, resolveChoice, type NegamonLiteBattleState, type NegamonLiteCombatant } from "@/lib/negamon-lite";

function makeSkill(overrides: Partial<NegamonSkillDefinition> = {}): NegamonSkillDefinition {
    return {
        id: "skill_shadow_jab",
        name: "Shadow Jab",
        description: "Simple dark attack",
        elementType: "DARK",
        category: "attack",
        target: "enemy",
        power: 42,
        accuracy: 100,
        energyCost: 5,
        cooldownTurns: 0,
        priority: 0,
        effects: [
            { kind: "damage", power: 42 },
            { kind: "energy_cost", value: 5 },
        ],
        unlock: { level: 1, rankIndex: 0, speciesId: "pyronox" },
        sourceMove: {
            id: "skill_shadow_jab",
            name: "Shadow Jab",
            type: "DARK",
            category: "PHYSICAL",
            power: 42,
            accuracy: 100,
            learnRank: 1,
            energyCost: 5,
        },
        ...overrides,
    };
}

function makeCombatant(overrides: Partial<NegamonLiteCombatant> = {}): NegamonLiteCombatant {
    return {
        id: "student-1",
        name: "A",
        speciesId: "pyronox",
        level: 5,
        types: ["FIRE", "DARK"],
        stats: {
            hp: 100,
            attack: 30,
            defense: 20,
            specialAttack: 30,
            specialDefense: 20,
            speed: 20,
        },
        hp: 100,
        energy: 30,
        maxEnergy: 30,
        moves: [mapNegamonSkillToLiteMove(makeSkill())],
        ...overrides,
    };
}

function makeState(player: NegamonLiteCombatant): NegamonLiteBattleState {
    return {
        battleId: "skill-runtime-1",
        seed: 123,
        turn: 1,
        phase: "choosing",
        sides: {
            player,
            opponent: makeCombatant({
                id: "student-2",
                name: "B",
                types: ["LIGHT"],
                hp: 100,
            }),
        },
        events: [],
    };
}

function makeMonster(ability?: PassiveAbility): NegamonMonsterSnapshot {
    return {
        studentId: "student-1",
        speciesId: "pyronox",
        speciesName: "Pyronox",
        formName: "Pyronox Cub",
        rankIndex: 1,
        level: 2,
        types: ["FIRE", "DARK"],
        stats: { hp: 100, atk: 30, def: 20, spd: 20 },
        skills: [],
        unlockedMoves: [],
        monsterId: "student-1:pyronox",
        displayName: "A",
        formIcon: "P",
        formColor: "#9a3412",
        elementTypes: ["FIRE", "DARK"],
        exp: 0,
        expToNextLevel: 100,
        evolutionStage: 1,
        baseStats: { hp: 100, atk: 30, def: 20, spd: 20 },
        derivedStats: { maxHp: 100, atk: 30, def: 20, spd: 20, maxEnergy: 40, energyRegen: 10 },
        ability,
        abilityId: ability?.id,
        unlockedSkillIds: ["skill_shadow_jab"],
        equippedSkillIds: ["skill_shadow_jab"],
        equippedItemIds: [],
        skillCatalog: [makeSkill()],
    };
}

describe("Negamon skill effect runtime V2", () => {
    it("maps damage skills into lite moves and runtime effects", () => {
        const skill = makeSkill();

        expect(resolveNegamonSkillRuntimeEffects(skill)).toEqual([
            { kind: "damage", power: 42 },
            { kind: "energy_cost", value: 5 },
        ]);
        expect(mapNegamonSkillToLiteMove(skill)).toMatchObject({
            id: "skill_shadow_jab",
            category: "PHYSICAL",
            power: 42,
            energyCost: 5,
            cooldownTurns: 0,
            target: "opponent",
        });
    });

    it("resolves heal, buff, debuff, and accuracy skill effects", () => {
        const heal = makeSkill({
            id: "skill_minor_heal",
            category: "heal",
            target: "self",
            power: 0,
            effects: [{ kind: "heal", percent: 25 }],
        });
        const guard = makeSkill({
            id: "skill_guard_shell",
            category: "buff",
            target: "self",
            power: 0,
            effects: [{ kind: "stat_stage", stat: "defense", stages: 1, target: "self" }],
        });
        const focus = makeSkill({
            id: "skill_focus_mark",
            category: "debuff",
            target: "enemy",
            power: 0,
            effects: [{ kind: "stat_stage", stat: "accuracy", stages: -1, target: "enemy" }],
        });

        expect(mapNegamonSkillToLiteMove(heal).effect).toEqual({ kind: "heal", percent: 25 });
        expect(mapNegamonSkillToLiteMove(guard).effect).toEqual({ kind: "buff", stat: "defense", stages: 1 });
        expect(mapNegamonSkillToLiteMove(focus).effect).toEqual({ kind: "debuff", stat: "accuracy", stages: 1 });
    });

    it("maps condition status effects into lite battle statuses", () => {
        const burn = makeSkill({
            id: "skill_burn_mark",
            category: "status",
            target: "enemy",
            power: 0,
            effects: [{ kind: "status", effect: "BURN", chance: 75, durationTurns: 2 }],
        });
        const freeze = makeSkill({
            id: "skill_frost_lock",
            category: "status",
            target: "enemy",
            power: 0,
            effects: [{ kind: "status", effect: "FREEZE", chance: 100, durationTurns: 1 }],
        });

        expect(mapNegamonSkillToLiteMove(burn).effect).toEqual({
            kind: "status",
            status: "BURN",
            chance: 75,
            durationTurns: 2,
        });
        expect(mapNegamonSkillToLiteMove(freeze).effect).toEqual({
            kind: "status",
            status: "STUN",
            chance: 100,
            durationTurns: 1,
        });
    });

    it("applies mapped skill effects during battle resolution and logs them deterministically", () => {
        const guard = mapNegamonSkillToLiteMove(makeSkill({
            id: "skill_guard_shell",
            category: "buff",
            target: "self",
            power: 0,
            effects: [{ kind: "stat_stage", stat: "defense", stages: 1, target: "self" }],
        }));
        const state = makeState(makeCombatant({ moves: [guard] }));

        const result = resolveChoice(state, { side: "player", kind: "move", moveId: "skill_guard_shell" });

        expect(result.accepted).toBe(true);
        expect(result.state.sides.player.stats.defense).toBe(25);
        expect(result.state.events.at(-1)).toMatchObject({
            kind: "turn_resolved",
            effect: { kind: "buff", stat: "defense", stages: 1 },
            effectApplied: true,
        });
    });

    it("applies passive traits at battle start", () => {
        const ironShell: PassiveAbility = { id: "iron_shell", name: "Iron Shell", desc: "DEF +10%" };
        const voltFlow: PassiveAbility = { id: "volt_flow", name: "Volt Flow", desc: "Energy +15" };

        expect(applyNegamonPassiveRuntimeEffects(makeMonster(ironShell))).toMatchObject({
            stats: { def: 22 },
            passiveTraitIds: ["trait_iron_shell"],
        });
        expect(applyNegamonPassiveRuntimeEffects(makeMonster(voltFlow))).toMatchObject({
            maxEnergy: 55,
            passiveTraitIds: ["trait_volt_flow"],
        });
    });

    it("maps content pack roles to meaningful battle effects", () => {
        const catalog = buildNegamonContentCatalog();
        const bySkillId = new Map(catalog.skills.map((skill) => [skill.id, skill]));

        expect(catalog.monsters.find((monster) => monster.id === "pyronox")).toMatchObject({ role: "attacker" });
        expect(mapNegamonSkillToLiteMove(bySkillId.get("pyronox-hell-dive")!)).toMatchObject({
            power: 52,
            effect: { kind: "status", status: "BURN", chance: 100 },
        });

        const terranoir = createNegamonMonsterSnapshot({
            studentId: "student-1",
            points: 50,
            levelConfig: [
                { name: "Common", minScore: 0 },
                { name: "Uncommon", minScore: 10 },
                { name: "Rare", minScore: 20 },
                { name: "Epic", minScore: 30 },
                { name: "Legendary", minScore: 40 },
                { name: "Mythic", minScore: 50 },
            ],
            negamonSettings: {
                enabled: true,
                allowStudentChoice: true,
                expPerPoint: 10,
                expPerAttendance: 20,
                species: DEFAULT_NEGAMON_SPECIES,
                studentMonsters: { "student-1": "terranoir" },
            },
        })!;
        expect(catalog.monsters.find((monster) => monster.id === "terranoir")).toMatchObject({ role: "defender" });
        expect(applyNegamonPassiveRuntimeEffects(terranoir)).toMatchObject({
            passiveTraitIds: ["trait_iron_shell"],
        });

        expect(catalog.monsters.find((monster) => monster.id === "lumilune")).toMatchObject({ role: "support" });
        expect(mapNegamonSkillToLiteMove(bySkillId.get("lumilune-soft-glow")!).effect).toEqual({
            kind: "heal",
            percent: 25,
        });

        expect(catalog.monsters.find((monster) => monster.id === "voltshade")).toMatchObject({ role: "control" });
        expect(mapNegamonSkillToLiteMove(bySkillId.get("voltshade-chain-shock")!).effect).toMatchObject({
            kind: "status",
            status: "PARALYZE",
            chance: 100,
        });
    });

    it("keeps locked or unavailable skills disabled through the battle choice layer", () => {
        const expensive = mapNegamonSkillToLiteMove(makeSkill({
            id: "skill_tidal_force",
            energyCost: 50,
            effects: [{ kind: "damage", power: 60 }, { kind: "energy_cost", value: 50 }],
        }));
        const state = makeState(makeCombatant({ energy: 10, moves: [expensive] }));

        expect(getValidChoices(state, "player")[0]).toMatchObject({
            moveId: "skill_tidal_force",
            enabled: false,
            reason: "NO_ENERGY",
        });
        expect(resolveChoice(state, { side: "player", kind: "move", moveId: "skill_tidal_force" })).toMatchObject({
            accepted: false,
            reason: "NO_ENERGY",
        });
    });

    it("spends skill cooldown after a resolved move", () => {
        const move = mapNegamonSkillToLiteMove(makeSkill({ cooldownTurns: 2 }));
        const result = resolveChoice(makeState(makeCombatant({ moves: [move] })), {
            side: "player",
            kind: "move",
            moveId: "skill_shadow_jab",
        });

        expect(result.accepted).toBe(true);
        expect(result.state.sides.player.moves[0]).toMatchObject({
            cooldownTurns: 2,
            cooldownRemaining: 2,
        });
        expect(getValidChoices(result.state, "player")[0]).toMatchObject({
            enabled: false,
            reason: "ON_COOLDOWN",
        });
    });
});
