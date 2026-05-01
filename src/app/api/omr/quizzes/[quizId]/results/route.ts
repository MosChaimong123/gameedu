import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"
import { isTeacherOrAdmin } from "@/lib/role-guards"
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { getLimitsForUser } from "@/lib/plan/plan-access";

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
        if (!session?.user?.id) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
        if (!isTeacherOrAdmin(session.user.role)) return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })
        const body = await req.json()
        const { studentId, studentName, score, total, answers } = body

        // Verify quiz ownership
        const quiz = await prisma.oMRQuiz.findFirst({
            where: { id: quizId, teacherId: session.user.id }
        })

        if (!quiz) return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })

        const limits = getLimitsForUser(session.user.role, session.user.plan)
        if (Number.isFinite(limits.maxOmrScansPerMonth)) {
            const start = new Date()
            start.setDate(1)
            start.setHours(0, 0, 0, 0)
            const used = await prisma.oMRResult.count({
                where: {
                    scannedAt: { gte: start },
                    quiz: { teacherId: session.user.id },
                },
            })
            if (used >= limits.maxOmrScansPerMonth) {
                return createAppErrorResponse(
                    "PLAN_LIMIT_OMR_MONTHLY",
                    "Monthly OMR scan limit reached for your plan",
                    403
                )
            }
        }

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
