import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import { isLessonContentV2 } from "@/lib/lessons/lesson-content"
import { summarizeStudentLessonProgress } from "@/lib/lessons/lesson-progress"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string; lessonId: string }> }

// GET /api/student/[code]/lessons/[lessonId]
// Returns the LessonAssignment + lesson content + this student's completion
export async function GET(_req: Request, { params }: Params) {
    try {
        const { code, lessonId } = await params

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

        const assignment = await db.lessonAssignment.findUnique({
            where: { lessonId_classId: { lessonId, classId: student.classId } },
            include: {
                lesson: {
                    select: {
                        id: true,
                        title: true,
                        subject: true,
                        gradeLevel: true,
                        status: true,
                        content: true,
                    },
                },
                completions: {
                    where: { studentId: student.id },
                    select: { completedAt: true, quizScore: true },
                },
            },
        })

        if (!assignment || assignment.lesson.status !== "PUBLISHED" || !isLessonContentV2(assignment.lesson.content)) {
            return createAppErrorResponse("NOT_FOUND", "Lesson not found or not published", 404)
        }

        const assessmentAttempts =
            assignment.lesson.content.topics.some((topic) => Boolean(topic.assessment?.questionSetId))
            ? await db.lessonAssessmentAttempt.findMany({
                  where: {
                      lessonId: assignment.lesson.id,
                      studentId: student.id,
                  },
                  select: {
                      id: true,
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
        const topicVideoWatches = await db.topicVideoWatch.findMany({
            where: {
                lessonId: assignment.lesson.id,
                studentId: student.id,
            },
            select: {
                topicId: true,
                completedAt: true,
            },
        })
        const completion = assignment.completions[0] ?? null
        const progressSummary = summarizeStudentLessonProgress({
            content: assignment.lesson.content,
            attempts: assessmentAttempts,
            topicVideoWatches,
            completedAt: completion?.completedAt ?? null,
        })

        return NextResponse.json({
            ...assignment,
            progressSummary,
            assessmentStatus: {
                ...progressSummary.assessmentStatus,
                latestAttempt: assessmentAttempts[0] ?? null,
            },
        })
    } catch (error) {
        console.error("[STUDENT_LESSON_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch lesson", 500)
    }
}
