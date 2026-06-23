import type { CourseContentV1 } from "@/lib/courses/course-content"
import { getCanonicalSubjectById } from "@/lib/curriculum/subject-catalog"
import { resolveCurriculumUnitTitle, resolveLessonCurriculumContext } from "@/lib/lessons/lesson-curriculum-context"

type LessonAnalyticsRecord = {
    id: string
    title: string
    subject: string | null
    content: unknown
}

type StudentLessonProgress = {
    completedLessonIds: string[]
}

type AssessmentSummary = {
    assessmentCount: number
    submittedCount: number
    passedCount: number
    failedCount: number
    notStartedCount: number
}

export type ClassroomCourseCurriculumLessonAnalytics = {
    lessonId: string
    title: string
    required: boolean
    subjectId: string | null
    subjectLabel: string | null
    unitId: string | null
    unitTitle: string | null
    completionCount: number
    completionRate: number
}

export type ClassroomCourseCurriculumUnitAnalytics = {
    unitId: string | null
    unitTitle: string
    lessonCount: number
    requiredLessonCount: number
    averageCompletionRate: number
}

export type ClassroomCourseCurriculumAnalytics = {
    subjectId: string | null
    subjectLabel: string
    lessonCount: number
    requiredLessonCount: number
    optionalLessonCount: number
    unitCount: number
    averageLessonCompletionRate: number
    assessmentCount: number
    assessmentPassRate: number | null
    unitCoverage: ClassroomCourseCurriculumUnitAnalytics[]
    lessonCompletion: ClassroomCourseCurriculumLessonAnalytics[]
}

function roundPercent(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)))
}

export function buildClassroomCourseCurriculumAnalytics(input: {
    content: CourseContentV1
    lessons: LessonAnalyticsRecord[]
    students: StudentLessonProgress[]
    assessmentSummary?: AssessmentSummary | null
}): ClassroomCourseCurriculumAnalytics {
    const lessonById = new Map(input.lessons.map((lesson) => [lesson.id, lesson]))
    const studentCount = input.students.length

    const lessonCompletion = input.content.modules.flatMap((module) =>
        module.lessons.map((lessonRef) => {
            const lessonRecord = lessonById.get(lessonRef.lessonId) ?? null
            const context = lessonRecord ? resolveLessonCurriculumContext(lessonRecord.content, lessonRecord.subject) : { subjectId: null, unitId: null }
            const completionCount = input.students.filter((student) => student.completedLessonIds.includes(lessonRef.lessonId)).length
            const completionRate = studentCount > 0 ? roundPercent((completionCount / studentCount) * 100) : 0
            return {
                lessonId: lessonRef.lessonId,
                title: lessonRef.title ?? lessonRecord?.title ?? lessonRef.lessonId,
                required: lessonRef.required,
                subjectId: context.subjectId,
                subjectLabel: context.subjectId ? getCanonicalSubjectById(context.subjectId)?.displayNameTh ?? context.subjectId : lessonRecord?.subject ?? null,
                unitId: context.unitId,
                unitTitle: resolveCurriculumUnitTitle(context.subjectId, context.unitId),
                completionCount,
                completionRate,
            } satisfies ClassroomCourseCurriculumLessonAnalytics
        })
    )

    const subjectId = lessonCompletion.find((lesson) => lesson.subjectId)?.subjectId ?? null
    const subjectLabel =
        (subjectId ? getCanonicalSubjectById(subjectId)?.displayNameTh ?? null : null) ??
        lessonCompletion.find((lesson) => lesson.subjectLabel)?.subjectLabel ??
        input.content.subject ??
        "คอร์สนี้"

    const unitBuckets = new Map<string, { unitId: string | null; unitTitle: string; lessons: ClassroomCourseCurriculumLessonAnalytics[] }>()
    for (const lesson of lessonCompletion) {
        const key = lesson.unitId ?? `lesson:${lesson.lessonId}`
        const unitTitle = lesson.unitTitle ?? lesson.title
        const current = unitBuckets.get(key)
        if (current) {
            current.lessons.push(lesson)
        } else {
            unitBuckets.set(key, {
                unitId: lesson.unitId,
                unitTitle,
                lessons: [lesson],
            })
        }
    }

    const unitCoverage = Array.from(unitBuckets.values()).map((bucket) => {
        const lessonCount = bucket.lessons.length
        const requiredLessonCount = bucket.lessons.filter((lesson) => lesson.required).length
        const averageCompletionRate =
            lessonCount > 0 ? roundPercent(bucket.lessons.reduce((sum, lesson) => sum + lesson.completionRate, 0) / lessonCount) : 0
        return {
            unitId: bucket.unitId,
            unitTitle: bucket.unitTitle,
            lessonCount,
            requiredLessonCount,
            averageCompletionRate,
        } satisfies ClassroomCourseCurriculumUnitAnalytics
    })

    const averageLessonCompletionRate =
        lessonCompletion.length > 0
            ? roundPercent(lessonCompletion.reduce((sum, lesson) => sum + lesson.completionRate, 0) / lessonCompletion.length)
            : 0

    const assessmentSummary = input.assessmentSummary ?? null
    const assessmentPassRate =
        assessmentSummary && assessmentSummary.submittedCount > 0
            ? roundPercent((assessmentSummary.passedCount / assessmentSummary.submittedCount) * 100)
            : null

    return {
        subjectId,
        subjectLabel,
        lessonCount: lessonCompletion.length,
        requiredLessonCount: lessonCompletion.filter((lesson) => lesson.required).length,
        optionalLessonCount: lessonCompletion.filter((lesson) => !lesson.required).length,
        unitCount: unitCoverage.length,
        averageLessonCompletionRate,
        assessmentCount: assessmentSummary?.assessmentCount ?? 0,
        assessmentPassRate,
        unitCoverage: unitCoverage.sort((left, right) => right.averageCompletionRate - left.averageCompletionRate),
        lessonCompletion: lessonCompletion.sort((left, right) => right.completionRate - left.completionRate),
    }
}
