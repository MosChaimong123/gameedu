import { beforeEach, describe, expect, it, vi } from "vitest"

const mockStudentFindFirst = vi.fn()
const mockCourseAssignmentFindFirst = vi.fn()
const mockCourseProgressFindUnique = vi.fn()
const mockCourseProgressUpsert = vi.fn()
const mockCourseAssessmentAttemptFindMany = vi.fn()
const mockPointHistoryCreate = vi.fn()
const mockSendNotification = vi.fn()

vi.mock("@/lib/db", () => ({
    db: {
        student: {
            findFirst: mockStudentFindFirst,
        },
        courseAssignment: {
            findFirst: mockCourseAssignmentFindFirst,
        },
        courseProgress: {
            findUnique: mockCourseProgressFindUnique,
            upsert: mockCourseProgressUpsert,
        },
        courseAssessmentAttempt: {
            findMany: mockCourseAssessmentAttemptFindMany,
        },
        pointHistory: {
            create: mockPointHistoryCreate,
        },
    },
}))

vi.mock("@/lib/notifications", () => ({
    sendNotification: mockSendNotification,
}))

vi.mock("@/lib/student-login-code", () => ({
    getStudentLoginCodeVariants: (code: string) => [code, code.toUpperCase()],
}))

const validCourseContent = {
    schemaVersion: "course_content_v1",
    title: "Physics Course",
    modules: [
        {
            id: "module-1",
            title: "Module 1",
            order: 0,
            lessons: [
                {
                    id: "course-lesson-1",
                    lessonId: "lesson-1",
                    title: "Force",
                    order: 0,
                    required: true,
                    unlockRule: { type: "none" },
                },
                {
                    id: "course-lesson-2",
                    lessonId: "lesson-2",
                    title: "Motion",
                    order: 1,
                    required: false,
                    unlockRule: { type: "none" },
                },
                {
                    id: "course-lesson-3",
                    lessonId: "lesson-3",
                    title: "Energy",
                    order: 2,
                    required: true,
                    unlockRule: { type: "none" },
                },
            ],
        },
    ],
}

