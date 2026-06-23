import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error"
import { syncTeachingMediaUsageForOwner } from "@/lib/actions/teaching-media-actions"
import { db } from "@/lib/db"
import { isLessonContentV2 } from "@/lib/lessons/lesson-content"
import { getLessonMediaBlockUsageReferences, getTeachingMediaUsageReferences } from "@/lib/teaching-media-reference"

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
                content: true,
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
        if (!isLessonContentV2(content)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "lesson content must use lesson_content_v2", 400)
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

        const documentUsage = getTeachingMediaUsageReferences(content.topics.flatMap((topic) => topic.documents ?? []))
        const mediaUsage = getLessonMediaBlockUsageReferences(
            content.topics.flatMap((topic) => [...(topic.media ?? []), ...topic.sections.flatMap((section) => section.media ?? [])])
        )

        await syncTeachingMediaUsageForOwner(session.user.id, {
            mediaIds: [...new Set([...documentUsage.mediaIds, ...mediaUsage.mediaIds])],
            urls: [...new Set([...documentUsage.urls, ...mediaUsage.urls])],
            linkUrls: [...new Set([...documentUsage.linkUrls, ...mediaUsage.linkUrls])],
            youtubeIds: [...new Set([...documentUsage.youtubeIds, ...mediaUsage.youtubeIds])],
        })

        return NextResponse.json(lesson, { status: 201 })
    } catch (error) {
        console.error("[LESSONS_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to create lesson", 500)
    }
}
