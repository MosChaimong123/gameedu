import { beforeEach, describe, expect, it, vi } from "vitest"

const mockStudentFindFirst = vi.fn()
const mockLessonAssignmentFindUnique = vi.fn()
const mockTopicVideoWatchFindMany = vi.fn()
const mockTopicVideoWatchFindUnique = vi.fn()
const mockTopicVideoWatchUpsert = vi.fn()

vi.mock("@/lib/db", () => ({
    db: {
        student: { findFirst: mockStudentFindFirst },
        lessonAssignment: { findUnique: mockLessonAssignmentFindUnique },
        topicVideoWatch: {
            findMany: mockTopicVideoWatchFindMany,
            findUnique: mockTopicVideoWatchFindUnique,
            upsert: mockTopicVideoWatchUpsert,
        },
    },
}))

const lessonContent = {
    schemaVersion: "lesson_content_v2",
    outline: {
        title: "Multi-video lesson",
        topics: [{ id: "topic-1", title: "Topic 1", order: 0 }],
    },
    topics: [
        {
            id: "topic-1",
            title: "Topic 1",
            order: 0,
            contentStatus: "generated",
            objectives: ["Learn the topic"],
            sections: [
                {
                    id: "section-1",
                    heading: "Section",
                    content: "Content",
                    media: [{ id: "video-2", type: "video", url: "https://example.com/2.mp4" }],
                },
            ],
            media: [
                { id: "video-1", type: "video", url: "https://example.com/1.mp4" },
                { id: "image-1", type: "image", url: "https://example.com/image.png" },
            ],
        },
    ],
}

describe("student lesson video watch routes", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockStudentFindFirst.mockResolvedValue({ id: "student-1", classId: "class-1" })
        mockLessonAssignmentFindUnique.mockResolvedValue({
            lesson: { status: "PUBLISHED", content: lessonContent },
        })
        mockTopicVideoWatchFindUnique.mockResolvedValue(null)
        mockTopicVideoWatchUpsert.mockImplementation(async ({ create }) => create)
    })

    it("stores each video under a media-level composite key", async () => {
        const { PATCH } = await import(
            "@/app/api/student/[code]/lessons/[lessonId]/topics/[topicId]/video-watch/route"
        )
        const response = await PATCH(
            new Request("http://localhost", {
                method: "PATCH",
                body: JSON.stringify({
                    mediaId: "video-2",
                    watchedRanges: [[0, 90]],
                    totalSeconds: 100,
                }),
            }),
            { params: Promise.resolve({ code: "abc123", lessonId: "lesson-1", topicId: "topic-1" }) }
        )

        expect(response.status).toBe(200)
        expect(mockTopicVideoWatchFindUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    studentId_lessonId_topicId_mediaId: {
                        studentId: "student-1",
                        lessonId: "lesson-1",
                        topicId: "topic-1",
                        mediaId: "video-2",
                    },
                },
            })
        )
        expect(mockTopicVideoWatchUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ mediaId: "video-2" }),
                update: expect.not.objectContaining({ mediaId: expect.anything() }),
            })
        )
        await expect(response.json()).resolves.toMatchObject({
            topicId: "topic-1",
            mediaId: "video-2",
            percent: 90,
            completed: true,
            justCompleted: true,
        })
    })

    it("rejects media that is not a video in the requested topic", async () => {
        const { PATCH } = await import(
            "@/app/api/student/[code]/lessons/[lessonId]/topics/[topicId]/video-watch/route"
        )
        const response = await PATCH(
            new Request("http://localhost", {
                method: "PATCH",
                body: JSON.stringify({
                    mediaId: "image-1",
                    watchedRanges: [[0, 10]],
                    totalSeconds: 100,
                }),
            }),
            { params: Promise.resolve({ code: "abc123", lessonId: "lesson-1", topicId: "topic-1" }) }
        )

        expect(response.status).toBe(400)
        expect(mockTopicVideoWatchFindUnique).not.toHaveBeenCalled()
        expect(mockTopicVideoWatchUpsert).not.toHaveBeenCalled()
    })

    it("returns independent progress entries for videos in the same topic", async () => {
        mockTopicVideoWatchFindMany.mockResolvedValue([
            {
                topicId: "topic-1",
                mediaId: "video-1",
                watchedSeconds: 80,
                totalSeconds: 100,
                completedAt: new Date("2026-07-12T10:00:00.000Z"),
            },
            {
                topicId: "topic-1",
                mediaId: "video-2",
                watchedSeconds: 25,
                totalSeconds: 100,
                completedAt: null,
            },
        ])
        const { GET } = await import("@/app/api/student/[code]/lessons/[lessonId]/video-watch/route")
        const response = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123", lessonId: "lesson-1" }),
        })

        await expect(response.json()).resolves.toEqual({
            watches: [
                {
                    topicId: "topic-1",
                    mediaId: "video-1",
                    watchedSeconds: 80,
                    totalSeconds: 100,
                    percent: 80,
                    completed: true,
                },
                {
                    topicId: "topic-1",
                    mediaId: "video-2",
                    watchedSeconds: 25,
                    totalSeconds: 100,
                    percent: 25,
                    completed: false,
                },
            ],
        })
    })
})
