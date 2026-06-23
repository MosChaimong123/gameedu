import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.fn()
const mockGenerateContent = vi.fn()
const mockLogAuditEvent = vi.fn()
const mockConsumeRateLimitWithStore = vi.fn()

vi.mock("@/auth", () => ({
    auth: mockAuth,
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

describe("POST /api/ai/lessons/generate-outline", () => {
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
            resetAt: new Date("2026-06-13T00:00:00.000Z"),
            retryAfterSeconds: 0,
        })
    })

    afterEach(() => {
        delete process.env.GEMINI_API_KEY
    })

    it("generates lesson outlines from text without full lesson content", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        lessons: [
                            {
                                title: "แรงและการเคลื่อนที่",
                                description: "บทเรียนฟิสิกส์เบื้องต้น",
                                subject: "วิทยาศาสตร์",
                                gradeLevel: "ม.2",
                                topics: [
                                    { id: "topic-1", title: "แรงคืออะไร", description: "ความหมายของแรง", order: 0 },
                                    { id: "topic-2", title: "ผลของแรง", description: "แรงส่งผลต่อวัตถุอย่างไร", order: 1 },
                                ],
                            },
                            {
                                title: "กฎการเคลื่อนที่",
                                description: "แนวคิดเรื่องการเคลื่อนที่",
                                subject: "วิทยาศาสตร์",
                                gradeLevel: "ม.2",
                                topics: [
                                    { id: "topic-1", title: "ความเร็ว", description: "ความเร็วพื้นฐาน", order: 0 },
                                ],
                            },
                        ],
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-outline/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-outline", {
                method: "POST",
                body: JSON.stringify({
                    text: "แรงคือการผลักหรือดึง วัตถุสามารถเปลี่ยนความเร็วหรือทิศทางเมื่อมีแรงมากระทำ",
                    subject: "วิทยาศาสตร์",
                    gradeLevel: "ม.2",
                    lessonCount: 2,
                }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body).toMatchObject({
            lessons: [
                {
                    title: "แรงและการเคลื่อนที่",
                    topics: [
                        { id: "topic-1", title: "แรงคืออะไร", order: 0 },
                        { id: "topic-2", title: "ผลของแรง", order: 1 },
                    ],
                },
                {
                    title: "กฎการเคลื่อนที่",
                    topics: [{ id: "topic-1", title: "ความเร็ว", order: 0 }],
                },
            ],
        })
        expect(body).not.toHaveProperty("content")
        expect(body.lessons[0].topics[0]).not.toHaveProperty("sections")

        const parts = mockGenerateContent.mock.calls[0][0] as Array<{ text?: string }>
        const prompt = parts.at(-1)?.text ?? ""
        expect(prompt).toContain("Split the source into multiple lessons first")
        expect(prompt).toContain("For EACH lesson, create the lesson title and the topic list")
        expect(prompt).toContain("Do NOT create objectives")
        expect(prompt).toContain("Do NOT create lesson sections")
        expect(prompt).toContain("Do NOT create quiz questions")
    })

    it("supports parsed PDF input with text and pdfData", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        lessons: [
                            {
                                title: "ระบบสุริยะ",
                                topics: [{ id: "topic-1", title: "ดาวเคราะห์", description: "รู้จักดาวเคราะห์", order: 0 }],
                            },
                        ],
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-outline/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-outline", {
                method: "POST",
                body: JSON.stringify({
                    text: "เอกสาร PDF กล่าวถึงระบบสุริยะและดาวเคราะห์",
                    pdfData: "base64-pdf",
                    subject: "วิทยาศาสตร์",
                    gradeLevel: "ป.4",
                }),
            })
        )

        expect(res.status).toBe(200)
        const parts = mockGenerateContent.mock.calls[0][0] as Array<{ text?: string; inlineData?: unknown }>
        expect(parts.some((part) => part.text?.includes("CURRICULUM CONTENT"))).toBe(true)
        expect(parts.some((part) => Boolean(part.inlineData))).toBe(true)
    })

    it("returns INVALID_AI_RESPONSE when Gemini returns invalid JSON", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => "not-json",
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-outline/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-outline", {
                method: "POST",
                body: JSON.stringify({ text: "This is enough source text for outline generation." }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(502)
        expect(body.error.code).toBe("INVALID_AI_RESPONSE")
        expect(mockLogAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "ai.lesson_outline_generate.failed",
                reason: "invalid_ai_json",
            })
        )
    })

    it("returns INVALID_AI_RESPONSE when Gemini returns an invalid outline", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        title: "Incomplete",
                        content: {
                            objectives: ["Should not exist in outline step"],
                        },
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-outline/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-outline", {
                method: "POST",
                body: JSON.stringify({ text: "This is enough source text for outline generation." }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(502)
        expect(body.error.code).toBe("INVALID_AI_RESPONSE")
        expect(mockLogAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "ai.lesson_outline_generate.failed",
                reason: "invalid_ai_payload",
            })
        )
    })

    it("locks outline generation to the selected curriculum template topics", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        lessons: [
                            {
                                title: "AI title that should be normalized",
                                topics: [
                                    { id: "thai-u01-t01", title: "wrong title", description: "x", order: 0 },
                                    { id: "thai-u01-t02", title: "wrong title 2", description: "y", order: 1 },
                                ],
                            },
                        ],
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-outline/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-outline", {
                method: "POST",
                body: JSON.stringify({
                    text: "แหล่งข้อมูลเรื่องการฟังและการพูด",
                    curriculumSelection: {
                        subjectId: "thai",
                        unitId: "thai-u01",
                        templateId: "thai-master-template-01",
                    },
                }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.lessons).toHaveLength(1)
        expect(body.lessons[0].title).toBe("แม่แบบบทเรียนอ่านและสื่อสารจากเนื้อหาแกนกลาง")
        expect(body.lessons[0].topics).toEqual([
            expect.objectContaining({ id: "thai-u01-t01", title: "การฟังและจับใจความ", order: 0 }),
            expect.objectContaining({ id: "thai-u01-t02", title: "การพูดสื่อสารและอภิปราย", order: 1 }),
        ])

        const parts = mockGenerateContent.mock.calls[0][0] as Array<{ text?: string }>
        const prompt = parts.at(-1)?.text ?? ""
        expect(prompt).toContain("Canonical curriculum context")
        expect(prompt).toContain("You must use only allowed topic ids")
    })

    it("rejects curriculum-bound outlines that return topics outside the selected unit", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        lessons: [
                            {
                                title: "ผิดหน่วย",
                                topics: [{ id: "wrong-topic", title: "นอกหน่วย", order: 0 }],
                            },
                        ],
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-outline/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-outline", {
                method: "POST",
                body: JSON.stringify({
                    text: "แหล่งข้อมูลเรื่องการฟังและการพูด",
                    curriculumSelection: {
                        subjectId: "thai",
                        unitId: "thai-u01",
                        templateId: "thai-master-template-01",
                    },
                }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(502)
        expect(body.error.code).toBe("INVALID_AI_RESPONSE")
    })
})
