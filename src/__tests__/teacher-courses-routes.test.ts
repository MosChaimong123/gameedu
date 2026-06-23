import { beforeEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.fn()
const mockCourseFindMany = vi.fn()
const mockCourseCreate = vi.fn()
const mockCourseFindUnique = vi.fn()
const mockCourseUpdate = vi.fn()
const mockCourseDelete = vi.fn()
const mockLessonFindMany = vi.fn()
const mockQuestionSetFindMany = vi.fn()

vi.mock("@/auth", () => ({
    auth: mockAuth,
}))

vi.mock("@/lib/db", () => ({
    db: {
        course: {
            findMany: mockCourseFindMany,
            create: mockCourseCreate,
            findUnique: mockCourseFindUnique,
            update: mockCourseUpdate,
            delete: mockCourseDelete,
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
            type: "posttest",
            title: "Physics final",
            questionSetId: "set-1",
            source: {
                sourceType: "module",
                courseId: "course-1",
                moduleId: "module-1",
            },
        },
    ],
}

describe("teacher course CRUD routes", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } })
        mockCourseFindMany.mockResolvedValue([])
        mockCourseCreate.mockResolvedValue({ id: "course-1", title: "Physics Course", status: "DRAFT" })
        mockCourseFindUnique.mockResolvedValue({ id: "course-1", ownerUserId: "teacher-1", content: validCourseContent })
        mockCourseUpdate.mockResolvedValue({ id: "course-1", title: "Physics Course", status: "PUBLISHED" })
        mockCourseDelete.mockResolvedValue({})
        mockLessonFindMany.mockResolvedValue([{ id: "lesson-1", status: "PUBLISHED", content: validLessonContent }])
        mockQuestionSetFindMany.mockResolvedValue([{ id: "set-1" }])
    })

    it("scopes course list to the signed-in teacher", async () => {
        const { GET } = await import("@/app/api/courses/route")
        const res = await GET()

        expect(res.status).toBe(200)
        expect(mockCourseFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { ownerUserId: "teacher-1" },
                include: {
                    _count: {
                        select: {
                            classroomAssignments: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            })
        )
    })

    it("creates a draft course with validated content and trimmed fields", async () => {
        const { POST } = await import("@/app/api/courses/route")
        const res = await POST(
            new Request("http://localhost/api/courses", {
                method: "POST",
                body: JSON.stringify({
                    title: "  Physics Course  ",
                    subject: " Physics ",
                    gradeLevel: " M2 ",
                    description: "  Intro course  ",
                    coverImageUrl: " https://example.com/cover.png ",
                    content: validCourseContent,
                }),
            })
        )

        expect(res.status).toBe(201)
        expect(mockCourseCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                title: "Physics Course",
                subject: "Physics",
                gradeLevel: "M2",
                description: "Intro course",
                coverImageUrl: "https://example.com/cover.png",
                status: "DRAFT",
                ownerUserId: "teacher-1",
                content: validCourseContent,
            }),
        })
    })

    it("rejects invalid course content on create and update", async () => {
        const listRoute = await import("@/app/api/courses/route")
        const createRes = await listRoute.POST(
            new Request("http://localhost/api/courses", {
                method: "POST",
                body: JSON.stringify({ title: "Physics", content: { schemaVersion: "lesson_content_v2" } }),
            })
        )

        const itemRoute = await import("@/app/api/courses/[id]/route")
        const patchRes = await itemRoute.PATCH(
            new Request("http://localhost/api/courses/course-1", {
                method: "PATCH",
                body: JSON.stringify({ content: { schemaVersion: "lesson_content_v2" } }),
            }),
            { params: Promise.resolve({ id: "course-1" }) }
        )

        expect(createRes.status).toBe(400)
        expect(patchRes.status).toBe(400)
        expect(mockCourseCreate).not.toHaveBeenCalled()
        expect(mockCourseUpdate).not.toHaveBeenCalled()
    })

    it("blocks students from teacher course routes", async () => {
        mockAuth.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } })

        const { POST } = await import("@/app/api/courses/route")
        const res = await POST(
            new Request("http://localhost/api/courses", {
                method: "POST",
                body: JSON.stringify({ title: "Physics", content: validCourseContent }),
            })
        )

        expect(res.status).toBe(403)
        expect(mockCourseCreate).not.toHaveBeenCalled()
    })

    it("prevents editing another teacher's course", async () => {
        mockCourseFindUnique.mockResolvedValue({ ownerUserId: "teacher-2", content: validCourseContent })

        const { PATCH } = await import("@/app/api/courses/[id]/route")
        const res = await PATCH(
            new Request("http://localhost/api/courses/course-1", {
                method: "PATCH",
                body: JSON.stringify({ title: "Updated" }),
            }),
            { params: Promise.resolve({ id: "course-1" }) }
        )

        expect(res.status).toBe(403)
        expect(mockCourseUpdate).not.toHaveBeenCalled()
    })

    it("publishes only when referenced lessons are published Lesson V2 content", async () => {
        const { PATCH } = await import("@/app/api/courses/[id]/route")
        const res = await PATCH(
            new Request("http://localhost/api/courses/course-1", {
                method: "PATCH",
                body: JSON.stringify({ status: "PUBLISHED" }),
            }),
            { params: Promise.resolve({ id: "course-1" }) }
        )

        expect(res.status).toBe(200)
        expect(mockLessonFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { in: ["lesson-1"] } },
            })
        )
        expect(mockCourseUpdate).toHaveBeenCalledWith({
            where: { id: "course-1" },
            data: expect.objectContaining({ status: "PUBLISHED" }),
        })
    })

    it("rejects publishing when an assessment question set is missing", async () => {
        mockQuestionSetFindMany.mockResolvedValue([])

        const { PATCH } = await import("@/app/api/courses/[id]/route")
        const res = await PATCH(
            new Request("http://localhost/api/courses/course-1", {
                method: "PATCH",
                body: JSON.stringify({ status: "PUBLISHED" }),
            }),
            { params: Promise.resolve({ id: "course-1" }) }
        )
        const payload = await res.json()

        expect(res.status).toBe(400)
        expect(payload.issues.map((issue: { code: string }) => issue.code)).toContain("MISSING_ASSESSMENT_QUESTION_SET")
        expect(mockCourseUpdate).not.toHaveBeenCalled()
    })

    it("rejects publishing when referenced lessons are missing or legacy", async () => {
        mockLessonFindMany.mockResolvedValue([{ id: "lesson-1", status: "PUBLISHED", content: { objectives: [] } }])

        const { PATCH } = await import("@/app/api/courses/[id]/route")
        const res = await PATCH(
            new Request("http://localhost/api/courses/course-1", {
                method: "PATCH",
                body: JSON.stringify({ status: "PUBLISHED" }),
            }),
            { params: Promise.resolve({ id: "course-1" }) }
        )
        const payload = await res.json()

        expect(res.status).toBe(400)
        expect(payload.issues.map((issue: { code: string }) => issue.code)).toContain("LEGACY_LESSON_CONTENT")
        expect(mockCourseUpdate).not.toHaveBeenCalled()
    })

    it("deletes owned courses", async () => {
        const { DELETE } = await import("@/app/api/courses/[id]/route")
        const res = await DELETE(new Request("http://localhost/api/courses/course-1"), {
            params: Promise.resolve({ id: "course-1" }),
        })

        expect(res.status).toBe(204)
        expect(mockCourseDelete).toHaveBeenCalledWith({ where: { id: "course-1" } })
    })
})
