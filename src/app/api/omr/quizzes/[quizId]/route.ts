import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"

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
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

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

        if (!quiz) return new NextResponse("Not Found", { status: 404 })

        return NextResponse.json(quiz)
    } catch (error) {
        console.error("[OMR_QUIZ_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
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
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
        const body = await req.json()
        const { title, description, answerKey, classId, questionCount } = body

        // Verify ownership
        const existing = await prisma.oMRQuiz.findFirst({
            where: { id: quizId, teacherId: session.user.id }
        })
        if (!existing) return new NextResponse("Not Found", { status: 404 })

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
        return new NextResponse("Internal Error", { status: 500 })
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
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

        // Verify ownership
        const existing = await prisma.oMRQuiz.findFirst({
            where: { id: quizId, teacherId: session.user.id }
        })
        if (!existing) return new NextResponse("Not Found", { status: 404 })

        await prisma.oMRQuiz.delete({
            where: { id: quizId }
        })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("[OMR_QUIZ_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
