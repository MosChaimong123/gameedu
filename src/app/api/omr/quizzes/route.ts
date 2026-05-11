import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"
import { isTeacherOrAdmin } from "@/lib/role-guards"
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";

function isPositiveInteger(value: unknown) {
    return Number.isInteger(value) && Number(value) > 0
}

// GET /api/omr/quizzes - List all OMR quizzes for the teacher
export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        if (!isTeacherOrAdmin(session.user.role)) return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)

        const quizzes = await prisma.oMRQuiz.findMany({
            where: { teacherId: session.user.id },
            orderBy: { createdAt: "desc" },
            include: {
                results: {
                    orderBy: { scannedAt: "desc" }
                },
                _count: {
                    select: { results: true }
                }
            }
        })

        return NextResponse.json(quizzes)
    } catch (error) {
        console.error("[OMR_QUIZZES_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}

// POST /api/omr/quizzes - Create a new OMR quiz
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        if (!isTeacherOrAdmin(session.user.role)) return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)

        const body = await req.json()
        const { title, description, questionCount, classId } = body

        if (!title) return createAppErrorResponse("INVALID_PAYLOAD", "Title is required", 400)
        if (typeof title !== "string" || !title.trim()) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Title is required", 400)
        }
        if (!isPositiveInteger(questionCount)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Question count must be a positive integer", 400)
        }
        if (description !== undefined && description !== null && typeof description !== "string") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Description must be a string", 400)
        }
        if (classId !== undefined && classId !== null && typeof classId !== "string") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Classroom id must be a string", 400)
        }

        // Initialize empty answer key
        const answerKey: Record<string, string> = {}
        for (let i = 1; i <= questionCount; i++) {
            answerKey[i.toString()] = "" // Empty initially
        }

        const quiz = await prisma.oMRQuiz.create({
            data: {
                title: title.trim(),
                description,
                questionCount,
                answerKey,
                teacherId: session.user.id,
                classId: classId || null
            },
            include: {
                _count: {
                    select: { results: true }
                }
            }
        })

        return NextResponse.json(quiz)
    } catch (error) {
        console.error("[OMR_QUIZZES_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}
