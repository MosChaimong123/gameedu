import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.fn()
const mockGenerateContent = vi.fn()
const mockLogAuditEvent = vi.fn()
const mockConsumeRateLimitWithStore = vi.fn()
const mockLessonFindUnique = vi.fn()
const mockLessonFindMany = vi.fn()
const mockCourseFindUnique = vi.fn()

vi.mock("@/auth", () => ({
    auth: mockAuth,
}))

vi.mock("@/lib/db", () => ({
    db: {
        lesson: {
            findUnique: mockLessonFindUnique,
            findMany: mockLessonFindMany,
        },
        course: {
            findUnique: mockCourseFindUnique,
        },
    },
}))

vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: vi.fn().mockImplementation(function GoogleGenerativeAI() {
        return {
            getGenerativeModel: vi.fn().mockReturnValue({
                generateContent: mockGenerateContent,
            }),
        }
    }),
}))

vi.mock("@/lib/security/audit-log", () => ({
    logAuditEvent: mockLogAuditEvent,
}))

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>()
    return {
        ...actual,
        consumeRateLimitWithStore: mockConsumeRateLimitWithStore,
    }
})

const lessonContent = {
    schemaVersion: "lesson_content_v2",
    outline: {
        title: "เนเธฃเธเนเธฅเธฐเธเธฒเธฃเน€เธเธฅเธทเนเธญเธเธ—เธตเน",
        subject: "physics",
        gradeLevel: "เธก.4",
        topics: [
            { id: "topic-1", title: "เนเธฃเธ", description: "เธเธทเนเธเธเธฒเธเน€เธฃเธทเนเธญเธเนเธฃเธ", order: 0 },
            { id: "topic-2", title: "เนเธกเน€เธกเธเธ•เธฑเธก", description: "เธเธทเนเธเธเธฒเธเน€เธฃเธทเนเธญเธเนเธกเน€เธกเธเธ•เธฑเธก", order: 1 },
        ],
    },
    topics: [
        {
            id: "topic-1",
            title: "เนเธฃเธ",
            description: "เธเธทเนเธเธเธฒเธเน€เธฃเธทเนเธญเธเนเธฃเธ",
            order: 0,
            contentStatus: "generated",
            objectives: ["เธญเธเธดเธเธฒเธขเธเธงเธฒเธกเธซเธกเธฒเธขเธเธญเธเนเธฃเธเนเธ”เน", "เธขเธเธ•เธฑเธงเธญเธขเนเธฒเธเธเธฅเธเธญเธเนเธฃเธเธ•เนเธญเธเธฒเธฃเน€เธเธฅเธทเนเธญเธเธ—เธตเนเนเธ”เน"],
            sections: [
                {
                    id: "section-1",
                    heading: "เธเธงเธฒเธกเธซเธกเธฒเธขเธเธญเธเนเธฃเธ",
                    content: "เนเธฃเธเธเธทเธญเธเธฒเธฃเธเธฅเธฑเธเธซเธฃเธทเธญเธ”เธถเธเธ—เธตเนเธ—เธณเนเธซเนเธงเธฑเธ•เธ–เธธเน€เธเธฅเธตเนเธขเธเธชเธ เธฒเธเธเธฒเธฃเน€เธเธฅเธทเนเธญเธเธ—เธตเน",
                },
            ],
        },
        {
            id: "topic-2",
            title: "เนเธกเน€เธกเธเธ•เธฑเธก",
            description: "เธเธทเนเธเธเธฒเธเน€เธฃเธทเนเธญเธเนเธกเน€เธกเธเธ•เธฑเธก",
            order: 1,
            contentStatus: "generated",
            objectives: ["เธญเธเธดเธเธฒเธขเธเธงเธฒเธกเธซเธกเธฒเธขเธเธญเธเนเธกเน€เธกเธเธ•เธฑเธกเนเธ”เน"],
            sections: [
                {
                    id: "section-1",
                    heading: "เธเธงเธฒเธกเธซเธกเธฒเธขเธเธญเธเนเธกเน€เธกเธเธ•เธฑเธก",
                    content: "เนเธกเน€เธกเธเธ•เธฑเธกเน€เธเนเธเธเธฅเธเธนเธ“เธเธญเธเธกเธงเธฅเนเธฅเธฐเธเธงเธฒเธกเน€เธฃเนเธง",
                },
            ],
        },
    ],
    metadata: {
        curriculum: {
            subject: "physics",
            curriculumCode: "basic_education_2551_revised_2560",
            gradeLevel: "เธก.4",
            semester: 1,
            unitId: "phy-m4-s1-u02",
            learningOutcomeIds: ["phy-lo-m4-s1-u02-01"],
        },
    },
}

