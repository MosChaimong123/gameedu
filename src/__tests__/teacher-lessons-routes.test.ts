import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockLessonFindMany = vi.fn();
const mockLessonCreate = vi.fn();
const mockLessonFindUnique = vi.fn();
const mockLessonUpdate = vi.fn();
const mockLessonDelete = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        lesson: {
            findMany: mockLessonFindMany,
            create: mockLessonCreate,
            findUnique: mockLessonFindUnique,
            update: mockLessonUpdate,
            delete: mockLessonDelete,
        },
    },
}));

const validContent = {
    objectives: ["Understand the topic"],
    sections: [
        {
            id: "s1",
            heading: "Intro",
            content: "Main explanation",
            examples: [{ title: "Example", body: "Example body" }],
        },
    ],
    keyTerms: [{ term: "Term", definition: "Definition" }],
    summary: "Summary",
    estimatedMinutes: 30,
};

describe("teacher lesson CRUD routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockLessonFindMany.mockResolvedValue([]);
        mockLessonCreate.mockResolvedValue({ id: "lesson-1", title: "Physics", status: "DRAFT" });
        mockLessonFindUnique.mockResolvedValue({ id: "lesson-1", ownerUserId: "teacher-1" });
        mockLessonUpdate.mockResolvedValue({ id: "lesson-1", title: "Updated", status: "PUBLISHED" });
        mockLessonDelete.mockResolvedValue({});
    });

    it("scopes lesson list to the signed-in teacher", async () => {
        const { GET } = await import("@/app/api/lessons/route");
        const res = await GET();

        expect(res.status).toBe(200);
        expect(mockLessonFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { ownerUserId: "teacher-1" },
                orderBy: { createdAt: "desc" },
            })
        );
    });

    it("creates a draft lesson with validated content and trimmed fields", async () => {
        const { POST } = await import("@/app/api/lessons/route");
        const res = await POST(
            new Request("http://localhost/api/lessons", {
                method: "POST",
                body: JSON.stringify({
                    title: "  Physics  ",
                    subject: " Science ",
                    gradeLevel: " M5 ",
                    description: "  Lesson intro  ",
                    sourceFileName: " worksheet.pdf ",
                    content: validContent,
                }),
            })
        );

        expect(res.status).toBe(201);
        expect(mockLessonCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                title: "Physics",
                subject: "Science",
                gradeLevel: "M5",
                description: "Lesson intro",
                sourceFileName: "worksheet.pdf",
                status: "DRAFT",
                ownerUserId: "teacher-1",
                content: validContent,
            }),
        });
    });

    it("rejects invalid lesson content on create and update", async () => {
        const listRoute = await import("@/app/api/lessons/route");
        const createRes = await listRoute.POST(
            new Request("http://localhost/api/lessons", {
                method: "POST",
                body: JSON.stringify({ title: "Physics", content: { sections: [] } }),
            })
        );

        const itemRoute = await import("@/app/api/lessons/[id]/route");
        const patchRes = await itemRoute.PATCH(
            new Request("http://localhost/api/lessons/lesson-1", {
                method: "PATCH",
                body: JSON.stringify({ content: { sections: [] } }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );

        expect(createRes.status).toBe(400);
        expect(patchRes.status).toBe(400);
        expect(mockLessonCreate).not.toHaveBeenCalled();
        expect(mockLessonUpdate).not.toHaveBeenCalled();
    });

    it("blocks students from teacher lesson routes", async () => {
        mockAuth.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } });

        const { POST } = await import("@/app/api/lessons/route");
        const res = await POST(
            new Request("http://localhost/api/lessons", {
                method: "POST",
                body: JSON.stringify({ title: "Physics", content: validContent }),
            })
        );

        expect(res.status).toBe(403);
        expect(mockLessonCreate).not.toHaveBeenCalled();
    });

    it("prevents editing another teacher's lesson", async () => {
        mockLessonFindUnique.mockResolvedValue({ ownerUserId: "teacher-2" });

        const { PATCH } = await import("@/app/api/lessons/[id]/route");
        const res = await PATCH(
            new Request("http://localhost/api/lessons/lesson-1", {
                method: "PATCH",
                body: JSON.stringify({ title: "Updated" }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );

        expect(res.status).toBe(403);
        expect(mockLessonUpdate).not.toHaveBeenCalled();
    });

    it("updates publish status and deletes owned lessons", async () => {
        const { PATCH, DELETE } = await import("@/app/api/lessons/[id]/route");
        const patchRes = await PATCH(
            new Request("http://localhost/api/lessons/lesson-1", {
                method: "PATCH",
                body: JSON.stringify({ title: " Updated ", status: "PUBLISHED", content: validContent }),
            }),
            { params: Promise.resolve({ id: "lesson-1" }) }
        );
        const deleteRes = await DELETE(new Request("http://localhost/api/lessons/lesson-1"), {
            params: Promise.resolve({ id: "lesson-1" }),
        });

        expect(patchRes.status).toBe(200);
        expect(deleteRes.status).toBe(204);
        expect(mockLessonUpdate).toHaveBeenCalledWith({
            where: { id: "lesson-1" },
            data: expect.objectContaining({ title: "Updated", status: "PUBLISHED", content: validContent }),
        });
        expect(mockLessonDelete).toHaveBeenCalledWith({ where: { id: "lesson-1" } });
    });
});
