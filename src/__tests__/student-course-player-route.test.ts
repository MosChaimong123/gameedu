import { beforeEach, describe, expect, it, vi } from "vitest"

const mockStudentFindFirst = vi.fn()
const mockCourseAssignmentFindFirst = vi.fn()
const mockLessonFindMany = vi.fn()
const mockCourseProgressFindUnique = vi.fn()
const mockCourseAssessmentAttemptFindMany = vi.fn()
const mockCourseCertificateFindUnique = vi.fn()

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
        lesson: {
            findMany: mockLessonFindMany,
        },
    },
}))

vi.mock("@/lib/student-login-code", () => ({
    getStudentLoginCodeVariants: (code: string) => [code, code.toUpperCase()],
}))

const validCourseContent = {
    schemaVersion: "course_content_v1",
    title: "Physics Course",
    certificate: {
        enabled: true,
        title: "Physics Certificate",
        requiredAssessmentIds: ["assessment-1"],
        reward: {
            behaviorPoints: 15,
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
                    estimatedMinutes: 12,
                },
                {
                    id: "course-lesson-2",
                    lessonId: "lesson-legacy",
                    title: "Legacy",
                    order: 1,
                    required: true,
                    unlockRule: { type: "none" },
                },
            ],
        },
    ],
}

const validLessonContent = {
    schemaVersion: "lesson_content_v2",
    outline: {
        title: "Force",
        description: "Lesson description",
        subject: "Physics",
        gradeLevel: "M6",
        topics: [
            {
                id: "topic-1",
                title: "แรง",
                order: 0,
            },
        ],
    },
    estimatedMinutes: 12,
    topics: [
        {
            id: "topic-1",
            title: "แรง",
            order: 0,
            contentStatus: "generated",
            objectives: ["อธิบายแรงได้"],
            sections: [
                {
                    id: "section-1",
                    heading: "แรงคืออะไร",
                    content: "แรงทำให้วัตถุเปลี่ยนสภาพการเคลื่อนที่",
                    media: [
                        {
                            id: "media-1",
                            type: "video",
                            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                            title: "วิดีโอแรง",
                        },
                    ],
                },
            ],
            documents: [],
        },
    ],
}

describe("student course player route", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockStudentFindFirst.mockResolvedValue({ id: "student-1", classId: "class-1" })
        mockCourseAssignmentFindFirst.mockResolvedValue({
            id: "assignment-1",
            courseId: "course-1",
            classId: "class-1",
            course: {
                id: "course-1",
                title: "Physics Course",
                subject: "Physics",
                gradeLevel: "M6",
                description: "Course description",
                coverImageUrl: null,
                content: validCourseContent,
            },
        })
        mockLessonFindMany.mockResolvedValue([
            {
                id: "lesson-1",
                title: "Force",
                subject: "Physics",
                gradeLevel: "M6",
                description: "Lesson description",
                content: validLessonContent,
            },
            {
                id: "lesson-legacy",
                title: "Legacy",
                subject: "Physics",
                gradeLevel: "M6",
                description: null,
                content: { schemaVersion: "lesson_content_v1" },
            },
        ])
        mockCourseProgressFindUnique.mockResolvedValue({
            id: "progress-1",
            completedLessonIds: ["lesson-1"],
            currentLessonId: "lesson-1",
            percent: 50,
            startedAt: new Date("2026-06-14T10:00:00.000Z"),
            lastOpenedAt: new Date("2026-06-14T10:05:00.000Z"),
            completedAt: null,
        })
        mockCourseAssessmentAttemptFindMany.mockResolvedValue([
            {
                assessmentId: "assessment-1",
                passed: true,
                score: 8,
                maxScore: 10,
                attemptNumber: 1,
                completedAt: new Date("2026-06-14T10:06:00.000Z"),
            },
        ])
        mockCourseCertificateFindUnique.mockResolvedValue(null)
    })

    it("returns an assigned published course with ordered Lesson V2 content", async () => {
        const { GET } = await import("@/app/api/student/[code]/courses/[courseId]/route")
        const res = await GET(new Request("http://localhost/api/student/abc123/courses/course-1"), {
            params: Promise.resolve({ code: "abc123", courseId: "course-1" }),
        })
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload.studentId).toBe("student-1")
        expect(payload.progress.currentLessonId).toBe("lesson-1")
        expect(payload.progress.completedLessonIds).toEqual(["lesson-1"])
        expect(payload.orderedLessons).toHaveLength(1)
        expect(payload.orderedLessons[0].lessons).toHaveLength(1)
        expect(payload.orderedLessons[0].lessons[0].lesson.content.schemaVersion).toBe("lesson_content_v2")
        expect(payload.certificate.config?.enabled).toBe(true)
        expect(payload.certificate.eligibility.eligible).toBe(false)
        expect(payload.certificate.eligibility.reasons).toContain("Course completion is required.")
        expect(payload.assessmentAttempts).toHaveLength(1)
        expect(mockCourseAssignmentFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    classId: "class-1",
                    courseId: "course-1",
                    status: "ACTIVE",
                    course: { status: "PUBLISHED" },
                },
            })
        )
        expect(mockLessonFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { in: ["lesson-1", "lesson-legacy"] }, status: "PUBLISHED" },
            })
        )
    })

    it("returns not found when the student code is unknown", async () => {
        mockStudentFindFirst.mockResolvedValue(null)

        const { GET } = await import("@/app/api/student/[code]/courses/[courseId]/route")
        const res = await GET(new Request("http://localhost/api/student/missing/courses/course-1"), {
            params: Promise.resolve({ code: "missing", courseId: "course-1" }),
        })

        expect(res.status).toBe(404)
        expect(mockCourseAssignmentFindFirst).not.toHaveBeenCalled()
    })

    it("returns not found when the assigned course does not use course content v1", async () => {
        mockCourseAssignmentFindFirst.mockResolvedValue({
            id: "assignment-1",
            courseId: "course-1",
            course: {
                id: "course-1",
                title: "Legacy Course",
                content: { schemaVersion: "lesson_content_v2" },
            },
        })

        const { GET } = await import("@/app/api/student/[code]/courses/[courseId]/route")
        const res = await GET(new Request("http://localhost/api/student/abc123/courses/course-1"), {
            params: Promise.resolve({ code: "abc123", courseId: "course-1" }),
        })

        expect(res.status).toBe(404)
        expect(mockLessonFindMany).not.toHaveBeenCalled()
    })
})
