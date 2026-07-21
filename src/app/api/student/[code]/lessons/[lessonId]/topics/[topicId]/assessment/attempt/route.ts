import { NextResponse } from "next/server"
import { createAppErrorResponse } from "@/lib/api-error"
import { submitTopicAssessmentAttempt } from "@/lib/services/student-dashboard/submit-topic-assessment-attempt"

type Params = { params: Promise<{ code: string; lessonId: string; topicId: string }> }

export async function POST(req: Request, { params }: Params) {
    try {
        const { code, lessonId, topicId } = await params
        const body = (await req.json().catch(() => null)) as { answers?: unknown } | null
        if (!body) {
            return createAppErrorResponse("INVALID_PAYLOAD", "answers must be an array", 400)
        }

        const result = await submitTopicAssessmentAttempt({
            code,
            lessonId,
            topicId,
            answers: body.answers,
        })
        if (!result.ok) {
            return createAppErrorResponse(result.code, result.message, result.status)
        }

        return NextResponse.json(result.body)
    } catch (error) {
        console.error("[STUDENT_TOPIC_ASSESSMENT_ATTEMPT_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", "Failed to submit topic assessment", 500)
    }
}
