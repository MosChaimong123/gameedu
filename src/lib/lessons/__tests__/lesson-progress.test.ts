import { describe, expect, it } from "vitest"
import { getLessonTopicProgressVersion, summarizeStudentLessonProgress } from "@/lib/lessons/lesson-progress"
import type { LessonContentV2 } from "@/lib/lessons/lesson-content"

const sampleContent: LessonContentV2 = {
    schemaVersion: "lesson_content_v2",
    outline: {
        title: "Forces and Motion",
        subject: "ฟิสิกส์",
        gradeLevel: "ม.4",
        topics: [
            { id: "topic-1", title: "แรง", order: 0 },
            { id: "topic-2", title: "การเคลื่อนที่", order: 1 },
        ],
    },
    topics: [
        {
            id: "topic-1",
            title: "แรง",
            order: 0,
            contentStatus: "generated",
            objectives: ["เข้าใจเรื่องแรง"],
            media: [{ id: "media-1", type: "video", url: "https://example.com/force.mp4" }],
            sections: [{ id: "section-1", heading: "บทนำ", content: "เนื้อหา" }],
            assessment: {
                id: "assessment-1",
                title: "แบบทดสอบแรง",
                questionSetId: "set-1",
                source: { sourceType: "topic", lessonId: "lesson-1", topicId: "topic-1" },
                allowRetake: true,
                passScore: 1,
            },
        },
        {
            id: "topic-2",
            title: "การเคลื่อนที่",
            order: 1,
            contentStatus: "generated",
            objectives: ["เข้าใจการเคลื่อนที่"],
            sections: [
                {
                    id: "section-2",
                    heading: "วิดีโอประกอบ",
                    content: "เนื้อหา",
                    media: [{ id: "media-2", type: "video", url: "https://example.com/motion.mp4" }],
                },
            ],
        },
    ],
}

