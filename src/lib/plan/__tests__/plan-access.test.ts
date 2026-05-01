import { describe, expect, it } from "vitest";
import {
    countQuestionsInJson,
    getEffectivePlan,
    getLimitsForUser,
    validateNegamonSpeciesForPlan,
} from "../plan-access";
import { PLAN_LIMITS } from "@/constants/plan-limits";

describe("getEffectivePlan", () => {
    it("normalizes unknown to FREE", () => {
        expect(getEffectivePlan(null)).toBe("FREE");
        expect(getEffectivePlan(undefined)).toBe("FREE");
        expect(getEffectivePlan("")).toBe("FREE");
        expect(getEffectivePlan("ENTERPRISE")).toBe("FREE");
    });

    it("keeps known plans", () => {
        expect(getEffectivePlan("PLUS")).toBe("PLUS");
        expect(getEffectivePlan("PRO")).toBe("PRO");
    });
});

describe("getLimitsForUser", () => {
    it("ADMIN gets unlimited-style limits", () => {
        const lim = getLimitsForUser("ADMIN", "FREE");
        expect(lim.aiQuestionGeneration).toBe(true);
        expect(lim.maxQuestionSets).toBe(Number.POSITIVE_INFINITY);
    });

    it("TEACHER uses plan", () => {
        const free = getLimitsForUser("TEACHER", "FREE");
        expect(free.maxQuestionSets).toBe(PLAN_LIMITS.FREE.maxQuestionSets);
        const plus = getLimitsForUser("TEACHER", "PLUS");
        expect(plus.aiQuestionGeneration).toBe(true);
    });
});

describe("countQuestionsInJson", () => {
    it("counts array length", () => {
        expect(countQuestionsInJson([{ id: "1" }, { id: "2" }])).toBe(2);
        expect(countQuestionsInJson([])).toBe(0);
        expect(countQuestionsInJson(null)).toBe(0);
    });
});

describe("validateNegamonSpeciesForPlan", () => {
    it("allows empty species", () => {
        expect(validateNegamonSpeciesForPlan(PLAN_LIMITS.FREE, null)).toBeNull();
        expect(validateNegamonSpeciesForPlan(PLAN_LIMITS.FREE, [])).toBeNull();
    });

    it("FREE rejects more than 3 species", () => {
        const species = [{ id: "naga" }, { id: "garuda" }, { id: "singha" }, { id: "kinnaree" }];
        expect(validateNegamonSpeciesForPlan(PLAN_LIMITS.FREE, species)).toBe("too_many_species");
    });

    it("FREE rejects species outside first three defaults", () => {
        expect(validateNegamonSpeciesForPlan(PLAN_LIMITS.FREE, [{ id: "naga" }])).toBeNull();
        expect(validateNegamonSpeciesForPlan(PLAN_LIMITS.FREE, [{ id: "kinnaree" }])).toBe("species_not_allowed");
    });
});
