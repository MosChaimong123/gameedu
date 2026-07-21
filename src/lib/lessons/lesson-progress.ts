import type { TopicVideoWatch } from "@prisma/client"
import { createHash } from "node:crypto"
import {
    getActiveLessonTopics,
    getLessonTopicRequirements,
    getLessonTopicVideoMedia,
    type LessonContentV2,
} from "@/lib/lessons/lesson-content"
import {
    summarizeLessonAssessmentStatus,
    type LessonAssessmentStatusSummary,
} from "@/lib/lessons/lesson-assessment-status"

type TopicVideoWatchSummary = Pick<TopicVideoWatch, "topicId" | "mediaId" | "completedAt">
type LessonTopicAcknowledgementSummary = {
    topicId: string
    contentVersion: string
    acknowledgedAt: Date | string
}

export function getLessonTopicProgressVersion(topic: LessonContentV2["topics"][number]) {
    const versionedContent = {
        title: topic.title,
        description: topic.description ?? null,
        sections: topic.sections.map((section) => ({
            id: section.id,
            heading: section.heading,
            content: section.content,
            media: (section.media ?? []).filter((media) => media.type !== "video"),
        })),
        documents: topic.documents ?? [],
        media: (topic.media ?? []).filter((media) => media.type !== "video"),
    }

    return createHash("sha256").update(JSON.stringify(versionedContent)).digest("hex")
}

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
    completedVideoMediaIds: string[]
    pendingVideoMediaIds: string[]
    acknowledgedTopicIds: string[]
    pendingAcknowledgementTopicIds: string[]
    passedTopicAssessmentIds: string[]
    pendingTopicAssessmentIds: string[]
    failedTopicAssessmentIds: string[]
    totalTrackableVideoTopics: number
    completedTrackableVideoTopics: number
    totalTrackableVideoMedia: number
    completedTrackableVideoMedia: number
    topicStatuses: Array<{
        topicId: string
        hasVideoRequirement: boolean
        hasAssessmentRequirement: boolean
        hasAcknowledgementRequirement: boolean
        acknowledged: boolean
        requiredVideoMediaIds: string[]
        completedVideoMediaIds: string[]
        contentCompleted: boolean
        assessmentCompleted: boolean
        completed: boolean
        nextRequiredAction: "NONE" | "CONTENT" | "ASSESSMENT"
        assessmentId: string | null
    }>
    assessmentStatus: LessonAssessmentStatusSummary
}

function getTrackableVideoMedia(content: LessonContentV2) {
    return getActiveLessonTopics(content).flatMap((topic) =>
        getLessonTopicVideoMedia(topic).map((media) => ({ topicId: topic.id, mediaId: media.id }))
    )
}

