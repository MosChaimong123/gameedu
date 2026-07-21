import { getSubjectCurriculumMapPack } from "@/lib/curriculum/map-packs"
import { getCanonicalSubjectById, type CanonicalCoreSubjectId } from "@/lib/curriculum/subject-catalog"
import { getSubjectUnitLearningOutcomePack } from "@/lib/curriculum/unit-learning-outcomes"
import { isLessonContentV2, type LessonContentMetadata, type LessonContentV2 } from "@/lib/lessons/lesson-content"
import { resolveLegacyLessonCurriculumContext } from "@/lib/lessons/lesson-curriculum-context"
import { findPhysicsCurriculumUnitById, findPhysicsLearningOutcomesByIds } from "@/lib/physics/curriculum"

export type ResolvedLessonLearningOutcome = {
    id: string
    text: string
}

export type ResolvedLessonCurriculumMetadata = {
    subjectId: CanonicalCoreSubjectId | null
    subjectLabel: string | null
    curriculumCode: string | null
    gradeLevel: string | null
    semester: number | null
    courseId: string | null
    courseTitle: string | null
    rawUnitId: string | null
    unitId: string | null
    unitTitle: string | null
    standardIds: string[]
    duringIndicatorIds: string[]
    terminalIndicatorIds: string[]
    learningOutcomeIds: string[]
    learningOutcomes: ResolvedLessonLearningOutcome[]
    isLegacyPhysics: boolean
}

export type LessonNormalizedCurriculumSummary = ResolvedLessonCurriculumMetadata

function normalizeText(value: string | null | undefined) {
    const trimmed = value?.trim()
    return trimmed && trimmed.length > 0 ? trimmed : null
}

function isLegacyPhysicsOutcomeId(outcomeId: string) {
    return outcomeId.startsWith("phy-")
}

export function resolveLessonCurriculumUnitTitle(unitId: string | null | undefined) {
    const normalizedUnitId = normalizeText(unitId)
    if (!normalizedUnitId) {
        return null
    }

    const legacyPhysicsUnit = findPhysicsCurriculumUnitById(normalizedUnitId)
    if (legacyPhysicsUnit?.unit.title) {
        return legacyPhysicsUnit.unit.title
    }

    const subjectIds: CanonicalCoreSubjectId[] = [
        "thai",
        "mathematics",
        "science_technology",
        "social_religion_culture",
        "health_physical_education",
        "arts",
        "career",
        "foreign_languages",
    ]

    for (const subjectId of subjectIds) {
        const pack = getSubjectCurriculumMapPack(subjectId)
        const unit = pack?.unitOutlines.find((entry) => entry.id === normalizedUnitId)
        if (unit?.title) {
            return unit.title
        }
    }

    return null
}

export function resolveLessonCurriculumLearningOutcomes(input: {
    subjectId: CanonicalCoreSubjectId | null
    unitId: string | null
    learningOutcomeIds: string[] | null | undefined
}) {
    const learningOutcomeIds = (input.learningOutcomeIds ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0)

    if (learningOutcomeIds.length === 0) {
        return []
    }

    if (learningOutcomeIds.some(isLegacyPhysicsOutcomeId)) {
        return findPhysicsLearningOutcomesByIds(learningOutcomeIds).map((outcome) => ({
            id: outcome.id,
            text: outcome.text,
        }))
    }

    if (!input.subjectId || !input.unitId) {
        return []
    }

    const pack = getSubjectUnitLearningOutcomePack(input.subjectId, input.unitId)
    if (!pack) {
        return []
    }

    return learningOutcomeIds
        .map((outcomeId) => pack.learningOutcomes.find((outcome) => outcome.id === outcomeId) ?? null)
        .filter((outcome): outcome is NonNullable<typeof outcome> => outcome !== null)
        .map((outcome) => ({
            id: outcome.id,
            text: outcome.text,
        }))
}

export function resolveLessonCurriculumMetadata(input: {
    curriculum: LessonContentMetadata["curriculum"] | undefined
    fallbackSubject?: string | null
}): ResolvedLessonCurriculumMetadata {
    const rawSubject = normalizeText(input.curriculum?.subject) ?? normalizeText(input.fallbackSubject)
    const rawUnitId = normalizeText(input.curriculum?.unitId)
    const context = resolveLegacyLessonCurriculumContext({
        subject: rawSubject,
        unitId: rawUnitId,
        fallbackSubject: input.fallbackSubject,
    })
    const canonicalSubject = context.subjectId ? getCanonicalSubjectById(context.subjectId) : null
    const learningOutcomeIds = (input.curriculum?.learningOutcomeIds ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0)

    return {
        subjectId: context.subjectId,
        subjectLabel: canonicalSubject?.displayNameTh ?? rawSubject,
        curriculumCode: normalizeText(input.curriculum?.curriculumCode),
        gradeLevel: normalizeText(input.curriculum?.gradeLevel),
        semester: typeof input.curriculum?.semester === "number" ? input.curriculum.semester : null,
        courseId: normalizeText(input.curriculum?.courseId),
        courseTitle: normalizeText(input.curriculum?.courseTitle),
        rawUnitId,
        unitId: context.unitId,
        unitTitle:
            resolveLessonCurriculumUnitTitle(rawUnitId) ??
            resolveLessonCurriculumUnitTitle(context.unitId ?? rawUnitId),
        standardIds: [...new Set((input.curriculum?.standardIds ?? []).map((value) => value.trim()).filter((value) => value.length > 0))],
        duringIndicatorIds: [...new Set((input.curriculum?.duringIndicatorIds ?? []).map((value) => value.trim()).filter((value) => value.length > 0))],
        terminalIndicatorIds: [...new Set((input.curriculum?.terminalIndicatorIds ?? []).map((value) => value.trim()).filter((value) => value.length > 0))],
        learningOutcomeIds,
        learningOutcomes: resolveLessonCurriculumLearningOutcomes({
            subjectId: context.subjectId,
            unitId: context.unitId,
            learningOutcomeIds,
        }),
        isLegacyPhysics:
            rawSubject?.toLowerCase() === "physics" ||
            rawUnitId?.startsWith("phy-") === true ||
            learningOutcomeIds.some(isLegacyPhysicsOutcomeId),
    }
}

