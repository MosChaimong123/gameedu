import { beforeEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.fn()
const mockStudentFindFirst = vi.fn()
const mockStudentFindMany = vi.fn()
const mockCourseAssignmentFindFirst = vi.fn()
const mockQuestionSetFindUnique = vi.fn()
const mockQuestionSetFindMany = vi.fn()
const mockCourseAssessmentAttemptFindUnique = vi.fn()
const mockCourseAssessmentAttemptUpsert = vi.fn()
const mockCourseAssessmentAttemptFindMany = vi.fn()
const mockClassroomFindUnique = vi.fn()

vi.mock("@/auth", () => ({
    auth: mockAuth,
}))

vi.mock("@/lib/db", () => ({
    db: {
        student: {
            findFirst: mockStudentFindFirst,
            findMany: mockStudentFindMany,
        },
        courseAssignment: {
            findFirst: mockCourseAssignmentFindFirst,
        },
        questionSet: {
            findUnique: mockQuestionSetFindUnique,
            findMany: mockQuestionSetFindMany,
        },
        courseAssessmentAttempt: {
            findUnique: mockCourseAssessmentAttemptFindUnique,
            upsert: mockCourseAssessmentAttemptUpsert,
            findMany: mockCourseAssessmentAttemptFindMany,
        },
        classroom: {
            findUnique: mockClassroomFindUnique,
        },
    },
}))

vi.mock("@/lib/student-login-code", () => ({
    getStudentLoginCodeVariants: (code: string) => [code, code.toUpperCase()],
}))

const courseContent = {
    schemaVersion: "course_content_v1",
    title: "Physics Course",
    modules: [
        {
            id: "module-1",
            title: "Force",
            order: 0,
            lessons: [],
        },
    ],
    assessments: [
        {
            id: "assessment-1",
            type: "checkpoint",
            title: "Force checkpoint",
            questionSetId: "set-1",
            moduleId: "module-1",
            passScore: 2,
            allowRetake: false,
        },
    ],
}

const questionSet = {
    id: "set-1",
    title: "Force quiz",
    questions: [
        {
            id: "q1",
            question: "1+1",
            options: ["1", "2", "3", "4"],
            correctAnswer: 1,
            explanation: "",
            image: null,
            timeLimit: 20,
            optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
            questionType: "MULTIPLE_CHOICE",
        },
        {
            id: "q2",
            question: "2+2",
            options: ["4", "5", "6", "7"],
            correctAnswer: 0,
            explanation: "",
            image: null,
            timeLimit: 20,
            optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
            questionType: "MULTIPLE_CHOICE",
        },
    ],
}

describe("course assessment V2 routes", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } })
        mockStudentFindFirst.mockResolvedValue({ id: "student-1", classId: "class-1", name: "Student One" })
        mockStudentFindMany.mockResolvedValue([
            { id: "student-1", name: "Student One", nickname: "One", loginCode: "ABC123" },
            { id: "student-2", name: "Student Two", nickname: "Two", loginCode: "XYZ999" },
        ])
        mockCourseAssignmentFindFirst.mockResolvedValue({
            id: "course-assignment-1",
            course: {
                id: "course-1",
                title: "Physics Course",
                content: courseContent,
            },
        })
        mockQuestionSetFindUnique.mockResolvedValue(questionSet)
        mockQuestionSetFindMany.mockResolvedValue([questionSet])
        mockCourseAssessmentAttemptFindUnique.mockResolvedValue(null)
        mockCourseAssessmentAttemptUpsert.mockResolvedValue({
            id: "attempt-1",
            score: 2,
            maxScore: 2,
            passed: true,
            attemptNumber: 1,
            completedAt: new Date("2026-06-14T12:00:00.000Z"),
        })
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1" })
        mockCourseAssessmentAttemptFindMany.mockResolvedValue([
            {
                id: "attempt-1",
                assessmentId: "assessment-1",
                studentId: "student-1",
                score: 2,
                maxScore: 2,
                passed: true,
                attemptNumber: 1,
                answers: [1, 0],
                completedAt: new Date("2026-06-14T12:00:00.000Z"),
            },
        ])
    })

    it("loads a student-facing assessment without exposing correct answers", async () => {
        const { GET } = await import("@/app/api/student/[code]/courses/[courseId]/assessments/[assessmentId]/route")
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123", courseId: "course-1", assessmentId: "assessment-1" }),
        })
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload.questions).toHaveLength(2)
        expect(JSON.stringify(payload.questions)).not.toContain("correctAnswer")
        expect(payload.assessment.questionSetTitle).toBe("Force quiz")
    })

    it("submits an assessment attempt and computes pass/fail", async () => {
        const { POST } = await import("@/app/api/student/[code]/courses/[courseId]/assessments/[assessmentId]/attempt/route")
        const res = await POST(
            new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({ answers: [1, 0] }),
            }),
            { params: Promise.resolve({ code: "abc123", courseId: "course-1", assessmentId: "assessment-1" }) }
        )
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload.result).toMatchObject({
            score: 2,
            maxScore: 2,
            passScore: 2,
            passed: true,
        })
        expect(mockCourseAssessmentAttemptUpsert).toHaveBeenCalled()
    })

    it("blocks retake when allowRetake is false and an attempt already exists", async () => {
        mockCourseAssessmentAttemptFindUnique.mockResolvedValue({
            id: "attempt-1",
            attemptNumber: 1,
            passed: false,
        })

        const { POST } = await import("@/app/api/student/[code]/courses/[courseId]/assessments/[assessmentId]/attempt/route")
        const res = await POST(
            new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({ answers: [1, 0] }),
            }),
            { params: Promise.resolve({ code: "abc123", courseId: "course-1", assessmentId: "assessment-1" }) }
        )

        expect(res.status).toBe(403)
        expect(mockCourseAssessmentAttemptUpsert).not.toHaveBeenCalled()
    })

    it("returns teacher results grouped by assessment", async () => {
        const { GET } = await import("@/app/api/classrooms/[id]/courses/[courseId]/assessment-results/route")
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", courseId: "course-1" }),
        })
        const payload = await res.json()

        expect(res.status).toBe(200)
        expect(payload.assessments).toHaveLength(1)
        expect(payload.summary).toMatchObject({
            assessmentCount: 1,
            studentCount: 2,
            submittedCount: 1,
            passedCount: 1,
            failedCount: 0,
            notStartedCount: 1,
        })
        expect(payload.assessments[0].questionInsights[0]).toMatchObject({
            questionId: "q1",
            responseCount: 1,
            incorrectCount: 0,
        })
        expect(payload.assessments[0].students[0]).toMatchObject({
            studentName: "Student One",
            status: "PASSED",
            attemptCount: 1,
            intervention: "NONE",
        })
        expect(payload.assessments[0].students[1]).toMatchObject({
            studentName: "Student Two",
            status: "NOT_STARTED",
            attemptCount: 0,
            intervention: "REMIND_TO_START",
        })
    })
})
