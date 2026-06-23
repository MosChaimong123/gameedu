import type { TopicVideoWatch } from "@prisma/client"
import type { LessonContentV2 } from "@/lib/lessons/lesson-content"
import {
    summarizeLessonAssessmentStatus,
    type LessonAssessmentStatusSummary,
} from "@/lib/lessons/lesson-assessment-status"

type TopicVideoWatchSummary = Pick<TopicVideoWatch, "topicId" | "completedAt">

export type StudentLessonProgressSummary = {
    isCompleted: boolean
    contentCompleted: boolean
    requiredAssessmentPassed: boolean
    completionEligible: boolean
    nextRequiredAction: "NONE" | "CONTENT" | "ASSESSMENT"
    percent: number
    totalTopics: number
    completedTopics: number
    resumeTopicId: string | null
    resumeMode: "CONTENT" | "ASSESSMENT" | "REVIEW" | "DONE"
    completedVideoTopicIds: string[]
    pendingVideoTopicIds: string[]
    passedTopicAssessmentIds: string[]
    pendingTopicAssessmentIds: string[]
    failedTopicAssessmentIds: string[]
    totalTrackableVideoTopics: number
    completedTrackableVideoTopics: number
    topicStatuses: Array<{
        topicId: string
        hasVideoRequirement: boolean
        hasAssessmentRequirement: boolean
        contentCompleted: boolean
        assessmentCompleted: boolean
        completed: boolean
        nextRequiredAction: "NONE" | "CONTENT" | "ASSESSMENT"
        assessmentId: string | null
    }>
    assessmentStatus: LessonAssessmentStatusSummary
}

function getActiveTopics(content: LessonContentV2) {
    const readyTopics = content.topics.filter((topic) => topic.contentStatus !== "empty")
    return readyTopics.length > 0 ? readyTopics : content.topics
}

function getTrackableVideoTopicIds(content: LessonContentV2) {
    return getActiveTopics(content)
        .filter(
            (topic) =>
                (topic.media?.some((media) => media.type === "video") ?? false) ||
                topic.sections.some((section) => section.media?.some((media) => media.type === "video") ?? false)
        )
        .map((topic) => topic.id)
}

export function summarizeStudentLessonProgress(input: {
    content: LessonContentV2
    attempts: Parameters<typeof summarizeLessonAssessmentStatus>[0]["attempts"]
    topicVideoWatches: TopicVideoWatchSummary[]
    completedAt?: Date | string | null
}): StudentLessonProgressSummary {
    const assessmentStatus = summarizeLessonAssessmentStatus({
        content: input.content,
        attempts: input.attempts,
    })
    const activeTopics = getActiveTopics(input.content)
    const trackableVideoTopicIds = getTrackableVideoTopicIds(input.content)
    const completedVideoTopicIdSet = new Set(
        input.topicVideoWatches
            .filter((watch) => watch.completedAt)
            .map((watch) => watch.topicId)
            .filter((topicId) => trackableVideoTopicIds.includes(topicId))
    )
    const completedVideoTopicIds = trackableVideoTopicIds.filter((topicId) => completedVideoTopicIdSet.has(topicId))
    const pendingVideoTopicIds = trackableVideoTopicIds.filter((topicId) => !completedVideoTopicIdSet.has(topicId))
    const passedAssessmentIdSet = new Set(assessmentStatus.passedAssessmentIds)
    const topicStatuses = activeTopics.map((topic) => {
        const hasVideoRequirement =
            (topic.media?.some((media) => media.type === "video") ?? false) ||
            topic.sections.some((section) => section.media?.some((media) => media.type === "video") ?? false)
        const assessmentId = topic.assessment?.id ?? null
        const hasAssessmentRequirement = Boolean(topic.assessment?.questionSetId && assessmentId)
        const contentDone = !hasVideoRequirement || completedVideoTopicIdSet.has(topic.id)
        const assessmentDone = !hasAssessmentRequirement || (assessmentId ? passedAssessmentIdSet.has(assessmentId) : false)
        const completed = contentDone && assessmentDone
        return {
            topicId: topic.id,
            hasVideoRequirement,
            hasAssessmentRequirement,
            contentCompleted: contentDone,
            assessmentCompleted: assessmentDone,
            completed,
            nextRequiredAction: completed ? "NONE" : contentDone ? "ASSESSMENT" : "CONTENT",
            assessmentId,
        } satisfies StudentLessonProgressSummary["topicStatuses"][number]
    })

    const contentCompleted = pendingVideoTopicIds.length === 0
    const requiredAssessmentPassed = !assessmentStatus.available || assessmentStatus.pendingAssessmentIds.length === 0
    const completionEligible = contentCompleted && requiredAssessmentPassed
    const isCompleted = Boolean(input.completedAt)
    const resumeTopic =
        topicStatuses.find((topic) => topic.nextRequiredAction === "CONTENT") ??
        topicStatuses.find((topic) => topic.nextRequiredAction === "ASSESSMENT") ??
        topicStatuses[0] ??
        null

    const dimensions: number[] = []
    const contentRatio =
        trackableVideoTopicIds.length > 0 ? completedVideoTopicIds.length / trackableVideoTopicIds.length : 1
    dimensions.push(contentRatio)
    if (assessmentStatus.available) {
        const assessmentRatio =
            assessmentStatus.totalAssessments > 0
                ? assessmentStatus.passedAssessments / assessmentStatus.totalAssessments
                : 1
        dimensions.push(assessmentRatio)
    }
    const percent = isCompleted ? 100 : Math.round((dimensions.reduce((sum, value) => sum + value, 0) / dimensions.length) * 100)

    return {
        isCompleted,
        contentCompleted,
        requiredAssessmentPassed,
        completionEligible,
        nextRequiredAction: completionEligible ? "NONE" : contentCompleted ? "ASSESSMENT" : "CONTENT",
        percent,
        totalTopics: topicStatuses.length,
        completedTopics: topicStatuses.filter((topic) => topic.completed).length,
        resumeTopicId: isCompleted ? null : resumeTopic?.topicId ?? null,
        resumeMode:
            isCompleted
                ? "DONE"
                : resumeTopic?.nextRequiredAction === "CONTENT"
                  ? "CONTENT"
                  : resumeTopic?.nextRequiredAction === "ASSESSMENT"
                    ? "ASSESSMENT"
                    : "REVIEW",
        completedVideoTopicIds,
        pendingVideoTopicIds,
        passedTopicAssessmentIds: assessmentStatus.passedAssessmentIds,
        pendingTopicAssessmentIds: assessmentStatus.pendingAssessmentIds,
        failedTopicAssessmentIds: assessmentStatus.failedAssessmentIds,
        totalTrackableVideoTopics: trackableVideoTopicIds.length,
        completedTrackableVideoTopics: completedVideoTopicIds.length,
        topicStatuses,
        assessmentStatus,
    }
}
