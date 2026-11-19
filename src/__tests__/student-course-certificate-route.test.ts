import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockStudentFindFirst = vi.fn()
const mockCourseAssignmentFindFirst = vi.fn()
const mockCourseProgressFindUnique = vi.fn()
const mockCourseAssessmentAttemptFindMany = vi.fn()
const mockCourseCertificateFindUnique = vi.fn()
const mockTransaction = vi.fn()
const mockSendNotification = vi.fn()
const mockStudentUpdate = vi.fn()
const mockPointHistoryCreate = vi.fn()
const mockStudentAchievementUpsert = vi.fn()

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
        },
        courseAssessmentAttempt: {
            findMany: mockCourseAssessmentAttemptFindMany,
        },
        courseCertificate: {
            findUnique: mockCourseCertificateFindUnique,
        },
        $transaction: mockTransaction,
    },
}))

vi.mock("@/lib/student-login-code", () => ({
    getStudentLoginCodeVariants: (code: string) => [code, code.toUpperCase()],
}))

vi.mock("@/lib/notifications", () => ({
    sendNotification: mockSendNotification,
}))

const validCourseContent = {
    schemaVersion: "course_content_v1",
    title: "Physics Course",
    certificate: {
        enabled: true,
        title: "Physics Certificate",
        description: "Complete the course and final test",
        requiredAssessmentIds: ["assessment-1"],
        reward: {
            behaviorPoints: 20,
            achievementId: "course-physics",
            achievementTitle: "Physics Graduate",
        },
    },
    assessments: [
        {
            id: "assessment-1",
            type: "posttest",
            title: "Final Test",
            questionSetId: "set-1",
            allowRetake: true,
        },
    ],
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
            ],
        },
    ],
}

describe("student course certificate route", () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    beforeEach(() => {
        vi.clearAllMocks()
        mockStudentFindFirst.mockResolvedValue({
            id: "student-1",
            classId: "class-1",
            name: "Alice",
        })
        mockCourseAssignmentFindFirst.mockResolvedValue({
            course: {
                id: "course-1",
                title: "Physics Course",
                content: validCourseContent,
            },
        })
        mockCourseProgressFindUnique.mockResolvedValue({
            id: "progress-1",
            completedLessonIds: ["lesson-1"],
            currentLessonId: "lesson-1",
            percent: 100,
            startedAt: new Date("2026-06-14T10:00:00.000Z"),
            lastOpenedAt: new Date("2026-06-14T10:05:00.000Z"),
            completedAt: new Date("2026-06-14T10:10:00.000Z"),
        })
        mockCourseAssessmentAttemptFindMany.mockResolvedValue([
            {
                assessmentId: "assessment-1",
                passed: true,
                score: 9,
                maxScore: 10,
            },
        ])
        mockCourseCertificateFindUnique.mockResolvedValue(null)
        mockStudentUpdate.mockResolvedValue({})
        mockPointHistoryCreate.mockResolvedValue({})
        mockStudentAchievementUpsert.mockResolvedValue({})
        mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
            callback({
                courseCertificate: {
                    create: vi.fn().mockResolvedValue({
                        id: "cert-1",
                        title: "Physics Certificate",
                        description: "Complete the course and final test",
                        certificateCode: "TPC-COURSE1-STUDEN1",
                        issuedAt: new Date("2026-06-14T10:15:00.000Z"),
                    }),
                },
                student: {
                    update: mockStudentUpdate,
                },
                pointHistory: {
                    create: mockPointHistoryCreate,
                },
                studentAchievement: {
                    upsert: mockStudentAchievementUpsert,
                },
            })
        )
    })

    it("issues a certificate and applies rewards when requirements are met", async () => {
        const { POST } = await import("@/app/api/student/[code]/courses/[courseId]/certificate/issue/route")
        const res = await POST(new Request("http://localhost/api/student/abc123/courses/course-1/certificate/issue", { method: "POST" }), {
            params: Promise.resolve({ code: "abc123", courseId: "course-1" }),
        })
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload.certificate.certificateCode).toBe("TPC-COURSE1-STUDEN1")
        expect(payload.reward.behaviorPoints).toBe(20)
        expect(mockSendNotification).toHaveBeenCalled()
    })

    it("returns forbidden when certificate requirements are not met", async () => {
        mockCourseAssessmentAttemptFindMany.mockResolvedValue([
            {
                assessmentId: "assessment-1",
                passed: false,
                score: 2,
                maxScore: 10,
            },
        ])

        const { POST } = await import("@/app/api/student/[code]/courses/[courseId]/certificate/issue/route")
        const res = await POST(new Request("http://localhost/api/student/abc123/courses/course-1/certificate/issue", { method: "POST" }), {
            params: Promise.resolve({ code: "abc123", courseId: "course-1" }),
        })

        expect(res.status).toBe(403)
        expect(mockTransaction).not.toHaveBeenCalled()
    })

    it("issues the certificate without game rewards when classroom games are retired", async () => {
        vi.stubEnv("CLASSROOM_GAME_SYSTEM_ENABLED", "false")
        const { POST } = await import("@/app/api/student/[code]/courses/[courseId]/certificate/issue/route")
        const res = await POST(new Request("http://localhost", { method: "POST" }), {
            params: Promise.resolve({ code: "abc123", courseId: "course-1" }),
        })
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload.certificate.certificateCode).toBe("TPC-COURSE1-STUDEN1")
        expect(payload.reward).toBeNull()
        expect(mockStudentUpdate).not.toHaveBeenCalled()
        expect(mockPointHistoryCreate).not.toHaveBeenCalled()
        expect(mockStudentAchievementUpsert).not.toHaveBeenCalled()
    })
})
