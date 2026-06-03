import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"

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

        const student = await db.student.findUnique({
            where: { loginCode: trimmedCode },
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

        return NextResponse.json(assignments)
    } catch (error) {
        console.error("[STUDENT_LESSONS_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch student lessons", 500)
    }
}
