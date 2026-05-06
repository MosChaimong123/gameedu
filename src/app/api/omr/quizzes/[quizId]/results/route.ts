import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"
import { isTeacherOrAdmin } from "@/lib/role-guards"
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
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
        if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        if (!isTeacherOrAdmin(session.user.role)) return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        const body = await req.json()
        const { studentId, studentName, score, total, answers } = body

        // Verify quiz ownership
        const quiz = await prisma.oMRQuiz.findFirst({
            where: { id: quizId, teacherId: session.user.id }
        })

        if (!quiz) return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404)

        const limits = getLimitsForUser(
            session.user.role,
            session.user.plan,
            session.user.planStatus,
            session.user.planExpiry
        )
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
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}
