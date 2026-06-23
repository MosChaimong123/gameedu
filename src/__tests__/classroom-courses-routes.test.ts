import { beforeEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.fn()
const mockClassroomFindUnique = vi.fn()
const mockCourseFindUnique = vi.fn()
const mockCourseAssignmentFindMany = vi.fn()
const mockCourseAssignmentUpsert = vi.fn()
const mockLessonFindMany = vi.fn()
const mockQuestionSetFindMany = vi.fn()

vi.mock("@/auth", () => ({
    auth: mockAuth,
}))

vi.mock("@/lib/db", () => ({
    db: {
        classroom: {
            findUnique: mockClassroomFindUnique,
        },
        course: {
            findUnique: mockCourseFindUnique,
        },
        courseAssignment: {
            findMany: mockCourseAssignmentFindMany,
            upsert: mockCourseAssignmentUpsert,
        },
        lesson: {
            findMany: mockLessonFindMany,
        },
        questionSet: {
            findMany: mockQuestionSetFindMany,
        },
    },
}))

const validLessonContent = {
    schemaVersion: "lesson_content_v2",
    outline: {
        title: "Force",
        topics: [{ id: "topic-1", title: "Force basics", order: 0 }],
    },
    topics: [
        {
            id: "topic-1",
            title: "Force basics",
            order: 0,
            contentStatus: "generated",
            objectives: ["Explain force."],
            sections: [
                {
                    id: "section-1",
                    heading: "Meaning",
                    content: "Force is a push or pull.",
                    media: [{ id: "media-1", type: "video", url: "https://example.com/force.mp4" }],
                },
            ],
        },
    ],
    metadata: {
        curriculum: {
            subject: "physics",
            curriculumCode: "basic_education_2551_revised_2560",
            gradeLevel: "ม.4",
            semester: 1,
            unitId: "phy-m4-s1-u01",
            learningOutcomeIds: ["phy-lo-m4-s1-u01-01"],
        },
    },
}

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
    assessments: [
        {
            id: "assessment-1",
            type: "checkpoint",
            title: "Module checkpoint",
            questionSetId: "set-1",
            moduleId: "module-1",
            source: {
                sourceType: "module",
                courseId: "course-1",
                moduleId: "module-1",
            },
        },
    ],
}

describe("classroom course assignment routes", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } })
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1" })
        mockCourseFindUnique.mockResolvedValue({
            ownerUserId: "teacher-1",
            status: "PUBLISHED",
            content: validCourseContent,
        })
        mockLessonFindMany.mockResolvedValue([{ id: "lesson-1", status: "PUBLISHED", content: validLessonContent }])
        mockQuestionSetFindMany.mockResolvedValue([{ id: "set-1" }])
        mockCourseAssignmentFindMany.mockResolvedValue([])
        mockCourseAssignmentUpsert.mockResolvedValue({ id: "course-assignment-1", courseId: "course-1", classId: "class-1" })
    })

    it("lists course assignments for a teacher-owned classroom", async () => {
        mockCourseAssignmentFindMany.mockResolvedValue([
            {
                id: "course-assignment-1",
                course: {
                    id: "course-1",
                    title: "Physics Course",
                    status: "PUBLISHED",
                    content: validCourseContent,
                },
            },
        ])

        const { GET } = await import("@/app/api/classrooms/[id]/courses/route")
        const res = await GET(new Request("http://localhost/api/classrooms/class-1/courses"), {
            params: Promise.resolve({ id: "class-1" }),
        })
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload).toHaveLength(1)
        expect(mockCourseAssignmentFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { classId: "class-1" },
            })
        )
    })

    it("assigns a published course to the classroom", async () => {
        const { POST } = await import("@/app/api/classrooms/[id]/courses/route")
        const res = await POST(
            new Request("http://localhost/api/classrooms/class-1/courses", {
                method: "POST",
                body: JSON.stringify({ courseId: "course-1" }),
            }),
            { params: Promise.resolve({ id: "class-1" }) }
        )

        expect(res.status).toBe(201)
        expect(mockCourseAssignmentUpsert).toHaveBeenCalledWith({
            where: { courseId_classId: { courseId: "course-1", classId: "class-1" } },
            create: expect.objectContaining({ courseId: "course-1", classId: "class-1" }),
            update: expect.objectContaining({ status: "ACTIVE" }),
        })
    })

    it("blocks students from teacher classroom course assignment routes", async () => {
        mockAuth.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } })

        const { POST } = await import("@/app/api/classrooms/[id]/courses/route")
        const res = await POST(
            new Request("http://localhost/api/classrooms/class-1/courses", {
                method: "POST",
                body: JSON.stringify({ courseId: "course-1" }),
            }),
            { params: Promise.resolve({ id: "class-1" }) }
        )

        expect(res.status).toBe(403)
        expect(mockCourseAssignmentUpsert).not.toHaveBeenCalled()
    })

    it("prevents assigning a course to another teacher's classroom", async () => {
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-2" })

        const { POST } = await import("@/app/api/classrooms/[id]/courses/route")
        const res = await POST(
            new Request("http://localhost/api/classrooms/class-1/courses", {
                method: "POST",
                body: JSON.stringify({ courseId: "course-1" }),
            }),
            { params: Promise.resolve({ id: "class-1" }) }
        )

        expect(res.status).toBe(403)
        expect(mockCourseAssignmentUpsert).not.toHaveBeenCalled()
    })

    it("rejects draft courses before assignment", async () => {
        mockCourseFindUnique.mockResolvedValue({
            ownerUserId: "teacher-1",
            status: "DRAFT",
            content: validCourseContent,
        })

        const { POST } = await import("@/app/api/classrooms/[id]/courses/route")
        const res = await POST(
            new Request("http://localhost/api/classrooms/class-1/courses", {
                method: "POST",
                body: JSON.stringify({ courseId: "course-1" }),
            }),
            { params: Promise.resolve({ id: "class-1" }) }
        )

        expect(res.status).toBe(400)
        expect(mockCourseAssignmentUpsert).not.toHaveBeenCalled()
    })

    it("rejects courses with legacy or missing lesson content before assignment", async () => {
        mockLessonFindMany.mockResolvedValue([{ id: "lesson-1", status: "PUBLISHED", content: { objectives: [] } }])

        const { POST } = await import("@/app/api/classrooms/[id]/courses/route")
        const res = await POST(
            new Request("http://localhost/api/classrooms/class-1/courses", {
                method: "POST",
                body: JSON.stringify({ courseId: "course-1" }),
            }),
            { params: Promise.resolve({ id: "class-1" }) }
        )
        const payload = await res.json()

        expect(res.status).toBe(400)
        expect(payload.issues.map((issue: { code: string }) => issue.code)).toContain("LEGACY_LESSON_CONTENT")
        expect(mockCourseAssignmentUpsert).not.toHaveBeenCalled()
    })

    it("rejects assigning a course when an assessment question set is missing", async () => {
        mockQuestionSetFindMany.mockResolvedValue([])

        const { POST } = await import("@/app/api/classrooms/[id]/courses/route")
        const res = await POST(
            new Request("http://localhost/api/classrooms/class-1/courses", {
                method: "POST",
                body: JSON.stringify({ courseId: "course-1" }),
            }),
            { params: Promise.resolve({ id: "class-1" }) }
        )
        const payload = await res.json()

        expect(res.status).toBe(400)
        expect(payload.issues.map((issue: { code: string }) => issue.code)).toContain("MISSING_ASSESSMENT_QUESTION_SET")
        expect(mockCourseAssignmentUpsert).not.toHaveBeenCalled()
    })
})
