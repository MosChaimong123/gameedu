import { describe, expect, it } from "vitest"
import { isLessonContentV2 } from "@/lib/lessons/lesson-content"
import { PHYSICS_CURRICULUM_CATALOG } from "../curriculum"
import { buildPhysicsTemplateContentV2, buildPhysicsUnitShellContentV2 } from "../lesson-template-content"
import { getPhysicsLessonTemplatesByUnit } from "../lesson-templates"

describe("physics lesson template content", () => {
    it("builds lesson_content_v2 from a physics template with curriculum metadata", () => {
        const map = PHYSICS_CURRICULUM_CATALOG.find((candidate) => candidate.gradeLevel === "m4" && candidate.semester === 1)
        expect(map).toBeTruthy()

        const unit = map!.units.find((candidate) => candidate.id === "phy-m4-s1-u01")
        expect(unit).toBeTruthy()

        const template = getPhysicsLessonTemplatesByUnit("phy-m4-s1-u01")[0]
        expect(template).toBeTruthy()

        const content = buildPhysicsTemplateContentV2(map!, unit!, template!)

        expect(isLessonContentV2(content)).toBe(true)
        expect(content.metadata?.curriculum?.curriculumCode).toBe("basic_education_2551_revised_2560")
        expect(content.metadata?.curriculum?.unitId).toBe("phy-m4-s1-u01")
        expect(content.metadata?.curriculum?.learningOutcomeIds).toEqual(template!.learningOutcomeIds)
        expect(content.metadata?.template?.templateId).toBe(template!.id)
        expect(content.metadata?.mediaPlaceholders?.length).toBe(template!.mediaPlan.length)
        expect(content.topics.every((topic) => topic.contentStatus === "edited")).toBe(true)
        expect(content.topics.every((topic) => topic.sections.length > 0)).toBe(true)
    })

    it("builds a unit shell draft with empty topics but linked curriculum metadata", () => {
        const map = PHYSICS_CURRICULUM_CATALOG.find((candidate) => candidate.gradeLevel === "m4" && candidate.semester === 1)
        expect(map).toBeTruthy()

        const unit = map!.units.find((candidate) => candidate.id === "phy-m4-s1-u02")
        expect(unit).toBeTruthy()

        const outline = {
            title: unit!.title,
            description: "โครงบทเรียนฟิสิกส์",
            subject: "ฟิสิกส์",
            gradeLevel: "ม.4",
            topics: unit!.learningOutcomes.map((outcome, index) => ({
                id: `topic-${index + 1}`,
                title: outcome.concepts[0] ?? `หัวข้อ ${index + 1}`,
                description: outcome.text,
                order: index,
            })),
        }

        const content = buildPhysicsUnitShellContentV2(map!, unit!, outline)

        expect(isLessonContentV2(content)).toBe(true)
        expect(content.topics.every((topic) => topic.contentStatus === "empty")).toBe(true)
        expect(content.metadata?.curriculum?.unitId).toBe(unit!.id)
        expect(content.metadata?.curriculum?.learningOutcomeIds).toEqual(
            unit!.learningOutcomes.map((outcome) => outcome.id)
        )
    })
})
