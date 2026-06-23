import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import { isCourseContentV1 } from "@/lib/courses/course-content"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }
        if (session.user.role === "STUDENT") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const courses = await db.course.findMany({
            where: { ownerUserId: session.user.id },
            include: {
                _count: {
                    select: {
                        classroomAssignments: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(courses)
    } catch (error) {
        console.error("[COURSES_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch courses", 500)
    }
}

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
        const { title, subject, gradeLevel, description, coverImageUrl, content } = body as {
            title: string
            subject?: string | null
            gradeLevel?: string | null
            description?: string | null
            coverImageUrl?: string | null
            content: unknown
        }

        if (!title || typeof title !== "string" || title.trim().length === 0) {
            return createAppErrorResponse("INVALID_PAYLOAD", "title is required", 400)
        }
        if (!isCourseContentV1(content)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "course content must use course_content_v1", 400)
        }

        const course = await db.course.create({
            data: {
                title: title.trim(),
                subject: subject?.trim() || null,
                gradeLevel: gradeLevel?.trim() || null,
                description: description?.trim() || null,
                coverImageUrl: coverImageUrl?.trim() || null,
                status: "DRAFT",
                content,
                ownerUserId: session.user.id,
            },
        })

        return NextResponse.json(course, { status: 201 })
    } catch (error) {
        console.error("[COURSES_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to create course", 500)
    }
}
