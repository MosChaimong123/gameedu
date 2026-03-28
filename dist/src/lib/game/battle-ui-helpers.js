"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBattleStamina = resolveBattleStamina;
exports.resolveBattleMaxStamina = resolveBattleMaxStamina;
exports.resolveSoloFarmingResources = resolveSoloFarmingResources;
exports.getVisibleSkillIds = getVisibleSkillIds;
function resolveBattleStamina(player) {
    var _a;
    return (_a = player.stamina) !== null && _a !== void 0 ? _a : player.ap;
}
function resolveBattleMaxStamina(player) {
    var _a;
    return (_a = player.maxStamina) !== null && _a !== void 0 ? _a : player.maxAp;
}
function resolveSoloFarmingResources(farmingState, player) {
    var _a, _b, _c, _d, _e, _f;
    return {
        stamina: (_c = (_b = (_a = farmingState === null || farmingState === void 0 ? void 0 : farmingState.stamina) !== null && _a !== void 0 ? _a : farmingState === null || farmingState === void 0 ? void 0 : farmingState.ap) !== null && _b !== void 0 ? _b : player.stamina) !== null && _c !== void 0 ? _c : player.ap,
        maxStamina: (_e = (_d = farmingState === null || farmingState === void 0 ? void 0 : farmingState.maxStamina) !== null && _d !== void 0 ? _d : player.maxStamina) !== null && _e !== void 0 ? _e : player.maxAp,
        mp: (_f = farmingState === null || farmingState === void 0 ? void 0 : farmingState.mp) !== null && _f !== void 0 ? _f : player.mp,
        maxMp: player.maxMp,
    };
}
function getVisibleSkillIds(skills, limit) {
    return skills.slice(0, limit);
}
