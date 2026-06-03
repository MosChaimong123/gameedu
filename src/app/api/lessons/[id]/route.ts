import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error"
import { db } from "@/lib/db"
import { isLessonContentPayload } from "@/lib/lessons/lesson-content"

type Params = { params: Promise<{ id: string }> }

// GET /api/lessons/[id]
export async function GET(_req: Request, { params }: Params) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }
        if (session.user.role === "STUDENT") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const { id } = await params
        const lesson = await db.lesson.findUnique({
            where: { id },
            include: {
                classroomAssignments: {
                    select: {
                        id: true,
                        classId: true,
                        assignedAt: true,
                        classroom: {
                            select: {
                                id: true,
                                name: true,
                                students: {
                                    orderBy: { order: "asc" },
                                    select: { id: true, name: true, nickname: true, order: true },
                                },
                            },
                        },
                        completions: {
                            select: {
                                studentId: true,
                                quizScore: true,
                                completedAt: true,
                                student: { select: { id: true, name: true, nickname: true, order: true } },
                            },
                        },
                    },
                },
            },
        })

        if (!lesson) {
            return createAppErrorResponse("NOT_FOUND", "Lesson not found", 404)
        }
        if (lesson.ownerUserId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        return NextResponse.json(lesson)
    } catch (error) {
        console.error("[LESSON_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch lesson", 500)
    }
}

// PATCH /api/lessons/[id] — แก้ไขเนื้อหา หรือ publish
export async function PATCH(req: Request, { params }: Params) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }
        if (session.user.role === "STUDENT") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const { id } = await params
        const existing = await db.lesson.findUnique({ where: { id }, select: { ownerUserId: true } })
        if (!existing) {
            return createAppErrorResponse("NOT_FOUND", "Lesson not found", 404)
        }
        if (existing.ownerUserId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const body = await req.json()
        const { title, subject, gradeLevel, description, status, content } = body as {
            title?: string
            subject?: string
            gradeLevel?: string
            description?: string
            status?: string
            content?: unknown
        }

        if (status && !["DRAFT", "PUBLISHED"].includes(status)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "status must be DRAFT or PUBLISHED", 400)
        }
        if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "title cannot be empty", 400)
        }
        if (content !== undefined && !isLessonContentPayload(content)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "valid lesson content is required", 400)
        }

        const updated = await db.lesson.update({
            where: { id },
            data: {
                ...(title !== undefined && { title: title.trim() }),
                ...(subject !== undefined && { subject: subject?.trim() || null }),
                ...(gradeLevel !== undefined && { gradeLevel: gradeLevel?.trim() || null }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(status !== undefined && { status }),
                ...(content !== undefined && { content }),
            },
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("[LESSON_PATCH]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to update lesson", 500)
    }
}

// DELETE /api/lessons/[id]
export async function DELETE(_req: Request, { params }: Params) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }
        if (session.user.role === "STUDENT") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const { id } = await params
        const existing = await db.lesson.findUnique({ where: { id }, select: { ownerUserId: true } })
        if (!existing) {
            return createAppErrorResponse("NOT_FOUND", "Lesson not found", 404)
        }
        if (existing.ownerUserId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        await db.lesson.delete({ where: { id } })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("[LESSON_DELETE]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to delete lesson", 500)
    }
}
