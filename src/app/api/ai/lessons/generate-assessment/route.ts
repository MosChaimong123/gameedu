import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error"
import {
    buildSubjectAssessmentBlueprintPromptContext,
    getRecommendedAssessmentPassScore,
    resolveAssessmentQuestionCount,
    resolveSubjectAssessmentBlueprintFromLabel,
} from "@/lib/curriculum/assessment-blueprints"
import type { QuestionSetSourceMetadata } from "@/lib/courses/assessment-source"
import { isCourseContentV1 } from "@/lib/courses/course-content"
import { db } from "@/lib/db"
import { isLessonContentV2, type LessonContentV2 } from "@/lib/lessons/lesson-content"
import { getLimitsForUser } from "@/lib/plan/plan-access"
import { normalizeGeneratedQuestions, type QuestionSetQuestion } from "@/lib/question-set-schema"
import { logAuditEvent } from "@/lib/security/audit-log"
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit"

type GeminiContentPart = { text: string }

type AssessmentRequestBody = {
    lessonId?: string
    topicId?: string
    courseId?: string
    moduleId?: string
    language?: string
    difficulty?: "EASY" | "MEDIUM" | "HARD"
    count?: number
}

type AssessmentDraftResponse = {
    title: string
    description?: string
    sourceMetadata: QuestionSetSourceMetadata
    questions: QuestionSetQuestion[]
}

type LessonSourceResult = {
    sourceLabel: string
    sourceMetadata: QuestionSetSourceMetadata
    promptContext: string
    subjectBlueprintContext: string | null
}

type LessonRecord = {
    id: string
    title: string
    subject: string | null
    gradeLevel: string | null
    ownerUserId: string
    content: unknown
}

type CourseRecord = {
    id: string
    title: string
    subject: string | null
    gradeLevel: string | null
    ownerUserId: string
    content: unknown
}

function asText(value: unknown, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback
}

function stripJsonFence(raw: string) {
    return raw.includes("```") ? raw.replace(/```json/g, "").replace(/```/g, "").trim() : raw.trim()
}

function clampQuestionCount(value: unknown) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return null
    return Math.min(Math.max(Math.trunc(parsed), 3), 20)
}

function normalizeDifficulty(value: unknown): "EASY" | "MEDIUM" | "HARD" {
    return value === "EASY" || value === "HARD" || value === "MEDIUM" ? value : "MEDIUM"
}

function buildTopicBlock(topic: LessonContentV2["topics"][number]) {
    const objectives = topic.objectives.map((objective) => `- ${objective}`).join("\n")
    const sections = topic.sections
        .map(
            (section) =>
                `Section: ${section.heading}\n${section.content}${section.media?.length ? `\nMedia count: ${section.media.length}` : ""}`
        )
        .join("\n\n")

    return `Topic: ${topic.title}
Description: ${topic.description || "not specified"}
Objectives:
${objectives}

Sections:
${sections}`
}

function normalizeAssessmentDraft(
    value: unknown,
    sourceMetadata: QuestionSetSourceMetadata
): AssessmentDraftResponse | null {
    if (!value || typeof value !== "object") return null

    const root = value as Record<string, unknown>
    const title = asText(root.title)
    const questionsInput = root.questions
    if (!title || !Array.isArray(questionsInput)) return null

    try {
        const questions = normalizeGeneratedQuestions(questionsInput, () => crypto.randomUUID())
        if (questions.length === 0) return null
        return {
            title,
            description: asText(root.description) || undefined,
            sourceMetadata,
            questions,
        }
    } catch {
        return null
    }
}

function validateSourceSelection(body: AssessmentRequestBody) {
    const lessonId = asText(body.lessonId)
    const topicId = asText(body.topicId)
    const courseId = asText(body.courseId)
    const moduleId = asText(body.moduleId)

    const usesLessonSource = Boolean(lessonId)
    const usesCourseSource = Boolean(courseId)

    if (!usesLessonSource && !usesCourseSource) {
        return { ok: false as const, message: "lessonId or courseId is required" }
    }
    if (usesLessonSource && usesCourseSource) {
        return { ok: false as const, message: "Use either lessonId/topicId or courseId/moduleId" }
    }
    if (usesLessonSource && !topicId) {
        return { ok: false as const, message: "lesson assessment generation requires topicId" }
    }
    if (moduleId && !courseId) {
        return { ok: false as const, message: "moduleId requires courseId" }
    }

    return {
        ok: true as const,
        lessonId: lessonId || undefined,
        topicId: topicId || undefined,
        courseId: courseId || undefined,
        moduleId: moduleId || undefined,
    }
}

