import { describe, expect, it } from "vitest"
import {
    findSubjectUnitLearningOutcome,
    getSubjectUnitLearningOutcomePack,
    isSubjectUnitLearningOutcomeCatalog,
    listSubjectUnitLearningOutcomes,
    SUBJECT_UNIT_LEARNING_OUTCOME_CATALOG,
    validateSubjectUnitLearningOutcomeCatalog,
    validateSubjectUnitOutcomeSelection,
} from "../unit-learning-outcomes"

describe("subject unit learning outcomes", () => {
    it("accepts the canonical unit outcome catalog", () => {
        expect(isSubjectUnitLearningOutcomeCatalog(SUBJECT_UNIT_LEARNING_OUTCOME_CATALOG)).toBe(true)
        expect(validateSubjectUnitLearningOutcomeCatalog(SUBJECT_UNIT_LEARNING_OUTCOME_CATALOG).success).toBe(true)
    })

    it("resolves a unit outcome pack with topics and outcomes", () => {
        const pack = getSubjectUnitLearningOutcomePack("mathematics", "math-u01")

        expect(pack).not.toBeNull()
        expect(pack?.topics.length).toBeGreaterThan(0)
        expect(pack?.learningOutcomes.length).toBeGreaterThanOrEqual(2)
        expect(pack?.crosswalkRules.sameUnitOnly).toBe(true)
    })

    it("lists outcomes for a known unit", () => {
        const outcomes = listSubjectUnitLearningOutcomes("science_technology", "sci-tech-u04")

        expect(outcomes.length).toBe(2)
        expect(outcomes[0]?.concepts.length).toBeGreaterThan(0)
    })

    it("finds an outcome by id and returns its parent pack", () => {
        const found = findSubjectUnitLearningOutcome("thai-lo-u05-02")

        expect(found?.pack.subjectId).toBe("thai")
        expect(found?.pack.unitId).toBe("thai-u05")
        expect(found?.outcome.topicIds.length).toBeGreaterThan(0)
    })

    it("validates a correct same-unit outcome selection", () => {
        const result = validateSubjectUnitOutcomeSelection({
            subjectId: "foreign_languages",
            unitId: "lang-u01",
            primaryOutcomeId: "lang-lo-u01-01",
            supportingOutcomeIds: ["lang-lo-u01-02"],
        })

        expect(result.ok).toBe(true)
    })

    it("rejects cross-unit outcome selection", () => {
        const result = validateSubjectUnitOutcomeSelection({
            subjectId: "foreign_languages",
            unitId: "lang-u01",
            primaryOutcomeId: "lang-lo-u01-01",
            supportingOutcomeIds: ["lang-lo-u02-01"],
        })

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.issues.some((issue) => issue.code === "SUPPORTING_OUTCOME_OUTSIDE_UNIT")).toBe(true)
        }
    })
})
