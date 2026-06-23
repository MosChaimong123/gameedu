import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error"
import {
    getCoursePublishReadinessIssues,
    isCourseContentV1,
    type CourseAssessmentQuestionSetRecord,
} from "@/lib/courses/course-content"
import { db } from "@/lib/db"
import { isTeacherOrAdmin } from "@/lib/role-guards"

type Params = { params: Promise<{ id: string }> }

function collectLessonIds(content: unknown) {
    if (!isCourseContentV1(content)) return []
    return Array.from(new Set(content.modules.flatMap((module) => module.lessons.map((lesson) => lesson.lessonId))))
}

function collectQuestionSetIds(content: unknown) {
    if (!isCourseContentV1(content)) return []
    return Array.from(
        new Set(
            (content.assessments ?? [])
                .map((assessment) => assessment.questionSetId)
                .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        )
    )
}

export async function GET(_req: Request, { params }: Params) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }

        const { id: classId } = await params
        const classroom = await db.classroom.findUnique({
            where: { id: classId },
            select: { id: true, teacherId: true },
        })
        if (!classroom) {
            return createAppErrorResponse("NOT_FOUND", "Classroom not found", 404)
        }

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }
        if (classroom.teacherId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const assignments = await db.courseAssignment.findMany({
            where: { classId },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        subject: true,
                        gradeLevel: true,
                        status: true,
                        description: true,
                        coverImageUrl: true,
                        content: true,
                    },
                },
            },
            orderBy: { assignedAt: "asc" },
        })

        return NextResponse.json(assignments.filter((assignment) => isCourseContentV1(assignment.course.content)))
    } catch (error) {
        console.error("[CLASSROOM_COURSES_GET]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to fetch classroom courses", 500)
    }
}

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

        const body = await req.json()
        const { courseId, startAt, dueAt } = body as {
            courseId?: string
            startAt?: string | null
            dueAt?: string | null
        }
        if (!courseId || typeof courseId !== "string") {
            return createAppErrorResponse("INVALID_PAYLOAD", "courseId is required", 400)
        }

        const course = await db.course.findUnique({
            where: { id: courseId },
            select: { ownerUserId: true, status: true, content: true },
        })
        if (!course) {
            return createAppErrorResponse("NOT_FOUND", "Course not found", 404)
        }
        if (course.ownerUserId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", "You do not own this course", 403)
        }
        if (course.status !== "PUBLISHED") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Course must be published before assignment", 400)
        }
        if (!isCourseContentV1(course.content)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Course must use course_content_v1 before assignment", 400)
        }

        const lessonIds = collectLessonIds(course.content)
        const questionSetIds = collectQuestionSetIds(course.content)
        const lessons = lessonIds.length > 0
            ? await db.lesson.findMany({
                  where: { id: { in: lessonIds } },
                  select: { id: true, status: true, content: true },
              })
            : []
        const questionSets: CourseAssessmentQuestionSetRecord[] = questionSetIds.length > 0
            ? await db.questionSet.findMany({
                  where: { id: { in: questionSetIds } },
                  select: { id: true },
              })
            : []
        const readinessIssues = getCoursePublishReadinessIssues(course.content, lessons, questionSets)
        if (readinessIssues.length > 0) {
            return NextResponse.json(
                {
                    error: {
                        code: "INVALID_PAYLOAD",
                        message: "Course is not assign-ready",
                    },
                    issues: readinessIssues,
                },
                { status: 400 }
            )
        }

        const parsedStartAt = startAt ? new Date(startAt) : null
        const parsedDueAt = dueAt ? new Date(dueAt) : null
        if (parsedStartAt && Number.isNaN(parsedStartAt.getTime())) {
            return createAppErrorResponse("INVALID_PAYLOAD", "startAt must be a valid date", 400)
        }
        if (parsedDueAt && Number.isNaN(parsedDueAt.getTime())) {
            return createAppErrorResponse("INVALID_PAYLOAD", "dueAt must be a valid date", 400)
        }

        const assignment = await db.courseAssignment.upsert({
            where: { courseId_classId: { courseId, classId } },
            create: {
                courseId,
                classId,
                startAt: parsedStartAt,
                dueAt: parsedDueAt,
            },
            update: {
                startAt: parsedStartAt,
                dueAt: parsedDueAt,
                status: "ACTIVE",
            },
        })

        return NextResponse.json(assignment, { status: 201 })
    } catch (error) {
        console.error("[CLASSROOM_COURSES_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to assign course", 500)
    }
}
