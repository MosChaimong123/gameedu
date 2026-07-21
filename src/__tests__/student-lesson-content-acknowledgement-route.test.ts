import { beforeEach, describe, expect, it, vi } from "vitest"

const mockStudentFindFirst = vi.fn()
const mockLessonAssignmentFindUnique = vi.fn()
const mockAcknowledgementUpsert = vi.fn()

vi.mock("@/lib/db", () => ({
    db: {
        student: { findFirst: mockStudentFindFirst },
        lessonAssignment: { findUnique: mockLessonAssignmentFindUnique },
        lessonTopicAcknowledgement: { upsert: mockAcknowledgementUpsert },
    },
}))

function contentForTopic(topic: Record<string, unknown>) {
    return {
        schemaVersion: "lesson_content_v2",
        outline: {
            title: "Reading lesson",
            topics: [{ id: "topic-1", title: "Topic 1", order: 0 }],
        },
        topics: [
            {
                id: "topic-1",
                title: "Topic 1",
                order: 0,
                contentStatus: "generated",
                objectives: ["Learn"],
                sections: [],
                ...topic,
            },
        ],
    }
}

describe("student lesson content acknowledgement route", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockStudentFindFirst.mockResolvedValue({ id: "student-1", classId: "class-1" })
        mockLessonAssignmentFindUnique.mockResolvedValue({
            lesson: {
                status: "PUBLISHED",
                content: contentForTopic({
                    sections: [{ id: "section-1", heading: "Read", content: "Lesson content" }],
                }),
            },
        })
        mockAcknowledgementUpsert.mockResolvedValue({
            topicId: "topic-1",
            acknowledgedAt: new Date("2026-07-12T12:00:00.000Z"),
        })
    })

    it("idempotently acknowledges a text or document topic", async () => {
        const { POST } = await import(
            "@/app/api/student/[code]/lessons/[lessonId]/topics/[topicId]/content-acknowledgement/route"
        )
        const response = await POST(new Request("http://localhost", { method: "POST" }), {
            params: Promise.resolve({ code: "abc123", lessonId: "lesson-1", topicId: "topic-1" }),
        })

        expect(response.status).toBe(200)
        expect(mockAcknowledgementUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    studentId_lessonId_topicId: {
                        studentId: "student-1",
                        lessonId: "lesson-1",
                        topicId: "topic-1",
                    },
                },
                create: expect.objectContaining({ contentVersion: expect.any(String) }),
                update: expect.objectContaining({
                    contentVersion: expect.any(String),
                    acknowledgedAt: expect.any(Date),
                }),
            })
        )
    })

    it("rejects acknowledgement for a video topic", async () => {
        mockLessonAssignmentFindUnique.mockResolvedValue({
            lesson: {
                status: "PUBLISHED",
                content: contentForTopic({
                    sections: [
                        {
                            id: "section-video",
                            heading: "Watch",
                            content: "Video content",
                            media: [],
                        },
                    ],
                    media: [{ id: "video-1", type: "video", url: "https://example.com/video.mp4" }],
                }),
            },
        })
        const { POST } = await import(
            "@/app/api/student/[code]/lessons/[lessonId]/topics/[topicId]/content-acknowledgement/route"
        )
        const response = await POST(new Request("http://localhost", { method: "POST" }), {
            params: Promise.resolve({ code: "abc123", lessonId: "lesson-1", topicId: "topic-1" }),
        })

        expect(response.status).toBe(400)
        expect(mockAcknowledgementUpsert).not.toHaveBeenCalled()
    })
})
