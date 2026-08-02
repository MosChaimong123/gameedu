import { describe, expect, it } from "vitest"
import {
    getCanonicalCourseOptions,
    getSecondaryCoreCourseUnits,
} from "@/lib/curriculum/course-catalog"
import { getSubjectCurriculumMapPack } from "@/lib/curriculum/map-packs"
import { getSubjectUnitLearningOutcomePack } from "@/lib/curriculum/unit-learning-outcomes"
import { buildCurriculumCourseShellContentV2 } from "../curriculum-course-shell"

describe("curriculum course shell", () => {
    it.each([
        ["physics", "m4"],
        ["chemistry", "m4"],
        ["biology", "m4"],
        ["earth_space_science", "m4"],
    ] as const)("prepopulates %s sections from canonical Chapter Title topics", (subjectId, gradeLevel) => {
        const course = getCanonicalCourseOptions(subjectId, gradeLevel).find((entry) => entry.semester === 1)
        expect(course).toBeDefined()

        const unitId = course!.unitIds[0]
        const unit = getSubjectCurriculumMapPack(subjectId)?.unitOutlines.find((entry) => entry.id === unitId)
        const outcomePack = unitId ? getSubjectUnitLearningOutcomePack(subjectId, unitId) : null
        expect(unit).toBeDefined()
        expect(outcomePack).not.toBeNull()

        const content = buildCurriculumCourseShellContentV2(
            subjectId,
            course!,
            unit!,
            outcomePack,
            getSecondaryCoreCourseUnits(course!)
        )

        expect(content.topics[0]?.sections.map((section) => section.heading)).toEqual(
            outcomePack!.topics.map((topic) => topic.title)
        )
        expect(content.topics[0]?.sections.every((section) => section.content === "")).toBe(true)
    })

    it("does not add Chapter Title sections to core courses", () => {
        const course = getCanonicalCourseOptions("thai", "p1")[0]
        expect(course).toBeDefined()

        const unitId = course!.unitIds[0]
        const unit = getSubjectCurriculumMapPack("thai")?.unitOutlines.find((entry) => entry.id === unitId)
        const outcomePack = unitId ? getSubjectUnitLearningOutcomePack("thai", unitId) : null
        expect(unit).toBeDefined()

        const content = buildCurriculumCourseShellContentV2(
            "thai",
            course!,
            unit!,
            outcomePack,
            getSecondaryCoreCourseUnits(course!)
        )

        expect(content.topics.every((topic) => topic.sections.length === 0)).toBe(true)
    })
})
