import type { PlanId } from "@/constants/pricing";

/** Subscription tier used for quota checks (ADMIN handled separately in plan-access). */
export type SubscriptionPlanId = PlanId;

export type PlanLimits = {
    maxQuestionSets: number;
    maxQuestionsPerSet: number;
    maxLiveGamePlayers: number;
    maxOmrScansPerMonth: number;
    maxClassrooms: number;
    aiQuestionGeneration: boolean;
    aiFileParse: boolean;
    /** Max distinct species rows allowed in classroom Negamon settings */
    maxNegamonSpeciesInClassroom: number;
    /**
     * If set, only the first N species IDs from `DEFAULT_NEGAMON_SPECIES` may appear in `negamon.species`.
     * `null` = any default species id allowed (subject to max count). PRO may use custom ids outside defaults.
     */
    negamonDefaultSpeciesSlotCount: number | null;
    /** When false, custom species (id not in default roster) blocked */
    negamonAllowCustomSpecies: boolean;
};

export const PLAN_LIMITS: Record<SubscriptionPlanId, PlanLimits> = {
    FREE: {
        maxQuestionSets: 10,
        maxQuestionsPerSet: 30,
        maxLiveGamePlayers: 40,
        maxOmrScansPerMonth: 50,
        maxClassrooms: 5,
        aiQuestionGeneration: false,
        aiFileParse: false,
        maxNegamonSpeciesInClassroom: 3,
        negamonDefaultSpeciesSlotCount: 3,
        negamonAllowCustomSpecies: false,
    },
    PLUS: {
        maxQuestionSets: 100,
        maxQuestionsPerSet: 200,
        maxLiveGamePlayers: 200,
        maxOmrScansPerMonth: 2000,
        maxClassrooms: 50,
        aiQuestionGeneration: true,
        aiFileParse: true,
        maxNegamonSpeciesInClassroom: 32,
        negamonDefaultSpeciesSlotCount: null,
        negamonAllowCustomSpecies: false,
    },
    PRO: {
        maxQuestionSets: Number.POSITIVE_INFINITY,
        maxQuestionsPerSet: Number.POSITIVE_INFINITY,
        maxLiveGamePlayers: 500,
        maxOmrScansPerMonth: Number.POSITIVE_INFINITY,
        maxClassrooms: Number.POSITIVE_INFINITY,
        aiQuestionGeneration: true,
        aiFileParse: true,
        maxNegamonSpeciesInClassroom: Number.POSITIVE_INFINITY,
        negamonDefaultSpeciesSlotCount: null,
        negamonAllowCustomSpecies: true,
    },
};
