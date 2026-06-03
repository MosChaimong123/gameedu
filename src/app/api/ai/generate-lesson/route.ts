import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error"
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit"
import { logAuditEvent } from "@/lib/security/audit-log"
import { getLimitsForUser } from "@/lib/plan/plan-access"

type GeminiContentPart =
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }

export interface LessonSection {
    id: string
    heading: string
    content: string
    examples: Array<{ title: string; body: string }>
}

export interface LessonContent {
    objectives: string[]
    sections: LessonSection[]
    keyTerms: Array<{ term: string; definition: string }>
    summary: string
    estimatedMinutes: number
}

export interface GenerateLessonResponse {
    title: string
    content: LessonContent
}

function asText(value: unknown, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback
}

function normalizeGeneratedLesson(value: unknown): GenerateLessonResponse | null {
    if (!value || typeof value !== "object") return null
    const root = value as Record<string, unknown>
    const content = root.content
    if (!content || typeof content !== "object") return null

    const lessonContent = content as Record<string, unknown>
    const sectionsInput = Array.isArray(lessonContent.sections) ? lessonContent.sections : []
    const sections = sectionsInput
        .map((section, index): LessonSection | null => {
            if (!section || typeof section !== "object") return null
            const item = section as Record<string, unknown>
            const heading = asText(item.heading)
            const body = asText(item.content)
            if (!heading || !body) return null
            const examplesInput = Array.isArray(item.examples) ? item.examples : []
            return {
                id: asText(item.id, `s${index + 1}`) || `s${index + 1}`,
                heading,
                content: body,
                examples: examplesInput
                    .map((example) => {
                        if (!example || typeof example !== "object") return null
                        const entry = example as Record<string, unknown>
                        return {
                            title: asText(entry.title),
                            body: asText(entry.body),
                        }
                    })
                    .filter((example): example is { title: string; body: string } =>
                        Boolean(example?.title && example.body)
                    ),
            }
        })
        .filter((section): section is LessonSection => Boolean(section))

    const title = asText(root.title)
    if (!title || sections.length === 0) return null

    const objectives = (Array.isArray(lessonContent.objectives) ? lessonContent.objectives : [])
        .map((objective) => asText(objective))
        .filter(Boolean)
    const keyTerms = (Array.isArray(lessonContent.keyTerms) ? lessonContent.keyTerms : [])
        .map((term) => {
            if (!term || typeof term !== "object") return null
            const item = term as Record<string, unknown>
            return {
                term: asText(item.term),
                definition: asText(item.definition),
            }
        })
        .filter((term): term is { term: string; definition: string } =>
            Boolean(term?.term && term.definition)
        )
    const minutes = Number(lessonContent.estimatedMinutes)

    return {
        title,
        content: {
            objectives,
            sections,
            keyTerms,
            summary: asText(lessonContent.summary),
            estimatedMinutes: Number.isFinite(minutes)
                ? Math.max(5, Math.min(Math.round(minutes), 240))
                : Math.max(10, sections.length * 10),
        },
    }
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
                action: "ai.lesson_generate.denied",
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
            bucket: "ai-generate-lesson:post",
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
            sectionCount = 4,
        } = body as {
            pdfData?: string
            text?: string
            subject?: string
            gradeLevel?: string
            language?: string
            sectionCount?: number
        }

        if (!pdfData && (!text || text.trim().length < 10)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "pdfData or text is required", 400)
        }

        const clampedSections = Math.min(Math.max(Number(sectionCount) || 4, 2), 8)

        if (!process.env.GEMINI_API_KEY) {
            return createAppErrorResponse("INTERNAL_ERROR", "Gemini API Key missing", 500)
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

        const prompt = `You are an expert Thai educational content designer.
Analyze the provided curriculum document and create a structured lesson plan.

Subject: ${subject || "ไม่ระบุ"}
Grade Level: ${gradeLevel || "ไม่ระบุ"}
Response Language: ${language === "th" ? "Thai (ภาษาไทย)" : "English"}
Number of sections: ${clampedSections}

Return ONLY valid JSON (no markdown, no code blocks) matching this exact structure:
{
  "title": "string — ชื่อบทเรียน",
  "content": {
    "objectives": ["string — วัตถุประสงค์การเรียนรู้ 3-5 ข้อ"],
    "sections": [
      {
        "id": "s1",
        "heading": "string — หัวข้อ",
        "content": "string — เนื้อหาอธิบาย 2-4 ย่อหน้า",
        "examples": [
          { "title": "string — ชื่อตัวอย่าง", "body": "string — เนื้อหาตัวอย่าง" }
        ]
      }
    ],
    "keyTerms": [
      { "term": "string — คำศัพท์", "definition": "string — นิยาม" }
    ],
    "summary": "string — สรุปบทเรียน 2-3 ประโยค",
    "estimatedMinutes": number
  }
}`

        const parts: GeminiContentPart[] = []
        if (pdfData) {
            parts.push({ inlineData: { data: pdfData, mimeType: "application/pdf" } })
        }
        if (text && text.trim().length > 0) {
            parts.push({ text: `CURRICULUM CONTENT:\n${text}` })
        }
        parts.push({ text: prompt })

        // Valid models for this API key (verified via ListModels), free-tier friendly, in preference order.
        const MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-flash-lite-latest"]
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

        function parseRetryDelay(msg: string): number {
            const match = msg.match(/retryDelay['":\s]+(\d+)s/)
            return match ? (parseInt(match[1]) + 2) * 1000 : 50_000
        }

        let raw = ""
        let lastError: unknown
        for (const modelName of MODELS) {
            let attempts = 0
            while (attempts < 2) {
                try {
                    const m = genAI.getGenerativeModel({ model: modelName })
                    const result = await m.generateContent(parts)
                    raw = result.response.text()
                    break
                } catch (err) {
                    lastError = err
                    const msg = err instanceof Error ? err.message : ""
                    const is503 = msg.includes("503") || msg.includes("overloaded") || msg.includes("Service Unavailable")
                    const is429 = msg.includes("429") || msg.includes("Too Many Requests")
                    const is404 = msg.includes("404") || msg.includes("not found")
                    const isHardQuota = msg.includes("limit: 0") || msg.includes("limit\": 0")
                    if (is404 || isHardQuota) break          // model unavailable on this tier → next model
                    if (is503) break                         // overloaded → next model
                    if (is429 && attempts === 0) {
                        attempts++
                        await sleep(parseRetryDelay(msg))    // temporary rate limit → wait then retry same model
                        continue
                    }
                    throw err
                }
                break
            }
            if (raw) break
        }
        if (!raw) throw lastError

        if (raw.includes("```")) {
            raw = raw.replace(/```json/g, "").replace(/```/g, "").trim()
        }

        let jsonPayload: unknown
        try {
            jsonPayload = JSON.parse(raw)
        } catch {
            logAuditEvent({
                actorUserId,
                action: "ai.lesson_generate.failed",
                category: "ai",
                status: "error",
                reason: "invalid_ai_json",
                targetType: "aiLesson",
            })
            return createAppErrorResponse("INVALID_AI_RESPONSE", "AI returned invalid JSON", 502)
        }

        const parsed = normalizeGeneratedLesson(jsonPayload)
        if (!parsed) {
            logAuditEvent({
                actorUserId,
                action: "ai.lesson_generate.failed",
                category: "ai",
                status: "error",
                reason: "invalid_ai_payload",
                targetType: "aiLesson",
            })
            return createAppErrorResponse("INVALID_AI_RESPONSE", "AI returned an invalid lesson structure", 502)
        }

        logAuditEvent({
            actorUserId,
            action: "ai.lesson_generate.succeeded",
            category: "ai",
            status: "success",
            targetType: "aiLesson",
            metadata: {
                subject,
                gradeLevel,
                sectionCount: clampedSections,
                hasPdf: Boolean(pdfData),
            },
        })

        return NextResponse.json(parsed)
    } catch (error) {
        console.error("[AI_GENERATE_LESSON_POST]", error)
        logAuditEvent({
            actorUserId,
            action: "ai.lesson_generate.failed",
            category: "ai",
            status: "error",
            reason: "internal_error",
            targetType: "aiLesson",
            metadata: { message: error instanceof Error ? error.message : "unknown_error" },
        })
        return createAppErrorResponse("INTERNAL_ERROR", "Internal error during lesson generation", 500)
    }
}
