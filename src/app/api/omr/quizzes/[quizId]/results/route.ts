import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"

interface IParams {
    quizId: string
}

// POST /api/omr/quizzes/[quizId]/results - Save a new scan result
export async function POST(
    req: Request,
    { params }: { params: Promise<IParams> }
) {
    try {
        const { quizId } = await params
        const session = await auth()
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
        const body = await req.json()
        const { studentId, studentName, score, total, answers } = body

        // Verify quiz ownership
        const quiz = await prisma.oMRQuiz.findFirst({
            where: { id: quizId, teacherId: session.user.id }
        })

        if (!quiz) return new NextResponse("Forbidden", { status: 403 })

        const result = await prisma.oMRResult.create({
            data: {
                quizId,
                studentId: studentId || null,
                studentName,
                score,
                total,
                answers
            }
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("[OMR_RESULTS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
