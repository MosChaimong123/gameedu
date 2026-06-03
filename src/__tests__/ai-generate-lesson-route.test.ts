import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockGenerateContent = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockConsumeRateLimitWithStore = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: vi.fn().mockImplementation(function GoogleGenerativeAI() {
        return {
            getGenerativeModel: vi.fn().mockReturnValue({
                generateContent: mockGenerateContent,
            }),
        };
    }),
}));

vi.mock("@/lib/security/audit-log", () => ({
    logAuditEvent: mockLogAuditEvent,
}));

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
    return {
        ...actual,
        consumeRateLimitWithStore: mockConsumeRateLimitWithStore,
    };
});

describe("POST /api/ai/generate-lesson", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GEMINI_API_KEY = "test-key";
        mockAuth.mockResolvedValue({
            user: {
                id: "teacher-1",
                role: "TEACHER",
                plan: "PLUS",
                planStatus: "ACTIVE",
                planExpiry: null,
            },
        });
        mockConsumeRateLimitWithStore.mockResolvedValue({
            allowed: true,
            remaining: 4,
            resetAt: new Date("2026-06-03T00:00:00.000Z"),
            retryAfterSeconds: 0,
        });
    });

    afterEach(() => {
        delete process.env.GEMINI_API_KEY;
    });

    it("returns INVALID_AI_RESPONSE when Gemini returns invalid JSON", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => "not json",
            },
        });

        const { POST } = await import("@/app/api/ai/generate-lesson/route");
        const res = await POST(
            new Request("http://localhost/api/ai/generate-lesson", {
                method: "POST",
                body: JSON.stringify({ text: "This is enough curriculum text for lesson generation." }),
            })
        );
        const body = await res.json();

        expect(res.status).toBe(502);
        expect(body.error.code).toBe("INVALID_AI_RESPONSE");
        expect(mockLogAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "ai.lesson_generate.failed",
                reason: "invalid_ai_json",
            })
        );
    });

    it("normalizes a valid generated lesson response", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        title: "Lesson 1",
                        content: {
                            objectives: ["Understand the topic"],
                            sections: [
                                {
                                    heading: "Intro",
                                    content: "Main explanation",
                                    examples: [{ title: "Example", body: "Example body" }],
                                },
                            ],
                            keyTerms: [{ term: "Term", definition: "Definition" }],
                            summary: "Summary",
                            estimatedMinutes: 30,
                        },
                    }),
            },
        });

        const { POST } = await import("@/app/api/ai/generate-lesson/route");
        const res = await POST(
            new Request("http://localhost/api/ai/generate-lesson", {
                method: "POST",
                body: JSON.stringify({ text: "This is enough curriculum text for lesson generation." }),
            })
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            title: "Lesson 1",
            content: {
                sections: [
                    {
                        id: "s1",
                        heading: "Intro",
                    },
                ],
            },
        });
    });
});
