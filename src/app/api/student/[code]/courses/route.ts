import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { isCourseContentV1 } from "@/lib/courses/course-content"
import { buildCourseProgressSnapshot } from "@/lib/courses/course-progress"
import { db } from "@/lib/db"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string }> }

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

        const assignments = await db.courseAssignment.findMany({
            where: {
                classId: student.classId,
                status: "ACTIVE",
                course: { status: "PUBLISHED" },
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        subject: true,
                        gradeLevel: true,
                        description: true,
                        coverImageUrl: true,
                        content: true,
                    },
                },
            },
            orderBy: { assignedAt: "asc" },
        })

        const validAssignments = assignments.filter(
            (
                assignment
            ): assignment is typeof assignment & {
                course: typeof assignment.course & { content: import("@/lib/courses/course-content").CourseContentV1 }
            } => isCourseContentV1(assignment.course.content)
        )
        const courseIds = validAssignments.map((assignment) => assignment.course.id)
        const [progressRows, assessmentAttempts] =
            courseIds.length > 0
                ? await Promise.all([
                      db.courseProgress.findMany({
                          where: {
                              studentId: student.id,
                              courseId: { in: courseIds },
                          },
                          select: {
                              id: true,
                              courseId: true,
                              completedLessonIds: true,
                              currentLessonId: true,
                              percent: true,
                              startedAt: true,
                              lastOpenedAt: true,
                              completedAt: true,
                          },
                      }),
                      db.courseAssessmentAttempt.findMany({
                          where: {
                              studentId: student.id,
                              courseId: { in: courseIds },
                              passed: true,
                          },
                          select: {
                              courseId: true,
                              assessmentId: true,
                          },
                      }),
                  ])
                : [[], []]
        const progressByCourseId = new Map(progressRows.map((row) => [row.courseId, row]))
        const passedAssessmentIdsByCourseId = new Map<string, string[]>()
        for (const attempt of assessmentAttempts) {
            const current = passedAssessmentIdsByCourseId.get(attempt.courseId) ?? []
            current.push(attempt.assessmentId)
            passedAssessmentIdsByCourseId.set(attempt.courseId, current)
        }

        return NextResponse.json(
            validAssignments.map((assignment) => ({
                ...assignment,
                progress: buildCourseProgressSnapshot({
                    content: assignment.course.content,
                    progress: progressByCourseId.get(assignment.course.id),
                    passedAssessmentIds: passedAssessmentIdsByCourseId.get(assignment.course.id) ?? [],
                }),
            }))
        )
    } catch (error) {
        console.error("[STUDENT_COURSES_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch student courses", 500)
    }
}
