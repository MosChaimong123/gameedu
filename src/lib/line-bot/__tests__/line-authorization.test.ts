import { beforeEach, describe, expect, it, vi } from "vitest";

const studentFindMany = vi.fn();
const teacherFindUnique = vi.fn();
const isTeacherAuthorized = vi.fn();

vi.mock("@/lib/db", () => ({
    db: { lineStudentAccountLink: { findMany: studentFindMany } },
    getOptionalDbModel: () => ({ findUnique: teacherFindUnique }),
}));

vi.mock("@/lib/line-bot/teacher-linking", () => ({
    isLineTeacherAuthorizedForGroup: isTeacherAuthorized,
}));

describe("LINE actor authorization", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        teacherFindUnique.mockResolvedValue(null);
        studentFindMany.mockResolvedValue([]);
    });

    it("resolves public, student, and teacher identities", async () => {
        const { resolveLineActor } = await import("@/lib/line-bot/line-authorization");
        await expect(resolveLineActor("public")).resolves.toEqual({
            kind: "public",
            lineUserId: "public",
        });
        studentFindMany.mockResolvedValue([
            { userId: "user-1", studentId: "student-1", classroomId: "class-1" },
        ]);
        await expect(resolveLineActor("student")).resolves.toMatchObject({ kind: "student" });
        teacherFindUnique.mockResolvedValue({ userId: "teacher-1" });
        await expect(resolveLineActor("teacher")).resolves.toEqual({
            kind: "teacher",
            lineUserId: "teacher",
            userId: "teacher-1",
        });
    });

    it("allows group mutations only for a verified, classroom-authorized teacher", async () => {
        const { authorizeLineCapability } = await import(
            "@/lib/line-bot/line-authorization"
        );
        await expect(
            authorizeLineCapability({
                actor: { kind: "public", lineUserId: "public" },
                capability: "line.assignment.create",
                lineGroupId: "group-1",
            })
        ).resolves.toBe(false);
        isTeacherAuthorized.mockResolvedValue(true);
        await expect(
            authorizeLineCapability({
                actor: { kind: "teacher", lineUserId: "teacher", userId: "teacher-1" },
                capability: "line.assignment.create",
                lineGroupId: "group-1",
            })
        ).resolves.toBe(true);
    });
});
