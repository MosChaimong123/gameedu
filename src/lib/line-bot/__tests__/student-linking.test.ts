import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStudentFindFirst = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockAccountLinkFindUnique = vi.fn();
const mockAccountLinkDeleteMany = vi.fn();
const mockAccountLinkCreate = vi.fn();
const mockLinkCodeFindFirst = vi.fn();
const mockLinkCodeCreate = vi.fn();
const mockLinkCodeFindUnique = vi.fn();
const mockLinkCodeUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockGetOptionalDbModel = vi.fn();
const mockBindingDeleteMany = vi.fn();
const mockBindingUpsert = vi.fn();

vi.mock("@/lib/db", () => ({
    db: {
        student: {
            findFirst: mockStudentFindFirst,
            findUnique: mockStudentFindUnique,
        },
        lineStudentAccountLink: {
            findUnique: mockAccountLinkFindUnique,
            deleteMany: mockAccountLinkDeleteMany,
            create: mockAccountLinkCreate,
        },
        lineStudentLinkCode: {
            findFirst: mockLinkCodeFindFirst,
            create: mockLinkCodeCreate,
            findUnique: mockLinkCodeFindUnique,
            update: mockLinkCodeUpdate,
        },
        $transaction: mockTransaction,
    },
    getOptionalDbModel: mockGetOptionalDbModel,
}));

describe("student LINE self-linking", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
            const tx = {
                lineStudentAccountLink: {
                    deleteMany: mockAccountLinkDeleteMany,
                    create: mockAccountLinkCreate,
                },
                lineStudentLinkCode: {
                    update: mockLinkCodeUpdate,
                },
            };
            return callback(tx);
        });
        mockGetOptionalDbModel.mockReturnValue({
            deleteMany: mockBindingDeleteMany,
            upsert: mockBindingUpsert,
        });
    });

    it("returns an existing active code for the linked-in student owner", async () => {
        mockStudentFindFirst.mockResolvedValue({
            id: "student-1",
            name: "Somchai",
            loginCode: "S12345",
            userId: "user-1",
            classroom: { id: "classroom-1", name: "M1/1" },
        });
        mockAccountLinkFindUnique.mockResolvedValue(null);
        mockLinkCodeFindFirst.mockResolvedValue({
            code: "483921",
            expiresAt: new Date("2026-06-03T13:10:00.000Z"),
        });

        const { getStudentLineLinkSnapshot } = await import("@/lib/line-bot/student-linking");
        const result = await getStudentLineLinkSnapshot({
            userId: "user-1",
            loginCode: "S12345",
            now: new Date("2026-06-03T13:00:00.000Z"),
        });

        expect(result).toEqual({
            ok: true,
            snapshot: {
                linked: false,
                studentName: "Somchai",
                classroomName: "M1/1",
                code: "483921",
                commandText: "เชื่อม 483921",
                expiresAt: "2026-06-03T13:10:00.000Z",
            },
        });
    });

    it("returns linked status when LINE is already connected", async () => {
        mockStudentFindFirst.mockResolvedValue({
            id: "student-1",
            name: "Somchai",
            loginCode: "S12345",
            userId: "user-1",
            classroom: { id: "classroom-1", name: "M1/1" },
        });
        mockAccountLinkFindUnique.mockResolvedValue({
            createdAt: new Date("2026-06-03T12:55:00.000Z"),
        });

        const { getStudentLineLinkSnapshot } = await import("@/lib/line-bot/student-linking");
        const result = await getStudentLineLinkSnapshot({
            userId: "user-1",
            loginCode: "S12345",
            now: new Date("2026-06-03T13:00:00.000Z"),
        });

        expect(result).toEqual({
            ok: true,
            snapshot: {
                linked: true,
                studentName: "Somchai",
                classroomName: "M1/1",
                linkedAt: "2026-06-03T12:55:00.000Z",
            },
        });
    });

    it("consumes a valid link code and creates account + binding records", async () => {
        mockLinkCodeFindUnique.mockResolvedValue({
            id: "code-1",
            userId: "user-1",
            studentId: "student-1",
            classroomId: "classroom-1",
            studentLoginCode: "S12345",
            expiresAt: new Date("2026-06-03T13:10:00.000Z"),
            consumedAt: null,
        });
        mockStudentFindUnique.mockResolvedValue({
            id: "student-1",
            name: "Somchai",
            classroom: { id: "classroom-1", name: "M1/1" },
        });
        mockAccountLinkDeleteMany.mockResolvedValue({ count: 0 });
        mockAccountLinkCreate.mockResolvedValue({});
        mockLinkCodeUpdate.mockResolvedValue({});
        mockBindingDeleteMany.mockResolvedValue({ count: 0 });
        mockBindingUpsert.mockResolvedValue({});

        const { consumeStudentLineLinkCode } = await import("@/lib/line-bot/student-linking");
        const result = await consumeStudentLineLinkCode({
            lineUserId: "line-user-1",
            code: "483921",
            now: new Date("2026-06-03T13:00:00.000Z"),
        });

        expect(result).toEqual({
            ok: true,
            link: {
                studentName: "Somchai",
                classroomName: "M1/1",
                linkedAt: "2026-06-03T13:00:00.000Z",
            },
        });
        expect(mockAccountLinkCreate).toHaveBeenCalledWith({
            data: {
                userId: "user-1",
                studentId: "student-1",
                classroomId: "classroom-1",
                lineUserId: "line-user-1",
                studentLoginCode: "S12345",
            },
        });
        expect(mockBindingUpsert).toHaveBeenCalledWith({
            where: {
                lineUserId_classroomId: {
                    lineUserId: "line-user-1",
                    classroomId: "classroom-1",
                },
            },
            create: expect.objectContaining({
                lineGroupId: "direct:line-user-1",
                studentId: "student-1",
            }),
            update: expect.objectContaining({
                lineGroupId: "direct:line-user-1",
                studentId: "student-1",
            }),
        });
    });

    it("rejects expired or unknown codes", async () => {
        mockLinkCodeFindUnique.mockResolvedValue({
            id: "code-1",
            userId: "user-1",
            studentId: "student-1",
            classroomId: "classroom-1",
            studentLoginCode: "S12345",
            expiresAt: new Date("2026-06-03T12:59:00.000Z"),
            consumedAt: null,
        });

        const { consumeStudentLineLinkCode } = await import("@/lib/line-bot/student-linking");
        const result = await consumeStudentLineLinkCode({
            lineUserId: "line-user-1",
            code: "483921",
            now: new Date("2026-06-03T13:00:00.000Z"),
        });

        expect(result).toEqual({ ok: false, reason: "EXPIRED" });
        expect(mockAccountLinkCreate).not.toHaveBeenCalled();
    });
});
