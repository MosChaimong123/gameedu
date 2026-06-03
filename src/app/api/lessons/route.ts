import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error"
import { db } from "@/lib/db"
import { isLessonContentPayload } from "@/lib/lessons/lesson-content"

// GET /api/lessons — ดึงรายการ lessons ของครูที่ login
export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }
        if (session.user.role === "STUDENT") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const lessons = await db.lesson.findMany({
            where: { ownerUserId: session.user.id },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                subject: true,
                gradeLevel: true,
                description: true,
                status: true,
                sourceFileName: true,
                createdAt: true,
                updatedAt: true,
                classroomAssignments: {
                    select: {
                        classId: true,
                        classroom: { select: { id: true, name: true } },
                    },
                },
            },
        })

        return NextResponse.json(lessons)
    } catch (error) {
        console.error("[LESSONS_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch lessons", 500)
    }
}

// POST /api/lessons — สร้าง lesson ใหม่ (DRAFT)
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }
        if (session.user.role === "STUDENT") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const body = await req.json()
        const { title, subject, gradeLevel, description, sourceFileName, content } = body as {
            title: string
            subject?: string
            gradeLevel?: string
            description?: string
            sourceFileName?: string
            content: unknown
        }

        if (!title || typeof title !== "string" || title.trim().length === 0) {
            return createAppErrorResponse("INVALID_PAYLOAD", "title is required", 400)
        }
        if (!isLessonContentPayload(content)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "valid lesson content is required", 400)
        }

        const lesson = await db.lesson.create({
            data: {
                title: title.trim(),
                subject: subject?.trim() || null,
                gradeLevel: gradeLevel?.trim() || null,
                description: description?.trim() || null,
                sourceFileName: sourceFileName?.trim() || null,
                content,
                status: "DRAFT",
                ownerUserId: session.user.id,
            },
        })

        return NextResponse.json(lesson, { status: 201 })
    } catch (error) {
        console.error("[LESSONS_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to create lesson", 500)
    }
}
