import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error"
import {
    isLessonOutlineBatchDraft,
    isLessonOutlineDraft,
    type LessonOutlineBatchDraft,
    type LessonOutlineDraft,
} from "@/lib/lessons/lesson-content"
import {
    alignGeneratedOutlineBatchToCurriculumSelection,
    buildOutlineCurriculumPromptContext,
    resolveAILessonCurriculumSelection,
    validateAILessonCurriculumSelection,
    validateGeneratedOutlineBatchAgainstCurriculumSelection,
    type ResolvedAILessonCurriculumSelection,
} from "@/lib/curriculum/ai-curriculum-rules"
import { getLimitsForUser } from "@/lib/plan/plan-access"
import { logAuditEvent } from "@/lib/security/audit-log"
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit"

type GeminiContentPart =
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }

function asText(value: unknown, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback
}

function createTopicId(input: string, index: number) {
    const slug = input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9ก-๙]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40)
    return slug ? `topic-${index + 1}-${slug}` : `topic-${index + 1}`
}

function normalizeGeneratedOutline(value: unknown): LessonOutlineDraft | null {
    if (!value || typeof value !== "object") return null

    const root = value as Record<string, unknown>
    const topicsInput = Array.isArray(root.topics) ? root.topics : []
    const topics = topicsInput
        .slice(0, 10)
        .map((topic, index): LessonOutlineDraft["topics"][number] | null => {
            if (!topic || typeof topic !== "object") return null
            const item = topic as Record<string, unknown>
            const title = asText(item.title)
            if (!title) return null

            return {
                id: asText(item.id, createTopicId(title, index)) || createTopicId(title, index),
                title,
                description: asText(item.description) || undefined,
                order: Number.isInteger(item.order) && (item.order as number) >= 0 ? (item.order as number) : index,
            }
        })
        .filter((topic): topic is LessonOutlineDraft["topics"][number] => Boolean(topic))

    const outline: LessonOutlineDraft = {
        title: asText(root.title),
        description: asText(root.description) || undefined,
        subject: asText(root.subject) || undefined,
        gradeLevel: asText(root.gradeLevel) || undefined,
        topics,
    }

    return isLessonOutlineDraft(outline) ? outline : null
}

function normalizeGeneratedOutlineBatch(value: unknown): LessonOutlineBatchDraft | null {
    if (!value || typeof value !== "object") return null

    const root = value as Record<string, unknown>
    const lessonsInput = Array.isArray(root.lessons) ? root.lessons : [root]
    const lessons = lessonsInput
        .slice(0, 12)
        .map(normalizeGeneratedOutline)
        .filter((lesson): lesson is LessonOutlineDraft => Boolean(lesson))

    const batch = { lessons }
    return isLessonOutlineBatchDraft(batch) ? batch : null
}

function stripJsonFence(raw: string) {
    return raw.includes("```") ? raw.replace(/```json/g, "").replace(/```/g, "").trim() : raw.trim()
}

