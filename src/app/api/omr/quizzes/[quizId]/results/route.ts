import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isFiniteInteger(value: unknown) {
    return Number.isInteger(value) && Number.isFinite(value)
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

        if (studentId !== undefined && studentId !== null && typeof studentId !== "string") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Student id must be a string", 400)
        }
        if (studentName !== undefined && studentName !== null && typeof studentName !== "string") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Student name must be a string", 400)
        }
        if (!isFiniteInteger(score) || !isFiniteInteger(total) || Number(score) < 0 || Number(total) <= 0 || Number(score) > Number(total)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Score and total are invalid", 400)
        }
        if (!Array.isArray(answers) && !isPlainObject(answers)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Answers must be an object or array", 400)
        }

        // Verify quiz ownership
        const quiz = await prisma.oMRQuiz.findFirst({
            where: { id: quizId, teacherId: session.user.id },
            select: { id: true, classId: true },
        })

        if (!quiz) return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404)

        let normalizedStudentId: string | null = null
        let normalizedStudentName: string | null = typeof studentName === "string" ? studentName.trim() : null
        if (typeof studentId === "string" && studentId.trim()) {
            const student = await prisma.student.findUnique({
                where: { id: studentId.trim() },
                select: { id: true, classId: true, name: true, nickname: true },
            })
            if (!student) {
                return createAppErrorResponse("INVALID_PAYLOAD", "Student not found", 400)
            }
            if (quiz.classId && student.classId !== quiz.classId) {
                return createAppErrorResponse("INVALID_PAYLOAD", "Student does not belong to this quiz classroom", 400)
            }
            normalizedStudentId = student.id
            if (!normalizedStudentName) {
                normalizedStudentName = student.nickname?.trim() || student.name.trim()
            }
        }

        if (!normalizedStudentName) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Student name is required", 400)
        }

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
                studentId: normalizedStudentId,
                studentName: normalizedStudentName,
                score,
                total,
                answers: answers as Prisma.InputJsonValue,
            }
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("[OMR_RESULTS_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}