describe("summarizeStudentLessonProgress", () => {
    it("requires acknowledgement for text or document topics without video", () => {
        const textContent: LessonContentV2 = {
            ...sampleContent,
            outline: { ...sampleContent.outline, topics: [sampleContent.outline.topics[0]] },
            topics: [
                {
                    ...sampleContent.topics[0],
                    media: [],
                    assessment: undefined,
                },
            ],
        }
        const pending = summarizeStudentLessonProgress({
            content: textContent,
            attempts: [],
            topicVideoWatches: [],
            topicAcknowledgements: [],
            completedAt: null,
        })

        expect(pending.contentCompleted).toBe(false)
        expect(pending.percent).toBe(0)
        expect(pending.pendingAcknowledgementTopicIds).toEqual(["topic-1"])
        expect(pending.topicStatuses[0]).toMatchObject({
            hasAcknowledgementRequirement: true,
            acknowledged: false,
            nextRequiredAction: "CONTENT",
        })

        const acknowledged = summarizeStudentLessonProgress({
            content: textContent,
            attempts: [],
            topicVideoWatches: [],
            topicAcknowledgements: [
                {
                    topicId: "topic-1",
                    contentVersion: getLessonTopicProgressVersion(textContent.topics[0]),
                    acknowledgedAt: new Date("2026-07-12T12:00:00.000Z"),
                },
            ],
            completedAt: null,
        })

        expect(acknowledged.contentCompleted).toBe(true)
        expect(acknowledged.completionEligible).toBe(true)
        expect(acknowledged.percent).toBe(100)
        expect(acknowledged.acknowledgedTopicIds).toEqual(["topic-1"])

        const editedContent: LessonContentV2 = {
            ...textContent,
            topics: [
                {
                    ...textContent.topics[0],
                    sections: [{ ...textContent.topics[0].sections[0], content: "Updated content" }],
                },
            ],
        }
        const staleAcknowledgement = summarizeStudentLessonProgress({
            content: editedContent,
            attempts: [],
            topicVideoWatches: [],
            topicAcknowledgements: [
                {
                    topicId: "topic-1",
                    contentVersion: getLessonTopicProgressVersion(textContent.topics[0]),
                    acknowledgedAt: new Date("2026-07-12T12:00:00.000Z"),
                },
            ],
            completedAt: null,
        })

        expect(staleAcknowledgement.contentCompleted).toBe(false)
        expect(staleAcknowledgement.pendingAcknowledgementTopicIds).toEqual(["topic-1"])
    })

    it("does not require content acknowledgement for assessment-only topics", () => {
        const assessmentOnlyContent: LessonContentV2 = {
            ...sampleContent,
            outline: { ...sampleContent.outline, topics: [sampleContent.outline.topics[0]] },
            topics: [
                {
                    ...sampleContent.topics[0],
                    media: [],
                    sections: [],
                },
            ],
        }
        const summary = summarizeStudentLessonProgress({
            content: assessmentOnlyContent,
            attempts: [],
            topicVideoWatches: [],
            topicAcknowledgements: [],
            completedAt: null,
        })

        expect(summary.contentCompleted).toBe(true)
        expect(summary.requiredAssessmentPassed).toBe(false)
        expect(summary.pendingAcknowledgementTopicIds).toEqual([])
        expect(summary.resumeMode).toBe("ASSESSMENT")
    })

    it("requires every video media item in a topic before content is complete", () => {
        const content: LessonContentV2 = {
            ...sampleContent,
            outline: {
                ...sampleContent.outline,
                topics: [sampleContent.outline.topics[0]],
            },
            topics: [
                {
                    ...sampleContent.topics[0],
                    assessment: undefined,
                    media: [
                        ...(sampleContent.topics[0].media ?? []),
                        { id: "media-1b", type: "video", url: "https://example.com/force-2.mp4" },
                    ],
                },
            ],
        }
        const partial = summarizeStudentLessonProgress({
            content,
            attempts: [],
            topicVideoWatches: [
                { topicId: "topic-1", mediaId: "media-1", completedAt: new Date("2026-06-21T08:00:00.000Z") },
            ],
            topicAcknowledgements: [],
            completedAt: null,
        })

        expect(partial.contentCompleted).toBe(false)
        expect(partial.completedVideoTopicIds).toEqual([])
        expect(partial.pendingVideoMediaIds).toEqual(["media-1b"])
        expect(partial.topicStatuses[0]).toMatchObject({
            requiredVideoMediaIds: ["media-1", "media-1b"],
            completedVideoMediaIds: ["media-1"],
        })

        const complete = summarizeStudentLessonProgress({
            content,
            attempts: [],
            topicVideoWatches: [
                { topicId: "topic-1", mediaId: "media-1", completedAt: new Date("2026-06-21T08:00:00.000Z") },
                { topicId: "topic-1", mediaId: "media-1b", completedAt: new Date("2026-06-21T08:05:00.000Z") },
            ],
            topicAcknowledgements: [],
            completedAt: null,
        })

        expect(complete.contentCompleted).toBe(true)
        expect(complete.completedVideoTopicIds).toEqual(["topic-1"])
        expect(complete.completedTrackableVideoMedia).toBe(2)
    })

    it("uses canonical active topics when stored content status is stale", () => {
        const content: LessonContentV2 = {
            ...sampleContent,
            topics: [
                { ...sampleContent.topics[0], contentStatus: "empty" },
                {
                    ...sampleContent.topics[1],
                    id: "topic-empty",
                    contentStatus: "generated",
                    sections: [],
                    media: [],
                    documents: [],
                },
            ],
        }
        const summary = summarizeStudentLessonProgress({
            content,
            attempts: [],
            topicVideoWatches: [],
            topicAcknowledgements: [],
            completedAt: null,
        })

        expect(summary.totalTopics).toBe(1)
        expect(summary.resumeTopicId).toBe("topic-1")
        expect(summary.topicStatuses.map((topic) => topic.topicId)).toEqual(["topic-1"])
    })

    it("prefers unfinished content as the resume topic", () => {
        const summary = summarizeStudentLessonProgress({
            content: sampleContent,
            attempts: [],
            topicVideoWatches: [],
            topicAcknowledgements: [],
            completedAt: null,
        })

        expect(summary.resumeTopicId).toBe("topic-1")
        expect(summary.resumeMode).toBe("CONTENT")
        expect(summary.topicStatuses[0]).toMatchObject({
            topicId: "topic-1",
            hasVideoRequirement: true,
            hasAssessmentRequirement: true,
            nextRequiredAction: "CONTENT",
        })
        expect(summary.completedTopics).toBe(0)
        expect(summary.totalTopics).toBe(2)
    })

    it("moves resume to assessment when content is done but quiz is still pending", () => {
        const summary = summarizeStudentLessonProgress({
            content: sampleContent,
            attempts: [],
            topicVideoWatches: [
                { topicId: "topic-1", mediaId: "media-1", completedAt: new Date("2026-06-21T08:00:00.000Z") },
                { topicId: "topic-2", mediaId: "media-2", completedAt: new Date("2026-06-21T08:05:00.000Z") },
            ],
            topicAcknowledgements: [],
            completedAt: null,
        })

        expect(summary.contentCompleted).toBe(true)
        expect(summary.requiredAssessmentPassed).toBe(false)
        expect(summary.resumeTopicId).toBe("topic-1")
        expect(summary.resumeMode).toBe("ASSESSMENT")
        expect(summary.topicStatuses[0]).toMatchObject({
            topicId: "topic-1",
            contentCompleted: true,
            assessmentCompleted: false,
            nextRequiredAction: "ASSESSMENT",
        })
    })

    it("marks everything done when all requirements are complete", () => {
        const summary = summarizeStudentLessonProgress({
            content: sampleContent,
            attempts: [
                {
                    questionSetId: "set-1",
                    assessmentSourceType: "topic",
                    topicId: "topic-1",
                    topicAssessmentId: "assessment-1",
                    score: 1,
                    maxScore: 1,
                    passed: true,
                    attemptNumber: 1,
                    rewardGrantedAt: null,
                    certificateIssuedAt: null,
                    completedAt: new Date("2026-06-21T08:10:00.000Z"),
                },
            ],
            topicVideoWatches: [
                { topicId: "topic-1", mediaId: "media-1", completedAt: new Date("2026-06-21T08:00:00.000Z") },
                { topicId: "topic-2", mediaId: "media-2", completedAt: new Date("2026-06-21T08:05:00.000Z") },
            ],
            topicAcknowledgements: [],
            completedAt: new Date("2026-06-21T08:20:00.000Z"),
        })

        expect(summary.isCompleted).toBe(true)
        expect(summary.percent).toBe(100)
        expect(summary.resumeTopicId).toBeNull()
        expect(summary.resumeMode).toBe("DONE")
        expect(summary.completedTopics).toBe(2)
    })
})
