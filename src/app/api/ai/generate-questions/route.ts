import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error";
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
    | {
        inlineData: {
            data: string
            mimeType: string
        }
    }

type GeneratedQuestion = {
    question: string
    options: string[]
    correctAnswer: number
    explanation?: string
}

// Initialize inside the handler for better environment variable reliability

export async function POST(req: Request) {
    let actorUserId: string | undefined
    try {
        const session = await auth()
        if (!session?.user?.id) {
            logAuditEvent({
                action: "auth.ai_generate.denied",
                category: "auth",
                status: "rejected",
                reason: "auth_required",
                targetType: "aiGenerate",
            })
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }
        actorUserId = session.user.id
        if (session.user.role === "STUDENT") {
            logAuditEvent({
                actorUserId,
                action: "auth.ai_generate.denied",
                category: "auth",
                status: "rejected",
                reason: "forbidden_role",
                targetType: "aiGenerate",
                metadata: { role: session.user.role },
            })
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
        }

        const planLimits = getLimitsForUser(session.user.role, session.user.plan)
        if (!planLimits.aiQuestionGeneration) {
            logAuditEvent({
                actorUserId,
                action: "auth.ai_generate.denied",
                category: "auth",
                status: "rejected",
                reason: "plan_limit",
                targetType: "aiGenerate",
            })
            return createAppErrorResponse(
                "PLAN_LIMIT_AI_FEATURE",
                "AI question generation is not included in your plan",
                403
            )
        }

        const rateLimit = await consumeRateLimitWithStore({
            bucket: "ai-generate:post",
            key: buildRateLimitKey(getRequestClientIdentifier(req), session.user.id),
            limit: 10,
            windowMs: 60_000,
        })

        if (!rateLimit.allowed) {
            logAuditEvent({
                actorUserId,
                action: "auth.ai_generate.denied",
                category: "auth",
                status: "rejected",
                reason: "rate_limited",
                targetType: "aiGenerate",
            })
            return createRateLimitResponse(rateLimit.retryAfterSeconds)
        }

        const { content, count = 10, language = "th", difficulty = "MEDIUM", pdfData } = await req.json()

        if (!content && !pdfData) {
            logAuditEvent({
                actorUserId,
                action: "auth.ai_generate.denied",
                category: "auth",
                status: "rejected",
                reason: "missing_content",
                targetType: "aiGenerate",
            })
            return createAppErrorResponse("INVALID_PAYLOAD", "Content or PDF data is required", 400)
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error("[AI_GENERATE] GEMINI_API_KEY is missing in .env")
            return createAppErrorResponse("INTERNAL_ERROR", "Gemini API Key missing in server environment", 500)
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

        // Using gemini-flash-latest (as discovered from ListModels list)
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
        })

        const prompt = `
            You are an expert educational content creator for GameEdu.
            Generate ${count} high-quality multiple choice questions based on the provided content.
            Target Difficulty Level: ${difficulty === "EASY" ? "Easy/Basic (Recall of facts)" : difficulty === "HARD" ? "Hard/Professional (Application and Critical Thinking)" : "Normal (Understanding and Analysis)"}
            The response language should be ${language === "th" ? "Thai" : "English"}.
            Return ONLY a valid JSON array of objects.
            Each object must have: "question" (string), "options" (array of 4 strings), "correctAnswer" (number 0-3), "explanation" (string).
        `

        // Build parts for generation (Restoring PDF support)
        const parts: GeminiContentPart[] = []
        
        if (pdfData) {
            parts.push({
                inlineData: {
                    data: pdfData,
                    mimeType: "application/pdf"
                }
            })
        }

        if (content && content.trim().length > 0) {
            parts.push({ text: `CONTENT:\n${content}` })
        }
        
        // Add prompt last
        parts.push({ text: prompt })

        // Request JSON output
        const result = await model.generateContent(parts)
        const response = result.response
        
        let text = response.text()
        
        // Clean markdown formatting if present
        if (text.includes("```")) {
            text = text.replace(/```json/g, "").replace(/```/g, "").trim()
        }
        
        // Parse and add IDs and default values to match GameEdu format
        const questions = (JSON.parse(text) as GeneratedQuestion[]).map((q) => ({
            id: crypto.randomUUID(),
            question: q.question,
            image: null,
            timeLimit: 20,
            options: q.options,
            optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
            questionType: "MULTIPLE_CHOICE",
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "",
        }))

        logAuditEvent({
            actorUserId,
            action: "auth.ai_generate.succeeded",
            category: "auth",
            status: "success",
            targetType: "aiGenerate",
            metadata: { questionCount: questions.length, hasPdf: Boolean(pdfData) },
        })

        return NextResponse.json(questions)
    } catch (error) {
        console.error("[AI_GENERATE_POST]", error)
        logAuditEvent({
            actorUserId,
            action: "auth.ai_generate.failed",
            category: "auth",
            status: "error",
            reason: "internal_error",
            targetType: "aiGenerate",
            metadata: {
                message: error instanceof Error ? error.message : "unknown_error",
            },
        })
        return createAppErrorResponse("INTERNAL_ERROR", "Internal Error during AI generation", 500)
    }
}