describe("student course progress routes", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockStudentFindFirst.mockResolvedValue({ id: "student-1", classId: "class-1", name: "Student One" })
        mockCourseAssignmentFindFirst.mockResolvedValue({
            id: "assignment-1",
            courseId: "course-1",
            classId: "class-1",
            course: {
                id: "course-1",
                title: "Physics Course",
                content: validCourseContent,
            },
        })
        mockCourseProgressFindUnique.mockResolvedValue(null)
        mockCourseProgressUpsert.mockResolvedValue({
            id: "progress-1",
            completedLessonIds: [],
            currentLessonId: "lesson-1",
            percent: 0,
            startedAt: new Date("2026-06-14T10:00:00.000Z"),
            lastOpenedAt: new Date("2026-06-14T10:00:00.000Z"),
            completedAt: null,
        })
        mockCourseAssessmentAttemptFindMany.mockResolvedValue([])
        mockPointHistoryCreate.mockResolvedValue({ id: "history-1" })
        mockSendNotification.mockResolvedValue({ id: "notification-1" })
    })

    it("creates course progress and logs a start event when current lesson is first opened", async () => {
        const { PATCH } = await import("@/app/api/student/[code]/courses/[courseId]/progress/route")
        const res = await PATCH(
            new Request("http://localhost/api/student/abc123/courses/course-1/progress", {
                method: "PATCH",
                body: JSON.stringify({ currentLessonId: "lesson-1" }),
            }),
            { params: Promise.resolve({ code: "abc123", courseId: "course-1" }) }
        )
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload.progress.currentLessonId).toBe("lesson-1")
        expect(payload.progress.percent).toBe(0)
        expect(payload.progress.assessmentStatus.pendingAssessmentIds).toEqual([])
        expect(mockCourseProgressUpsert).toHaveBeenCalled()
        expect(mockPointHistoryCreate).toHaveBeenCalledWith({
            data: {
                studentId: "student-1",
                value: 0,
                reason: "เริ่มเรียนคอร์ส: Physics Course",
            },
        })
    })

    it("rejects progress updates for a lesson outside the course", async () => {
        const { PATCH } = await import("@/app/api/student/[code]/courses/[courseId]/progress/route")
        const res = await PATCH(
            new Request("http://localhost/api/student/abc123/courses/course-1/progress", {
                method: "PATCH",
                body: JSON.stringify({ currentLessonId: "lesson-x" }),
            }),
            { params: Promise.resolve({ code: "abc123", courseId: "course-1" }) }
        )

        expect(res.status).toBe(400)
        expect(mockCourseProgressUpsert).not.toHaveBeenCalled()
    })

    it("marks a lesson complete and calculates percent from required lessons only", async () => {
        mockCourseProgressFindUnique.mockResolvedValue({
            id: "progress-1",
            completedLessonIds: ["lesson-1"],
            currentLessonId: "lesson-1",
            completedAt: null,
            startedAt: new Date("2026-06-14T10:00:00.000Z"),
            lastOpenedAt: new Date("2026-06-14T10:05:00.000Z"),
        })
        mockCourseProgressUpsert.mockResolvedValue({
            id: "progress-1",
            completedLessonIds: ["lesson-1", "lesson-2"],
            currentLessonId: "lesson-2",
            percent: 50,
            startedAt: new Date("2026-06-14T10:00:00.000Z"),
            lastOpenedAt: new Date("2026-06-14T10:10:00.000Z"),
            completedAt: null,
        })

        const { POST } = await import("@/app/api/student/[code]/courses/[courseId]/complete/route")
        const res = await POST(
            new Request("http://localhost/api/student/abc123/courses/course-1/complete", {
                method: "POST",
                body: JSON.stringify({ lessonId: "lesson-2" }),
            }),
            { params: Promise.resolve({ code: "abc123", courseId: "course-1" }) }
        )
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload.progress.completedLessonIds).toEqual(["lesson-1", "lesson-2"])
        expect(payload.progress.percent).toBe(50)
        expect(payload.courseCompleted).toBe(false)
        expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it("completes the course when the final required lesson is completed", async () => {
        mockCourseProgressFindUnique.mockResolvedValue({
            id: "progress-1",
            completedLessonIds: ["lesson-1"],
            currentLessonId: "lesson-1",
            completedAt: null,
            startedAt: new Date("2026-06-14T10:00:00.000Z"),
            lastOpenedAt: new Date("2026-06-14T10:05:00.000Z"),
        })
        mockCourseProgressUpsert.mockResolvedValue({
            id: "progress-1",
            completedLessonIds: ["lesson-1", "lesson-3"],
            currentLessonId: "lesson-3",
            percent: 100,
            startedAt: new Date("2026-06-14T10:00:00.000Z"),
            lastOpenedAt: new Date("2026-06-14T10:20:00.000Z"),
            completedAt: new Date("2026-06-14T10:20:00.000Z"),
        })

        const { POST } = await import("@/app/api/student/[code]/courses/[courseId]/complete/route")
        const res = await POST(
            new Request("http://localhost/api/student/abc123/courses/course-1/complete", {
                method: "POST",
                body: JSON.stringify({ lessonId: "lesson-3" }),
            }),
            { params: Promise.resolve({ code: "abc123", courseId: "course-1" }) }
        )
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload.progress.percent).toBe(100)
        expect(payload.courseCompleted).toBe(true)
        expect(mockPointHistoryCreate).toHaveBeenCalledWith({
            data: {
                studentId: "student-1",
                value: 0,
                reason: "จบคอร์ส: Physics Course",
            },
        })
        expect(mockSendNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                studentId: "student-1",
                type: "SUCCESS",
            })
        )
    })

    it("keeps course incomplete when required assessment is still pending", async () => {
        mockCourseAssignmentFindFirst.mockResolvedValue({
            id: "assignment-1",
            courseId: "course-1",
            classId: "class-1",
            course: {
                id: "course-1",
                title: "Physics Course",
                content: {
                    ...validCourseContent,
                    certificate: {
                        enabled: true,
                        requiredAssessmentIds: ["assessment-1"],
                    },
                },
            },
        })
        mockCourseProgressFindUnique.mockResolvedValue({
            id: "progress-1",
            completedLessonIds: ["lesson-1"],
            currentLessonId: "lesson-1",
            completedAt: null,
            startedAt: new Date("2026-06-14T10:00:00.000Z"),
            lastOpenedAt: new Date("2026-06-14T10:05:00.000Z"),
        })
        mockCourseProgressUpsert.mockResolvedValue({
            id: "progress-1",
            completedLessonIds: ["lesson-1", "lesson-3"],
            currentLessonId: "lesson-3",
            percent: 100,
            startedAt: new Date("2026-06-14T10:00:00.000Z"),
            lastOpenedAt: new Date("2026-06-14T10:20:00.000Z"),
            completedAt: null,
        })
        mockCourseAssessmentAttemptFindMany.mockResolvedValue([])

        const { POST } = await import("@/app/api/student/[code]/courses/[courseId]/complete/route")
        const res = await POST(
            new Request("http://localhost/api/student/abc123/courses/course-1/complete", {
                method: "POST",
                body: JSON.stringify({ lessonId: "lesson-3" }),
            }),
            { params: Promise.resolve({ code: "abc123", courseId: "course-1" }) }
        )
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload.courseCompleted).toBe(false)
        expect(payload.progress.courseCompletedByLessons).toBe(true)
        expect(payload.progress.nextRequiredAction).toBe("ASSESSMENT")
        expect(payload.progress.assessmentStatus.pendingAssessmentIds).toEqual(["assessment-1"])
        expect(mockSendNotification).not.toHaveBeenCalled()
    })
})
