import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockLessonFindUnique = vi.fn();
const mockLessonAssignmentFindMany = vi.fn();
const mockLessonAssignmentUpsert = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        classroom: {
            findUnique: mockClassroomFindUnique,
        },
        student: {
            findFirst: mockStudentFindFirst,
        },
        lesson: {
            findUnique: mockLessonFindUnique,
        },
        lessonAssignment: {
            findMany: mockLessonAssignmentFindMany,
            upsert: mockLessonAssignmentUpsert,
        },
    },
}));

describe("classroom lesson assignment routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1" });
        mockStudentFindFirst.mockResolvedValue({ id: "student-1" });
        mockLessonFindUnique.mockResolvedValue({ ownerUserId: "teacher-1", status: "PUBLISHED" });
        mockLessonAssignmentFindMany.mockResolvedValue([]);
        mockLessonAssignmentUpsert.mockResolvedValue({
            id: "assignment-1",
            lessonId: "lesson-1",
            classId: "class-1",
        });
    });

    it("returns teacher classroom assignments for the owning teacher", async () => {
        const { GET } = await import("@/app/api/classrooms/[id]/lessons/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        expect(res.status).toBe(200);
        expect(mockLessonAssignmentFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { classId: "class-1" },
                orderBy: { assignedAt: "asc" },
            })
        );
    });

    it("returns only published classroom assignments for student members", async () => {
        mockAuth.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } });

        const { GET } = await import("@/app/api/classrooms/[id]/lessons/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        expect(res.status).toBe(200);
        expect(mockStudentFindFirst).toHaveBeenCalledWith({
            where: { classId: "class-1", userId: "student-user-1" },
            select: { id: true },
        });
        expect(mockLessonAssignmentFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { classId: "class-1", lesson: { status: "PUBLISHED" } },
            })
        );
    });

    it("blocks assigning a lesson to a classroom owned by another teacher", async () => {
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-2" });

        const { POST } = await import("@/app/api/classrooms/[id]/lessons/route");
        const res = await POST(
            new Request("http://localhost/api/classrooms/class-1/lessons", {
                method: "POST",
                body: JSON.stringify({ lessonId: "lesson-1" }),
            }),
            { params: Promise.resolve({ id: "class-1" }) }
        );

        expect(res.status).toBe(403);
        expect(mockLessonAssignmentUpsert).not.toHaveBeenCalled();
    });

    it("rejects draft lessons before classroom assignment", async () => {
        mockLessonFindUnique.mockResolvedValue({ ownerUserId: "teacher-1", status: "DRAFT" });

        const { POST } = await import("@/app/api/classrooms/[id]/lessons/route");
        const res = await POST(
            new Request("http://localhost/api/classrooms/class-1/lessons", {
                method: "POST",
                body: JSON.stringify({ lessonId: "lesson-1" }),
            }),
            { params: Promise.resolve({ id: "class-1" }) }
        );
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error.code).toBe("INVALID_PAYLOAD");
        expect(mockLessonAssignmentUpsert).not.toHaveBeenCalled();
    });

    it("upserts a published lesson assignment", async () => {
        const { POST } = await import("@/app/api/classrooms/[id]/lessons/route");
        const res = await POST(
            new Request("http://localhost/api/classrooms/class-1/lessons", {
                method: "POST",
                body: JSON.stringify({ lessonId: "lesson-1" }),
            }),
            { params: Promise.resolve({ id: "class-1" }) }
        );

        expect(res.status).toBe(201);
        expect(mockLessonAssignmentUpsert).toHaveBeenCalledWith({
            where: { lessonId_classId: { lessonId: "lesson-1", classId: "class-1" } },
            create: { lessonId: "lesson-1", classId: "class-1" },
            update: {},
        });
    });
});
