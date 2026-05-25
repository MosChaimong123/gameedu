"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNegamonMoveLearnLevel = getNegamonMoveLearnLevel;
exports.createNegamonSkillDefinition = createNegamonSkillDefinition;
exports.createNegamonBasicSkillDefinition = createNegamonBasicSkillDefinition;
exports.getNegamonSpeciesSkillCatalog = getNegamonSpeciesSkillCatalog;
exports.findNegamonSkillDefinition = findNegamonSkillDefinition;
const negamon_basic_move_1 = require("@/lib/negamon-basic-move");
const negamon_energy_1 = require("@/lib/negamon-energy");
const monster_growth_1 = require("./monster-growth");
function getNegamonMoveLearnLevel(move) {
    var _a;
    if (typeof move.learnLevel === "number") {
        return (0, monster_growth_1.normalizeNegamonLevel)(move.learnLevel);
    }
    const rank = Math.max(0, Math.floor((_a = move.learnRank) !== null && _a !== void 0 ? _a : 1));
    if (rank <= 1)
        return 1;
    if (rank === 2)
        return 2;
    if (rank === 3)
        return 4;
    if (rank === 4)
        return 8;
    if (rank === 5)
        return 16;
    return 26;
}
function getSkillCategory(move) {
    var _a, _b;
    if (move.effectFamily === "HEAL")
        return "heal";
    if (move.effectFamily === "SELF_BOOST")
        return "buff";
    if (move.effectFamily === "ENEMY_DEBUFF" || move.effectFamily === "TEMPO_CONTROL")
        return "debuff";
    if (move.category === "HEAL" || move.effect === "HEAL_25")
        return "heal";
    if (move.power > 0 && move.effect)
        return "special";
    if (move.power > 0)
        return "attack";
    if ((_a = move.effect) === null || _a === void 0 ? void 0 : _a.startsWith("BOOST_"))
        return "buff";
    if ((_b = move.effect) === null || _b === void 0 ? void 0 : _b.startsWith("LOWER_"))
        return "debuff";
    return "status";
}
function getSkillTarget(move) {
    var _a, _b;
    if ((_a = move.flags) === null || _a === void 0 ? void 0 : _a.includes("selfOnly"))
        return "self";
    if ((_b = move.flags) === null || _b === void 0 ? void 0 : _b.includes("allEnemies"))
        return "allEnemies";
    if (move.category === "HEAL" || move.effect === "HEAL_25" || move.selfEffect)
        return "self";
    if (move.effect === "LOWER_ATK_ALL")
        return "allEnemies";
    return "enemy";
}
function getCooldownTurns(move) {
    var _a, _b;
    if ((0, negamon_basic_move_1.isNegamonBasicAttackMoveId)(move.id))
        return 0;
    if (move.learnRank >= 6)
        return 2;
    if (move.category === "HEAL")
        return 2;
    if (move.effect === "PARALYZE" || move.effect === "SLEEP" || move.effect === "FREEZE")
        return 1;
    if (move.power === 0 && (((_a = move.effect) === null || _a === void 0 ? void 0 : _a.startsWith("BOOST_")) || ((_b = move.effect) === null || _b === void 0 ? void 0 : _b.startsWith("LOWER_"))))
        return 1;
    return 0;
}
function describeSkill(move) {
    const parts = [];
    if (move.effectFamily)
        parts.push(move.effectFamily);
    if (move.power > 0)
        parts.push(`Power ${move.power}`);
    if (move.effect)
        parts.push(`Effect ${move.effect}`);
    if (move.selfEffect)
        parts.push(`Self ${move.selfEffect}`);
    if (move.drainPct)
        parts.push(`Drain ${move.drainPct}%`);
    if (move.critBonus)
        parts.push(`Crit +${move.critBonus}%`);
    return parts.length ? parts.join(" / ") : "Utility skill";
}
function mapStatusEffectToSkillEffects(input) {
    var _a, _b, _c;
    const durationTurns = input.durationTurns;
    switch (input.effect) {
        case "BOOST_ATK":
            return [{
                    kind: "stat_stage",
                    stat: "attack",
                    stages: 1,
                    target: input.target,
                    durationTurns,
                }];
        case "BOOST_DEF":
        case "BOOST_DEF_20":
            return [{
                    kind: "stat_stage",
                    stat: "defense",
                    stages: 1,
                    target: input.target,
                    durationTurns,
                }];
        case "BOOST_SPD":
        case "BOOST_SPD_30":
            return [{
                    kind: "stat_stage",
                    stat: "speed",
                    stages: 1,
                    target: input.target,
                    durationTurns,
                }];
        case "BOOST_SPD_100":
            return [{
                    kind: "stat_stage",
                    stat: "speed",
                    stages: 2,
                    target: input.target,
                    durationTurns,
                }];
        case "LOWER_ATK":
        case "LOWER_ATK_ALL":
            return [{
                    kind: "stat_stage",
                    stat: "attack",
                    stages: -1,
                    target: input.target,
                    durationTurns,
                }];
        case "LOWER_DEF":
            return [{
                    kind: "stat_stage",
                    stat: "defense",
                    stages: -1,
                    target: input.target,
                    durationTurns,
                }];
        case "LOWER_SPD":
            return [{
                    kind: "stat_stage",
                    stat: "speed",
                    stages: -2,
                    target: input.target,
                    durationTurns,
                }];
        case "LOWER_EN_REGEN":
            return [{
                    kind: "energy_shift",
                    amount: -((_a = input.regenPenalty) !== null && _a !== void 0 ? _a : 15),
                    target: input.target === "self" ? "self" : "enemy",
                    durationTurns,
                    regenPenalty: (_b = input.regenPenalty) !== null && _b !== void 0 ? _b : 15,
                }];
        case "HEAL_25":
            return [{ kind: "heal", percent: 25 }];
        default:
            if (input.target === "self") {
                return [{
                        kind: "self_status",
                        effect: input.effect,
                        durationTurns,
                        fullSkip: input.fullSkip,
                        dotRate: input.dotRate,
                    }];
            }
            return [{
                    kind: "status",
                    effect: input.effect,
                    chance: (_c = input.chance) !== null && _c !== void 0 ? _c : 100,
                    durationTurns,
                    fullSkip: input.fullSkip,
                    dotRate: input.dotRate,
                }];
    }
}
function createNegamonSkillDefinition(move, speciesId) {
    var _a, _b, _c;
    const effects = [];
    if (move.power > 0)
        effects.push({ kind: "damage", power: move.power });
    if (move.category === "HEAL") {
        effects.push({ kind: "heal", percent: 25 });
    }
    else if (move.effect) {
        effects.push(...mapStatusEffectToSkillEffects({
            effect: move.effect,
            chance: move.effectChance,
            durationTurns: move.effectDurationTurns,
            target: move.effect === "LOWER_ATK_ALL" ? "allEnemies" : "enemy",
            fullSkip: move.effectParalyzeFullSkip,
            dotRate: move.effectBurnDotRate,
            regenPenalty: move.effectRegenPenalty,
        }));
    }
    if (move.selfEffect) {
        effects.push(...mapStatusEffectToSkillEffects({
            effect: move.selfEffect,
            durationTurns: move.selfEffectDurationTurns,
            target: "self",
        }));
    }
    if (move.drainPct)
        effects.push({ kind: "drain", percent: move.drainPct });
    if (move.critBonus)
        effects.push({ kind: "critical_bonus", percent: move.critBonus });
    const energyCost = (0, negamon_energy_1.getMoveEnergyCost)(move, speciesId);
    effects.push({ kind: "energy_cost", value: energyCost });
    const learnLevel = getNegamonMoveLearnLevel(move);
    return {
        id: move.id,
        name: move.name,
        description: describeSkill(move),
        elementType: move.type,
        category: getSkillCategory(move),
        target: getSkillTarget(move),
        power: move.power,
        accuracy: move.accuracy,
        energyCost,
        cooldownTurns: getCooldownTurns(move),
        priority: (_a = move.priority) !== null && _a !== void 0 ? _a : 0,
        effectFamily: (_b = move.effectFamily) !== null && _b !== void 0 ? _b : (move.power > 0 ? "STRIKE" : "SELF_BOOST"),
        flags: (_c = move.flags) !== null && _c !== void 0 ? _c : [],
        roleTag: move.roleTag,
        effects,
        unlock: {
            level: learnLevel,
            rankIndex: (0, monster_growth_1.getNegamonFormIndexFromLevel)(learnLevel),
            speciesId,
        },
        sourceMove: { ...move, energyCost },
    };
}
function createNegamonBasicSkillDefinition() {
    const basic = (0, negamon_basic_move_1.buildBasicAttackMove)();
    return createNegamonSkillDefinition(basic, "basic");
}
function getNegamonSpeciesSkillCatalog(species, options = {}) {
    const skills = species.moves.map((move) => createNegamonSkillDefinition(move, species.id));
    return options.includeBasic ? [createNegamonBasicSkillDefinition(), ...skills] : skills;
}
function findNegamonSkillDefinition(skillId, catalog) {
    var _a;
    return (_a = catalog.find((skill) => skill.id === skillId)) !== null && _a !== void 0 ? _a : null;
}
