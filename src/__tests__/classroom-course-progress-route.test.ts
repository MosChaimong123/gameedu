import { beforeEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.fn()
const mockClassroomFindUnique = vi.fn()
const mockCourseAssignmentFindFirst = vi.fn()
const mockStudentFindMany = vi.fn()
const mockCourseProgressFindMany = vi.fn()
const mockCourseAssessmentAttemptFindMany = vi.fn()
const mockCourseCertificateFindMany = vi.fn()
const mockLessonFindMany = vi.fn()

vi.mock("@/auth", () => ({
    auth: mockAuth,
}))

vi.mock("@/lib/db", () => ({
    db: {
        classroom: {
            findUnique: mockClassroomFindUnique,
        },
        courseAssignment: {
            findFirst: mockCourseAssignmentFindFirst,
        },
        student: {
            findMany: mockStudentFindMany,
        },
        lesson: {
            findMany: mockLessonFindMany,
        },
        courseProgress: {
            findMany: mockCourseProgressFindMany,
        },
        courseAssessmentAttempt: {
            findMany: mockCourseAssessmentAttemptFindMany,
        },
        courseCertificate: {
            findMany: mockCourseCertificateFindMany,
        },
    },
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
                    required: true,
                    unlockRule: { type: "previous_lesson_completed" },
                },
            ],
        },
    ],
}

describe("classroom course progress route", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } })
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", name: "M6/1", teacherId: "teacher-1" })
        mockCourseAssignmentFindFirst.mockResolvedValue({
            id: "assignment-1",
            assignedAt: new Date("2026-06-14T08:00:00.000Z"),
            startAt: null,
            dueAt: new Date("2026-06-30T00:00:00.000Z"),
            status: "ACTIVE",
            course: {
                id: "course-1",
                title: "Physics Course",
                subject: "Physics",
                gradeLevel: "M6",
                content: validCourseContent,
            },
        })
        mockStudentFindMany.mockResolvedValue([
            { id: "student-1", name: "Alice", nickname: "Al", loginCode: "A001" },
            { id: "student-2", name: "Bob", nickname: null, loginCode: "B001" },
            { id: "student-3", name: "Cara", nickname: null, loginCode: "C001" },
        ])
        mockCourseProgressFindMany.mockResolvedValue([
            {
                id: "progress-1",
                studentId: "student-1",
                completedLessonIds: ["lesson-1", "lesson-2"],
                currentLessonId: "lesson-2",
                percent: 100,
                startedAt: new Date("2026-06-14T09:00:00.000Z"),
                lastOpenedAt: new Date("2026-06-14T09:30:00.000Z"),
                completedAt: new Date("2026-06-14T09:45:00.000Z"),
            },
            {
                id: "progress-2",
                studentId: "student-2",
                completedLessonIds: ["lesson-1"],
                currentLessonId: "lesson-1",
                percent: 50,
                startedAt: new Date("2026-06-01T09:00:00.000Z"),
                lastOpenedAt: new Date("2026-06-01T09:30:00.000Z"),
                completedAt: null,
            },
        ])
        mockCourseAssessmentAttemptFindMany.mockResolvedValue([
            { studentId: "student-1", assessmentId: "assessment-1" },
        ])
        mockCourseCertificateFindMany.mockResolvedValue([
            { studentId: "student-1", issuedAt: new Date("2026-06-14T10:00:00.000Z") },
        ])
        mockLessonFindMany.mockResolvedValue([
            {
                id: "lesson-1",
                title: "Force",
                subject: "science_technology",
                content: {
                    schemaVersion: "lesson_content_v2",
                    outline: { title: "Force", topics: [{ id: "topic-1", title: "แรง", order: 0 }] },
                    topics: [{ id: "topic-1", title: "แรง", order: 0, contentStatus: "generated", objectives: ["อธิบายแรง"], sections: [{ id: "section-1", heading: "แรง", content: "content" }] }],
                    metadata: {
                        curriculum: {
                            subject: "science_technology",
                            curriculumCode: "basic_education_2551_revised_2560",
                            gradeLevel: "ม.4",
                            unitId: "phy-m4-s1-u01",
                            learningOutcomeIds: ["phy-m4-s1-u01-lo1"],
                        },
                    },
                },
            },
            {
                id: "lesson-2",
                title: "Motion",
                subject: "science_technology",
                content: {
                    schemaVersion: "lesson_content_v2",
                    outline: { title: "Motion", topics: [{ id: "topic-2", title: "การเคลื่อนที่", order: 0 }] },
                    topics: [{ id: "topic-2", title: "การเคลื่อนที่", order: 0, contentStatus: "generated", objectives: ["อธิบายการเคลื่อนที่"], sections: [{ id: "section-2", heading: "การเคลื่อนที่", content: "content" }] }],
                    metadata: {
                        curriculum: {
                            subject: "science_technology",
                            curriculumCode: "basic_education_2551_revised_2560",
                            gradeLevel: "ม.4",
                            unitId: "phy-m4-s1-u02",
                            learningOutcomeIds: ["phy-m4-s1-u02-lo1"],
                        },
                    },
                },
            },
        ])
    })

    it("returns aggregated classroom course progress with intervention summaries", async () => {
        const { GET } = await import("@/app/api/classrooms/[id]/courses/[courseId]/progress/route")
        const res = await GET(new Request("http://localhost/api/classrooms/class-1/courses/course-1/progress"), {
            params: Promise.resolve({ id: "class-1", courseId: "course-1" }),
        })
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload.summary.studentCount).toBe(3)
        expect(payload.summary.completedCount).toBe(1)
        expect(payload.summary.inProgressCount).toBe(1)
        expect(payload.summary.notStartedCount).toBe(1)
        expect(payload.summary.certificateIssuedCount).toBe(1)
        expect(payload.summary.blockerLessons[0].lessonTitle).toBe("Motion")
        expect(payload.curriculumAnalytics.subjectLabel).toBe("วิทยาศาสตร์และเทคโนโลยี")
        expect(payload.curriculumAnalytics.unitCount).toBe(2)
        expect(payload.curriculumAnalytics.lessonCompletion[0].completionRate).toBe(67)
        expect(payload.students.find((student: { studentId: string }) => student.studentId === "student-2").needsAttention).toBe(true)
    })

    it("blocks non-teachers from reading classroom course progress", async () => {
        mockAuth.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } })

        const { GET } = await import("@/app/api/classrooms/[id]/courses/[courseId]/progress/route")
        const res = await GET(new Request("http://localhost/api/classrooms/class-1/courses/course-1/progress"), {
            params: Promise.resolve({ id: "class-1", courseId: "course-1" }),
        })

        expect(res.status).toBe(403)
    })
})
