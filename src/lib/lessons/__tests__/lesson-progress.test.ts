import { describe, expect, it } from "vitest"
import { summarizeStudentLessonProgress } from "@/lib/lessons/lesson-progress"
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
    it("prefers unfinished content as the resume topic", () => {
        const summary = summarizeStudentLessonProgress({
            content: sampleContent,
            attempts: [],
            topicVideoWatches: [],
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
                { topicId: "topic-1", completedAt: new Date("2026-06-21T08:00:00.000Z") },
                { topicId: "topic-2", completedAt: new Date("2026-06-21T08:05:00.000Z") },
            ],
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
                { topicId: "topic-1", completedAt: new Date("2026-06-21T08:00:00.000Z") },
                { topicId: "topic-2", completedAt: new Date("2026-06-21T08:05:00.000Z") },
            ],
            completedAt: new Date("2026-06-21T08:20:00.000Z"),
        })

        expect(summary.isCompleted).toBe(true)
        expect(summary.percent).toBe(100)
        expect(summary.resumeTopicId).toBeNull()
        expect(summary.resumeMode).toBe("DONE")
        expect(summary.completedTopics).toBe(2)
    })
})
