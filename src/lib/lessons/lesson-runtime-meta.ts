import { getCanonicalSubjectById } from "@/lib/curriculum/subject-catalog"
import type { LessonContentV2 } from "@/lib/lessons/lesson-content"
import {
    resolveLessonContentCurriculumMetadata,
    resolveLessonCurriculumUnitTitle,
} from "@/lib/lessons/lesson-curriculum-metadata"

export type LessonRuntimeMeta = {
    subjectLabel: string
    unitTitle: string | null
    gradeLabel: string | null
    semesterLabel: string | null
    learningOutcomes: Array<{
        id: string
        text: string
    }>
    practicePlan: string[]
}

type LessonRuntimeMetaLesson = {
    subject: string | null
    gradeLevel: string | null
}

export function resolveUnitTitleFromCurriculum(unitId: string | undefined) {
    return resolveLessonCurriculumUnitTitle(unitId)
}

export function resolveLessonRuntimeMeta(content: LessonContentV2, lesson: LessonRuntimeMetaLesson): LessonRuntimeMeta {
    const resolvedCurriculum = resolveLessonContentCurriculumMetadata(content, lesson.subject)
    const canonicalSubject = resolvedCurriculum.subjectId ? getCanonicalSubjectById(resolvedCurriculum.subjectId) : null
    const gradeLabel = resolvedCurriculum.gradeLevel ?? lesson.gradeLevel ?? null
    const semesterLabel = typeof resolvedCurriculum.semester === "number" ? `เทอม ${resolvedCurriculum.semester}` : null

    return {
        subjectLabel:
            canonicalSubject?.displayNameTh ??
            resolvedCurriculum.subjectLabel ??
            lesson.subject ??
            "บทเรียน",
        unitTitle: resolvedCurriculum.unitTitle,
        gradeLabel,
        semesterLabel,
        learningOutcomes: resolvedCurriculum.learningOutcomes,
        practicePlan: content.metadata?.template?.practicePlan ?? [],
    }
}
