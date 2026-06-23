import { beforeEach, describe, expect, it, vi } from "vitest"

const mockStudentFindFirst = vi.fn()
const mockCourseAssignmentFindMany = vi.fn()
const mockCourseProgressFindMany = vi.fn()
const mockCourseAssessmentAttemptFindMany = vi.fn()

vi.mock("@/lib/db", () => ({
    db: {
        student: {
            findFirst: mockStudentFindFirst,
        },
        courseAssignment: {
            findMany: mockCourseAssignmentFindMany,
        },
        courseProgress: {
            findMany: mockCourseProgressFindMany,
        },
        courseAssessmentAttempt: {
            findMany: mockCourseAssessmentAttemptFindMany,
        },
    },
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
            ],
        },
    ],
}

describe("student course shelf route", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockStudentFindFirst.mockResolvedValue({ id: "student-1", classId: "class-1" })
        mockCourseAssignmentFindMany.mockResolvedValue([
            {
                id: "course-assignment-1",
                courseId: "course-1",
                course: {
                    id: "course-1",
                    title: "Physics Course",
                    content: validCourseContent,
                },
            },
        ])
        mockCourseProgressFindMany.mockResolvedValue([
            {
                id: "progress-1",
                courseId: "course-1",
                completedLessonIds: ["lesson-1"],
                currentLessonId: "lesson-1",
                percent: 100,
                startedAt: new Date("2026-06-14T10:00:00.000Z"),
                lastOpenedAt: new Date("2026-06-14T10:05:00.000Z"),
                completedAt: new Date("2026-06-14T10:05:00.000Z"),
            },
        ])
        mockCourseAssessmentAttemptFindMany.mockResolvedValue([])
    })

    it("returns active published course assignments for the student's classroom", async () => {
        const { GET } = await import("@/app/api/student/[code]/courses/route")
        const res = await GET(new Request("http://localhost/api/student/abc123/courses"), {
            params: Promise.resolve({ code: "abc123" }),
        })
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload).toHaveLength(1)
        expect(payload[0].progress.currentLessonId).toBe("lesson-1")
        expect(payload[0].progress.assessmentStatus.pendingAssessmentIds).toEqual([])
        expect(mockStudentFindFirst).toHaveBeenCalledWith({
            where: {
                OR: [{ loginCode: "abc123" }, { loginCode: "ABC123" }],
            },
            select: { id: true, classId: true },
        })
        expect(mockCourseAssignmentFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    classId: "class-1",
                    status: "ACTIVE",
                    course: { status: "PUBLISHED" },
                },
            })
        )
        expect(mockCourseProgressFindMany).toHaveBeenCalledWith({
            where: {
                studentId: "student-1",
                courseId: { in: ["course-1"] },
            },
            select: {
                id: true,
                courseId: true,
                completedLessonIds: true,
                currentLessonId: true,
                percent: true,
                startedAt: true,
                lastOpenedAt: true,
                completedAt: true,
            },
        })
        expect(mockCourseAssessmentAttemptFindMany).toHaveBeenCalledWith({
            where: {
                studentId: "student-1",
                courseId: { in: ["course-1"] },
                passed: true,
            },
            select: {
                courseId: true,
                assessmentId: true,
            },
        })
    })

    it("filters invalid or legacy course content", async () => {
        mockCourseAssignmentFindMany.mockResolvedValue([
            {
                id: "course-assignment-1",
                course: {
                    id: "course-1",
                    title: "Legacy",
                    content: { schemaVersion: "lesson_content_v2" },
                },
            },
        ])

        const { GET } = await import("@/app/api/student/[code]/courses/route")
        const res = await GET(new Request("http://localhost/api/student/abc123/courses"), {
            params: Promise.resolve({ code: "abc123" }),
        })
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload).toEqual([])
    })

    it("returns not found when student code is unknown", async () => {
        mockStudentFindFirst.mockResolvedValue(null)

        const { GET } = await import("@/app/api/student/[code]/courses/route")
        const res = await GET(new Request("http://localhost/api/student/missing/courses"), {
            params: Promise.resolve({ code: "missing" }),
        })

        expect(res.status).toBe(404)
        expect(mockCourseAssignmentFindMany).not.toHaveBeenCalled()
        expect(mockCourseProgressFindMany).not.toHaveBeenCalled()
        expect(mockCourseAssessmentAttemptFindMany).not.toHaveBeenCalled()
    })
})
