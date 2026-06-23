import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { isCourseContentV1 } from "@/lib/courses/course-content"
import {
    buildCourseProgressSnapshot,
    getRequiredCourseLessonIds,
    calculateCourseProgressPercent,
} from "@/lib/courses/course-progress"
import { db } from "@/lib/db"
import { sendNotification } from "@/lib/notifications"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string; courseId: string }> }

export async function POST(req: Request, { params }: Params) {
    try {
        const { code, courseId } = await params
        const trimmedCode = code.trim()
        if (!trimmedCode || !courseId) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Student code and courseId are required", 400)
        }

        const body = (await req.json().catch(() => null)) as { lessonId?: string } | null
        const lessonId = body?.lessonId?.trim()
        if (!lessonId) {
            return createAppErrorResponse("INVALID_PAYLOAD", "lessonId is required", 400)
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
        if (!validLessonIds.has(lessonId)) {
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
                completedAt: true,
                startedAt: true,
                lastOpenedAt: true,
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

        const completedLessonIds = Array.from(new Set([...(existing?.completedLessonIds ?? []), lessonId]))
        const percent = calculateCourseProgressPercent(assignment.course.content, completedLessonIds)
        const passedAssessmentIds = passedAssessmentAttempts.map((attempt) => attempt.assessmentId)
        const completionSnapshot = buildCourseProgressSnapshot({
            content: assignment.course.content,
            progress: {
                ...existing,
                completedLessonIds,
                currentLessonId: lessonId,
                percent,
            },
            passedAssessmentIds,
        })
        const completed = completionSnapshot.courseCompleted
        const alreadyCompletedCourse = Boolean(existing?.completedAt)
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
                currentLessonId: lessonId,
                completedLessonIds,
                percent,
                startedAt: now,
                lastOpenedAt: now,
                completedAt: completed ? now : null,
            },
            update: {
                currentLessonId: lessonId,
                completedLessonIds,
                percent,
                lastOpenedAt: now,
                completedAt: completed ? existing?.completedAt ?? now : null,
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

        if (completed && !alreadyCompletedCourse) {
            await db.pointHistory.create({
                data: {
                    studentId: student.id,
                    value: 0,
                    reason: `จบคอร์ส: ${assignment.course.title}`,
                },
            })

            await sendNotification({
                studentId: student.id,
                type: "SUCCESS",
                link: `/student/${trimmedCode}?tab=courses`,
                title: "เรียนจบคอร์สแล้ว",
                message: `คุณเรียนจบคอร์ส ${assignment.course.title} เรียบร้อยแล้ว`,
            })
        }

        return NextResponse.json({
            progress: buildCourseProgressSnapshot({
                content: assignment.course.content,
                progress,
                passedAssessmentIds,
            }),
            courseCompleted: completed,
            requiredLessonCount: getRequiredCourseLessonIds(assignment.course.content).length,
        })
    } catch (error) {
        console.error("[STUDENT_COURSE_COMPLETE_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to complete course lesson", 500)
    }
}
