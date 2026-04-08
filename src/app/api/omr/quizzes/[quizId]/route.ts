import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"
import { isTeacherOrAdmin } from "@/lib/role-guards"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error";

interface IParams {
    quizId: string
}

// GET /api/omr/quizzes/[quizId] - Get single quiz details with results
export async function GET(
    req: Request,
    { params }: { params: Promise<IParams> }
) {
    try {
        const { quizId } = await params
        const session = await auth()
        if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        if (!isTeacherOrAdmin(session.user.role)) return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)

        const quiz = await prisma.oMRQuiz.findFirst({
            where: {
                id: quizId,
                teacherId: session.user.id
            },
            include: {
                results: {
                    orderBy: { scannedAt: "desc" },
                    include: {
                        student: {
                            select: { name: true, nickname: true }
                        }
                    }
                }
            }
        })

        if (!quiz) return createAppErrorResponse("NOT_FOUND", "Not Found", 404)

        return NextResponse.json(quiz)
    } catch (error) {
        console.error("[OMR_QUIZ_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Internal Error", 500)
    }
}

// PUT /api/omr/quizzes/[quizId] - Update quiz (Answer Key, title, etc.)
export async function PUT(
    req: Request,
    { params }: { params: Promise<IParams> }
) {
    try {
        const { quizId } = await params
        const session = await auth()
        if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        if (!isTeacherOrAdmin(session.user.role)) return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        const body = await req.json()
        const { title, description, answerKey, classId, questionCount } = body

        // Verify ownership
        const existing = await prisma.oMRQuiz.findFirst({
            where: { id: quizId, teacherId: session.user.id }
        })
        if (!existing) return createAppErrorResponse("NOT_FOUND", "Not Found", 404)

        const quiz = await prisma.oMRQuiz.update({
            where: { id: quizId },
            data: {
                title,
                description,
                answerKey,
                classId,
                questionCount
            },
            include: {
                results: {
                    orderBy: { scannedAt: "desc" },
                    include: {
                        student: {
                            select: { name: true, nickname: true }
                        }
                    }
                }
            }
        })

        return NextResponse.json(quiz)
    } catch (error) {
        console.error("[OMR_QUIZ_PUT]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Internal Error", 500)
    }
}

// DELETE /api/omr/quizzes/[quizId] - Delete quiz
export async function DELETE(
    req: Request,
    { params }: { params: Promise<IParams> }
) {
    try {
        const { quizId } = await params
        const session = await auth()
        if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        if (!isTeacherOrAdmin(session.user.role)) return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)

        // Verify ownership
        const existing = await prisma.oMRQuiz.findFirst({
            where: { id: quizId, teacherId: session.user.id }
        })
        if (!existing) return createAppErrorResponse("NOT_FOUND", "Not Found", 404)

        await prisma.oMRQuiz.delete({
            where: { id: quizId }
        })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("[OMR_QUIZ_DELETE]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Internal Error", 500)
    }
}
