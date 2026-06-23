import { getSubjectCurriculumMapPack } from "@/lib/curriculum/map-packs"
import { getCanonicalSubjectById, type CanonicalCoreSubjectId } from "@/lib/curriculum/subject-catalog"
import type { LessonContentV2 } from "@/lib/lessons/lesson-content"
import {
    findPhysicsCurriculumUnitById,
    findPhysicsLearningOutcomesByIds,
    type PhysicsLearningOutcome,
} from "@/lib/physics/curriculum"

const CORE_SUBJECT_IDS: CanonicalCoreSubjectId[] = [
    "thai",
    "mathematics",
    "science_technology",
    "social_religion_culture",
    "health_physical_education",
    "arts",
    "career",
    "foreign_languages",
]

export type LessonRuntimeMeta = {
    subjectLabel: string
    unitTitle: string | null
    gradeLabel: string | null
    semesterLabel: string | null
    learningOutcomes: PhysicsLearningOutcome[]
    practicePlan: string[]
}

type LessonRuntimeMetaLesson = {
    subject: string | null
    gradeLevel: string | null
}

export function resolveUnitTitleFromCurriculum(unitId: string | undefined) {
    if (!unitId) return null

    const physicsUnit = findPhysicsCurriculumUnitById(unitId)
    if (physicsUnit?.unit.title) return physicsUnit.unit.title

    for (const subjectId of CORE_SUBJECT_IDS) {
        const pack = getSubjectCurriculumMapPack(subjectId)
        const unit = pack?.unitOutlines.find((entry) => entry.id === unitId)
        if (unit?.title) return unit.title
    }

    return null
}

export function resolveLessonRuntimeMeta(content: LessonContentV2, lesson: LessonRuntimeMetaLesson): LessonRuntimeMeta {
    const curriculum = content.metadata?.curriculum
    const subjectLabel = curriculum?.subject ?? lesson.subject ?? "บทเรียน"
    const canonicalSubject = CORE_SUBJECT_IDS
        .map((subjectId) => getCanonicalSubjectById(subjectId))
        .find((subject) => subject?.displayNameTh === subjectLabel || subject?.displayNameEn === subjectLabel)
    const learningOutcomes = curriculum?.learningOutcomeIds?.length
        ? findPhysicsLearningOutcomesByIds(curriculum.learningOutcomeIds)
        : []
    const gradeLabel = curriculum?.gradeLevel ?? lesson.gradeLevel ?? null
    const semesterLabel = typeof curriculum?.semester === "number" ? `เทอม ${curriculum.semester}` : null

    return {
        subjectLabel: canonicalSubject?.displayNameTh ?? subjectLabel,
        unitTitle: resolveUnitTitleFromCurriculum(curriculum?.unitId),
        gradeLabel,
        semesterLabel,
        learningOutcomes,
        practicePlan: content.metadata?.template?.practicePlan ?? [],
    }
}
