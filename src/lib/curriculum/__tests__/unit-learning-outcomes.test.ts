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

    it("loads physics additional outcomes from the imported upper-secondary source", () => {
        const m4s1FirstUnitPack = getSubjectUnitLearningOutcomePack("physics", "physics-additional-m4-s1-u01")
        const physicsOutcomes = SUBJECT_UNIT_LEARNING_OUTCOME_CATALOG
            .filter((pack) => pack.subjectId === "physics")
            .flatMap((pack) => pack.learningOutcomes)

        expect(m4s1FirstUnitPack).not.toBeNull()
        expect(m4s1FirstUnitPack?.unitTitle).toBe("หน่วยการเรียนรู้ที่ 1 การศึกษาวิชาฟิสิกส์")
        expect(m4s1FirstUnitPack?.learningOutcomes.map((outcome) => outcome.id)).toEqual([
            "physics-additional-m4-s1-lo-01",
            "physics-additional-m4-s1-lo-02",
        ])
        expect(m4s1FirstUnitPack?.topics.map((topic) => topic.title)).toEqual([
            "ธรรมชาติของฟิสิกส์",
            "สาขาความรู้ของวิชาฟิสิกส์",
            "การวัดปริมาณทางกายภาพในเชิงฟิสิกส์",
            "เลขนัยสำคัญ",
        ])
        expect(getSubjectUnitLearningOutcomePack("physics", "physics-additional-m4-s1-u02")?.learningOutcomes.map((outcome) => outcome.id)).toEqual([
            "physics-additional-m4-s1-lo-03",
        ])
        expect(getSubjectUnitLearningOutcomePack("physics", "physics-additional-m4-s1-u03")?.learningOutcomes.map((outcome) => outcome.id)).toEqual([
            "physics-additional-m4-s1-lo-04",
            "physics-additional-m4-s1-lo-05",
            "physics-additional-m4-s1-lo-06",
            "physics-additional-m4-s1-lo-07",
        ])
        expect(getSubjectUnitLearningOutcomePack("physics", "physics-additional-m4-s1-u04")?.learningOutcomes.map((outcome) => outcome.id)).toEqual([
            "physics-additional-m4-s1-lo-08",
            "physics-additional-m4-s1-lo-09",
        ])
        expect(physicsOutcomes).toHaveLength(68)
        expect(physicsOutcomes[0]?.text).toContain("การค้นหาความรู้ทางฟิสิกส์")
    })

    it("loads chemistry, biology, and earth-space additional outcomes from their subject sources", () => {
        const chemistryOutcomes = SUBJECT_UNIT_LEARNING_OUTCOME_CATALOG
            .filter((pack) => pack.subjectId === "chemistry")
            .flatMap((pack) => pack.learningOutcomes)
        const biologyOutcomes = SUBJECT_UNIT_LEARNING_OUTCOME_CATALOG
            .filter((pack) => pack.subjectId === "biology")
            .flatMap((pack) => pack.learningOutcomes)
        const earthSpaceOutcomes = SUBJECT_UNIT_LEARNING_OUTCOME_CATALOG
            .filter((pack) => pack.subjectId === "earth_space_science")
            .flatMap((pack) => pack.learningOutcomes)

        expect(getSubjectUnitLearningOutcomePack("chemistry", "chemistry-additional-m4-s1-u01")?.learningOutcomes).toHaveLength(4)
        expect(getSubjectUnitLearningOutcomePack("biology", "biology-additional-m4-s1-u01")?.learningOutcomes).toHaveLength(2)
        expect(getSubjectUnitLearningOutcomePack("earth_space_science", "earth-space-additional-m4-s1-u04")?.learningOutcomes.map((outcome) => outcome.id)).toEqual([
            "earth-space-additional-m4-s1-lo-04",
        ])
        expect(chemistryOutcomes).toHaveLength(96)
        expect(biologyOutcomes).toHaveLength(108)
        expect(earthSpaceOutcomes).toHaveLength(44)

        const additionalSciencePacks = SUBJECT_UNIT_LEARNING_OUTCOME_CATALOG.filter((pack) =>
            ["physics", "chemistry", "biology", "earth_space_science"].includes(pack.subjectId)
        )
        expect(additionalSciencePacks).toHaveLength(76)
        expect(additionalSciencePacks.every((pack) => pack.topics.length > 1)).toBe(true)
        expect(additionalSciencePacks.every((pack) =>
            pack.learningOutcomes.every((outcome) => outcome.topicIds.length === pack.topics.length)
        )).toBe(true)

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
