import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockLessonFindUnique = vi.fn();
const mockLessonUpdate = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockLessonAssignmentFindFirst = vi.fn();
const mockGenerateContent = vi.fn();
const mockConsumeRateLimitWithStore = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        lesson: {
            findUnique: mockLessonFindUnique,
            update: mockLessonUpdate,
        },
        student: {
            findFirst: mockStudentFindFirst,
        },
        lessonAssignment: {
            findFirst: mockLessonAssignmentFindFirst,
        },
    },
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

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
    return {
        ...actual,
        consumeRateLimitWithStore: mockConsumeRateLimitWithStore,
    };
});

vi.mock("@/lib/security/audit-log", () => ({
    logAuditEvent: mockLogAuditEvent,
}));

const lessonContent = {
    objectives: ["Understand fields"],
    sections: [{ id: "s1", heading: "Intro", content: "Electric field content", examples: [] }],
    keyTerms: [{ term: "Field", definition: "Force per charge" }],
    summary: "Summary",
    estimatedMinutes: 30,
};

const quizDraft = {
    questions: [
        {
            id: "q-1",
            question: "What is a field?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Because A",
        },
    ],
};

describe("lesson quiz routes", () => {
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
            remaining: 9,
            resetAt: new Date("2026-06-03T00:00:00.000Z"),
            retryAfterSeconds: 0,
        });
        mockLessonFindUnique.mockResolvedValue({
            id: "lesson-1",
            title: "Physics",
            ownerUserId: "teacher-1",
            content: lessonContent,
        });
        mockLessonUpdate.mockResolvedValue({});
        mockStudentFindFirst.mockResolvedValue({ id: "student-1", classId: "class-1" });
        mockLessonAssignmentFindFirst.mockResolvedValue({
            id: "lesson-assignment-1",
            lesson: { content: { ...lessonContent, quizDraft } },
        });
    });

    it("generates and stores a teacher lesson quiz draft", async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify([
                        {
                            question: "What is a field?",
                            options: ["A", "B", "C", "D"],
                            correctAnswer: 0,
                            explanation: "Because A",
                        },
                    ]),
            },
        });

        const { POST } = await import("@/app/api/lessons/[id]/quiz/generate/route");
        const response = await POST(
            new Request("http://localhost/api/lessons/lesson-1/quiz/generate", {
                method: "POST",
                body: JSON.stringify({ count: 5 }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.questions).toHaveLength(1);
        expect(mockLessonUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "lesson-1" },
                data: expect.objectContaining({
                    content: expect.objectContaining({
                        quizDraft: expect.objectContaining({
                            questions: expect.arrayContaining([
                                expect.objectContaining({ question: "What is a field?", correctAnswer: 0 }),
                            ]),
                        }),
                    }),
                }),
            })
        );
    });

    it("returns the stored quiz draft for a student lesson", async () => {
        const { POST } = await import("@/app/api/student/[code]/lessons/[lessonId]/quiz/route");
        const response = await POST(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123", lessonId: "lesson-1" }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual(quizDraft.questions);
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("returns QUIZ_NOT_READY when the lesson has no stored quiz draft", async () => {
        mockLessonAssignmentFindFirst.mockResolvedValue({
            id: "lesson-assignment-1",
            lesson: { content: lessonContent },
        });

        const { POST } = await import("@/app/api/student/[code]/lessons/[lessonId]/quiz/route");
        const response = await POST(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123", lessonId: "lesson-1" }),
        });
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.error).toBe("QUIZ_NOT_READY");
    });
});
