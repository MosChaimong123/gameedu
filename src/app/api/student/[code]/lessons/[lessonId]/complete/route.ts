import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import { sendNotification } from "@/lib/notifications"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

const LESSON_COMPLETE_XP = 5
const LESSON_COMPLETE_GOLD = 20

type Params = { params: Promise<{ code: string; lessonId: string }> }

// POST /api/student/[code]/lessons/[lessonId]/complete
export async function POST(req: Request, { params }: Params) {
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
            select: { id: true, classId: true, behaviorPoints: true, gold: true },
        })
        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404)
        }

        const assignment = await db.lessonAssignment.findUnique({
            where: { lessonId_classId: { lessonId, classId: student.classId } },
            select: {
                id: true,
                lesson: { select: { status: true, title: true } },
            },
        })
        if (!assignment || assignment.lesson.status !== "PUBLISHED") {
            return createAppErrorResponse("NOT_FOUND", "Lesson not found or not published", 404)
        }

        const body = await req.json().catch(() => ({})) as { quizScore?: number }
        const quizScore =
            typeof body.quizScore === "number" &&
            Number.isInteger(body.quizScore) &&
            body.quizScore >= 0 &&
            body.quizScore <= 100
                ? body.quizScore
                : null

        // Check if already completed
        const existing = await db.lessonCompletion.findUnique({
            where: {
                lessonAssignmentId_studentId: {
                    lessonAssignmentId: assignment.id,
                    studentId: student.id,
                },
            },
            select: { id: true },
        })

        const isFirstCompletion = !existing

        const completion = await db.lessonCompletion.upsert({
            where: {
                lessonAssignmentId_studentId: {
                    lessonAssignmentId: assignment.id,
                    studentId: student.id,
                },
            },
            create: {
                lessonAssignmentId: assignment.id,
                studentId: student.id,
                quizScore,
            },
            update: {
                completedAt: new Date(),
                ...(quizScore !== null && { quizScore }),
            },
        })

        // Award XP + Gold only on first completion
        if (isFirstCompletion) {
            await db.student.update({
                where: { id: student.id },
                data: {
                    behaviorPoints: { increment: LESSON_COMPLETE_XP },
                    gold: { increment: LESSON_COMPLETE_GOLD },
                    history: {
                        create: {
                            reason: `เรียนจบบทเรียน: ${assignment.lesson.title}`,
                            value: LESSON_COMPLETE_XP,
                        },
                    },
                },
            })

            await sendNotification({
                studentId: student.id,
                type: "SUCCESS",
                link: `/student/${trimmedCode}`,
                i18n: {
                    titleKey: "lessonCompleteTitle",
                    messageKey: "lessonCompleteBody",
                    params: {
                        xp: LESSON_COMPLETE_XP,
                        gold: LESSON_COMPLETE_GOLD,
                        title: assignment.lesson.title,
                    },
                },
            })
        }

        return NextResponse.json(
            { completion, reward: isFirstCompletion ? { xp: LESSON_COMPLETE_XP, gold: LESSON_COMPLETE_GOLD } : null },
            { status: 201 }
        )
    } catch (error) {
        console.error("[STUDENT_LESSON_COMPLETE]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to record completion", 500)
    }
}
