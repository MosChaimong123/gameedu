import { describe, expect, it } from "vitest"
import { PHYSICS_CURRICULUM_CATALOG } from "../curriculum"
import {
    findPhysicsLessonTemplate,
    getPhysicsLessonTemplatesByUnit,
    listPhysicsTemplatePack1,
    listPhysicsLessonTemplates,
    PHYSICS_TEMPLATE_PACK_1_TEMPLATE_IDS,
    PHYSICS_TEMPLATE_PACK_1_UNIT_IDS,
} from "../lesson-templates"
import { buildPhysicsTemplateContentV2 } from "../lesson-template-content"
import { isLessonContentV2 } from "@/lib/lessons/lesson-content"

describe("physics lesson template library", () => {
    it("lists curated templates with unique ids", () => {
        const templates = listPhysicsLessonTemplates()
        expect(templates.length).toBeGreaterThan(0)
        expect(new Set(templates.map((template) => template.id)).size).toBe(templates.length)
    })

    it("filters templates by unit id", () => {
        const unitTemplates = getPhysicsLessonTemplatesByUnit("phy-m4-s1-u01")
        expect(unitTemplates.length).toBeGreaterThan(0)
        expect(unitTemplates.every((template) => template.unitId === "phy-m4-s1-u01")).toBe(true)

        const firstTemplate = unitTemplates[0]
        expect(findPhysicsLessonTemplate(firstTemplate.id)?.id).toBe(firstTemplate.id)
    })

    it("keeps every curated template aligned to the canonical curriculum unit and outcomes", () => {
        const unitLookup = new Map(
            PHYSICS_CURRICULUM_CATALOG.flatMap((map) =>
                map.units.map((unit) => [unit.id, { map, unit }] as const)
            )
        )

        for (const template of listPhysicsLessonTemplates()) {
            const linkedUnit = unitLookup.get(template.unitId)
            expect(linkedUnit, `missing curriculum unit for ${template.id}`).toBeDefined()
            if (!linkedUnit) continue

            const validOutcomeIds = new Set(linkedUnit.unit.learningOutcomes.map((outcome) => outcome.id))
            expect(template.learningOutcomeIds.length).toBeGreaterThan(0)
            expect(
                template.learningOutcomeIds.every((outcomeId) => validOutcomeIds.has(outcomeId)),
                `template ${template.id} references outcomes outside ${template.unitId}`
            ).toBe(true)
            expect(template.outline.subject?.trim().length ?? 0).toBeGreaterThan(0)
            expect(template.outline.gradeLevel).toBe(`ม.${linkedUnit.map.gradeLevel.slice(1)}`)
            expect(template.outline.topics.length).toBeGreaterThan(0)
        }
    })

    it("covers the first M4 physics pack across the core units", () => {
        const templates = listPhysicsTemplatePack1()
        const coveredUnits = new Set(templates.map((template) => template.unitId))

        expect(templates.length).toBe(PHYSICS_TEMPLATE_PACK_1_TEMPLATE_IDS.length)
        for (const unitId of PHYSICS_TEMPLATE_PACK_1_UNIT_IDS) {
            expect(coveredUnits.has(unitId), `missing pack 1 coverage for ${unitId}`).toBe(true)
        }
    })

    it("builds every pack 1 template into valid lesson_content_v2", () => {
        const mapLookup = new Map(
            PHYSICS_CURRICULUM_CATALOG.flatMap((map) =>
                map.units.map((unit) => [unit.id, { map, unit }] as const)
            )
        )

        for (const template of listPhysicsTemplatePack1()) {
            const linkedUnit = mapLookup.get(template.unitId)
            expect(linkedUnit, `missing curriculum bundle for ${template.id}`).toBeDefined()
            if (!linkedUnit) continue

            const content = buildPhysicsTemplateContentV2(linkedUnit.map, linkedUnit.unit, template)

            expect(isLessonContentV2(content), `template ${template.id} failed v2 build`).toBe(true)
            expect(content.outline.title).toBe(template.outline.title)
            expect(content.metadata?.template?.templateId).toBe(template.id)
            expect(content.metadata?.curriculum?.unitId).toBe(template.unitId)
            expect(content.metadata?.mediaPlaceholders?.length ?? 0).toBeGreaterThanOrEqual(template.mediaPlan.length)
            expect(content.topics.length).toBe(template.outline.topics.length)
            expect(content.topics.every((topic) => topic.objectives.length > 0)).toBe(true)
            expect(content.topics.every((topic) => topic.sections.length > 0)).toBe(true)
        }
    })
})