const courseContent = {
    schemaVersion: "course_content_v1",
    title: "เธเธดเธชเธดเธเธชเน เธก.4",
    modules: [
        {
            id: "module-1",
            title: "เนเธฃเธเนเธฅเธฐเธเธฒเธฃเน€เธเธฅเธทเนเธญเธเธ—เธตเน",
            description: "เธซเธเนเธงเธขเนเธฃเธเธเธญเธเธเธดเธชเธดเธเธชเน เธก.4",
            order: 0,
            lessons: [
                {
                    id: "course-lesson-1",
                    lessonId: "lesson-1",
                    title: "เนเธฃเธ",
                    order: 0,
                    required: true,
                    unlockRule: { type: "none" },
                },
                {
                    id: "course-lesson-2",
                    lessonId: "lesson-2",
                    title: "เนเธกเน€เธกเธเธ•เธฑเธก",
                    order: 1,
                    required: true,
                    unlockRule: { type: "previous_lesson_completed" },
                },
            ],
        },
    ],
}

describe("POST /api/ai/lessons/generate-assessment", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.GEMINI_API_KEY = "test-key"
        mockAuth.mockResolvedValue({
            user: {
                id: "teacher-1",
                role: "TEACHER",
                plan: "PLUS",
                planStatus: "ACTIVE",
                planExpiry: null,
            },
        })
        mockConsumeRateLimitWithStore.mockResolvedValue({
            allowed: true,
            remaining: 4,
            resetAt: new Date("2026-06-17T00:00:00.000Z"),
            retryAfterSeconds: 0,
        })
        mockLessonFindUnique.mockResolvedValue({
            id: "lesson-1",
            title: "เนเธฃเธเนเธฅเธฐเธเธฒเธฃเน€เธเธฅเธทเนเธญเธเธ—เธตเน",
            subject: "physics",
            gradeLevel: "เธก.4",
            ownerUserId: "teacher-1",
            content: lessonContent,
        })
        mockCourseFindUnique.mockResolvedValue({
            id: "course-1",
            title: "เธเธดเธชเธดเธเธชเน เธก.4",
            subject: "physics",
            gradeLevel: "เธก.4",
            ownerUserId: "teacher-1",
            content: courseContent,
        })
        mockLessonFindMany.mockResolvedValue([
            {
                id: "lesson-1",
                title: "เนเธฃเธเนเธฅเธฐเธเธฒเธฃเน€เธเธฅเธทเนเธญเธเธ—เธตเน",
                subject: "physics",
                gradeLevel: "เธก.4",
                ownerUserId: "teacher-1",
                content: lessonContent,
            },
            {
                id: "lesson-2",
                title: "เนเธกเน€เธกเธเธ•เธฑเธก",
                subject: "physics",
                gradeLevel: "เธก.4",
                ownerUserId: "teacher-1",
                content: {
                    ...lessonContent,
                    outline: {
                        ...lessonContent.outline,
                        title: "เนเธกเน€เธกเธเธ•เธฑเธก",
                        topics: [{ id: "topic-9", title: "เนเธกเน€เธกเธเธ•เธฑเธก", description: "เธเธฒเธฃเธ”เธฅเนเธฅเธฐเนเธกเน€เธกเธเธ•เธฑเธก", order: 0 }],
                    },
                    topics: [
                        {
                            id: "topic-9",
                            title: "เนเธกเน€เธกเธเธ•เธฑเธก",
                            description: "เธเธฒเธฃเธ”เธฅเนเธฅเธฐเนเธกเน€เธกเธเธ•เธฑเธก",
                            order: 0,
                            contentStatus: "generated",
                            objectives: ["เธญเธเธดเธเธฒเธขเนเธกเน€เธกเธเธ•เธฑเธกเนเธ”เน"],
                            sections: [{ id: "section-1", heading: "เธเธดเธขเธฒเธก", content: "เนเธกเน€เธกเธเธ•เธฑเธกเธเธทเธญเธกเธงเธฅเธเธนเธ“เธเธงเธฒเธกเน€เธฃเนเธง" }],
                        },
                    ],
                },
            },
        ])
    })

    afterEach(() => {
        delete process.env.GEMINI_API_KEY
    })

    it("generates a question draft from a canonical lesson topic source", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        title: "เนเธเธเธ—เธ”เธชเธญเธเน€เธฃเธทเนเธญเธเนเธฃเธ",
                        description: "เธเธฃเธฐเน€เธกเธดเธเธซเธฅเธฑเธเน€เธฃเธตเธขเธเน€เธฃเธทเนเธญเธเนเธฃเธ",
                        questions: [
                            {
                                question: "เนเธฃเธเธเธทเธญเธญเธฐเนเธฃ",
                                options: ["เธเธฒเธฃเธเธฅเธฑเธเธซเธฃเธทเธญเธ”เธถเธ", "เธกเธงเธฅเธเธญเธเธงเธฑเธ•เธ–เธธ", "เธเธงเธฒเธกเน€เธฃเนเธงเธเธญเธเธงเธฑเธ•เธ–เธธ", "เธญเธธเธ“เธซเธ เธนเธกเธดเธเธญเธเธงเธฑเธ•เธ–เธธ"],
                                correctAnswer: 0,
                                explanation: "เนเธฃเธเธเธทเธญเธเธฒเธฃเธเธฅเธฑเธเธซเธฃเธทเธญเธ”เธถเธ",
                            },
                        ],
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-assessment/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-assessment", {
                method: "POST",
                body: JSON.stringify({ lessonId: "lesson-1", topicId: "topic-1", count: 5 }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body).toMatchObject({
            title: "เนเธเธเธ—เธ”เธชเธญเธเน€เธฃเธทเนเธญเธเนเธฃเธ",
            sourceMetadata: {
                source: { sourceType: "topic", lessonId: "lesson-1", topicId: "topic-1" },
                generatedFrom: "ai_lesson_assessment",
                subjectId: "physics",
                unitId: "phy-m4-s1-u02",
                assessmentBlueprintId: "physics-assessment-blueprint-v1",
                assessmentFamily: "science_inquiry",
                recommendedPassScore: 4,
                createdFromLessonTitle: "เนเธฃเธเนเธฅเธฐเธเธฒเธฃเน€เธเธฅเธทเนเธญเธเธ—เธตเน",
            },
        })
        expect(body.questions).toHaveLength(1)
        expect(body.questions[0]).toMatchObject({
            questionType: "MULTIPLE_CHOICE",
            correctAnswer: 0,
        })

        const prompt = (mockGenerateContent.mock.calls[0][0] as Array<{ text?: string }>)[0]?.text ?? ""
        expect(prompt).toContain("Use ONLY the source lesson data below")
        expect(prompt).toContain("Build questions from learning objectives and section content only")
        expect(prompt).toContain("Do NOT decide pass/fail for students")
        expect(prompt).toContain("Source scope: topic")
        expect(prompt).toContain("Subject assessment blueprint:")
        expect(prompt).toContain("Assessment family: science_inquiry")
        expect(prompt).toContain("Preferred question styles:")
        expect(prompt).toContain("Sections:")
        expect(prompt).toContain("Objectives:")
        expect(prompt).not.toContain("Source scope: module")
    })

    it("limits topic generation to the selected lesson topic", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        title: "เนเธเธเธ—เธ”เธชเธญเธเธซเธฑเธงเธเนเธญเนเธฃเธ",
                        description: "เน€เธเธเธฒเธฐเธซเธฑเธงเธเนเธญเนเธฃเธ",
                        questions: [
                            {
                                question: "เธเนเธญเนเธ”เธญเธเธดเธเธฒเธขเนเธฃเธเนเธ”เนเธ–เธนเธเธ•เนเธญเธ",
                                options: ["เธเธฒเธฃเธเธฅเธฑเธเธซเธฃเธทเธญเธ”เธถเธ", "เธเธฅเธเธนเธ“เธเธญเธเธกเธงเธฅเนเธฅเธฐเธเธงเธฒเธกเน€เธฃเนเธง", "เธเธฅเธฑเธเธเธฒเธเธชเธฐเธชเธก", "เธญเธฑเธ•เธฃเธฒเธเธฒเธฃเน€เธเธฅเธตเนเธขเธเธ•เธณเนเธซเธเนเธ"],
                                correctAnswer: 0,
                                explanation: "เธเธดเธขเธฒเธกเธเธญเธเนเธฃเธเธเธทเธญเธเธฒเธฃเธเธฅเธฑเธเธซเธฃเธทเธญเธ”เธถเธ",
                            },
                        ],
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-assessment/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-assessment", {
                method: "POST",
                body: JSON.stringify({ lessonId: "lesson-1", topicId: "topic-1" }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.sourceMetadata.source).toMatchObject({
            sourceType: "topic",
            lessonId: "lesson-1",
            topicId: "topic-1",
        })

        const prompt = (mockGenerateContent.mock.calls[0][0] as Array<{ text?: string }>)[0]?.text ?? ""
        expect(prompt).toContain("Topic: เนเธฃเธ")
        expect(prompt).not.toContain("Topic: เนเธกเน€เธกเธเธ•เธฑเธก")
    })

    it("generates a question draft from a course module source", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        title: "เนเธเธเธ—เธ”เธชเธญเธเธซเธเนเธงเธขเนเธฃเธเนเธฅเธฐเธเธฒเธฃเน€เธเธฅเธทเนเธญเธเธ—เธตเน",
                        description: "เธฃเธงเธกเธเธฒเธเธซเธฅเธฒเธขเธเธ—เน€เธฃเธตเธขเธ",
                        questions: [
                            {
                                question: "เนเธกเน€เธกเธเธ•เธฑเธกเธเธทเธญเธญเธฐเนเธฃ",
                                options: ["เธกเธงเธฅเธเธนเธ“เธเธงเธฒเธกเน€เธฃเนเธง", "เนเธฃเธเธเธนเธ“เธฃเธฐเธขเธฐเธ—เธฒเธ", "เธเธฅเธฑเธเธเธฒเธเธ•เนเธญเน€เธงเธฅเธฒ", "เธเธฃเธฐเธเธธเนเธเธเนเธฒเธ•เนเธญเธเธทเนเธเธ—เธตเน"],
                                correctAnswer: 0,
                                explanation: "เนเธกเน€เธกเธเธ•เธฑเธกเธเธทเธญเธกเธงเธฅเธเธนเธ“เธเธงเธฒเธกเน€เธฃเนเธง",
                            },
                        ],
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-assessment/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-assessment", {
                method: "POST",
                body: JSON.stringify({ courseId: "course-1", moduleId: "module-1", difficulty: "HARD" }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.sourceMetadata).toMatchObject({
            source: { sourceType: "module", courseId: "course-1", moduleId: "module-1" },
            generatedFrom: "ai_course_assessment",
            subjectId: "physics",
            assessmentBlueprintId: "physics-assessment-blueprint-v1",
            assessmentFamily: "science_inquiry",
            createdFromCourseTitle: "เธเธดเธชเธดเธเธชเน เธก.4",
        })
        expect(mockLessonFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { in: ["lesson-1", "lesson-2"] } },
            })
        )

        const prompt = (mockGenerateContent.mock.calls[0][0] as Array<{ text?: string }>)[0]?.text ?? ""
        expect(prompt).toContain("Module title: เนเธฃเธเนเธฅเธฐเธเธฒเธฃเน€เธเธฅเธทเนเธญเธเธ—เธตเน")
        expect(prompt).toContain("Lesson title: เนเธฃเธเนเธฅเธฐเธเธฒเธฃเน€เธเธฅเธทเนเธญเธเธ—เธตเน")
        expect(prompt).toContain("Lesson title: เนเธกเน€เธกเธเธ•เธฑเธก")
        expect(prompt).toContain("Hard/Application and reasoning")
        expect(prompt).toContain("Recommended pass ratio: 75%")
    })

    it("rejects requests with no lesson or course source", async () => {
        const { POST } = await import("@/app/api/ai/lessons/generate-assessment/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-assessment", {
                method: "POST",
                body: JSON.stringify({ count: 5 }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(400)
        expect(body.error.code).toBe("INVALID_PAYLOAD")
        expect(mockGenerateContent).not.toHaveBeenCalled()
    })

    it("rejects lesson assessment requests without topicId", async () => {
        const { POST } = await import("@/app/api/ai/lessons/generate-assessment/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-assessment", {
                method: "POST",
                body: JSON.stringify({ lessonId: "lesson-1", count: 5 }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(400)
        expect(body.error.code).toBe("INVALID_PAYLOAD")
        expect(body.error.message).toBe("lesson assessment generation requires topicId")
        expect(mockGenerateContent).not.toHaveBeenCalled()
    })

    it("returns INVALID_AI_RESPONSE when Gemini returns invalid JSON", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => "not-json",
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-assessment/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-assessment", {
                method: "POST",
                body: JSON.stringify({ lessonId: "lesson-1", topicId: "topic-1" }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(502)
        expect(body.error.code).toBe("INVALID_AI_RESPONSE")
        expect(mockLogAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "ai.lesson_assessment_generate.failed",
                reason: "invalid_ai_json",
            })
        )
    })

    it("returns INVALID_AI_RESPONSE when Gemini returns an invalid assessment draft", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        title: "Broken draft",
                        questions: [
                            {
                                question: "Invalid choices",
                                options: ["A", "B"],
                                correctAnswer: 0,
                            },
                        ],
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-assessment/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-assessment", {
                method: "POST",
                body: JSON.stringify({ lessonId: "lesson-1", topicId: "topic-1" }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(502)
        expect(body.error.code).toBe("INVALID_AI_RESPONSE")
        expect(mockLogAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "ai.lesson_assessment_generate.failed",
                reason: "invalid_ai_payload",
            })
        )
    })
})
