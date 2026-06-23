import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import {
    type CourseAssessmentQuestionSetRecord,
    getCoursePublishReadinessIssues,
    isCourseContentV1,
    type CourseContentV1,
    type CourseLessonPublishRecord,
} from "@/lib/courses/course-content"

type Params = { params: Promise<{ id: string }> }

function collectLessonIds(content: CourseContentV1) {
    return Array.from(new Set(content.modules.flatMap((module) => module.lessons.map((lesson) => lesson.lessonId))))
}

async function getLessonRecordsForCourse(content: CourseContentV1): Promise<CourseLessonPublishRecord[]> {
    const lessonIds = collectLessonIds(content)
    if (lessonIds.length === 0) return []

    const lessons = await db.lesson.findMany({
        where: { id: { in: lessonIds } },
        select: { id: true, status: true, content: true },
    })

    return lessons
}

function collectQuestionSetIds(content: CourseContentV1) {
    return Array.from(
        new Set(
            (content.assessments ?? [])
                .map((assessment) => assessment.questionSetId)
                .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        )
    )
}

async function getQuestionSetRecordsForCourse(content: CourseContentV1): Promise<CourseAssessmentQuestionSetRecord[]> {
    const questionSetIds = collectQuestionSetIds(content)
    if (questionSetIds.length === 0) return []

    const questionSets = await db.questionSet.findMany({
        where: { id: { in: questionSetIds } },
        select: { id: true },
    })

    return questionSets
}

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
        const course = await db.course.findUnique({ where: { id } })
        if (!course) {
            return createAppErrorResponse("NOT_FOUND", "Course not found", 404)
        }
        if (course.ownerUserId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        return NextResponse.json(course)
    } catch (error) {
        console.error("[COURSE_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch course", 500)
    }
}

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
        const existing = await db.course.findUnique({ where: { id }, select: { ownerUserId: true, content: true } })
        if (!existing) {
            return createAppErrorResponse("NOT_FOUND", "Course not found", 404)
        }
        if (existing.ownerUserId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const body = await req.json()
        const { title, subject, gradeLevel, description, coverImageUrl, status, content } = body as {
            title?: string
            subject?: string | null
            gradeLevel?: string | null
            description?: string | null
            coverImageUrl?: string | null
            status?: string
            content?: unknown
        }

        if (status && !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "status must be DRAFT, PUBLISHED, or ARCHIVED", 400)
        }
        if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "title cannot be empty", 400)
        }
        if (content !== undefined && !isCourseContentV1(content)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "course content must use course_content_v1", 400)
        }

        const contentForPublish = content !== undefined ? content : existing.content
        if (status === "PUBLISHED") {
            const lessonRecords = isCourseContentV1(contentForPublish) ? await getLessonRecordsForCourse(contentForPublish) : []
            const questionSetRecords = isCourseContentV1(contentForPublish)
                ? await getQuestionSetRecordsForCourse(contentForPublish)
                : []
            const issues = getCoursePublishReadinessIssues(contentForPublish, lessonRecords, questionSetRecords)
            if (issues.length > 0) {
                return NextResponse.json(
                    {
                        error: {
                            code: "INVALID_PAYLOAD",
                            message: "Course is not publish-ready",
                        },
                        issues,
                    },
                    { status: 400 }
                )
            }
        }

        const updated = await db.course.update({
            where: { id },
            data: {
                ...(title !== undefined && { title: title.trim() }),
                ...(subject !== undefined && { subject: subject?.trim() || null }),
                ...(gradeLevel !== undefined && { gradeLevel: gradeLevel?.trim() || null }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(coverImageUrl !== undefined && { coverImageUrl: coverImageUrl?.trim() || null }),
                ...(status !== undefined && { status }),
                ...(content !== undefined && { content }),
            },
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("[COURSE_PATCH]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to update course", 500)
    }
}

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
        const existing = await db.course.findUnique({ where: { id }, select: { ownerUserId: true } })
        if (!existing) {
            return createAppErrorResponse("NOT_FOUND", "Course not found", 404)
        }
        if (existing.ownerUserId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        await db.course.delete({ where: { id } })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("[COURSE_DELETE]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to delete course", 500)
    }
}
