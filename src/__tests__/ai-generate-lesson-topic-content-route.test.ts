import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { LessonOutlineDraft } from "@/lib/lessons/lesson-content"

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

const outline: LessonOutlineDraft = {
    title: "แรงและการเคลื่อนที่",
    description: "บทเรียนฟิสิกส์เบื้องต้น",
    subject: "วิทยาศาสตร์",
    gradeLevel: "ม.2",
    topics: [
        { id: "topic-1", title: "แรงคืออะไร", description: "ความหมายของแรง", order: 0 },
        { id: "topic-2", title: "ผลของแรง", description: "แรงส่งผลต่อวัตถุอย่างไร", order: 1 },
    ],
}

describe("POST /api/ai/lessons/generate-topic-content", () => {
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

    it("generates editable content only for the selected topic", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        topicId: "topic-1",
                        objectives: ["อธิบายความหมายของแรงได้"],
                        sections: [
                            {
                                id: "section-1",
                                heading: "ความหมายของแรง",
                                content: "แรงคือการผลักหรือดึงที่ทำให้วัตถุเปลี่ยนสภาพการเคลื่อนที่",
                            },
                        ],
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-topic-content/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-topic-content", {
                method: "POST",
                body: JSON.stringify({
                    outline,
                    topicId: "topic-1",
                    text: "แรงคือการผลักหรือดึง วัตถุเปลี่ยนความเร็วเมื่อมีแรงมากระทำ",
                }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body).toMatchObject({
            topicId: "topic-1",
            objectives: ["อธิบายความหมายของแรงได้"],
            sections: [{ id: "section-1", heading: "ความหมายของแรง" }],
            documents: [],
        })
        expect(body.sections[0]).not.toHaveProperty("examples")
        expect(body).not.toHaveProperty("keyTerms")
        expect(body).not.toHaveProperty("summary")
        expect(body).not.toHaveProperty("quiz")
        expect(body).not.toHaveProperty("questions")

        const parts = mockGenerateContent.mock.calls[0][0] as Array<{ text?: string }>
        const prompt = parts.at(-1)?.text ?? ""
        expect(prompt).toContain("Create lesson content ONLY for the selected topic")
        expect(prompt).toContain("Selected topic id: topic-1")
        expect(prompt).toContain("Do NOT create quiz questions")
        expect(prompt).toContain("Do NOT include any \"quiz\", \"questions\", \"answers\", \"correctAnswer\", or \"choices\" fields")
        expect(prompt).toContain("Do NOT create examples")
        expect(prompt).toContain("Do NOT create key terms")
        expect(prompt).toContain("Do NOT create a summary")
    })

    it("supports parsed PDF input with text and pdfData", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        topicId: "topic-2",
                        objectives: ["อธิบายผลของแรงได้"],
                        sections: [
                            {
                                id: "section-1",
                                heading: "ผลของแรง",
                                content: "แรงทำให้วัตถุเปลี่ยนความเร็ว ทิศทาง หรือรูปร่าง",
                            },
                        ],
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-topic-content/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-topic-content", {
                method: "POST",
                body: JSON.stringify({
                    outline,
                    topicId: "topic-2",
                    text: "เอกสาร PDF อธิบายผลของแรงต่อวัตถุ",
                    pdfData: "base64-pdf",
                }),
            })
        )

        expect(res.status).toBe(200)
        const parts = mockGenerateContent.mock.calls[0][0] as Array<{ text?: string; inlineData?: unknown }>
        expect(parts.some((part) => part.text?.includes("CURRICULUM CONTENT"))).toBe(true)
        expect(parts.some((part) => Boolean(part.inlineData))).toBe(true)
    })

    it("rejects topicId that is not in the outline", async () => {
        const { POST } = await import("@/app/api/ai/lessons/generate-topic-content/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-topic-content", {
                method: "POST",
                body: JSON.stringify({
                    outline,
                    topicId: "missing-topic",
                    text: "This is enough source text for topic generation.",
                }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(400)
        expect(body.error.code).toBe("INVALID_PAYLOAD")
        expect(mockGenerateContent).not.toHaveBeenCalled()
    })

    it("returns INVALID_AI_RESPONSE when Gemini returns invalid JSON", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => "not-json",
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-topic-content/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-topic-content", {
                method: "POST",
                body: JSON.stringify({
                    outline,
                    topicId: "topic-1",
                    text: "This is enough source text for topic generation.",
                }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(502)
        expect(body.error.code).toBe("INVALID_AI_RESPONSE")
        expect(mockLogAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "ai.lesson_topic_content_generate.failed",
                reason: "invalid_ai_json",
            })
        )
    })

    it("returns INVALID_AI_RESPONSE when Gemini returns invalid topic content", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        topicId: "topic-2",
                        objectives: [],
                        questions: [{ prompt: "Should not exist" }],
                    }),
            },
        })

        const { POST } = await import("@/app/api/ai/lessons/generate-topic-content/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-topic-content", {
                method: "POST",
                body: JSON.stringify({
                    outline,
                    topicId: "topic-2",
                    text: "This is enough source text for topic generation.",
                }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(502)
        expect(body.error.code).toBe("INVALID_AI_RESPONSE")
        expect(mockLogAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "ai.lesson_topic_content_generate.failed",
                reason: "invalid_ai_payload",
            })
        )
    })

    it("adds curriculum topic constraints to the topic-content prompt", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        topicId: "thai-u01-t01",
                        objectives: ["อธิบายการฟังและจับใจความได้"],
                        sections: [
                            {
                                id: "section-1",
                                heading: "การฟังและจับใจความ",
                                content: "นักเรียนฝึกฟังข้อความแล้วจับประเด็นสำคัญ",
                            },
                        ],
                    }),
            },
        })

        const curriculumOutline: LessonOutlineDraft = {
            title: "แม่แบบบทเรียนอ่านและสื่อสารจากเนื้อหาแกนกลาง",
            topics: [
                { id: "thai-u01-t01", title: "การฟังและจับใจความ", order: 0 },
                { id: "thai-u01-t02", title: "การพูดสื่อสารและอภิปราย", order: 1 },
            ],
        }

        const { POST } = await import("@/app/api/ai/lessons/generate-topic-content/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-topic-content", {
                method: "POST",
                body: JSON.stringify({
                    outline: curriculumOutline,
                    topicId: "thai-u01-t01",
                    text: "ข้อมูลต้นทางเรื่องการฟังและจับใจความ",
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
        expect(body.topicId).toBe("thai-u01-t01")

        const parts = mockGenerateContent.mock.calls[0][0] as Array<{ text?: string }>
        const prompt = parts.at(-1)?.text ?? ""
        expect(prompt).toContain("Allowed learning outcomes for this topic")
        expect(prompt).toContain("stay inside the listed topic and allowed outcomes only")
    })

    it("rejects topic generation when topicId is outside curriculumSelection scope", async () => {
        const curriculumOutline: LessonOutlineDraft = {
            title: "แม่แบบบทเรียนอ่านและสื่อสารจากเนื้อหาแกนกลาง",
            topics: [{ id: "thai-u01-t01", title: "การฟังและจับใจความ", order: 0 }],
        }

        const { POST } = await import("@/app/api/ai/lessons/generate-topic-content/route")
        const res = await POST(
            new Request("http://localhost/api/ai/lessons/generate-topic-content", {
                method: "POST",
                body: JSON.stringify({
                    outline: curriculumOutline,
                    topicId: "thai-u01-t01",
                    text: "ข้อมูลต้นทาง",
                    curriculumSelection: {
                        subjectId: "thai",
                        unitId: "thai-u01",
                        templateId: "thai-master-template-01",
                        topicIds: ["thai-u01-t02"],
                    },
                }),
            })
        )
        const body = await res.json()

        expect(res.status).toBe(400)
        expect(body.error.code).toBe("INVALID_PAYLOAD")
    })
})
