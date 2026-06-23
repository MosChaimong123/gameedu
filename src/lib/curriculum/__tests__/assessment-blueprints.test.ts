import { describe, expect, it } from "vitest"
import {
    SUBJECT_ASSESSMENT_BLUEPRINTS,
    buildSubjectAssessmentBlueprintPromptContext,
    getRecommendedAssessmentPassScore,
    getSubjectAssessmentBlueprint,
    resolveAssessmentQuestionCount,
    resolveSubjectAssessmentBlueprintFromLabel,
    validateSubjectAssessmentBlueprintCatalog,
} from "@/lib/curriculum/assessment-blueprints"

describe("subject assessment blueprints", () => {
    it("validates the canonical subject assessment blueprint catalog", () => {
        const parsed = validateSubjectAssessmentBlueprintCatalog(SUBJECT_ASSESSMENT_BLUEPRINTS)

        expect(parsed.success).toBe(true)
        if (parsed.success) {
            expect(parsed.data).toHaveLength(12)
        }
    })

    it("resolves a subject blueprint from a subject label", () => {
        const resolved = resolveSubjectAssessmentBlueprintFromLabel("physics")

        expect(resolved?.subject.id).toBe("physics")
        expect(resolved?.blueprint.id).toBe("physics-assessment-blueprint-v1")
    })

    it("calculates question count and pass score from the source blueprint", () => {
        const blueprint = getSubjectAssessmentBlueprint("physics")
        expect(blueprint).not.toBeNull()
        if (!blueprint) return

        expect(resolveAssessmentQuestionCount({ requestedCount: undefined, blueprint, sourceType: "topic" })).toBe(8)
        expect(resolveAssessmentQuestionCount({ requestedCount: 99, blueprint, sourceType: "topic" })).toBe(12)
        expect(getRecommendedAssessmentPassScore({ questionCount: 8, blueprint, sourceType: "topic" })).toBe(6)
    })

    it("builds a subject-specific prompt context", () => {
        const blueprint = getSubjectAssessmentBlueprint("thai")
        expect(blueprint).not.toBeNull()
        if (!blueprint) return

        const promptContext = buildSubjectAssessmentBlueprintPromptContext({
            blueprint,
            sourceType: "topic",
        })

        expect(promptContext).toContain("Assessment family: language_literacy")
        expect(promptContext).toContain("Preferred question styles")
        expect(promptContext).toContain("Recommended pass ratio")
    })
})
