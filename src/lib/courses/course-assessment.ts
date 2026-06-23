import type { CourseAssessmentV2, CourseContentV1 } from "@/lib/courses/course-content"
import { validateQuestionSetQuestions, type QuestionSetQuestion } from "@/lib/question-set-schema"

export type CourseAssessmentQuestionView = {
    id: string
    question: string
    options: string[]
    image?: string | null
    questionType: QuestionSetQuestion["questionType"]
    explanation?: string
}

export function getCourseAssessmentById(content: CourseContentV1, assessmentId: string) {
    return (content.assessments ?? []).find((assessment) => assessment.id === assessmentId) ?? null
}

export function parseCourseAssessmentQuestions(questions: unknown): QuestionSetQuestion[] | null {
    const parsed = validateQuestionSetQuestions(questions)
    return parsed.ok ? parsed.questions : null
}

export function toCourseAssessmentQuestionViews(questions: QuestionSetQuestion[]): CourseAssessmentQuestionView[] {
    return questions.map((question) => ({
        id: question.id,
        question: question.question,
        options: question.options,
        image: question.image,
        questionType: question.questionType,
        explanation: question.explanation,
    }))
}

export function scoreCourseAssessmentAttempt(input: {
    assessment: CourseAssessmentV2
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
