"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const battle_ui_helpers_1 = require("../battle-ui-helpers");
(0, vitest_1.describe)("battle-ui-helpers", () => {
    (0, vitest_1.it)("prefers stamina aliases over legacy ap fields in battle view", () => {
        (0, vitest_1.expect)((0, battle_ui_helpers_1.resolveBattleStamina)({ stamina: 80, ap: 50 })).toBe(80);
        (0, vitest_1.expect)((0, battle_ui_helpers_1.resolveBattleMaxStamina)({ maxStamina: 120, maxAp: 100 })).toBe(120);
    });
    (0, vitest_1.it)("falls back to legacy ap fields when stamina aliases are missing", () => {
        (0, vitest_1.expect)((0, battle_ui_helpers_1.resolveBattleStamina)({ ap: 45, stamina: undefined })).toBe(45);
        (0, vitest_1.expect)((0, battle_ui_helpers_1.resolveBattleMaxStamina)({ maxAp: 90, maxStamina: undefined })).toBe(90);
    });
    (0, vitest_1.it)("resolves solo farming resources from farming state first", () => {
        (0, vitest_1.expect)((0, battle_ui_helpers_1.resolveSoloFarmingResources)({
            wave: 2,
            monster: { name: "Slime", hp: 10, maxHp: 20, atk: 3, wave: 2, statusEffects: [] },
            ap: 10,
            stamina: 30,
            maxStamina: 80,
            mp: 12,
        }, {
            ap: 5,
            stamina: 6,
            maxAp: 50,
            maxStamina: 60,
            mp: 7,
            maxMp: 40,
        })).toEqual({
            stamina: 30,
            maxStamina: 80,
            mp: 12,
            maxMp: 40,
        });
    });
    (0, vitest_1.it)("falls back to player values when solo farming state aliases are absent", () => {
        (0, vitest_1.expect)((0, battle_ui_helpers_1.resolveSoloFarmingResources)(null, {
            ap: 14,
            stamina: undefined,
            maxAp: 100,
            maxStamina: undefined,
            mp: 9,
            maxMp: 25,
        })).toEqual({
            stamina: 14,
            maxStamina: 100,
            mp: 9,
            maxMp: 25,
        });
    });
    (0, vitest_1.it)("limits visible skills to the requested amount", () => {
        (0, vitest_1.expect)((0, battle_ui_helpers_1.getVisibleSkillIds)(["a", "b", "c", "d"], 3)).toEqual(["a", "b", "c"]);
        (0, vitest_1.expect)((0, battle_ui_helpers_1.getVisibleSkillIds)(["a", "b"], 4)).toEqual(["a", "b"]);
    });
});