export function resolveLessonContentCurriculumMetadata(content: LessonContentV2, fallbackSubject?: string | null) {
    return resolveLessonCurriculumMetadata({
        curriculum: content.metadata?.curriculum,
        fallbackSubject,
    })
}

export function buildLessonNormalizedCurriculumSummary(input: {
    content: unknown
    subject?: string | null
}): LessonNormalizedCurriculumSummary | null {
    if (!input.content || typeof input.content !== "object") {
        return null
    }

    const maybeLessonContent = input.content as Partial<LessonContentV2>
    if (maybeLessonContent.schemaVersion !== "lesson_content_v2") {
        return null
    }

    return resolveLessonContentCurriculumMetadata(maybeLessonContent as LessonContentV2, input.subject)
}

export function normalizeLessonContentForApi(content: unknown, fallbackSubject?: string | null) {
    if (!isLessonContentV2(content)) {
        return content
    }

    return normalizeLessonContentCurriculumForWrite(content, fallbackSubject)
}

export function withLessonNormalizedCurriculumSummary<
    TLesson extends {
        content?: unknown
        subject?: string | null
    },
>(lesson: TLesson, overrides?: { content?: unknown; subject?: string | null }) {
    const normalizedContent = normalizeLessonContentForApi(
        overrides?.content ?? lesson.content,
        overrides?.subject ?? lesson.subject
    )
    return {
        ...lesson,
        ...(normalizedContent !== undefined ? { content: normalizedContent } : {}),
        normalizedCurriculumSummary: buildLessonNormalizedCurriculumSummary({
            content: normalizedContent,
            subject: overrides?.subject ?? lesson.subject,
        }),
    }
}

export function normalizeLessonContentCurriculumForWrite(
    content: LessonContentV2,
    fallbackSubject?: string | null
): LessonContentV2 {
    const curriculum = content.metadata?.curriculum
    if (!curriculum) {
        return content
    }

    const resolvedCurriculum = resolveLessonContentCurriculumMetadata(content, fallbackSubject)
    const normalizedLearningOutcomeIds = [...new Set(resolvedCurriculum.learningOutcomeIds)]
    const normalizedCurriculum: NonNullable<LessonContentMetadata["curriculum"]> = {
        ...curriculum,
        subject: resolvedCurriculum.subjectId ?? curriculum.subject.trim(),
        curriculumCode: resolvedCurriculum.curriculumCode ?? curriculum.curriculumCode.trim(),
        ...(resolvedCurriculum.gradeLevel ? { gradeLevel: resolvedCurriculum.gradeLevel } : {}),
        ...(resolvedCurriculum.semester ? { semester: resolvedCurriculum.semester } : {}),
        ...(resolvedCurriculum.courseId ? { courseId: resolvedCurriculum.courseId } : {}),
        ...(resolvedCurriculum.courseTitle ? { courseTitle: resolvedCurriculum.courseTitle } : {}),
        ...(resolvedCurriculum.isLegacyPhysics
            ? resolvedCurriculum.rawUnitId
                ? { unitId: resolvedCurriculum.rawUnitId }
                : {}
            : resolvedCurriculum.unitId
              ? { unitId: resolvedCurriculum.unitId }
              : {}),
        ...(resolvedCurriculum.standardIds.length > 0 ? { standardIds: resolvedCurriculum.standardIds } : {}),
        ...(resolvedCurriculum.duringIndicatorIds.length > 0
            ? { duringIndicatorIds: resolvedCurriculum.duringIndicatorIds }
            : {}),
        ...(resolvedCurriculum.terminalIndicatorIds.length > 0
            ? { terminalIndicatorIds: resolvedCurriculum.terminalIndicatorIds }
            : {}),
        ...(normalizedLearningOutcomeIds.length > 0 ? { learningOutcomeIds: normalizedLearningOutcomeIds } : {}),
    }

    return {
        ...content,
        metadata: {
            ...content.metadata,
            curriculum: normalizedCurriculum,
        },
    }
}
