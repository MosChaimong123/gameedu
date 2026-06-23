import { describe, expect, it } from "vitest"
import {
    buildCurriculumPlacement,
    curriculumPlacementSchema,
    getCanonicalGradeBandLabel,
    getCanonicalGradeLevelLabel,
    getCanonicalSemesterLabel,
    getGradeBandForLevel,
    isCanonicalGradeBand,
    isCanonicalGradeLevel,
    isCanonicalSemester,
    isCurriculumPlacement,
} from "../grade-model"

describe("canonical grade model", () => {
    it("accepts canonical grade levels, bands, and semesters", () => {
        expect(isCanonicalGradeLevel("m4")).toBe(true)
        expect(isCanonicalGradeBand("m4_m6")).toBe(true)
        expect(isCanonicalSemester(2)).toBe(true)
        expect(isCanonicalGradeLevel("m7")).toBe(false)
        expect(isCanonicalSemester(3)).toBe(false)
    })

    it("maps grade levels to the correct grade bands", () => {
        expect(getGradeBandForLevel("p2")).toBe("p1_p3")
        expect(getGradeBandForLevel("m2")).toBe("m1_m3")
        expect(getGradeBandForLevel("m6")).toBe("m4_m6")
    })

    it("builds a curriculum placement with derived grade band", () => {
        const placement = buildCurriculumPlacement("m5", "required", 2)

        expect(placement).toEqual({
            gradeBand: "m4_m6",
            gradeLevel: "m5",
            semesterMode: "required",
            semester: 2,
        })
        expect(isCurriculumPlacement(placement)).toBe(true)
    })

    it("rejects missing semester for required semester mode", () => {
        const parsed = curriculumPlacementSchema.safeParse({
            gradeBand: "m4_m6",
            gradeLevel: "m4",
            semesterMode: "required",
        })

        expect(parsed.success).toBe(false)
    })

    it("rejects a semester value when the subject does not use semesters", () => {
        const parsed = curriculumPlacementSchema.safeParse({
            gradeBand: "p1_p3",
            gradeLevel: "p1",
            semesterMode: "not_applicable",
            semester: 1,
        })

        expect(parsed.success).toBe(false)
    })

    it("returns friendly Thai labels", () => {
        expect(getCanonicalGradeLevelLabel("m4")).toBe("ม.4")
        expect(getCanonicalGradeBandLabel("m4_m6")).toBe("มัธยมปลาย")
        expect(getCanonicalSemesterLabel(1)).toBe("เทอม 1")
    })
})
