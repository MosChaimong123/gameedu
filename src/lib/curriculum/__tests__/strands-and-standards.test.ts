import { describe, expect, it } from "vitest"
import {
    CURRICULUM_STRAND_STANDARD_CATALOG,
    getCurriculumStandardById,
    getCurriculumStrandById,
    getCurriculumStrandsForSubject,
    getStandardsForSubjectAndStrand,
    isCurriculumStrandStandardCatalog,
    validateCurriculumStrandStandardCatalog,
} from "../strands-and-standards"

describe("curriculum strands and standards", () => {
    it("accepts the canonical strand and standard catalog", () => {
        expect(isCurriculumStrandStandardCatalog(CURRICULUM_STRAND_STANDARD_CATALOG)).toBe(true)
        expect(validateCurriculumStrandStandardCatalog(CURRICULUM_STRAND_STANDARD_CATALOG).success).toBe(true)
    })

    it("returns ordered strands for a core subject", () => {
        const strands = getCurriculumStrandsForSubject("thai")

        expect(strands.map((strand) => strand.id)).toEqual([
            "thai-reading",
            "thai-writing",
            "thai-listening-speaking",
            "thai-language-use",
            "thai-literature",
        ])
    })

    it("returns standards only from the requested subject and strand", () => {
        const standards = getStandardsForSubjectAndStrand("science_technology", "sci-technology")

        expect(standards.map((standard) => standard.code)).toEqual(["ว 4.1", "ว 4.2"])
        expect(getStandardsForSubjectAndStrand("thai", "sci-technology")).toEqual([])
    })

    it("looks up individual strand and standard records", () => {
        expect(getCurriculumStrandById("math-number-algebra")?.subjectId).toBe("mathematics")
        expect(getCurriculumStandardById("lang-t4_2")?.code).toBe("ต 4.2")
    })

    it("rejects standards whose subject does not match the strand subject", () => {
        const invalidCatalog = {
            ...CURRICULUM_STRAND_STANDARD_CATALOG,
            standards: CURRICULUM_STRAND_STANDARD_CATALOG.standards.map((standard) =>
                standard.id === "thai-th1_1"
                    ? {
                          ...standard,
                          subjectId: "mathematics" as const,
                      }
                    : standard
            ),
        }

        const result = validateCurriculumStrandStandardCatalog(invalidCatalog)
        expect(result.success).toBe(false)
    })

    it("rejects standards whose code prefix does not match the owning subject", () => {
        const invalidCatalog = {
            ...CURRICULUM_STRAND_STANDARD_CATALOG,
            standards: CURRICULUM_STRAND_STANDARD_CATALOG.standards.map((standard) =>
                standard.id === "math-k1_1"
                    ? {
                          ...standard,
                          code: "ท 1.1",
                      }
                    : standard
            ),
        }

        const result = validateCurriculumStrandStandardCatalog(invalidCatalog)
        expect(result.success).toBe(false)
    })
})
