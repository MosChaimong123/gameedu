import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
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

        if (!assignment || assignment.lesson.status !== "PUBLISHED") {
            return createAppErrorResponse("NOT_FOUND", "Lesson not found or not published", 404)
        }

        return NextResponse.json(assignment)
    } catch (error) {
        console.error("[STUDENT_LESSON_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch lesson", 500)
    }
}
