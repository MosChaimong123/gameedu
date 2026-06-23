import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { isCourseContentV1 } from "@/lib/courses/course-content"
import { buildCourseProgressSnapshot } from "@/lib/courses/course-progress"
import { db } from "@/lib/db"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string; courseId: string }> }

export async function PATCH(req: Request, { params }: Params) {
    try {
        const { code, courseId } = await params
        const trimmedCode = code.trim()
        if (!trimmedCode || !courseId) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Student code and courseId are required", 400)
        }

        const body = (await req.json().catch(() => null)) as { currentLessonId?: string } | null
        const currentLessonId = body?.currentLessonId?.trim()
        if (!currentLessonId) {
            return createAppErrorResponse("INVALID_PAYLOAD", "currentLessonId is required", 400)
        }

        const student = await db.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(trimmedCode).map((candidate) => ({
                    loginCode: candidate,
                })),
            },
            select: { id: true, classId: true, name: true },
        })
        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404)
        }

        const assignment = await db.courseAssignment.findFirst({
            where: {
                classId: student.classId,
                courseId,
                status: "ACTIVE",
                course: { status: "PUBLISHED" },
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        content: true,
                    },
                },
            },
        })
        if (!assignment || !isCourseContentV1(assignment.course.content)) {
            return createAppErrorResponse("NOT_FOUND", "Course not found", 404)
        }

        const validLessonIds = new Set(
            assignment.course.content.modules.flatMap((module) => module.lessons.map((lesson) => lesson.lessonId))
        )
        if (!validLessonIds.has(currentLessonId)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Lesson is not part of this course", 400)
        }

        const existing = await db.courseProgress.findUnique({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId: student.id,
                },
            },
            select: {
                id: true,
                completedLessonIds: true,
                currentLessonId: true,
                percent: true,
                startedAt: true,
                lastOpenedAt: true,
                completedAt: true,
            },
        })
        const passedAssessmentAttempts = await db.courseAssessmentAttempt.findMany({
            where: {
                courseId,
                studentId: student.id,
                passed: true,
            },
            select: {
                assessmentId: true,
            },
        })

        const now = new Date()
        const progress = await db.courseProgress.upsert({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId: student.id,
                },
            },
            create: {
                courseId,
                studentId: student.id,
                classId: student.classId,
                currentLessonId,
                completedLessonIds: [],
                percent: 0,
                startedAt: now,
                lastOpenedAt: now,
            },
            update: {
                currentLessonId,
                lastOpenedAt: now,
            },
            select: {
                id: true,
                completedLessonIds: true,
                currentLessonId: true,
                percent: true,
                startedAt: true,
                lastOpenedAt: true,
                completedAt: true,
            },
        })

        if (!existing) {
            await db.pointHistory.create({
                data: {
                    studentId: student.id,
                    value: 0,
                    reason: `เริ่มเรียนคอร์ส: ${assignment.course.title}`,
                },
            })
        }

        return NextResponse.json({
            progress: buildCourseProgressSnapshot({
                content: assignment.course.content,
                progress,
                passedAssessmentIds: passedAssessmentAttempts.map((attempt) => attempt.assessmentId),
            }),
        })
    } catch (error) {
        console.error("[STUDENT_COURSE_PROGRESS_PATCH]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to update course progress", 500)
    }
}
