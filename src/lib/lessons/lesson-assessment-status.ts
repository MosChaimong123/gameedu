import type { LessonAssessmentAttempt } from "@prisma/client"
import {
    matchesLessonAssessmentAttempt,
    type PersistedLessonAssessmentAttemptLike,
    type TopicAssessmentV2,
} from "@/lib/lessons/lesson-assessment"
import { getCanonicalTopicAssessments, type LessonContentV2 } from "@/lib/lessons/lesson-content"

type LessonAssessmentAttemptSummary = Pick<
    LessonAssessmentAttempt,
    | "questionSetId"
    | "score"
    | "maxScore"
    | "passed"
    | "attemptNumber"
    | "rewardGrantedAt"
    | "certificateIssuedAt"
    | "completedAt"
> &
    PersistedLessonAssessmentAttemptLike

type AssessmentTarget = {
    kind: "topic"
    id: string
    title: string
    passScore: number | null
    assessment: TopicAssessmentV2
    topicId: string
}

export type LessonAssessmentStatusSummary = {
    available: boolean
    mode: "lesson" | "topic"
    title: string | null
    passScore: number | null
    attempted: boolean
    hasPassed: boolean
    rewardEarned: boolean
    certificateIssued: boolean
    attemptCount: number
    latestScore: number | null
    latestMaxScore: number | null
    latestCompletedAt: Date | string | null
    totalAssessments: number
    passedAssessments: number
    passedAssessmentIds: string[]
    pendingAssessmentIds: string[]
    failedAssessmentIds: string[]
}

function getAssessmentTargets(content: LessonContentV2): AssessmentTarget[] {
    return getCanonicalTopicAssessments(content).map<AssessmentTarget>((entry) => ({
        kind: "topic",
        id: entry.assessment.id,
        title: entry.assessment.title,
        passScore: entry.assessment.passScore ?? null,
        assessment: entry.assessment,
        topicId: entry.topicId,
    }))
}

function getAttemptsForTarget(target: AssessmentTarget, attempts: LessonAssessmentAttemptSummary[]) {
    return attempts.filter((attempt) =>
        matchesLessonAssessmentAttempt({
            attempt,
            assessment: target.assessment,
            topicId: target.topicId,
        })
    )
}

export function summarizeLessonAssessmentStatus(input: {
    content: LessonContentV2
    attempts: LessonAssessmentAttemptSummary[]
}): LessonAssessmentStatusSummary {
    const targets = getAssessmentTargets(input.content)
    if (targets.length === 0) {
        return {
            available: false,
            mode: "lesson",
            title: null,
            passScore: null,
            attempted: false,
            hasPassed: false,
            rewardEarned: false,
            certificateIssued: false,
            attemptCount: 0,
            latestScore: null,
            latestMaxScore: null,
            latestCompletedAt: null,
            totalAssessments: 0,
            passedAssessments: 0,
            passedAssessmentIds: [],
            pendingAssessmentIds: [],
            failedAssessmentIds: [],
        }
    }

    const sortedAttempts = [...input.attempts].sort((a, b) => {
        const aTime = new Date(a.completedAt).getTime()
        const bTime = new Date(b.completedAt).getTime()
        return bTime - aTime
    })
    const latestAttempt = sortedAttempts[0] ?? null

    let passedAssessments = 0
    const passedAssessmentIds: string[] = []
    const pendingAssessmentIds: string[] = []
    const failedAssessmentIds: string[] = []

    for (const target of targets) {
        const targetAttempts = getAttemptsForTarget(target, sortedAttempts)
        const targetPassed = targetAttempts.some((attempt) => attempt.passed)
        if (targetPassed) {
            passedAssessments += 1
            passedAssessmentIds.push(target.id)
        } else {
            pendingAssessmentIds.push(target.id)
            if (targetAttempts.length > 0) {
                failedAssessmentIds.push(target.id)
            }
        }
    }

    const firstTarget = targets[0] ?? null
    return {
        available: true,
        mode: targets[0]?.kind ?? "lesson",
        title:
            targets.length === 1
                ? (firstTarget?.title ?? null)
                : `แบบทดสอบ ${targets.length} หัวข้อ`,
        passScore: targets.length === 1 ? (firstTarget?.passScore ?? null) : null,
        attempted: sortedAttempts.length > 0,
        hasPassed: passedAssessments === targets.length,
        rewardEarned: sortedAttempts.some((attempt) => Boolean(attempt.rewardGrantedAt)),
        certificateIssued: sortedAttempts.some((attempt) => Boolean(attempt.certificateIssuedAt)),
        attemptCount: sortedAttempts.length,
        latestScore: latestAttempt?.score ?? null,
        latestMaxScore: latestAttempt?.maxScore ?? null,
        latestCompletedAt: latestAttempt?.completedAt ?? null,
        totalAssessments: targets.length,
        passedAssessments,
        passedAssessmentIds,
        pendingAssessmentIds,
        failedAssessmentIds,
    }
}
