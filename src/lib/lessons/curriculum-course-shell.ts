import { getCanonicalGradeLevelLabel, type CanonicalGradeLevel } from "@/lib/curriculum/grade-model"
import { getCurriculumStandardByCode } from "@/lib/curriculum/indicators"
import {
    getPrimaryCoreCourseIndicatorCrosswalkRows,
    type CanonicalCourseEntry,
} from "@/lib/curriculum/course-catalog"
import type { SecondaryCoreUnit } from "@/lib/curriculum/import/secondary-core-unit-rows-source"
import type { CurriculumSourceRef } from "@/lib/curriculum/source-registry"
import { getCanonicalSubjectById, type CanonicalSubjectId } from "@/lib/curriculum/subject-catalog"
import { type SubjectLessonTemplate } from "@/lib/curriculum/template-master-pack"
import type { SubjectUnitLearningOutcomePack } from "@/lib/curriculum/unit-learning-outcomes"
import {
    getLessonTopicContentStatus,
    type LessonContentMetadata,
    type LessonContentV2,
    type LessonOutlineDraft,
} from "@/lib/lessons/lesson-content"

export type TopicDraft = LessonContentV2["topics"][number]

/**
 * The slice of a curriculum unit the lesson shell actually reads.
 *
 * `SubjectCurriculumUnitOutline` (core subjects) is structurally assignable to this,
 * and additional subjects — which have no map pack and therefore no outline — can
 * project their own units onto it without fabricating core-only fields such as
 * `courseType: "core"`, `keyConceptTh`, or `estimatedHours`.
 */
export type CurriculumUnitChoice = {
    id: string
    title: string
    notes?: string[]
    semester?: 1 | 2
    gradeLevels: CanonicalGradeLevel[]
    standardIds: string[]
    sourceRefs: CurriculumSourceRef[]
}

function getPrimaryGradeLevelLabel(unit: CurriculumUnitChoice) {
    const gradeLevel = unit.gradeLevels[0]
    return gradeLevel ? getCanonicalGradeLevelLabel(gradeLevel, "th") : ""
}

export function createEmptyTopic(topic: LessonOutlineDraft["topics"][number]): TopicDraft {
    return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        order: topic.order,
        contentStatus: "empty",
        objectives: [],
        sections: [],
        documents: [],
    }
}

export function buildContentV2(
    outline: LessonOutlineDraft,
    topics: TopicDraft[],
    metadata?: LessonContentMetadata
): LessonContentV2 {
    const normalizedTopics = topics.map((topic) => {
        return { ...topic, contentStatus: getLessonTopicContentStatus(topic) }
    })
    return {
        schemaVersion: "lesson_content_v2",
        outline,
        topics: normalizedTopics,
        estimatedMinutes: Math.max(10, normalizedTopics.filter((topic) => topic.contentStatus !== "empty").length * 12),
        metadata,
    }
}

export function buildCurriculumMetadata(input: {
    subjectId: CanonicalSubjectId
    course?: CanonicalCourseEntry | null
    unit: CurriculumUnitChoice
    outcomePack?: SubjectUnitLearningOutcomePack | null
    template?: SubjectLessonTemplate | null
    learningOutcomeIds?: string[]
}) {
    const subject = getCanonicalSubjectById(input.subjectId)
    const primaryCrosswalkRows = input.course ? getPrimaryCoreCourseIndicatorCrosswalkRows(input.course) : []
    const primaryStandardIds = Array.from(
        new Set(
            primaryCrosswalkRows
                .map((row) => getCurriculumStandardByCode(row.standardCode)?.id)
                .filter((standardId): standardId is string => Boolean(standardId))
        )
    )
    const primaryDuringIndicatorIds = primaryCrosswalkRows.flatMap((row) =>
        row.duringIndicators.map((indicator) => indicator.code)
    )
    const primaryTerminalIndicatorIds = primaryCrosswalkRows.flatMap((row) =>
        row.terminalIndicators.map((indicator) => indicator.code)
    )
    const learningOutcomeIds = input.template?.suggestedOutcomeIds?.length
        ? input.template.suggestedOutcomeIds
        : input.outcomePack?.learningOutcomes.map((outcome) => outcome.id) ?? input.learningOutcomeIds ?? []

    return {
        curriculum: {
            subject: subject?.displayNameTh ?? input.subjectId,
            curriculumCode: "basic_education_2551",
            gradeLevel: input.course ? getCanonicalGradeLevelLabel(input.course.gradeLevel, "th") : getPrimaryGradeLevelLabel(input.unit),
            semester: input.course?.semester ?? input.unit.semester,
            courseId: input.course?.id,
            courseTitle: input.course?.titleTh,
            unitId: input.unit.id,
            standardIds: primaryStandardIds.length > 0 ? primaryStandardIds : input.course?.standardIds ?? input.unit.standardIds,
            duringIndicatorIds: primaryDuringIndicatorIds.length > 0 ? primaryDuringIndicatorIds : input.course?.duringIndicatorIds,
            terminalIndicatorIds: primaryTerminalIndicatorIds.length > 0 ? primaryTerminalIndicatorIds : input.course?.terminalIndicatorIds,
            learningOutcomeIds,
            sourceRefs: input.template ? [...input.unit.sourceRefs, ...input.template.sourceRefs] : input.unit.sourceRefs,
        },
        template: input.template
            ? {
                  templateId: input.template.id,
                  templateLabel: input.template.title,
              }
            : undefined,
    } satisfies LessonContentMetadata
}

