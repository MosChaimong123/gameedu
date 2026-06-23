import { describe, expect, it } from "vitest"
import {
    findSubjectLessonTemplate,
    getSubjectLessonTemplatePack,
    isSubjectLessonTemplateCatalog,
    listSubjectLessonTemplates,
    SUBJECT_TEMPLATE_MASTER_PACKS,
    validateSubjectLessonTemplateCatalog,
} from "../template-master-pack"

describe("subject template master pack", () => {
    it("accepts the starter master pack catalog", () => {
        expect(isSubjectLessonTemplateCatalog(SUBJECT_TEMPLATE_MASTER_PACKS)).toBe(true)
        expect(validateSubjectLessonTemplateCatalog(SUBJECT_TEMPLATE_MASTER_PACKS).success).toBe(true)
    })

    it("covers all eight core learning areas", () => {
        expect(SUBJECT_TEMPLATE_MASTER_PACKS).toHaveLength(8)
        expect(SUBJECT_TEMPLATE_MASTER_PACKS.map((pack) => pack.subjectId)).toEqual(
            expect.arrayContaining([
                "thai",
                "mathematics",
                "science_technology",
                "social_religion_culture",
                "health_physical_education",
                "arts",
                "career",
                "foreign_languages",
            ])
        )
    })

    it("resolves a starter template pack and keeps topic-based structure", () => {
        const pack = getSubjectLessonTemplatePack("science_technology")

        expect(pack).not.toBeNull()
        expect(pack?.templates).toHaveLength(1)
        expect(pack?.templates[0]?.topicStructure.length).toBeGreaterThan(0)
        expect(pack?.templates[0]?.requiredBlocks).toContain("topics")
    })

    it("supports the three canonical pedagogy modes across starter templates", () => {
        const pedagogies = SUBJECT_TEMPLATE_MASTER_PACKS.flatMap((pack) => pack.templates.map((template) => template.pedagogy))

        expect(pedagogies).toEqual(expect.arrayContaining(["video_first", "document_first", "practice_first"]))
    })

    it("lists templates by subject and keeps mapped outcomes inside the same unit", () => {
        const templates = listSubjectLessonTemplates("thai")
        const template = templates[0]

        expect(template).toBeDefined()
        expect(template?.suggestedOutcomeIds.length).toBeGreaterThan(0)
        expect(template?.topicStructure.every((topic) => topic.outcomeIds.length > 0)).toBe(true)
    })

    it("finds a template by id with its parent pack", () => {
        const found = findSubjectLessonTemplate("career-master-template-01")

        expect(found?.pack.subjectId).toBe("career")
        expect(found?.template.unitId).toBe("career-u01")
    })
})
