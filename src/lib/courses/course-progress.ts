import type { CourseAssessmentV2, CourseContentV1, CourseModule } from "@/lib/courses/course-content"

export type CourseProgressRecord = {
    id?: string
    completedLessonIds?: string[]
    currentLessonId?: string | null
    percent?: number
    startedAt?: Date | string | null
    lastOpenedAt?: Date | string | null
    completedAt?: Date | string | null
}

export type CourseAssessmentProgressStatus = {
    requiredAssessmentIds: string[]
    passedAssessmentIds: string[]
    pendingAssessmentIds: string[]
    completed: boolean
}

export type CourseModuleProgressStatus = {
    moduleId: string
    title: string
    requiredLessonIds: string[]
    completedLessonIds: string[]
    checkpointAssessmentIds: string[]
    passedCheckpointAssessmentIds: string[]
    pendingCheckpointAssessmentIds: string[]
    completed: boolean
}

export type CourseProgressSnapshot = ReturnType<typeof normalizeCourseProgress> & {
    courseCompletedByLessons: boolean
    courseCompleted: boolean
    assessmentStatus: CourseAssessmentProgressStatus
    moduleStatus: CourseModuleProgressStatus[]
    nextRequiredAction: "LESSON" | "ASSESSMENT" | "COMPLETE"
}

export function getCourseLessonIds(content: CourseContentV1) {
    return Array.from(new Set(content.modules.flatMap((module) => module.lessons.map((lesson) => lesson.lessonId))))
}

export function getRequiredCourseLessonIds(content: CourseContentV1) {
    return Array.from(
        new Set(
            content.modules.flatMap((module) =>
                module.lessons.filter((lesson) => lesson.required).map((lesson) => lesson.lessonId)
            )
        )
    )
}

export function getRequiredCourseAssessmentIds(content: CourseContentV1) {
    return Array.from(new Set(content.certificate?.requiredAssessmentIds ?? []))
}

export function getModuleCheckpointAssessments(content: CourseContentV1, moduleId: string) {
    return (content.assessments ?? []).filter((assessment) => assessment.moduleId === moduleId && assessment.type === "checkpoint")
}

export function getCourseAssessmentProgressStatus(content: CourseContentV1, passedAssessmentIds: string[]) {
    const requiredAssessmentIds = getRequiredCourseAssessmentIds(content)
    const passedAssessmentSet = new Set(passedAssessmentIds)
    const pendingAssessmentIds = requiredAssessmentIds.filter((assessmentId) => !passedAssessmentSet.has(assessmentId))

    return {
        requiredAssessmentIds,
        passedAssessmentIds: Array.from(new Set(passedAssessmentIds)),
        pendingAssessmentIds,
        completed: pendingAssessmentIds.length === 0,
    } satisfies CourseAssessmentProgressStatus
}

function buildModuleProgressStatus(module: CourseModule, content: CourseContentV1, completedLessonIds: string[], passedAssessmentIds: string[]) {
    const completedLessonSet = new Set(completedLessonIds)
    const passedAssessmentSet = new Set(passedAssessmentIds)
    const requiredLessonIds = module.lessons.filter((lesson) => lesson.required).map((lesson) => lesson.lessonId)
    const completedRequiredLessonIds = requiredLessonIds.filter((lessonId) => completedLessonSet.has(lessonId))
    const checkpointAssessmentIds = getModuleCheckpointAssessments(content, module.id).map((assessment) => assessment.id)
    const passedCheckpointAssessmentIds = checkpointAssessmentIds.filter((assessmentId) => passedAssessmentSet.has(assessmentId))
    const pendingCheckpointAssessmentIds = checkpointAssessmentIds.filter((assessmentId) => !passedAssessmentSet.has(assessmentId))

    return {
        moduleId: module.id,
        title: module.title,
        requiredLessonIds,
        completedLessonIds: completedRequiredLessonIds,
        checkpointAssessmentIds,
        passedCheckpointAssessmentIds,
        pendingCheckpointAssessmentIds,
        completed: completedRequiredLessonIds.length === requiredLessonIds.length && pendingCheckpointAssessmentIds.length === 0,
    } satisfies CourseModuleProgressStatus
}

export function calculateCourseProgressPercent(content: CourseContentV1, completedLessonIds: string[]) {
    const requiredLessonIds = getRequiredCourseLessonIds(content)
    if (requiredLessonIds.length === 0) return 100

    const completedSet = new Set(completedLessonIds)
    const completedRequiredCount = requiredLessonIds.filter((lessonId) => completedSet.has(lessonId)).length
    return Math.max(0, Math.min(100, Math.round((completedRequiredCount / requiredLessonIds.length) * 100)))
}

export function normalizeCourseProgress(content: CourseContentV1, progress: CourseProgressRecord | null | undefined) {
    const validLessonIds = new Set(getCourseLessonIds(content))
    const completedLessonIds = Array.from(
        new Set((progress?.completedLessonIds ?? []).filter((lessonId) => validLessonIds.has(lessonId)))
    )
    const currentLessonId =
        progress?.currentLessonId && validLessonIds.has(progress.currentLessonId) ? progress.currentLessonId : null

    return {
        id: progress?.id ?? null,
        completedLessonIds,
        currentLessonId,
        percent: calculateCourseProgressPercent(content, completedLessonIds),
        startedAt: progress?.startedAt ?? null,
        lastOpenedAt: progress?.lastOpenedAt ?? null,
        completedAt: progress?.completedAt ?? null,
    }
}

export function isCourseCompleted(content: CourseContentV1, completedLessonIds: string[]) {
    return calculateCourseProgressPercent(content, completedLessonIds) >= 100
}

export function buildCourseProgressSnapshot(input: {
    content: CourseContentV1
    progress: CourseProgressRecord | null | undefined
    passedAssessmentIds?: string[]
}) {
    const normalized = normalizeCourseProgress(input.content, input.progress)
    const uniquePassedAssessmentIds = Array.from(new Set(input.passedAssessmentIds ?? []))
    const courseCompletedByLessons = isCourseCompleted(input.content, normalized.completedLessonIds)
    const assessmentStatus = getCourseAssessmentProgressStatus(input.content, uniquePassedAssessmentIds)
    const moduleStatus = input.content.modules.map((module) =>
        buildModuleProgressStatus(module, input.content, normalized.completedLessonIds, uniquePassedAssessmentIds)
    )
    const courseCompleted = courseCompletedByLessons && assessmentStatus.completed
    const nextRequiredAction = !courseCompletedByLessons ? "LESSON" : assessmentStatus.completed ? "COMPLETE" : "ASSESSMENT"

    return {
        ...normalized,
        completedAt: courseCompleted ? normalized.completedAt : null,
        courseCompletedByLessons,
        courseCompleted,
        assessmentStatus,
        moduleStatus,
        nextRequiredAction,
    } satisfies CourseProgressSnapshot
}
