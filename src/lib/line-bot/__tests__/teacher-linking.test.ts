import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCodeFindFirst = vi.fn();
const mockCodeFindUnique = vi.fn();
const mockCodeCreate = vi.fn();
const mockCodeUpdate = vi.fn();
const mockCodeUpdateMany = vi.fn();
const mockLinkFindUnique = vi.fn();
const mockLinkUpsert = vi.fn();
const mockUserFindUnique = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockGroupFindUnique = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/db", () => ({
    db: {
        user: { findUnique: mockUserFindUnique },
        classroom: { findUnique: mockClassroomFindUnique },
        lineBotGroup: { findUnique: mockGroupFindUnique },
        $transaction: mockTransaction,
    },
    getOptionalDbModel: (name: string) => {
        if (name === "lineTeacherLinkCode") {
            return {
                findFirst: mockCodeFindFirst,
                findUnique: mockCodeFindUnique,
                create: mockCodeCreate,
                update: mockCodeUpdate,
                updateMany: mockCodeUpdateMany,
            };
        }
        if (name === "lineTeacherAccountLink") {
            return { findUnique: mockLinkFindUnique, upsert: mockLinkUpsert };
        }
        return null;
    },
}));

describe("LINE teacher linking", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCodeFindFirst.mockResolvedValue(null);
        mockCodeCreate.mockImplementation(({ data }: { data: { code: string; expiresAt: Date } }) =>
            Promise.resolve({ code: data.code, expiresAt: data.expiresAt })
        );
        mockCodeUpdate.mockResolvedValue({});
        mockCodeUpdateMany.mockResolvedValue({ count: 1 });
        mockLinkFindUnique.mockResolvedValue(null);
        mockLinkUpsert.mockResolvedValue({});
        mockUserFindUnique.mockResolvedValue({ id: "teacher-1", name: "Teacher A", role: "TEACHER" });
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", name: "M1/1", teacherId: "teacher-1" });
        mockGroupFindUnique.mockResolvedValue({ classroomId: "class-1" });
        mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
            callback({
                lineTeacherLinkCode: { updateMany: mockCodeUpdateMany },
                lineTeacherAccountLink: { upsert: mockLinkUpsert },
            })
        );
    });

    it("issues an opaque code and reuses an active code for the same teacher and classroom", async () => {
        const { getOrCreateTeacherLineLinkCode } = await import("@/lib/line-bot/teacher-linking");
        const now = new Date("2026-07-27T10:00:00.000Z");
        const created = await getOrCreateTeacherLineLinkCode({ userId: "teacher-1", classroomId: "class-1", now });

        expect(created?.code).toMatch(/^[A-Za-z0-9_-]{20,}$/);
        expect(created?.expiresAt.toISOString()).toBe("2026-07-27T10:10:00.000Z");

        mockCodeFindFirst.mockResolvedValue({ code: "existing-code", expiresAt: new Date("2026-07-27T10:05:00.000Z") });
        const reused = await getOrCreateTeacherLineLinkCode({ userId: "teacher-1", classroomId: "class-1", now });
        expect(reused?.code).toBe("existing-code");
    });

    it("consumes a valid code only for the teacher who owns its classroom", async () => {
        mockCodeFindUnique.mockResolvedValue({
            id: "code-1",
            userId: "teacher-1",
            classroomId: "class-1",
            code: "opaque-code",
            expiresAt: new Date("2026-07-27T10:10:00.000Z"),
            consumedAt: null,
        });
        const { consumeTeacherLineLinkCode } = await import("@/lib/line-bot/teacher-linking");
        const result = await consumeTeacherLineLinkCode({
            lineUserId: "line-teacher-1",
            code: "opaque-code",
            now: new Date("2026-07-27T10:00:00.000Z"),
        });

        expect(result).toEqual({ ok: true, teacherName: "Teacher A", classroomName: "M1/1" });
        expect(mockLinkUpsert).toHaveBeenCalledWith({
            where: { userId: "teacher-1" },
            create: { userId: "teacher-1", lineUserId: "line-teacher-1" },
            update: { lineUserId: "line-teacher-1" },
        });
        expect(mockCodeUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ id: "code-1", consumedAt: null }),
        }));
    });

    it("rejects reuse of a LINE identity linked to another teacher", async () => {
        mockCodeFindUnique.mockResolvedValue({
            id: "code-1",
            userId: "teacher-1",
            classroomId: "class-1",
            code: "opaque-code",
            expiresAt: new Date("2026-07-27T10:10:00.000Z"),
            consumedAt: null,
        });
        mockLinkFindUnique.mockResolvedValue({ userId: "teacher-2", lineUserId: "line-teacher-1" });
        const { consumeTeacherLineLinkCode } = await import("@/lib/line-bot/teacher-linking");
        const result = await consumeTeacherLineLinkCode({
            lineUserId: "line-teacher-1",
            code: "opaque-code",
            now: new Date("2026-07-27T10:00:00.000Z"),
        });

        expect(result).toEqual({ ok: false, reason: "CONFLICT" });
        expect(mockLinkUpsert).not.toHaveBeenCalled();
    });

    it("does not link a second concurrent teacher consume after the atomic claim loses", async () => {
        mockCodeFindUnique.mockResolvedValue({
            id: "code-1", userId: "teacher-1", classroomId: "class-1", code: "opaque-code",
            expiresAt: new Date("2026-07-27T10:10:00.000Z"), consumedAt: null,
        });
        mockCodeUpdateMany.mockResolvedValue({ count: 0 });
        const { consumeTeacherLineLinkCode } = await import("@/lib/line-bot/teacher-linking");
        await expect(consumeTeacherLineLinkCode({ lineUserId: "line-teacher-2", code: "opaque-code", now: new Date("2026-07-27T10:00:00.000Z") })).resolves.toEqual({ ok: false, reason: "EXPIRED" });
        expect(mockLinkUpsert).not.toHaveBeenCalled();
    });

    it("authorizes only a verified teacher who owns the bound classroom", async () => {
        mockLinkFindUnique.mockResolvedValue({ userId: "teacher-1", lineUserId: "line-teacher-1" });
        const { isLineTeacherAuthorizedForGroup } = await import("@/lib/line-bot/teacher-linking");
        await expect(
            isLineTeacherAuthorizedForGroup({ lineUserId: "line-teacher-1", lineGroupId: "line-group-1" })
        ).resolves.toBe(true);

        mockClassroomFindUnique.mockResolvedValue({ teacherId: "teacher-2" });
        await expect(
            isLineTeacherAuthorizedForGroup({ lineUserId: "line-teacher-1", lineGroupId: "line-group-1" })
        ).resolves.toBe(false);
    });
});
