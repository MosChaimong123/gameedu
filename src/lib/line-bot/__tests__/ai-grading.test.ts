import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateContent = vi.fn();

vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: class {
        getGenerativeModel() {
            return {
                generateContent: mockGenerateContent,
            };
        }
    },
}));

describe("line-bot AI preliminary grading", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("GEMINI_API_KEY", "test-key");
    });

    it("returns unavailable when GEMINI_API_KEY is missing", async () => {
        vi.stubEnv("GEMINI_API_KEY", "");

        const { gradeLineTextSubmissionWithAi } = await import("@/lib/line-bot/ai-grading");
        const result = await gradeLineTextSubmissionWithAi({
            assignmentName: "Homework 1",
            maxScore: 10,
            studentAnswer: "Answer",
        });

        expect(result).toEqual({ status: "unavailable", reason: "missing_api_key" });
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("normalizes Gemini JSON grading output", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => JSON.stringify({
                    suggestedScore: 99,
                    confidence: "high",
                    feedback: "ตรวจเบื้องต้นแล้ว",
                }),
            },
        });

        const { gradeLineTextSubmissionWithAi } = await import("@/lib/line-bot/ai-grading");
        const result = await gradeLineTextSubmissionWithAi({
            assignmentName: "Homework 1",
            assignmentDescription: "Explain briefly",
            maxScore: 10,
            studentAnswer: "Answer",
        });

        expect(result).toEqual({
            status: "graded",
            suggestedScore: 10,
            maxScore: 10,
            confidence: "high",
            feedback: "ตรวจเบื้องต้นแล้ว",
        });
        expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining("Homework 1"));
    });
});
