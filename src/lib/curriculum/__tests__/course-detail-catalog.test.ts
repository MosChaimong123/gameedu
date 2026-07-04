import { describe, expect, it } from "vitest"
import {
    CANONICAL_COURSE_DETAIL_CATALOG,
    getCanonicalCourseDetailById,
    getCanonicalCourseSummaryForApi,
    validateCanonicalCourseDetailCatalog,
} from "../course-detail-catalog"

describe("canonical course detail catalog", () => {
    it("builds a valid catalog with unit summaries for every course", () => {
        const result = validateCanonicalCourseDetailCatalog(CANONICAL_COURSE_DETAIL_CATALOG)

        expect(result.success).toBe(true)
        expect(
            CANONICAL_COURSE_DETAIL_CATALOG.every(
                (entry) =>
                    entry.units.length > 0 &&
                    entry.units.every(
                        (unit) =>
                            unit.title.trim().length > 0 &&
                            unit.keyConceptTh.trim().length > 0 &&
                            unit.estimatedHours > 0
                    )
            )
        ).toBe(true)
    })

    it("returns the selected M5 physics course with unit name and key concept", () => {
        const detail = getCanonicalCourseDetailById("science_technology:physical-science-physics:m5")

        expect(detail).not.toBeNull()
        expect(detail?.units).toHaveLength(1)
        expect(detail?.units[0]?.title.trim().length).toBeGreaterThan(5)
        expect(detail?.units[0]?.standardIds).toEqual(["sci-w2_2", "sci-w2_3"])
        expect(detail?.units[0]?.keyConceptTh.length).toBeGreaterThan(20)
    })

    it("builds an API-friendly course summary with units", () => {
        const summary = getCanonicalCourseSummaryForApi("thai:thai-language-use:m1")

        expect(summary).not.toBeNull()
        expect(summary?.unitCount).toBeGreaterThan(0)
        expect(summary?.units[0]).toMatchObject({
            id: expect.any(String),
            title: expect.any(String),
            keyConceptTh: expect.any(String),
            estimatedHours: expect.any(Number),
        })
    })
})
