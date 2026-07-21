import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { db } from "@/lib/db"
import { getLessonTopicById, getLessonTopicRequirements, isLessonContentV2 } from "@/lib/lessons/lesson-content"
import { getLessonTopicProgressVersion } from "@/lib/lessons/lesson-progress"
import { getStudentLoginCodeVariants } from "@/lib/student-login-code"

type Params = { params: Promise<{ code: string; lessonId: string; topicId: string }> }

export async function POST(_req: Request, { params }: Params) {
    try {
        const { code, lessonId, topicId } = await params
        const trimmedCode = code.trim()
        if (!trimmedCode) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Student code is required", 400)
        }

        const student = await db.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(trimmedCode).map((candidate) => ({ loginCode: candidate })),
            },
            select: { id: true, classId: true },
        })
        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404)
        }

        const assignment = await db.lessonAssignment.findUnique({
            where: { lessonId_classId: { lessonId, classId: student.classId } },
            select: {
                lesson: { select: { status: true, content: true } },
            },
        })
        if (
            !assignment ||
            assignment.lesson.status !== "PUBLISHED" ||
            !isLessonContentV2(assignment.lesson.content)
        ) {
            return createAppErrorResponse("NOT_FOUND", "Lesson not found or not published", 404)
        }

        const topic = getLessonTopicById(assignment.lesson.content, topicId)
        if (!topic) {
            return createAppErrorResponse("NOT_FOUND", "Lesson topic not found", 404)
        }
        if (!getLessonTopicRequirements(topic).requiresContentAcknowledgement) {
            return createAppErrorResponse(
                "INVALID_PAYLOAD",
                "This topic does not require content acknowledgement",
                400
            )
        }

        const acknowledgement = await db.lessonTopicAcknowledgement.upsert({
            where: {
                studentId_lessonId_topicId: {
                    studentId: student.id,
                    lessonId,
                    topicId,
                },
            },
            create: {
                studentId: student.id,
                lessonId,
                topicId,
                contentVersion: getLessonTopicProgressVersion(topic),
            },
            update: {
                contentVersion: getLessonTopicProgressVersion(topic),
                acknowledgedAt: new Date(),
            },
            select: {
                topicId: true,
                contentVersion: true,
                acknowledgedAt: true,
            },
        })

        return NextResponse.json({ acknowledgement })
    } catch (error) {
        console.error("[LESSON_TOPIC_CONTENT_ACKNOWLEDGEMENT_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to acknowledge lesson topic content", 500)
    }
}
