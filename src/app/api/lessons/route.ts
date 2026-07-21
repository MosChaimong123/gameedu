import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error"
import {
    createDraftLessonForTeacher,
    listLessonsForTeacher,
} from "@/lib/services/lessons/lesson-list"

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

        return NextResponse.json(await listLessonsForTeacher(session.user.id))
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

        const result = await createDraftLessonForTeacher(
            session.user.id,
            (await req.json()) as Record<string, unknown>
        )
        if (!result.ok && result.reason === "title_required") {
            return createAppErrorResponse("INVALID_PAYLOAD", "title is required", 400)
        }
        if (!result.ok && result.reason === "invalid_content") {
            return createAppErrorResponse("INVALID_PAYLOAD", "lesson content must use lesson_content_v2", 400)
        }

        return NextResponse.json(result.lesson, { status: 201 })
    } catch (error) {
        console.error("[LESSONS_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to create lesson", 500)
    }
}
