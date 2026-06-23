import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import { isLessonContentV2, type LessonContentV2 } from "@/lib/lessons/lesson-content"
import { summarizeStudentLessonProgress } from "@/lib/lessons/lesson-progress"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string }> }

// GET /api/student/[code]/lessons
// Returns published lessons assigned to the student's classroom using the login-code flow.
export async function GET(_req: Request, { params }: Params) {
    try {
        const { code } = await params
        const trimmedCode = code.trim()
        if (!trimmedCode) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Student code is required", 400)
        }

        const student = await db.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(trimmedCode).map((candidate) => ({
                    loginCode: candidate,
                })),
            },
            select: { id: true, classId: true },
        })
        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404)
        }

        const assignments = await db.lessonAssignment.findMany({
            where: {
                classId: student.classId,
                lesson: { status: "PUBLISHED" },
            },
            include: {
                lesson: {
                    select: {
                        id: true,
                        title: true,
                        subject: true,
                        gradeLevel: true,
                        description: true,
                        content: true,
                    },
                },
                completions: {
                    where: { studentId: student.id },
                    select: { completedAt: true, quizScore: true },
                },
            },
            orderBy: { assignedAt: "asc" },
        })
        const publishedAssignments = assignments.filter(
            (assignment): assignment is typeof assignment & { lesson: typeof assignment.lesson & { content: LessonContentV2 } } =>
                isLessonContentV2(assignment.lesson.content)
        )
        const lessonIdsWithAssessment = publishedAssignments
            .filter(
                (assignment) =>
                    assignment.lesson.content.topics.some((topic) => Boolean(topic.assessment?.questionSetId))
            )
            .map((assignment) => assignment.lesson.id)
        const assessmentAttempts =
            lessonIdsWithAssessment.length > 0
                ? await db.lessonAssessmentAttempt.findMany({
                      where: {
                          lessonId: { in: lessonIdsWithAssessment },
                          studentId: student.id,
                      },
                      select: {
                          lessonId: true,
                          questionSetId: true,
                          assessmentSourceType: true,
                          topicId: true,
                          topicAssessmentId: true,
                          score: true,
                          maxScore: true,
                          passed: true,
                          attemptNumber: true,
                          rewardGrantedAt: true,
                          certificateIssuedAt: true,
                          completedAt: true,
                      },
                      orderBy: { completedAt: "desc" },
                  })
                : []
        const topicVideoWatches =
            publishedAssignments.length > 0
                ? await db.topicVideoWatch.findMany({
                      where: {
                          lessonId: { in: publishedAssignments.map((assignment) => assignment.lesson.id) },
                          studentId: student.id,
                      },
                      select: {
                          lessonId: true,
                          topicId: true,
                          completedAt: true,
                      },
                  })
                : []
        const attemptsByLessonId = new Map<string, typeof assessmentAttempts>()
        for (const attempt of assessmentAttempts) {
            const current = attemptsByLessonId.get(attempt.lessonId) ?? []
            current.push(attempt)
            attemptsByLessonId.set(attempt.lessonId, current)
        }
        const watchesByLessonId = new Map<string, typeof topicVideoWatches>()
        for (const watch of topicVideoWatches) {
            const current = watchesByLessonId.get(watch.lessonId) ?? []
            current.push(watch)
            watchesByLessonId.set(watch.lessonId, current)
        }

        return NextResponse.json(
            publishedAssignments.map((assignment) => {
                const attempts = attemptsByLessonId.get(assignment.lesson.id) ?? []
                const watches = watchesByLessonId.get(assignment.lesson.id) ?? []
                const completion = assignment.completions[0] ?? null
                const progressSummary = summarizeStudentLessonProgress({
                    content: assignment.lesson.content,
                    attempts,
                    topicVideoWatches: watches,
                    completedAt: completion?.completedAt ?? null,
                })
                return {
                    ...assignment,
                    progressSummary,
                    assessmentStatus: progressSummary.assessmentStatus,
                }
            })
        )
    } catch (error) {
        console.error("[STUDENT_LESSONS_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch student lessons", 500)
    }
}