export function summarizeStudentLessonProgress(input: {
    content: LessonContentV2
    attempts: Parameters<typeof summarizeLessonAssessmentStatus>[0]["attempts"]
    topicVideoWatches: TopicVideoWatchSummary[]
    topicAcknowledgements: LessonTopicAcknowledgementSummary[]
    completedAt?: Date | string | null
}): StudentLessonProgressSummary {
    const assessmentStatus = summarizeLessonAssessmentStatus({
        content: input.content,
        attempts: input.attempts,
    })
    const activeTopics = getActiveLessonTopics(input.content)
    const trackableVideoMedia = getTrackableVideoMedia(input.content)
    const completedVideoMediaKeySet = new Set(
        input.topicVideoWatches
            .filter((watch) => watch.completedAt)
            .map((watch) => `${watch.topicId}:${watch.mediaId}`)
    )
    const completedVideoMedia = trackableVideoMedia.filter((entry) =>
        completedVideoMediaKeySet.has(`${entry.topicId}:${entry.mediaId}`)
    )
    const pendingVideoMedia = trackableVideoMedia.filter((entry) =>
        !completedVideoMediaKeySet.has(`${entry.topicId}:${entry.mediaId}`)
    )
    const trackableVideoTopicIds = [...new Set(trackableVideoMedia.map((entry) => entry.topicId))]
    const pendingVideoTopicIdSet = new Set(pendingVideoMedia.map((entry) => entry.topicId))
    const completedVideoTopicIds = trackableVideoTopicIds.filter((topicId) => !pendingVideoTopicIdSet.has(topicId))
    const pendingVideoTopicIds = trackableVideoTopicIds.filter((topicId) => pendingVideoTopicIdSet.has(topicId))
    const passedAssessmentIdSet = new Set(assessmentStatus.passedAssessmentIds)
    const acknowledgementVersionByTopicId = new Map(
        input.topicAcknowledgements
            .filter((acknowledgement) => acknowledgement.acknowledgedAt)
            .map((acknowledgement) => [acknowledgement.topicId, acknowledgement.contentVersion])
    )
    const topicStatuses = activeTopics.map((topic) => {
        const requirements = getLessonTopicRequirements(topic)
        const hasVideoRequirement = requirements.hasVideo
        const requiredVideoMediaIds = getLessonTopicVideoMedia(topic).map((media) => media.id)
        const completedTopicVideoMediaIds = requiredVideoMediaIds.filter((mediaId) =>
            completedVideoMediaKeySet.has(`${topic.id}:${mediaId}`)
        )
        const assessmentId = topic.assessment?.id ?? null
        const hasAssessmentRequirement = requirements.hasAssessment && Boolean(assessmentId)
        const hasAcknowledgementRequirement = requirements.requiresContentAcknowledgement
        const acknowledged =
            acknowledgementVersionByTopicId.get(topic.id) === getLessonTopicProgressVersion(topic)
        const videoContentDone = !hasVideoRequirement || completedTopicVideoMediaIds.length === requiredVideoMediaIds.length
        const contentDone = videoContentDone && (!hasAcknowledgementRequirement || acknowledged)
        const assessmentDone = !hasAssessmentRequirement || (assessmentId ? passedAssessmentIdSet.has(assessmentId) : false)
        const completed = contentDone && assessmentDone
        return {
            topicId: topic.id,
            hasVideoRequirement,
            hasAssessmentRequirement,
            hasAcknowledgementRequirement,
            acknowledged,
            requiredVideoMediaIds,
            completedVideoMediaIds: completedTopicVideoMediaIds,
            contentCompleted: contentDone,
            assessmentCompleted: assessmentDone,
            completed,
            nextRequiredAction: completed ? "NONE" : contentDone ? "ASSESSMENT" : "CONTENT",
            assessmentId,
        } satisfies StudentLessonProgressSummary["topicStatuses"][number]
    })

    const contentCompleted = topicStatuses.every((topic) => topic.contentCompleted)
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
        topicStatuses.length > 0
            ? topicStatuses.filter((topic) => topic.contentCompleted).length / topicStatuses.length
            : 1
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
        completedVideoMediaIds: completedVideoMedia.map((entry) => entry.mediaId),
        pendingVideoMediaIds: pendingVideoMedia.map((entry) => entry.mediaId),
        acknowledgedTopicIds: topicStatuses.filter((topic) => topic.acknowledged).map((topic) => topic.topicId),
        pendingAcknowledgementTopicIds: topicStatuses
            .filter((topic) => topic.hasAcknowledgementRequirement && !topic.acknowledged)
            .map((topic) => topic.topicId),
        passedTopicAssessmentIds: assessmentStatus.passedAssessmentIds,
        pendingTopicAssessmentIds: assessmentStatus.pendingAssessmentIds,
        failedTopicAssessmentIds: assessmentStatus.failedAssessmentIds,
        totalTrackableVideoTopics: trackableVideoTopicIds.length,
        completedTrackableVideoTopics: completedVideoTopicIds.length,
        totalTrackableVideoMedia: trackableVideoMedia.length,
        completedTrackableVideoMedia: completedVideoMedia.length,
        topicStatuses,
        assessmentStatus,
    }
}
