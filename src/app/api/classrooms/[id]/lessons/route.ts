import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error"
import { db } from "@/lib/db"
import { isTeacherOrAdmin } from "@/lib/role-guards"

type Params = { params: Promise<{ id: string }> }

// GET /api/classrooms/[id]/lessons — ดึง lessons ของ classroom (ครู + นักเรียน)
export async function GET(_req: Request, { params }: Params) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }

        const { id: classId } = await params

        // ตรวจสอบ classroom ว่ามีอยู่จริง
        const classroom = await db.classroom.findUnique({
            where: { id: classId },
            select: { id: true, teacherId: true },
        })
        if (!classroom) {
            return createAppErrorResponse("NOT_FOUND", "Classroom not found", 404)
        }

        // นักเรียน: ต้องอยู่ใน classroom นี้
        if (session.user.role === "STUDENT") {
            const student = await db.student.findFirst({
                where: { classId, userId: session.user.id },
                select: { id: true },
            })
            if (!student) {
                return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
            }

            const assignments = await db.lessonAssignment.findMany({
                where: { classId, lesson: { status: "PUBLISHED" } },
                include: {
                    lesson: {
                        select: {
                            id: true,
                            title: true,
                            subject: true,
                            gradeLevel: true,
                            description: true,
                            content: true,
                            estimatedMinutes: false,
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
        }

        // ครู: ต้องเป็นเจ้าของ classroom
        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }
        if (classroom.teacherId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const assignments = await db.lessonAssignment.findMany({
            where: { classId },
            include: {
                lesson: {
                    select: {
                        id: true,
                        title: true,
                        subject: true,
                        gradeLevel: true,
                        status: true,
                        description: true,
                    },
                },
                completions: {
                    select: { studentId: true, quizScore: true, completedAt: true },
                },
            },
            orderBy: { assignedAt: "asc" },
        })

        return NextResponse.json(assignments)
    } catch (error) {
        console.error("[CLASSROOM_LESSONS_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch classroom lessons", 500)
    }
}

// POST /api/classrooms/[id]/lessons — ครู assign lesson ให้ classroom
export async function POST(req: Request, { params }: Params) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }
        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const { id: classId } = await params

        const classroom = await db.classroom.findUnique({
            where: { id: classId },
            select: { teacherId: true },
        })
        if (!classroom) {
            return createAppErrorResponse("NOT_FOUND", "Classroom not found", 404)
        }
        if (classroom.teacherId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const { lessonId } = await req.json() as { lessonId: string }
        if (!lessonId) {
            return createAppErrorResponse("INVALID_PAYLOAD", "lessonId is required", 400)
        }

        const lesson = await db.lesson.findUnique({
            where: { id: lessonId },
            select: { ownerUserId: true, status: true },
        })
        if (!lesson) {
            return createAppErrorResponse("NOT_FOUND", "Lesson not found", 404)
        }
        if (lesson.ownerUserId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", "You do not own this lesson", 403)
        }
        if (lesson.status !== "PUBLISHED") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Lesson must be published before assignment", 400)
        }

        const assignment = await db.lessonAssignment.upsert({
            where: { lessonId_classId: { lessonId, classId } },
            create: { lessonId, classId },
            update: {},
        })

        return NextResponse.json(assignment, { status: 201 })
    } catch (error) {
        console.error("[CLASSROOM_LESSONS_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to assign lesson", 500)
    }
}
