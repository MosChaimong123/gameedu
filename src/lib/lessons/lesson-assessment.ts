import type { CourseAssessmentSource } from "@/lib/courses/assessment-source"
import { validateQuestionSetQuestions, type QuestionSetQuestion } from "@/lib/question-set-schema"

export type LessonAssessmentRewardV2 = {
    behaviorPoints?: number
    gold?: number
    achievementId?: string
    achievementTitle?: string
}

export type LessonAssessmentCertificateV2 = {
    enabled: boolean
    title?: string
    description?: string
}

export type LessonAssessmentV2 = {
    title: string
    questionSetId: string
    passScore?: number
    allowRetake?: boolean
    source: CourseAssessmentSource
    reward?: LessonAssessmentRewardV2
    certificate?: LessonAssessmentCertificateV2
}

export type TopicAssessmentV2 = {
    id: string
    title: string
    questionSetId: string
    passScore?: number
    allowRetake?: boolean
    source: CourseAssessmentSource
    reward?: LessonAssessmentRewardV2
    certificate?: LessonAssessmentCertificateV2
}

export type LessonAssessmentAttemptSourceMeta = {
    assessmentSourceType: "lesson" | "topic"
    topicId: string | null
    topicAssessmentId: string | null
}

export type PersistedLessonAssessmentAttemptLike = {
    questionSetId: string
    assessmentSourceType?: string | null
    topicId?: string | null
    topicAssessmentId?: string | null
}

export type LessonAssessmentQuestionView = {
    id: string
    question: string
    options: string[]
    image?: string | null
    questionType: QuestionSetQuestion["questionType"]
    explanation?: string
}

export function parseLessonAssessmentQuestions(questions: unknown): QuestionSetQuestion[] | null {
    const parsed = validateQuestionSetQuestions(questions)
    return parsed.ok ? parsed.questions : null
}

export function toLessonAssessmentQuestionViews(questions: QuestionSetQuestion[]): LessonAssessmentQuestionView[] {
    return questions.map((question) => ({
        id: question.id,
        question: question.question,
        options: question.options,
        image: question.image,
        questionType: question.questionType,
        explanation: question.explanation,
    }))
}

export function scoreLessonAssessmentAttempt(input: {
    assessment: LessonAssessmentV2
    questions: QuestionSetQuestion[]
    answers: number[]
}) {
    const { assessment, questions, answers } = input
    if (answers.length !== questions.length) {
        return {
            ok: false as const,
            error: "Answer every question before submitting.",
        }
    }

    let correct = 0
    for (let index = 0; index < questions.length; index += 1) {
        const answer = answers[index]
        const question = questions[index]
        const optionCount = question.options.length
        if (!Number.isInteger(answer) || answer < 0 || answer >= optionCount) {
            return {
                ok: false as const,
                error: "Invalid answer index.",
            }
        }
        if (answer === question.correctAnswer) correct += 1
    }

    const maxScore = questions.length
    const score = correct
    const passScore = assessment.passScore ?? null
    const passed = passScore === null ? true : score >= passScore
    return {
        ok: true as const,
        score,
        maxScore,
        correct,
        total: questions.length,
        passScore,
        passed,
    }
}

export function normalizeLessonAssessmentReward(reward: LessonAssessmentV2["reward"]) {
    if (!reward) return null

    const behaviorPoints = Math.max(0, Math.floor(reward.behaviorPoints ?? 0))
    const gold = Math.max(0, Math.floor(reward.gold ?? 0))
    const achievementId = reward.achievementId?.trim() || null
    const achievementTitle = reward.achievementTitle?.trim() || null

    if (behaviorPoints <= 0 && gold <= 0 && !achievementId && !achievementTitle) {
        return null
    }

    return {
        behaviorPoints,
        gold,
        achievementId,
        achievementTitle,
    }
}

export function buildLessonAssessmentAttemptSourceMeta(input: {
    assessment: LessonAssessmentV2 | TopicAssessmentV2
    topicId?: string | null
}): LessonAssessmentAttemptSourceMeta {
    const sourceType = input.assessment.source.sourceType === "topic" ? "topic" : "lesson"
    const fallbackTopicId = typeof input.topicId === "string" && input.topicId.trim().length > 0 ? input.topicId.trim() : null

    if (sourceType === "topic") {
        return {
            assessmentSourceType: "topic",
            topicId: typeof input.assessment.source.topicId === "string" ? input.assessment.source.topicId.trim() : fallbackTopicId,
            topicAssessmentId: "id" in input.assessment && typeof input.assessment.id === "string" ? input.assessment.id : null,
        }
    }

    return {
        assessmentSourceType: "lesson",
        topicId: fallbackTopicId,
        topicAssessmentId: null,
    }
}

export function matchesLessonAssessmentAttempt(input: {
    attempt: PersistedLessonAssessmentAttemptLike
    assessment: LessonAssessmentV2 | TopicAssessmentV2
    topicId?: string | null
}) {
    const expected = buildLessonAssessmentAttemptSourceMeta({
        assessment: input.assessment,
        topicId: input.topicId,
    })
    const attemptSourceType = typeof input.attempt.assessmentSourceType === "string" ? input.attempt.assessmentSourceType : null
    const attemptTopicAssessmentId =
        typeof input.attempt.topicAssessmentId === "string" && input.attempt.topicAssessmentId.trim().length > 0
            ? input.attempt.topicAssessmentId.trim()
            : null
    const attemptTopicId =
        typeof input.attempt.topicId === "string" && input.attempt.topicId.trim().length > 0 ? input.attempt.topicId.trim() : null

    if (attemptSourceType === expected.assessmentSourceType) {
        if (expected.assessmentSourceType === "topic") {
            if (expected.topicAssessmentId && attemptTopicAssessmentId) {
                return attemptTopicAssessmentId === expected.topicAssessmentId
            }
            if (expected.topicId && attemptTopicId) {
                return attemptTopicId === expected.topicId
            }
        } else {
            return input.attempt.questionSetId === input.assessment.questionSetId
        }
    }

    if (expected.assessmentSourceType === "topic") {
        if (attemptTopicAssessmentId && expected.topicAssessmentId) {
            return attemptTopicAssessmentId === expected.topicAssessmentId
        }
        if (attemptTopicId && expected.topicId) {
            return attemptTopicId === expected.topicId
        }
    }

    return input.attempt.questionSetId === input.assessment.questionSetId
}