export async function POST(req: Request) {
    let actorUserId: string | undefined

    try {
        const session = await auth()
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }
        actorUserId = session.user.id

        if (session.user.role === "STUDENT") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const planLimits = getLimitsForUser(
            session.user.role,
            session.user.plan,
            session.user.planStatus,
            session.user.planExpiry
        )
        if (!planLimits.aiLessonGeneration) {
            logAuditEvent({
                actorUserId,
                action: "ai.lesson_outline_generate.denied",
                category: "ai",
                status: "rejected",
                reason: "plan_limit",
                targetType: "aiLesson",
            })
            return createAppErrorResponse(
                "PLAN_LIMIT_AI_FEATURE",
                "AI lesson generation is not included in your plan",
                403
            )
        }

        const rateLimit = await consumeRateLimitWithStore({
            bucket: "ai-generate-lesson-outline:post",
            key: buildRateLimitKey(getRequestClientIdentifier(req), session.user.id),
            limit: 5,
            windowMs: 60_000,
        })

        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.retryAfterSeconds)
        }

        const body = await req.json()
        const {
            pdfData,
            text,
            subject = "",
            gradeLevel = "",
            language = "th",
            lessonCount = 4,
            topicCount,
        } = body as {
            pdfData?: string | null
            text?: string
            subject?: string
            gradeLevel?: string
            language?: string
            lessonCount?: number
            topicCount?: number
            curriculumSelection?: unknown
        }

        const trimmedText = text?.trim() ?? ""
        if (!pdfData && trimmedText.length < 10) {
            return createAppErrorResponse("INVALID_PAYLOAD", "pdfData or text is required", 400)
        }

        if (!process.env.GEMINI_API_KEY) {
            return createAppErrorResponse("INTERNAL_ERROR", "Gemini API Key missing", 500)
        }

        let resolvedCurriculumSelection: ResolvedAILessonCurriculumSelection | undefined
        const curriculumSelectionParsed = validateAILessonCurriculumSelection((body as { curriculumSelection?: unknown }).curriculumSelection)
        if ((body as { curriculumSelection?: unknown }).curriculumSelection !== undefined && !curriculumSelectionParsed.success) {
            return createAppErrorResponse("INVALID_PAYLOAD", "curriculumSelection is invalid", 400)
        }

        if (curriculumSelectionParsed.success) {
            const resolved = resolveAILessonCurriculumSelection(curriculumSelectionParsed.data)
            if (!resolved.ok) {
                return createAppErrorResponse("INVALID_PAYLOAD", resolved.issues[0]?.message ?? "curriculumSelection is invalid", 400)
            }
            resolvedCurriculumSelection = resolved.data
        }

        const clampedLessonCount = resolvedCurriculumSelection
            ? 1
            : Math.min(Math.max(Number(lessonCount ?? topicCount) || 4, 1), 12)
        const curriculumPrompt = resolvedCurriculumSelection
            ? `\n${buildOutlineCurriculumPromptContext(resolvedCurriculumSelection)}\n`
            : ""

        const prompt = `You are an expert Thai instructional designer.
Analyze the provided curriculum source and split it into lesson drafts.

Subject: ${subject || "not specified"}
Grade Level: ${gradeLevel || "not specified"}
Response Language: ${language === "th" ? "Thai" : "English"}
Target lesson count: ${clampedLessonCount}
${curriculumPrompt}

Important restrictions:
- Return ONLY valid JSON. No markdown. No code fence.
- Split the source into multiple lessons first.
- For EACH lesson, create the lesson title and the topic list that belongs to that lesson.
- If canonical curriculum context is provided, stay inside the selected subject/unit only.
- If canonical curriculum context is provided, use only the listed topic ids and topic titles.
- Do NOT create objectives.
- Do NOT create lesson sections.
- Do NOT create examples.
- Do NOT create key terms.
- Do NOT create a lesson summary.
- Do NOT create quiz questions.
- Lesson titles must be distinct.
- Topic titles must be distinct within the same lesson.

Return this exact JSON shape:
{
  "lessons": [
    {
      "title": "string",
      "description": "string, short optional overview",
      "subject": "string, optional",
      "gradeLevel": "string, optional",
      "topics": [
        {
          "id": "topic-1",
          "title": "string",
          "description": "string, one short sentence",
          "order": 0
        }
      ]
    }
  ]
}`

        const parts: GeminiContentPart[] = []
        if (trimmedText.length > 0) {
            parts.push({ text: `CURRICULUM CONTENT:\n${trimmedText}` })
        }
        if (pdfData && trimmedText.length < 200) {
            parts.push({ inlineData: { data: pdfData, mimeType: "application/pdf" } })
        }
        parts.push({ text: prompt })

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const models = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-flash-lite-latest"]

        let raw = ""
        let lastError: unknown
        let rateLimited = false
        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName })
                const result = await model.generateContent(parts)
                raw = result.response.text()
                break
            } catch (error) {
                lastError = error
                const message = error instanceof Error ? error.message : ""
                const is503 = message.includes("503") || message.includes("overloaded") || message.includes("Service Unavailable")
                const is429 = message.includes("429") || message.includes("Too Many Requests")
                const is404 = message.includes("404") || message.includes("not found")
                const isHardQuota = message.includes("limit: 0") || message.includes("limit\": 0")
                if (is429) rateLimited = true
                if (is404 || isHardQuota || is503 || is429) continue
                throw error
            }
        }

        if (!raw && rateLimited) {
            logAuditEvent({
                actorUserId,
                action: "ai.lesson_outline_generate.failed",
                category: "ai",
                status: "error",
                reason: "rate_limited",
                targetType: "aiLesson",
            })
            return createAppErrorResponse("RATE_LIMITED", "AI is currently rate limited. Please try again shortly.", 429)
        }
        if (!raw) throw lastError

        let jsonPayload: unknown
        try {
            jsonPayload = JSON.parse(stripJsonFence(raw))
        } catch {
            logAuditEvent({
                actorUserId,
                action: "ai.lesson_outline_generate.failed",
                category: "ai",
                status: "error",
                reason: "invalid_ai_json",
                targetType: "aiLesson",
            })
            return createAppErrorResponse("INVALID_AI_RESPONSE", "AI returned invalid JSON", 502)
        }

        let batch = normalizeGeneratedOutlineBatch(jsonPayload)
        if (!batch) {
            logAuditEvent({
                actorUserId,
                action: "ai.lesson_outline_generate.failed",
                category: "ai",
                status: "error",
                reason: "invalid_ai_payload",
                targetType: "aiLesson",
            })
            return createAppErrorResponse("INVALID_AI_RESPONSE", "AI returned an invalid lesson outline", 502)
        }

        if (resolvedCurriculumSelection) {
            const issues = validateGeneratedOutlineBatchAgainstCurriculumSelection(batch, resolvedCurriculumSelection)
            if (issues.length > 0) {
                logAuditEvent({
                    actorUserId,
                    action: "ai.lesson_outline_generate.failed",
                    category: "ai",
                    status: "error",
                    reason: "invalid_ai_payload",
                    targetType: "aiLesson",
                    metadata: { curriculumIssueCode: issues[0]?.code },
                })
                return createAppErrorResponse("INVALID_AI_RESPONSE", issues[0]?.message ?? "AI returned an invalid lesson outline", 502)
            }

            batch = alignGeneratedOutlineBatchToCurriculumSelection(batch, resolvedCurriculumSelection)
        }

        logAuditEvent({
            actorUserId,
            action: "ai.lesson_outline_generate.succeeded",
            category: "ai",
            status: "success",
            targetType: "aiLesson",
            metadata: {
                subject,
                gradeLevel,
                lessonCount: batch.lessons.length,
                topicCount: batch.lessons.reduce((sum, lesson) => sum + lesson.topics.length, 0),
                hasPdf: Boolean(pdfData),
                curriculumSubjectId: curriculumSelectionParsed.success ? curriculumSelectionParsed.data.subjectId : undefined,
                curriculumUnitId: curriculumSelectionParsed.success ? curriculumSelectionParsed.data.unitId : undefined,
            },
        })

        return NextResponse.json(batch)
    } catch (error) {
        console.error("[AI_LESSON_GENERATE_OUTLINE_POST]", error)
        logAuditEvent({
            actorUserId,
            action: "ai.lesson_outline_generate.failed",
            category: "ai",
            status: "error",
            reason: "internal_error",
            targetType: "aiLesson",
            metadata: { message: error instanceof Error ? error.message : "unknown_error" },
        })
        return createAppErrorResponse("INTERNAL_ERROR", "Internal error during lesson outline generation", 500)
    }
}
