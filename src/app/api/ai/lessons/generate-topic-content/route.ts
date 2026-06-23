import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error"
import {
    isLessonOutlineDraft,
    isLessonTopicContentDraft,
    type LessonOutlineDraft,
    type LessonTopicContentDraft,
} from "@/lib/lessons/lesson-content"
import {
    buildTopicContentCurriculumPromptContext,
    resolveAILessonCurriculumSelection,
    validateAILessonCurriculumSelection,
    validateTopicContentAgainstCurriculumSelection,
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

function stripJsonFence(raw: string) {
    return raw.includes("```") ? raw.replace(/```json/g, "").replace(/```/g, "").trim() : raw.trim()
}

function normalizeGeneratedTopicContent(value: unknown, topicId: string): LessonTopicContentDraft | null {
    if (!value || typeof value !== "object") return null

    const root = value as Record<string, unknown>
    const sectionsInput = Array.isArray(root.sections) ? root.sections : []
    const objectives = (Array.isArray(root.objectives) ? root.objectives : [])
        .map((objective) => asText(objective))
        .filter(Boolean)

    const sections = sectionsInput
        .map((section, index) => {
            if (!section || typeof section !== "object") return null
            const item = section as Record<string, unknown>
            const heading = asText(item.heading)
            const content = asText(item.content)
            if (!heading || !content) return null

            return {
                id: asText(item.id, `section-${index + 1}`) || `section-${index + 1}`,
                heading,
                content,
            }
        })
        .filter((section): section is LessonTopicContentDraft["sections"][number] => Boolean(section))

    const normalized: LessonTopicContentDraft = {
        topicId: asText(root.topicId, topicId) || topicId,
        objectives,
        sections,
        documents: [],
    }

    return normalized.topicId === topicId && isLessonTopicContentDraft(normalized) ? normalized : null
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
                action: "ai.lesson_topic_content_generate.denied",
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
            bucket: "ai-generate-lesson-topic-content:post",
            key: buildRateLimitKey(getRequestClientIdentifier(req), session.user.id),
            limit: 5,
            windowMs: 60_000,
        })

        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.retryAfterSeconds)
        }

        const body = await req.json()
        const {
            outline,
            topicId,
            pdfData,
            text,
            language = "th",
        } = body as {
            outline?: unknown
            topicId?: string
            pdfData?: string | null
            text?: string
            language?: string
            curriculumSelection?: unknown
        }

        const trimmedTopicId = topicId?.trim() ?? ""
        const trimmedText = text?.trim() ?? ""
        if (!isLessonOutlineDraft(outline)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "valid outline is required", 400)
        }
        const selectedTopic = outline.topics.find((topic) => topic.id === trimmedTopicId)
        if (!selectedTopic) {
            return createAppErrorResponse("INVALID_PAYLOAD", "topicId must match an outline topic", 400)
        }
        if (!pdfData && trimmedText.length < 10) {
            return createAppErrorResponse("INVALID_PAYLOAD", "source text is required", 400)
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

            const topicAllowed = resolved.data.selectedTopics.some((topic) => topic.id === selectedTopic.id)
            if (!topicAllowed) {
                return createAppErrorResponse("INVALID_PAYLOAD", "topicId is outside the selected curriculum topic scope", 400)
            }
        }

        const outlineForPrompt: LessonOutlineDraft = {
            ...outline,
            topics: outline.topics.map((topic) => ({
                id: topic.id,
                title: topic.title,
                description: topic.description,
                order: topic.order,
            })),
        }

        const curriculumPrompt = resolvedCurriculumSelection
            ? `\n${buildTopicContentCurriculumPromptContext(resolvedCurriculumSelection, selectedTopic.id) ?? ""}\n`
            : ""

        const prompt = `You are an expert Thai instructional designer.
Create lesson content ONLY for the selected topic.

Response Language: ${language === "th" ? "Thai" : "English"}
Selected topic id: ${selectedTopic.id}
Selected topic title: ${selectedTopic.title}
Selected topic description: ${selectedTopic.description || "not specified"}
${curriculumPrompt}

Full lesson outline JSON:
${JSON.stringify(outlineForPrompt)}

Important restrictions:
- Return ONLY valid JSON. No markdown. No code fence.
- Create content ONLY for the selected topic id.
- Do NOT create content for other topics.
- If canonical curriculum context is provided, stay inside the listed topic and allowed outcomes only.
- Do NOT create quiz questions.
- Do NOT create tests, answer keys, choices, scoring, or assessment sections.
- Do NOT include any "quiz", "questions", "answers", "correctAnswer", or "choices" fields.
- Do NOT create examples.
- Do NOT create key terms.
- Do NOT create a summary.
- Keep content classroom-ready and editable by a teacher.
- Sections should be short and designed for teachers to attach video clips later.

Return this exact JSON shape:
{
  "topicId": "${selectedTopic.id}",
  "objectives": ["string"],
  "sections": [
    {
      "id": "section-1",
      "heading": "string",
      "content": "string"
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
                action: "ai.lesson_topic_content_generate.failed",
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
                action: "ai.lesson_topic_content_generate.failed",
                category: "ai",
                status: "error",
                reason: "invalid_ai_json",
                targetType: "aiLesson",
            })
            return createAppErrorResponse("INVALID_AI_RESPONSE", "AI returned invalid JSON", 502)
        }

        const topicContent = normalizeGeneratedTopicContent(jsonPayload, selectedTopic.id)
        if (!topicContent) {
            logAuditEvent({
                actorUserId,
                action: "ai.lesson_topic_content_generate.failed",
                category: "ai",
                status: "error",
                reason: "invalid_ai_payload",
                targetType: "aiLesson",
            })
            return createAppErrorResponse("INVALID_AI_RESPONSE", "AI returned invalid topic content", 502)
        }

        if (resolvedCurriculumSelection) {
            const issues = validateTopicContentAgainstCurriculumSelection(topicContent, resolvedCurriculumSelection)
            if (issues.length > 0) {
                logAuditEvent({
                    actorUserId,
                    action: "ai.lesson_topic_content_generate.failed",
                    category: "ai",
                    status: "error",
                    reason: "invalid_ai_payload",
                    targetType: "aiLesson",
                    metadata: { curriculumIssueCode: issues[0]?.code },
                })
                return createAppErrorResponse("INVALID_AI_RESPONSE", issues[0]?.message ?? "AI returned invalid topic content", 502)
            }
        }

        logAuditEvent({
            actorUserId,
            action: "ai.lesson_topic_content_generate.succeeded",
            category: "ai",
            status: "success",
            targetType: "aiLesson",
            metadata: {
                topicId: selectedTopic.id,
                hasPdf: Boolean(pdfData),
                sectionCount: topicContent.sections.length,
                curriculumSubjectId: curriculumSelectionParsed.success ? curriculumSelectionParsed.data.subjectId : undefined,
                curriculumUnitId: curriculumSelectionParsed.success ? curriculumSelectionParsed.data.unitId : undefined,
            },
        })

        return NextResponse.json(topicContent)
    } catch (error) {
        console.error("[AI_LESSON_GENERATE_TOPIC_CONTENT_POST]", error)
        logAuditEvent({
            actorUserId,
            action: "ai.lesson_topic_content_generate.failed",
            category: "ai",
            status: "error",
            reason: "internal_error",
            targetType: "aiLesson",
            metadata: { message: error instanceof Error ? error.message : "unknown_error" },
        })
        return createAppErrorResponse("INTERNAL_ERROR", "Internal error during lesson topic content generation", 500)
    }
}
