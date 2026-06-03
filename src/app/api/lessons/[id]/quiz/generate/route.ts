import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { buildLessonQuizSourceText, normalizeLessonQuizQuestions } from "@/lib/lessons/lesson-quiz";
import { getLimitsForUser } from "@/lib/plan/plan-access";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { logAuditEvent } from "@/lib/security/audit-log";
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

type Params = { params: Promise<{ id: string }> };

function extractJsonArray(raw: string) {
    const cleaned = raw.includes("```") ? raw.replace(/```json/g, "").replace(/```/g, "").trim() : raw.trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    return match ? match[0] : cleaned;
}

export async function POST(req: Request, { params }: Params) {
    let actorUserId: string | undefined;
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
        }
        actorUserId = session.user.id;

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const planLimits = getLimitsForUser(
            session.user.role,
            session.user.plan,
            session.user.planStatus,
            session.user.planExpiry
        );
        if (!planLimits.aiQuestionGeneration) {
            return createAppErrorResponse(
                "PLAN_LIMIT_AI_FEATURE",
                "AI question generation is not included in your plan",
                403
            );
        }

        const rateLimit = await consumeRateLimitWithStore({
            bucket: "ai-generate-lesson-quiz:post",
            key: buildRateLimitKey(getRequestClientIdentifier(req), session.user.id),
            limit: 10,
            windowMs: 60_000,
        });
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.retryAfterSeconds);
        }

        const lesson = await db.lesson.findUnique({
            where: { id },
            select: { id: true, title: true, ownerUserId: true, content: true },
        });

        if (!lesson) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }
        if (lesson.ownerUserId !== session.user.id && session.user.role !== "ADMIN") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const sourceText = buildLessonQuizSourceText(lesson.content);
        if (!sourceText.trim()) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Lesson content is empty", 400);
        }
        if (!process.env.GEMINI_API_KEY) {
            return createAppErrorResponse("INTERNAL_ERROR", "Gemini API Key missing", 500);
        }

        const body = await req.json().catch(() => ({})) as { count?: number; difficulty?: string; language?: string };
        const count = Math.min(Math.max(Number(body.count) || 5, 3), 10);
        const difficulty = body.difficulty === "HARD" || body.difficulty === "EASY" ? body.difficulty : "MEDIUM";
        const language = body.language === "en" ? "English" : "Thai";

        const prompt = `
You are an expert educational quiz creator for TeachPlayEdu.
Generate ${count} multiple choice questions from this lesson.
Difficulty: ${difficulty}
Language: ${language}
Return ONLY valid JSON array.
Each object must have:
- "question": string
- "options": array of exactly 4 strings
- "correctAnswer": number 0-3
- "explanation": string

Lesson:
${sourceText}
        `.trim();

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent(prompt);
        const questions = normalizeLessonQuizQuestions(JSON.parse(extractJsonArray(result.response.text())), () =>
            crypto.randomUUID()
        );

        const nextContent = {
            ...(lesson.content && typeof lesson.content === "object" ? lesson.content : {}),
            quizDraft: {
                questions,
                generatedAt: new Date().toISOString(),
            },
        };

        await db.lesson.update({
            where: { id: lesson.id },
            data: { content: nextContent },
        });

        logAuditEvent({
            actorUserId,
            action: "ai.lesson_quiz_generate.succeeded",
            category: "ai",
            status: "success",
            targetType: "lesson",
            targetId: lesson.id,
            metadata: { questionCount: questions.length },
        });

        return NextResponse.json(nextContent.quizDraft);
    } catch (error) {
        console.error("[LESSON_QUIZ_GENERATE_POST]", error);
        logAuditEvent({
            actorUserId,
            action: "ai.lesson_quiz_generate.failed",
            category: "ai",
            status: "error",
            reason: "internal_error",
            targetType: "lesson",
            metadata: { message: error instanceof Error ? error.message : "unknown_error" },
        });
        return createAppErrorResponse("INVALID_AI_RESPONSE", "AI returned invalid quiz questions", 502);
    }
}
