import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStudentFindFirst = vi.fn();
const mockLessonAssignmentFindMany = vi.fn();
const mockLessonAssignmentFindUnique = vi.fn();
const mockLessonCompletionFindUnique = vi.fn();
const mockLessonCompletionUpsert = vi.fn();
const mockStudentUpdate = vi.fn();
const mockSendNotification = vi.fn();

vi.mock("@/lib/db", () => ({
    db: {
        student: {
            findFirst: mockStudentFindFirst,
            update: mockStudentUpdate,
        },
        lessonAssignment: {
            findMany: mockLessonAssignmentFindMany,
            findUnique: mockLessonAssignmentFindUnique,
        },
        lessonCompletion: {
            findUnique: mockLessonCompletionFindUnique,
            upsert: mockLessonCompletionUpsert,
        },
    },
}));

vi.mock("@/lib/notifications", () => ({
    sendNotification: mockSendNotification,
}));

describe("student lessons routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStudentFindFirst.mockResolvedValue({ id: "student-1", classId: "class-1" });
        mockLessonAssignmentFindMany.mockResolvedValue([]);
        mockLessonAssignmentFindUnique.mockResolvedValue({
            id: "lesson-assignment-1",
            lesson: { status: "PUBLISHED", title: "Lesson 1" },
            completions: [],
        });
        mockLessonCompletionFindUnique.mockResolvedValue(null);
        mockLessonCompletionUpsert.mockResolvedValue({
            id: "completion-1",
            lessonAssignmentId: "lesson-assignment-1",
            studentId: "student-1",
            quizScore: 90,
        });
        mockStudentUpdate.mockResolvedValue({});
        mockSendNotification.mockResolvedValue(undefined);
    });

    it("lists published student lessons using login-code variants", async () => {
        const { GET } = await import("@/app/api/student/[code]/lessons/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123" }),
        });

        expect(res.status).toBe(200);
        expect(mockStudentFindFirst).toHaveBeenCalledWith({
            where: {
                OR: [{ loginCode: "abc123" }, { loginCode: "ABC123" }],
            },
            select: { id: true, classId: true },
        });
        expect(mockLessonAssignmentFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    classId: "class-1",
                    lesson: { status: "PUBLISHED" },
                },
            })
        );
    });

    it("returns one assigned published lesson for the student", async () => {
        const { GET } = await import("@/app/api/student/[code]/lessons/[lessonId]/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ code: "abc123", lessonId: "lesson-1" }),
        });

        expect(res.status).toBe(200);
        expect(mockLessonAssignmentFindUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { lessonId_classId: { lessonId: "lesson-1", classId: "class-1" } },
            })
        );
    });

    it("completes a lesson and awards only on first completion", async () => {
        const { POST } = await import("@/app/api/student/[code]/lessons/[lessonId]/complete/route");
        const res = await POST(
            new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({ quizScore: 90 }),
            }),
            {
                params: Promise.resolve({ code: "abc123", lessonId: "lesson-1" }),
            }
        );
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.reward).toEqual({ xp: 5, gold: 20 });
        expect(mockLessonCompletionUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ quizScore: 90 }),
            })
        );
        expect(mockStudentUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "student-1" },
                data: expect.objectContaining({
                    behaviorPoints: { increment: 5 },
                    gold: { increment: 20 },
                }),
            })
        );
        expect(mockSendNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                studentId: "student-1",
                link: "/student/abc123",
            })
        );
    });

    it("does not award again for an existing completion", async () => {
        mockLessonCompletionFindUnique.mockResolvedValue({ id: "completion-1" });

        const { POST } = await import("@/app/api/student/[code]/lessons/[lessonId]/complete/route");
        const res = await POST(
            new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({ quizScore: 90 }),
            }),
            {
                params: Promise.resolve({ code: "abc123", lessonId: "lesson-1" }),
            }
        );
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.reward).toBeNull();
        expect(mockStudentUpdate).not.toHaveBeenCalled();
        expect(mockSendNotification).not.toHaveBeenCalled();
    });
});