async function buildLessonPromptSource(
    lesson: LessonRecord,
    topicId: string | undefined,
    sessionUserId: string,
    sessionRole: string
): Promise<LessonSourceResult | null> {
    if (lesson.ownerUserId !== sessionUserId && sessionRole !== "ADMIN") {
        return null
    }
    if (!isLessonContentV2(lesson.content)) {
        return null
    }

    const topics = topicId ? lesson.content.topics.filter((topic) => topic.id === topicId) : lesson.content.topics
    if (topics.length === 0) {
        return null
    }

    const curriculum = lesson.content.metadata?.curriculum
    const blueprintResolved = resolveSubjectAssessmentBlueprintFromLabel(lesson.subject || lesson.content.outline.subject)
    const recommendedPassScore = blueprintResolved
        ? getRecommendedAssessmentPassScore({
              questionCount: resolveAssessmentQuestionCount({
                  requestedCount: null,
                  blueprint: blueprintResolved.blueprint,
                  sourceType: "topic",
              }),
              blueprint: blueprintResolved.blueprint,
              sourceType: "topic",
          })
        : null
    const promptContext = `Lesson title: ${lesson.title}
Subject: ${lesson.subject || lesson.content.outline.subject || "not specified"}
Grade level: ${lesson.gradeLevel || lesson.content.outline.gradeLevel || "not specified"}
${curriculum?.curriculumCode ? `Curriculum code: ${curriculum.curriculumCode}` : ""}
${curriculum?.unitId ? `Unit id: ${curriculum.unitId}` : ""}

${topics.map(buildTopicBlock).join("\n\n---\n\n")}`.trim()

    return {
        sourceLabel: `topic ${topics[0].title}`,
        sourceMetadata: {
            source: { sourceType: "topic", lessonId: lesson.id, topicId: topicId! },
            generatedFrom: "ai_lesson_assessment",
            subjectId: blueprintResolved?.subject.id,
            curriculumCode: curriculum?.curriculumCode,
            gradeLevel: lesson.gradeLevel || lesson.content.outline.gradeLevel || undefined,
            unitId: curriculum?.unitId,
            learningOutcomeIds: curriculum?.learningOutcomeIds,
            assessmentBlueprintId: blueprintResolved?.blueprint.id,
            assessmentFamily: blueprintResolved?.blueprint.assessmentFamily,
            recommendedPassScore: recommendedPassScore ?? undefined,
            createdFromLessonTitle: lesson.title,
        },
        promptContext,
        subjectBlueprintContext: blueprintResolved
            ? buildSubjectAssessmentBlueprintPromptContext({
                  blueprint: blueprintResolved.blueprint,
                  sourceType: "topic",
              })
            : null,
    }
}

async function buildCoursePromptSource(
    course: CourseRecord,
    moduleId: string | undefined,
    sessionUserId: string,
    sessionRole: string
): Promise<LessonSourceResult | null> {
    if (course.ownerUserId !== sessionUserId && sessionRole !== "ADMIN") {
        return null
    }
    if (!isCourseContentV1(course.content)) {
        return null
    }

    const selectedModules = moduleId
        ? course.content.modules.filter((module) => module.id === moduleId)
        : course.content.modules

    if (selectedModules.length === 0) {
        return null
    }

    const orderedLessonIds = selectedModules.flatMap((module) => module.lessons.map((lesson) => lesson.lessonId))
    const lessons = (await db.lesson.findMany({
        where: { id: { in: orderedLessonIds } },
        select: {
            id: true,
            title: true,
            subject: true,
            gradeLevel: true,
            ownerUserId: true,
            content: true,
        },
    })) as LessonRecord[]

    const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
    const promptBlocks: string[] = []

    for (const module of selectedModules) {
        const lessonBlocks: string[] = []
        for (const lessonRef of module.lessons) {
            const lesson = lessonsById.get(lessonRef.lessonId)
            if (!lesson) return null
            if (lesson.ownerUserId !== sessionUserId && sessionRole !== "ADMIN") return null
            if (!isLessonContentV2(lesson.content)) return null

            lessonBlocks.push(
                `Lesson title: ${lesson.title}
${lesson.content.topics.map(buildTopicBlock).join("\n\n")}`
            )
        }

        promptBlocks.push(
            `Module title: ${module.title}
Module description: ${module.description || "not specified"}

${lessonBlocks.join("\n\n===\n\n")}`
        )
    }

    const blueprintResolved = resolveSubjectAssessmentBlueprintFromLabel(course.subject)
    const sourceType = moduleId ? "module" : "course"
    const recommendedPassScore = blueprintResolved
        ? getRecommendedAssessmentPassScore({
              questionCount: resolveAssessmentQuestionCount({
                  requestedCount: null,
                  blueprint: blueprintResolved.blueprint,
                  sourceType,
              }),
              blueprint: blueprintResolved.blueprint,
              sourceType,
          })
        : null

    return {
        sourceLabel: moduleId ? `module ${selectedModules[0].title}` : `course ${course.title}`,
        sourceMetadata: {
            source: moduleId
                ? { sourceType: "module", courseId: course.id, moduleId }
                : { sourceType: "course", courseId: course.id },
            generatedFrom: "ai_course_assessment",
            subjectId: blueprintResolved?.subject.id,
            gradeLevel: course.gradeLevel || undefined,
            assessmentBlueprintId: blueprintResolved?.blueprint.id,
            assessmentFamily: blueprintResolved?.blueprint.assessmentFamily,
            recommendedPassScore: recommendedPassScore ?? undefined,
            createdFromCourseTitle: course.title,
        },
        promptContext: `Course title: ${course.title}
Subject: ${course.subject || "not specified"}
Grade level: ${course.gradeLevel || "not specified"}

${promptBlocks.join("\n\n#####\n\n")}`.trim(),
        subjectBlueprintContext: blueprintResolved
            ? buildSubjectAssessmentBlueprintPromptContext({
                  blueprint: blueprintResolved.blueprint,
                  sourceType,
              })
            : null,
    }
}

