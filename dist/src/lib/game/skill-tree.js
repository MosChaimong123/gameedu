"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESPEC_LEVEL_MULTIPLIER = exports.RESPEC_BASE_GOLD = exports.DEFAULT_SKILL_MAX_RANK = exports.SKILL_POINTS_PER_LEVEL = void 0;
exports.normalizeSkillTreeState = normalizeSkillTreeState;
exports.getSkillRank = getSkillRank;
exports.calculateRespecCost = calculateRespecCost;
exports.validateSkillUpgrade = validateSkillUpgrade;
exports.applySkillUpgrade = applySkillUpgrade;
exports.applySkillRespec = applySkillRespec;
exports.buildSkillTreeView = buildSkillTreeView;
exports.getEffectiveSkillAtRank = getEffectiveSkillAtRank;
exports.SKILL_POINTS_PER_LEVEL = 1;
exports.DEFAULT_SKILL_MAX_RANK = 3;
exports.RESPEC_BASE_GOLD = 500;
exports.RESPEC_LEVEL_MULTIPLIER = 75;
function normalizeSkillTreeState(raw, level) {
    const safeProgress = (raw === null || raw === void 0 ? void 0 : raw.skillTreeProgress) && typeof raw.skillTreeProgress === "object"
        ? Object.entries(raw.skillTreeProgress).reduce((acc, [k, v]) => {
            const rank = typeof v === "number" ? Math.max(0, Math.floor(v)) : 0;
            if (rank > 0)
                acc[k] = rank;
            return acc;
        }, {})
        : {};
    const spentFromProgress = Object.values(safeProgress).reduce((sum, rank) => sum + rank, 0);
    const spent = Math.max(spentFromProgress, typeof (raw === null || raw === void 0 ? void 0 : raw.skillPointsSpent) === "number" ? Math.max(0, Math.floor(raw.skillPointsSpent)) : 0);
    const granted = Math.max(0, Math.floor(level - 1) * exports.SKILL_POINTS_PER_LEVEL);
    const explicitAvailable = typeof (raw === null || raw === void 0 ? void 0 : raw.skillPointsAvailable) === "number"
        ? Math.max(0, Math.floor(raw.skillPointsAvailable))
        : null;
    const shouldDeriveFromLevel = explicitAvailable !== null &&
        explicitAvailable <= 0 &&
        spent <= 0 &&
        Object.keys(safeProgress).length === 0;
    const available = explicitAvailable === null || shouldDeriveFromLevel
        ? Math.max(0, granted - spent)
        : explicitAvailable;
    return {
        skillPointsAvailable: available,
        skillPointsSpent: spent,
        skillTreeProgress: safeProgress,
        ...((raw === null || raw === void 0 ? void 0 : raw.lastRespecAt) ? { lastRespecAt: raw.lastRespecAt } : {}),
    };
}
function getSkillRank(progress, skillId) {
    var _a;
    return Math.max(0, Math.floor((_a = progress[skillId]) !== null && _a !== void 0 ? _a : 0));
}
function calculateRespecCost(level) {
    return Math.max(0, exports.RESPEC_BASE_GOLD + Math.floor(level) * exports.RESPEC_LEVEL_MULTIPLIER);
}
function validateSkillUpgrade(params) {
    var _a, _b, _c;
    const { skill, state, level } = params;
    if (!skill)
        return { ok: false, reason: "SKILL_NOT_FOUND", message: "ไม่พบทักษะนี้" };
    const requiredLevel = (_a = skill.requiredLevel) !== null && _a !== void 0 ? _a : skill.unlockLevel;
    if (level < requiredLevel) {
        return {
            ok: false,
            reason: "LEVEL_REQUIRED",
            message: `ต้องเลเวล ${requiredLevel} ขึ้นไป`,
        };
    }
    const currentRank = getSkillRank(state.skillTreeProgress, skill.id);
    const maxRank = (_b = skill.maxRank) !== null && _b !== void 0 ? _b : exports.DEFAULT_SKILL_MAX_RANK;
    if (currentRank >= maxRank) {
        return { ok: false, reason: "MAX_RANK", message: "อัปถึงแรงก์สูงสุดแล้ว" };
    }
    for (const preId of (_c = skill.prerequisite) !== null && _c !== void 0 ? _c : []) {
        if (getSkillRank(state.skillTreeProgress, preId) <= 0) {
            return {
                ok: false,
                reason: "MISSING_PREREQUISITE",
                message: `ต้องปลดล็อก ${preId} ก่อน`,
            };
        }
    }
    if (state.skillPointsAvailable <= 0) {
        return { ok: false, reason: "NO_POINTS", message: "แต้มสกิลไม่พอ" };
    }
    return {
        ok: true,
        currentRank,
        nextRank: currentRank + 1,
        pointsAfter: state.skillPointsAvailable - 1,
    };
}
function applySkillUpgrade(state, skillId) {
    const currentRank = getSkillRank(state.skillTreeProgress, skillId);
    const nextProgress = {
        ...state.skillTreeProgress,
        [skillId]: currentRank + 1,
    };
    return {
        ...state,
        skillTreeProgress: nextProgress,
        skillPointsSpent: state.skillPointsSpent + 1,
        skillPointsAvailable: Math.max(0, state.skillPointsAvailable - 1),
    };
}
function applySkillRespec(state, nowIso = new Date().toISOString()) {
    return {
        skillPointsAvailable: state.skillPointsAvailable + state.skillPointsSpent,
        skillPointsSpent: 0,
        skillTreeProgress: {},
        lastRespecAt: nowIso,
    };
}
function buildSkillTreeView(params) {
    const { skills, state, level } = params;
    return skills.map((skill) => {
        var _a, _b;
        const validation = validateSkillUpgrade({ skill, state, level });
        return {
            skillId: skill.id,
            currentRank: getSkillRank(state.skillTreeProgress, skill.id),
            maxRank: (_a = skill.maxRank) !== null && _a !== void 0 ? _a : exports.DEFAULT_SKILL_MAX_RANK,
            requiredLevel: (_b = skill.requiredLevel) !== null && _b !== void 0 ? _b : skill.unlockLevel,
            canUpgrade: validation.ok,
            lockReason: validation.ok ? null : validation.reason,
            lockMessage: validation.ok ? null : validation.message,
        };
    });
}
function getEffectiveSkillAtRank(skill, rank) {
    var _a, _b, _c, _d;
    const clampedRank = Math.max(0, Math.floor(rank));
    if (clampedRank <= 0)
        return skill;
    const scales = (_a = skill.rankScales) !== null && _a !== void 0 ? _a : {};
    const damagePerRank = (_b = scales.damageMultiplierPerRank) !== null && _b !== void 0 ? _b : 0;
    const healPerRank = (_c = scales.healMultiplierPerRank) !== null && _c !== void 0 ? _c : 0;
    const costPerRank = (_d = scales.costPerRank) !== null && _d !== void 0 ? _d : 0;
    const nextDamageMultiplier = typeof skill.damageMultiplier === "number"
        ? Number((skill.damageMultiplier * (1 + damagePerRank * clampedRank)).toFixed(4))
        : skill.damageMultiplier;
    const nextHealMultiplier = typeof skill.healMultiplier === "number"
        ? Number((skill.healMultiplier * (1 + healPerRank * clampedRank)).toFixed(4))
        : skill.healMultiplier;
    const nextCost = Math.max(0, Math.floor(skill.cost + costPerRank * clampedRank));
    return {
        ...skill,
        cost: nextCost,
        damageMultiplier: nextDamageMultiplier,
        healMultiplier: nextHealMultiplier,
    };
}
