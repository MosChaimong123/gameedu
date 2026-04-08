import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"
import { isTeacherOrAdmin } from "@/lib/role-guards"
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error";

// GET /api/omr/quizzes - List all OMR quizzes for the teacher
export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
        if (!isTeacherOrAdmin(session.user.role)) return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })

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
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// POST /api/omr/quizzes - Create a new OMR quiz
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
        if (!isTeacherOrAdmin(session.user.role)) return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })

        const body = await req.json()
        const { title, description, questionCount, classId } = body

        if (!title) return new NextResponse("Title is required", { status: 400 })

        // Initialize empty answer key
        const answerKey: Record<string, string> = {}
        for (let i = 1; i <= questionCount; i++) {
            answerKey[i.toString()] = "" // Empty initially
        }

        const quiz = await prisma.oMRQuiz.create({
            data: {
                title,
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
        return new NextResponse("Internal Error", { status: 500 })
    }
}