export function buildCurriculumCourseShellContentV2(
    subjectId: CanonicalSubjectId,
    course: CanonicalCourseEntry,
    unit: CurriculumUnitChoice,
    outcomePack: SubjectUnitLearningOutcomePack | null,
    realUnits: SecondaryCoreUnit[],
    options?: { learningOutcomeIds?: string[] }
): LessonContentV2 {
    const subject = getCanonicalSubjectById(subjectId)

    // Prefer the real DOCX learning units (one lesson topic per หน่วยการเรียนรู้);
    // fall back to the synthetic outcome-pack topics when the course has none.
    if (realUnits.length > 0) {
        const realUnitObjectivesByTopicId = new Map<string, string[]>()
        const outline: LessonOutlineDraft = {
            title: course.titleTh,
            description: unit.notes?.[0] ?? `โครงบทเรียนจากรายวิชา ${course.titleTh}`,
            subject: subject?.displayNameTh ?? subjectId,
            gradeLevel: getCanonicalGradeLevelLabel(course.gradeLevel, "th"),
            topics: realUnits.map((realUnit, index) => {
                const indicators = [...realUnit.duringIndicators, ...realUnit.terminalIndicators]
                const indicatorCodes = indicators.map((indicator) => indicator.code)
                const objectives = indicators
                    .map((indicator) => indicator.description?.trim())
                    .filter((text): text is string => Boolean(text))
                const topicId = `${course.id}-unit-${realUnit.unitNumber}-${index}`
                if (objectives.length > 0) {
                    realUnitObjectivesByTopicId.set(topicId, objectives)
                }
                return {
                    id: topicId,
                    title: realUnit.title,
                    description:
                        realUnit.summary ??
                        (indicatorCodes.length > 0 ? `ตัวชี้วัด: ${indicatorCodes.join(", ")}` : undefined),
                    order: index,
                }
            }),
        }

        const topics = outline.topics.map((topic) => ({
            ...createEmptyTopic(topic),
            objectives: realUnitObjectivesByTopicId.get(topic.id) ?? [],
        }))

        return buildContentV2(
            outline,
            topics,
            buildCurriculumMetadata({
                subjectId,
                course,
                unit,
                outcomePack,
                learningOutcomeIds: options?.learningOutcomeIds,
            })
        )
    }

    // The synthetic fallback is driven entirely by the outcome pack, so it cannot run without one.
    if (!outcomePack) {
        throw new Error("buildCurriculumCourseShellContentV2 requires an outcome pack when the course has no real units.")
    }

    const objectivesByTopicId = new Map<string, string[]>()
    for (const outcome of outcomePack.learningOutcomes) {
        for (const topicId of outcome.topicIds) {
            const current = objectivesByTopicId.get(topicId) ?? []
            current.push(outcome.text)
            objectivesByTopicId.set(topicId, current)
        }
    }

    const outline: LessonOutlineDraft = {
        title: course.titleTh,
        description: unit.notes?.[0] ?? `โครงบทเรียนจากรายวิชา ${course.titleTh}`,
        subject: subject?.displayNameTh ?? subjectId,
        gradeLevel: getCanonicalGradeLevelLabel(course.gradeLevel, "th"),
        topics: outcomePack.topics.map((topic, index) => ({
            id: topic.id,
            title: topic.title,
            description:
                topic.notes?.[0] ??
                objectivesByTopicId.get(topic.id)?.[0] ??
                undefined,
            order: index,
        })),
    }

    const topics = outline.topics.map((topic) => ({
        ...createEmptyTopic(topic),
        objectives: objectivesByTopicId.get(topic.id) ?? [],
    }))

    return buildContentV2(outline, topics, buildCurriculumMetadata({ subjectId, course, unit, outcomePack }))
}