function buildPrompt(input: {
    sourceLabel: string
    promptContext: string
    subjectBlueprintContext: string | null
    questionCount: number
    language: string
    difficulty: "EASY" | "MEDIUM" | "HARD"
}) {
    const difficultyLabel =
        input.difficulty === "EASY"
            ? "Easy/Basic recall"
            : input.difficulty === "HARD"
              ? "Hard/Application and reasoning"
              : "Medium/Understanding and analysis"

    return `You are an expert Thai educational assessment designer.
Create a classroom-ready multiple choice assessment from the provided lesson source only.

Source scope: ${input.sourceLabel}
Response language: ${input.language === "th" ? "Thai" : "English"}
Target question count: ${input.questionCount}
Difficulty: ${difficultyLabel}
${input.subjectBlueprintContext ? `\n${input.subjectBlueprintContext}\n` : ""}

Use ONLY the source lesson data below.
Build questions from learning objectives and section content only.
Do NOT use outside knowledge unless it is directly implied by the source text.
Do NOT create essay questions.
Do NOT create true/false questions.
Do NOT create pass/fail rules.
Do NOT decide pass/fail for students.
Every question must have exactly 4 answer choices.
Return ONLY valid JSON. No markdown. No code fence.

Return this exact JSON shape:
{
  "title": "string",
  "description": "string",
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": 0,
      "explanation": "string"
    }
  ]
}

SOURCE:
${input.promptContext}`
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

        const sessionRole = session.user.role ?? ""

        const planLimits = getLimitsForUser(
            session.user.role,
            session.user.plan,
            session.user.planStatus,
            session.user.planExpiry
        )
        if (!planLimits.aiQuestionGeneration) {
            logAuditEvent({
                actorUserId,
                action: "ai.lesson_assessment_generate.denied",
                category: "ai",
                status: "rejected",
                reason: "plan_limit",
                targetType: "aiLessonAssessment",
            })
            return createAppErrorResponse(
                "PLAN_LIMIT_AI_FEATURE",
                "AI assessment generation is not included in your plan",
                403
            )
        }

        const rateLimit = await consumeRateLimitWithStore({
            bucket: "ai-generate-lesson-assessment:post",
            key: buildRateLimitKey(getRequestClientIdentifier(req), session.user.id),
            limit: 5,
            windowMs: 60_000,
        })

        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.retryAfterSeconds)
        }

        const body = (await req.json()) as AssessmentRequestBody
        const selectedSource = validateSourceSelection(body)
        if (!selectedSource.ok) {
            return createAppErrorResponse("INVALID_PAYLOAD", selectedSource.message, 400)
        }

        if (!process.env.GEMINI_API_KEY) {
            return createAppErrorResponse("INTERNAL_ERROR", "Gemini API Key missing", 500)
        }

        let sourceResult: LessonSourceResult | null = null

        if (selectedSource.lessonId) {
            const lesson = (await db.lesson.findUnique({
                where: { id: selectedSource.lessonId },
                select: {
                    id: true,
                    title: true,
                    subject: true,
                    gradeLevel: true,
                    ownerUserId: true,
                    content: true,
                },
            })) as LessonRecord | null

            if (!lesson) {
                return createAppErrorResponse("NOT_FOUND", "Lesson not found", 404)
            }

            sourceResult = await buildLessonPromptSource(
                lesson,
                selectedSource.topicId,
                session.user.id,
                sessionRole
            )
            if (!sourceResult) {
                return createAppErrorResponse(
                    "NOT_FOUND",
                    "Topic not found in lesson",
                    404
                )
            }
        } else if (selectedSource.courseId) {
            const course = (await db.course.findUnique({
                where: { id: selectedSource.courseId },
                select: {
                    id: true,
                    title: true,
                    subject: true,
                    gradeLevel: true,
                    ownerUserId: true,
                    content: true,
                },
            })) as CourseRecord | null

            if (!course) {
                return createAppErrorResponse("NOT_FOUND", "Course not found", 404)
            }

            sourceResult = await buildCoursePromptSource(
                course,
                selectedSource.moduleId,
                session.user.id,
                sessionRole
            )
            if (!sourceResult) {
                return createAppErrorResponse(
                    selectedSource.moduleId ? "NOT_FOUND" : "FORBIDDEN",
                    selectedSource.moduleId ? "Module not found in course" : FORBIDDEN_MESSAGE,
                    selectedSource.moduleId ? 404 : 403
                )
            }
        }

        if (!sourceResult) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Unable to resolve assessment source", 400)
        }

        const requestedCount = clampQuestionCount(body.count)
        const blueprintResolved = sourceResult.sourceMetadata.subjectId
            ? resolveSubjectAssessmentBlueprintFromLabel(sourceResult.sourceMetadata.subjectId)
            : null
        const questionCount = resolveAssessmentQuestionCount({
            requestedCount,
            blueprint: blueprintResolved?.blueprint ?? null,
            sourceType: sourceResult.sourceMetadata.source.sourceType,
        })
        const recommendedPassScore = getRecommendedAssessmentPassScore({
            questionCount,
            blueprint: blueprintResolved?.blueprint ?? null,
            sourceType: sourceResult.sourceMetadata.source.sourceType,
        })
        if (recommendedPassScore) {
            sourceResult.sourceMetadata = {
                ...sourceResult.sourceMetadata,
                recommendedPassScore,
            }
        }
        const difficulty = normalizeDifficulty(body.difficulty)
        const language = body.language === "en" ? "en" : "th"
        const prompt = buildPrompt({
            sourceLabel: sourceResult.sourceLabel,
            promptContext: sourceResult.promptContext,
            subjectBlueprintContext: sourceResult.subjectBlueprintContext,
            questionCount,
            language,
            difficulty,
        })

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const models = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-flash-lite-latest"]

        let raw = ""
        let lastError: unknown
        let rateLimited = false
        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName })
                const result = await model.generateContent([{ text: prompt } satisfies GeminiContentPart])
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
                action: "ai.lesson_assessment_generate.failed",
                category: "ai",
                status: "error",
                reason: "rate_limited",
                targetType: "aiLessonAssessment",
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
                action: "ai.lesson_assessment_generate.failed",
                category: "ai",
                status: "error",
                reason: "invalid_ai_json",
                targetType: "aiLessonAssessment",
            })
            return createAppErrorResponse("INVALID_AI_RESPONSE", "AI returned invalid JSON", 502)
        }

        const assessmentDraft = normalizeAssessmentDraft(jsonPayload, sourceResult.sourceMetadata)
        if (!assessmentDraft) {
            logAuditEvent({
                actorUserId,
                action: "ai.lesson_assessment_generate.failed",
                category: "ai",
                status: "error",
                reason: "invalid_ai_payload",
                targetType: "aiLessonAssessment",
            })
            return createAppErrorResponse("INVALID_AI_RESPONSE", "AI returned invalid assessment draft", 502)
        }

        logAuditEvent({
            actorUserId,
            action: "ai.lesson_assessment_generate.succeeded",
            category: "ai",
            status: "success",
            targetType: "aiLessonAssessment",
            metadata: {
                sourceType: assessmentDraft.sourceMetadata.source.sourceType,
                questionCount: assessmentDraft.questions.length,
            },
        })

        return NextResponse.json(assessmentDraft)
    } catch (error) {
        console.error("[AI_LESSON_GENERATE_ASSESSMENT_POST]", error)
        logAuditEvent({
            actorUserId,
            action: "ai.lesson_assessment_generate.failed",
            category: "ai",
            status: "error",
            reason: "internal_error",
            targetType: "aiLessonAssessment",
            metadata: { message: error instanceof Error ? error.message : "unknown_error" },
        })
        return createAppErrorResponse("INTERNAL_ERROR", "Internal error during lesson assessment generation", 500)
    }
}
