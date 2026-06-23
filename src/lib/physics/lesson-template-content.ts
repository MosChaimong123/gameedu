import type { LessonContentMetadata, LessonContentV2 } from "@/lib/lessons/lesson-content"
import type { PhysicsCurriculumMap, PhysicsCurriculumUnit, PhysicsLearningOutcome } from "@/lib/physics/curriculum"
import type { PhysicsLessonTemplate } from "@/lib/physics/lesson-templates"

type LessonDraftTopic = LessonContentV2["topics"][number]

const PHYSICS_GRADE_LABELS = {
    m4: "ม.4",
    m5: "ม.5",
    m6: "ม.6",
} as const

function createPlaceholderId(templateId: string, index: number) {
    return `${templateId}-media-${index + 1}`
}

function dedupeSourceRefs(sourceRefs: NonNullable<LessonContentMetadata["curriculum"]>["sourceRefs"]) {
    if (!sourceRefs) return undefined

    const seen = new Set<string>()
    return sourceRefs.filter((ref) => {
        const key = `${ref.provider}:${ref.title}:${ref.url ?? ""}:${ref.usage}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}

function normalizeOutcomeObjective(outcome: PhysicsLearningOutcome) {
    return outcome.text.trim()
}

function buildTopicObjective(topic: PhysicsLessonTemplate["outline"]["topics"][number], fallbackObjectives: string[]) {
    const objectives = [
        topic.description?.trim(),
        ...fallbackObjectives,
    ].filter((value): value is string => Boolean(value && value.trim().length > 0))

    return Array.from(new Set(objectives)).slice(0, 3)
}

function buildTemplateTopicDrafts(template: PhysicsLessonTemplate, outcomes: PhysicsLearningOutcome[]): LessonDraftTopic[] {
    const fallbackObjectives = outcomes.map(normalizeOutcomeObjective)

    return template.outline.topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        order: topic.order,
        contentStatus: "edited",
        objectives: buildTopicObjective(topic, fallbackObjectives),
        sections: [
            {
                id: `${topic.id}-section-1`,
                heading: topic.title,
                content:
                    topic.description?.trim() ||
                    fallbackObjectives[0] ||
                    `ครูสามารถเติมเนื้อหาสำหรับหัวข้อ ${topic.title} ได้ในขั้นตอนถัดไป`,
            },
        ],
        documents: [],
    }))
}

export function buildPhysicsLessonMetadata(
    map: PhysicsCurriculumMap,
    unit: PhysicsCurriculumUnit,
    template?: PhysicsLessonTemplate
): LessonContentMetadata {
    return {
        curriculum: {
            subject: map.subject,
            curriculumCode: map.curriculumCode,
            gradeLevel: PHYSICS_GRADE_LABELS[map.gradeLevel],
            semester: map.semester,
            unitId: unit.id,
            learningOutcomeIds: template?.learningOutcomeIds ?? unit.learningOutcomes.map((outcome) => outcome.id),
            sourceRefs: dedupeSourceRefs([...map.sourceRefs, ...unit.sourceRefs]),
        },
        template: template
            ? {
                  templateId: template.id,
                  templateLabel: template.outline.title,
                  teacherNotes: template.teacherNotes,
                  practicePlan: template.practicePlan,
              }
            : undefined,
        mediaPlaceholders: template?.mediaPlan.map((item, index) => ({
            id: createPlaceholderId(template.id, index),
            title: `สื่อแนะนำ ${index + 1}`,
            note: item,
            scope: "lesson",
        })),
    }
}

export function buildPhysicsTemplateContentV2(
    map: PhysicsCurriculumMap,
    unit: PhysicsCurriculumUnit,
    template: PhysicsLessonTemplate
): LessonContentV2 {
    const outcomes = unit.learningOutcomes.filter((outcome) => template.learningOutcomeIds.includes(outcome.id))

    return {
        schemaVersion: "lesson_content_v2",
        outline: template.outline,
        topics: buildTemplateTopicDrafts(template, outcomes),
        estimatedMinutes: Math.max(20, template.outline.topics.length * 15),
        metadata: buildPhysicsLessonMetadata(map, unit, template),
    }
}

export function buildPhysicsUnitShellContentV2(
    map: PhysicsCurriculumMap,
    unit: PhysicsCurriculumUnit,
    outline: PhysicsLessonTemplate["outline"]
): LessonContentV2 {
    return {
        schemaVersion: "lesson_content_v2",
        outline,
        topics: outline.topics.map((topic) => ({
            id: topic.id,
            title: topic.title,
            description: topic.description,
            order: topic.order,
            contentStatus: "empty",
            objectives: [],
            sections: [],
            documents: [],
        })),
        estimatedMinutes: Math.max(10, outline.topics.length * 10),
        metadata: buildPhysicsLessonMetadata(map, unit),
    }
}
