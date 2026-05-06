"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectivePlan = getEffectivePlan;
exports.resolvePlanIdForQuota = resolvePlanIdForQuota;
exports.getLimitsForUser = getLimitsForUser;
exports.normalizeRoleForPlan = normalizeRoleForPlan;
exports.countQuestionsInJson = countQuestionsInJson;
exports.getAllowedNegamonSpeciesIdsForPlan = getAllowedNegamonSpeciesIdsForPlan;
exports.validateNegamonSpeciesForPlan = validateNegamonSpeciesForPlan;
const plan_limits_1 = require("@/constants/plan-limits");
const negamon_species_1 = require("@/lib/negamon-species");
const roles_1 = require("@/lib/roles");
const KNOWN_PLANS = new Set(["FREE", "PLUS", "PRO"]);
const ADMIN_PLAN_LIMITS = {
    maxQuestionSets: Number.POSITIVE_INFINITY,
    maxQuestionsPerSet: Number.POSITIVE_INFINITY,
    maxLiveGamePlayers: Number.POSITIVE_INFINITY,
    maxOmrScansPerMonth: Number.POSITIVE_INFINITY,
    maxClassrooms: Number.POSITIVE_INFINITY,
    aiQuestionGeneration: true,
    aiFileParse: true,
    maxNegamonSpeciesInClassroom: Number.POSITIVE_INFINITY,
    negamonDefaultSpeciesSlotCount: null,
    negamonAllowCustomSpecies: true,
};
function getEffectivePlan(plan) {
    if (plan && KNOWN_PLANS.has(plan)) {
        return plan;
    }
    return "FREE";
}
function coercePlanExpiryDate(value) {
    if (value == null) {
        return null;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === "number") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}
/**
 * Resolves which plan tier applies for quotas and feature gates, using billing fields
 * so stale `User.plan` rows cannot extend PLUS after expiry or inactive status.
 */
function resolvePlanIdForQuota(plan, planStatus, planExpiry, now = new Date()) {
    const base = getEffectivePlan(plan);
    if (base === "FREE") {
        return "FREE";
    }
    const status = (planStatus !== null && planStatus !== void 0 ? planStatus : "").trim().toUpperCase();
    if (status === "EXPIRED" || status === "INACTIVE") {
        return "FREE";
    }
    const expiry = coercePlanExpiryDate(planExpiry);
    if (expiry !== null && expiry.getTime() <= now.getTime()) {
        return "FREE";
    }
    if (status === "ACTIVE" || status === "TRIALING") {
        return base;
    }
    // Legacy rows: paid tier without status — trust `plan` if not past expiry.
    if (!status) {
        return base;
    }
    return "FREE";
}
function getLimitsForUser(role, plan, planStatus, planExpiry, now) {
    if (role === "ADMIN") {
        return ADMIN_PLAN_LIMITS;
    }
    const resolved = resolvePlanIdForQuota(plan, planStatus, planExpiry, now);
    return plan_limits_1.PLAN_LIMITS[resolved];
}
function normalizeRoleForPlan(role) {
    if ((0, roles_1.isAppRole)(role)) {
        return role;
    }
    return "USER";
}
/** Count question entries in a set's `questions` JSON (array of objects). */
function countQuestionsInJson(questions) {
    if (!Array.isArray(questions)) {
        return 0;
    }
    return questions.length;
}
const DEFAULT_SPECIES_IDS = new Set(negamon_species_1.DEFAULT_NEGAMON_SPECIES.map((s) => s.id));
function getAllowedNegamonSpeciesIdsForPlan(limits) {
    if (limits.negamonDefaultSpeciesSlotCount == null) {
        return new Set(negamon_species_1.DEFAULT_NEGAMON_SPECIES.map((s) => s.id));
    }
    const slice = negamon_species_1.DEFAULT_NEGAMON_SPECIES.slice(0, limits.negamonDefaultSpeciesSlotCount);
    return new Set(slice.map((s) => s.id));
}
/**
 * Validate `negamon.species` against plan limits. Skip when `negamon` absent or species list empty
 * (empty means “use defaults” in UI — defaults may exceed FREE cap until teacher saves; enforce on PATCH).
 */
function validateNegamonSpeciesForPlan(limits, species) {
    if (!(species === null || species === void 0 ? void 0 : species.length)) {
        return null;
    }
    if (species.length > limits.maxNegamonSpeciesInClassroom) {
        return "too_many_species";
    }
    const allowedDefaults = getAllowedNegamonSpeciesIdsForPlan(limits);
    for (const row of species) {
        const id = row.id;
        const isDefault = DEFAULT_SPECIES_IDS.has(id);
        if (!isDefault && !limits.negamonAllowCustomSpecies) {
            return "custom_species_not_allowed";
        }
        if (isDefault && !allowedDefaults.has(id)) {
            return "species_not_allowed";
        }
    }
    return null;
}
