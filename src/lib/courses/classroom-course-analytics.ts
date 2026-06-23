import type { CourseContentV1 } from "@/lib/courses/course-content"
import { buildCourseProgressSnapshot, type CourseProgressRecord } from "@/lib/courses/course-progress"

export type ClassroomCourseStudentProgress = {
    studentId: string
    studentName: string
    studentNickname: string | null
    studentLoginCode: string
    progressId: string | null
    percent: number
    completedLessonIds: string[]
    currentLessonId: string | null
    currentLessonTitle: string | null
    nextLessonId: string | null
    nextLessonTitle: string | null
    startedAt: Date | string | null
    lastOpenedAt: Date | string | null
    completedAt: Date | string | null
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
    needsAttention: boolean
    attentionReason: string | null
    passedAssessmentIds: string[]
    issuedCertificate: boolean
}

type BuildStudentProgressInput = {
    content: CourseContentV1
    student: {
        id: string
        name: string
        nickname: string | null
        loginCode: string
    }
    progress: CourseProgressRecord | null | undefined
    passedAssessmentIds: string[]
    issuedCertificate: boolean
    dueAt?: Date | null
    now?: Date
}

function buildLessonTitleMap(content: CourseContentV1) {
    return new Map(
        content.modules.flatMap((module) =>
            module.lessons.map((lesson) => [lesson.lessonId, lesson.title ?? null] as const)
        )
    )
}

export function getNextIncompleteLessonId(content: CourseContentV1, completedLessonIds: string[]) {
    const completedSet = new Set(completedLessonIds)
    for (const module of content.modules) {
        for (const lesson of module.lessons) {
            if (!lesson.required) continue
            if (!completedSet.has(lesson.lessonId)) {
                return lesson.lessonId
            }
        }
    }
    return null
}

export function buildClassroomCourseStudentProgress(input: BuildStudentProgressInput): ClassroomCourseStudentProgress {
    const now = input.now ?? new Date()
    const normalized = buildCourseProgressSnapshot({
        content: input.content,
        progress: input.progress,
        passedAssessmentIds: input.passedAssessmentIds,
    })
    const lessonTitleById = buildLessonTitleMap(input.content)
    const nextLessonId = getNextIncompleteLessonId(input.content, normalized.completedLessonIds)
    const status: ClassroomCourseStudentProgress["status"] =
        normalized.courseCompleted
            ? "COMPLETED"
            : normalized.id
              ? "IN_PROGRESS"
              : "NOT_STARTED"

    let attentionReason: string | null = null
    if (status === "NOT_STARTED") {
        attentionReason = "ยังไม่เริ่มเรียน"
    } else if (status === "IN_PROGRESS" && normalized.lastOpenedAt) {
        const lastOpenedAt = new Date(normalized.lastOpenedAt)
        const ageDays = Math.floor((now.getTime() - lastOpenedAt.getTime()) / 86400000)
        if (ageDays >= 7) {
            attentionReason = `ค้างเรียน ${ageDays} วัน`
        }
    }

    if (!attentionReason && normalized.courseCompletedByLessons && !normalized.assessmentStatus.completed) {
        attentionReason = "ค้างแบบทดสอบที่ต้องผ่าน"
    }
    if (!attentionReason && status !== "COMPLETED" && input.dueAt && input.dueAt.getTime() < now.getTime()) {
        attentionReason = "เลยกำหนดส่งคอร์ส"
    }

    return {
        studentId: input.student.id,
        studentName: input.student.name,
        studentNickname: input.student.nickname,
        studentLoginCode: input.student.loginCode,
        progressId: normalized.id,
        percent: normalized.percent,
        completedLessonIds: normalized.completedLessonIds,
        currentLessonId: normalized.currentLessonId,
        currentLessonTitle: normalized.currentLessonId ? lessonTitleById.get(normalized.currentLessonId) ?? null : null,
        nextLessonId,
        nextLessonTitle: nextLessonId ? lessonTitleById.get(nextLessonId) ?? null : null,
        startedAt: normalized.startedAt,
        lastOpenedAt: normalized.lastOpenedAt,
        completedAt: normalized.completedAt,
        status,
        needsAttention: attentionReason !== null,
        attentionReason,
        passedAssessmentIds: input.passedAssessmentIds,
        issuedCertificate: input.issuedCertificate,
    }
}

export function summarizeClassroomCourseProgress(rows: ClassroomCourseStudentProgress[]) {
    const completedCount = rows.filter((row) => row.status === "COMPLETED").length
    const inProgressCount = rows.filter((row) => row.status === "IN_PROGRESS").length
    const notStartedCount = rows.filter((row) => row.status === "NOT_STARTED").length
    const certificateIssuedCount = rows.filter((row) => row.issuedCertificate).length
    const attentionCount = rows.filter((row) => row.needsAttention).length
    const averagePercent =
        rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / rows.length) : 0
    const blockerCounts = new Map<string, { lessonId: string; lessonTitle: string | null; count: number }>()
    for (const row of rows) {
        if (!row.nextLessonId || row.status === "COMPLETED") continue
        const current = blockerCounts.get(row.nextLessonId)
        blockerCounts.set(row.nextLessonId, {
            lessonId: row.nextLessonId,
            lessonTitle: row.nextLessonTitle,
            count: (current?.count ?? 0) + 1,
        })
    }

    return {
        studentCount: rows.length,
        completedCount,
        inProgressCount,
        notStartedCount,
        certificateIssuedCount,
        attentionCount,
        averagePercent,
        blockerLessons: Array.from(blockerCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5),
    }
}
