import type { LessonAssessmentAttempt } from "@prisma/client"
import type { LessonAssessmentV2, TopicAssessmentV2 } from "@/lib/lessons/lesson-assessment"

export type LessonCertificateSummary = {
    id: string
    title: string
    description: string | null
    certificateCode: string
    issuedAt: Date
}

export type LessonCertificateSourceMeta = {
    certificateScope: "lesson" | "topic"
    topicId: string | null
    topicAssessmentId: string | null
}

export type PersistedLessonCertificateLike = {
    certificateScope?: string | null
    topicId?: string | null
    topicAssessmentId?: string | null
    criteriaSnapshot?: unknown
}

function normalizeNonEmptyString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function extractSourceMetaFromCriteriaSnapshot(value: unknown): LessonCertificateSourceMeta | null {
    if (!value || typeof value !== "object") return null
    const source = (value as { source?: unknown }).source
    if (!source || typeof source !== "object") return null

    const sourceType = (source as { sourceType?: unknown }).sourceType === "topic" ? "topic" : "lesson"
    const topicId = normalizeNonEmptyString((source as { topicId?: unknown }).topicId)
    const topicAssessmentId = normalizeNonEmptyString((source as { topicAssessmentId?: unknown }).topicAssessmentId)

    return {
        certificateScope: sourceType,
        topicId,
        topicAssessmentId,
    }
}

export function buildLessonCertificateSourceMeta(input: {
    assessment: LessonAssessmentV2 | TopicAssessmentV2
    topicId?: string | null
}): LessonCertificateSourceMeta {
    const fallbackTopicId = normalizeNonEmptyString(input.topicId)

    if (input.assessment.source.sourceType === "topic") {
        return {
            certificateScope: "topic",
            topicId: normalizeNonEmptyString(input.assessment.source.topicId) ?? fallbackTopicId,
            topicAssessmentId: "id" in input.assessment ? normalizeNonEmptyString(input.assessment.id) : null,
        }
    }

    return {
        certificateScope: "lesson",
        topicId: fallbackTopicId,
        topicAssessmentId: null,
    }
}

export function buildLessonCertificateCode(input: {
    lessonId: string
    studentId: string
    certificateScope?: "lesson" | "topic"
    topicId?: string | null
    topicAssessmentId?: string | null
}) {
    if (input.certificateScope === "topic") {
        const topicKey = (input.topicAssessmentId ?? input.topicId ?? "topic").slice(-6).toUpperCase()
        return `TPT-${input.lessonId.slice(-6).toUpperCase()}-${topicKey}-${input.studentId.slice(-6).toUpperCase()}`
    }

    return `TPL-${input.lessonId.slice(-6).toUpperCase()}-${input.studentId.slice(-6).toUpperCase()}`
}

export function buildLessonCertificatePayload(input: {
    lessonId: string
    lessonTitle: string
    studentId: string
    studentName: string
    assessment: LessonAssessmentV2 | TopicAssessmentV2
    attempt: Pick<LessonAssessmentAttempt, "id" | "score" | "maxScore" | "passed" | "attemptNumber" | "completedAt">
    rewardSnapshot: {
        behaviorPoints: number
        gold: number
        achievementId: string | null
        achievementTitle: string | null
    } | null
    topicId?: string | null
    topicTitle?: string | null
}) {
    const certificate = input.assessment.certificate
    if (!certificate?.enabled) return null

    const sourceMeta = buildLessonCertificateSourceMeta({
        assessment: input.assessment,
        topicId: input.topicId,
    })
    const defaultTitle =
        sourceMeta.certificateScope === "topic" && input.topicTitle
            ? `ใบรับรองหัวข้อ ${input.topicTitle}`
            : `ใบรับรองบทเรียน ${input.lessonTitle}`
    const defaultDescription =
        sourceMeta.certificateScope === "topic" && input.topicTitle
            ? `มอบให้สำหรับการผ่านแบบทดสอบหัวข้อ ${input.topicTitle}`
            : `มอบให้สำหรับการผ่านแบบทดสอบบทเรียน ${input.lessonTitle}`

    return {
        title: certificate.title?.trim() || defaultTitle,
        description: certificate.description?.trim() || defaultDescription,
        certificateCode: buildLessonCertificateCode({
            lessonId: input.lessonId,
            studentId: input.studentId,
            certificateScope: sourceMeta.certificateScope,
            topicId: sourceMeta.topicId,
            topicAssessmentId: sourceMeta.topicAssessmentId,
        }),
        criteriaSnapshot: {
            lessonId: input.lessonId,
            lessonTitle: input.lessonTitle,
            studentName: input.studentName,
            questionSetId: input.assessment.questionSetId,
            passScore: input.assessment.passScore ?? null,
            source: {
                ...input.assessment.source,
                sourceType: sourceMeta.certificateScope,
                topicId: sourceMeta.topicId,
                topicAssessmentId: sourceMeta.topicAssessmentId,
            },
            attempt: {
                id: input.attempt.id,
                score: input.attempt.score,
                maxScore: input.attempt.maxScore,
                passed: input.attempt.passed,
                attemptNumber: input.attempt.attemptNumber,
                completedAt: input.attempt.completedAt,
            },
        },
        rewardSnapshot: input.rewardSnapshot,
        sourceMeta,
    }
}

export function matchesLessonCertificate(input: {
    certificate: PersistedLessonCertificateLike
    assessment: LessonAssessmentV2 | TopicAssessmentV2
    topicId?: string | null
}) {
    const expected = buildLessonCertificateSourceMeta({
        assessment: input.assessment,
        topicId: input.topicId,
    })
    const directSourceType =
        input.certificate.certificateScope === "topic" || input.certificate.certificateScope === "lesson"
            ? input.certificate.certificateScope
            : null
    const directTopicId = normalizeNonEmptyString(input.certificate.topicId)
    const directTopicAssessmentId = normalizeNonEmptyString(input.certificate.topicAssessmentId)
    const snapshotSource = extractSourceMetaFromCriteriaSnapshot(input.certificate.criteriaSnapshot)

    const actual: LessonCertificateSourceMeta = {
        certificateScope: directSourceType ?? snapshotSource?.certificateScope ?? "lesson",
        topicId: directTopicId ?? snapshotSource?.topicId ?? null,
        topicAssessmentId: directTopicAssessmentId ?? snapshotSource?.topicAssessmentId ?? null,
    }

    if (expected.certificateScope !== actual.certificateScope) return false
    if (expected.certificateScope === "topic") {
        if (expected.topicAssessmentId && actual.topicAssessmentId) {
            return expected.topicAssessmentId === actual.topicAssessmentId
        }

        return expected.topicId !== null && expected.topicId === actual.topicId
    }

    return true
}

export function summarizeIssuedLessonCertificate(
    certificate:
        | Pick<LessonCertificateSummary, "id" | "title" | "description" | "certificateCode" | "issuedAt">
        | null
) {
    if (!certificate) return null
    return {
        id: certificate.id,
        title: certificate.title,
        description: certificate.description ?? null,
        certificateCode: certificate.certificateCode,
        issuedAt: certificate.issuedAt,
    }
}
