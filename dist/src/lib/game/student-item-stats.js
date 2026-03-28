"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnhancementMultiplier = getEnhancementMultiplier;
exports.buildStudentItemStatSnapshot = buildStudentItemStatSnapshot;
function getEnhancementMultiplier(enhancementLevel = 0) {
    return 1 + enhancementLevel * 0.1;
}
function buildStudentItemStatSnapshot(item, enhancementLevel = 0) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const mult = getEnhancementMultiplier(enhancementLevel);
    return {
        hp: Math.floor(((_a = item.baseHp) !== null && _a !== void 0 ? _a : 0) * mult),
        atk: Math.floor(((_b = item.baseAtk) !== null && _b !== void 0 ? _b : 0) * mult),
        def: Math.floor(((_c = item.baseDef) !== null && _c !== void 0 ? _c : 0) * mult),
        spd: Math.floor(((_d = item.baseSpd) !== null && _d !== void 0 ? _d : 0) * mult),
        crit: Number((((_e = item.baseCrit) !== null && _e !== void 0 ? _e : 0) * mult).toFixed(3)),
        luck: Number((((_f = item.baseLuck) !== null && _f !== void 0 ? _f : 0) * mult).toFixed(3)),
        mag: Math.floor(((_g = item.baseMag) !== null && _g !== void 0 ? _g : 0) * mult),
        mp: Math.floor(((_h = item.baseMp) !== null && _h !== void 0 ? _h : 0) * mult),
    };
}
