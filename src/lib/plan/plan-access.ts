import { PLAN_LIMITS, type PlanLimits, type SubscriptionPlanId } from "@/constants/plan-limits";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import type { AppRole } from "@/lib/roles";
import { isAppRole } from "@/lib/roles";

const KNOWN_PLANS = new Set<string>(["FREE", "PLUS", "PRO"]);

const ADMIN_PLAN_LIMITS: PlanLimits = {
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

export function getEffectivePlan(plan: string | null | undefined): SubscriptionPlanId {
    if (plan && KNOWN_PLANS.has(plan)) {
        return plan as SubscriptionPlanId;
    }
    return "FREE";
}

function coercePlanExpiryDate(
    value: Date | string | number | null | undefined
): Date | null {
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
export function resolvePlanIdForQuota(
    plan: string | null | undefined,
    planStatus: string | null | undefined,
    planExpiry: Date | string | number | null | undefined,
    now: Date = new Date()
): SubscriptionPlanId {
    const base = getEffectivePlan(plan);
    if (base === "FREE") {
        return "FREE";
    }

    const status = (planStatus ?? "").trim().toUpperCase();
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

export function getLimitsForUser(
    role: string | null | undefined,
    plan: string | null | undefined,
    planStatus?: string | null | undefined,
    planExpiry?: Date | string | number | null | undefined,
    now?: Date
): PlanLimits {
    if (role === "ADMIN") {
        return ADMIN_PLAN_LIMITS;
    }
    const resolved = resolvePlanIdForQuota(plan, planStatus, planExpiry, now);
    return PLAN_LIMITS[resolved];
}

export function normalizeRoleForPlan(role: string | null | undefined): AppRole {
    if (isAppRole(role)) {
        return role;
    }
    return "USER";
}

/** Count question entries in a set's `questions` JSON (array of objects). */
export function countQuestionsInJson(questions: unknown): number {
    if (!Array.isArray(questions)) {
        return 0;
    }
    return questions.length;
}

const DEFAULT_SPECIES_IDS = new Set(DEFAULT_NEGAMON_SPECIES.map((s) => s.id));

export function getAllowedNegamonSpeciesIdsForPlan(limits: PlanLimits): Set<string> {
    if (limits.negamonDefaultSpeciesSlotCount == null) {
        return new Set(DEFAULT_NEGAMON_SPECIES.map((s) => s.id));
    }
    const slice = DEFAULT_NEGAMON_SPECIES.slice(0, limits.negamonDefaultSpeciesSlotCount);
    return new Set(slice.map((s) => s.id));
}

export type NegamonSpeciesPlanViolation =
    | "too_many_species"
    | "species_not_allowed"
    | "custom_species_not_allowed";

/**
 * Validate `negamon.species` against plan limits. Skip when `negamon` absent or species list empty
 * (empty means “use defaults” in UI — defaults may exceed FREE cap until teacher saves; enforce on PATCH).
 */
export function validateNegamonSpeciesForPlan(
    limits: PlanLimits,
    species: Array<{ id: string }> | undefined | null
): NegamonSpeciesPlanViolation | null {
    if (!species?.length) {
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
