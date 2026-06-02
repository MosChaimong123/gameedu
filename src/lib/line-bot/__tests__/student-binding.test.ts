import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLineBotGroupFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockGetOptionalDbModel = vi.fn();
const mockBindingUpsert = vi.fn();
const mockBindingFindUnique = vi.fn();

vi.mock("@/lib/db", () => ({
    db: {
        lineBotGroup: {
            findUnique: mockLineBotGroupFindUnique,
        },
        student: {
            findUnique: mockStudentFindUnique,
        },
    },
    getOptionalDbModel: mockGetOptionalDbModel,
}));

vi.mock("@/lib/notifications", () => ({
    sendNotification: vi.fn(),
}));

describe("line student binding", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetOptionalDbModel.mockReturnValue({
            upsert: mockBindingUpsert,
            findUnique: mockBindingFindUnique,
        });
        mockBindingUpsert.mockResolvedValue({});
    });

    it("binds a LINE user to a student login code in the bound classroom", async () => {
        mockLineBotGroupFindUnique.mockResolvedValue({
            classroomId: "classroom-1",
            classroom: {
                id: "classroom-1",
                name: "M1/1",
                students: [{ id: "student-1", name: "Somchai", loginCode: "S123" }],
            },
        });

        const { bindLineStudentToStudentCode } = await import("@/lib/line-bot/repository");
        const result = await bindLineStudentToStudentCode({
            lineGroupId: "line-group-1",
            lineUserId: "line-user-1",
            studentCode: "S123",
        });

        expect(result).toEqual({
            ok: true,
            binding: {
                classroomName: "M1/1",
                studentName: "Somchai",
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
                lineUserId: "line-user-1",
                studentId: "student-1",
                studentLoginCode: "S123",
            }),
            update: expect.objectContaining({
                studentId: "student-1",
                studentLoginCode: "S123",
            }),
        });
    });

    it("returns personal missing work for a bound LINE user", async () => {
        mockLineBotGroupFindUnique.mockResolvedValue({
            classroomId: "classroom-1",
            classroom: {
                id: "classroom-1",
                name: "M1/1",
                assignments: [
                    { id: "assignment-1", name: "Homework 1", deadline: null },
                    { id: "assignment-2", name: "Homework 2", deadline: null },
                ],
            },
        });
        mockBindingFindUnique.mockResolvedValue({ studentId: "student-1" });
        mockStudentFindUnique.mockResolvedValue({
            id: "student-1",
            name: "Somchai",
            submissions: [{ assignmentId: "assignment-2" }],
        });

        const { getLineMyWorkSummary } = await import("@/lib/line-bot/repository");
        const result = await getLineMyWorkSummary({
            lineGroupId: "line-group-1",
            lineUserId: "line-user-1",
        });

        expect(result).toEqual({
            ok: true,
            summary: {
                classroomName: "M1/1",
                studentName: "Somchai",
                items: [{ assignmentName: "Homework 1", deadline: null }],
            },
        });
    });

    it("rejects an unknown student login code", async () => {
        mockLineBotGroupFindUnique.mockResolvedValue({
            classroomId: "classroom-1",
            classroom: {
                id: "classroom-1",
                name: "M1/1",
                students: [{ id: "student-1", name: "Somchai", loginCode: "S123" }],
            },
        });

        const { bindLineStudentToStudentCode } = await import("@/lib/line-bot/repository");
        const result = await bindLineStudentToStudentCode({
            lineGroupId: "line-group-1",
            lineUserId: "line-user-1",
            studentCode: "BADCODE",
        });

        expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
        expect(mockBindingUpsert).not.toHaveBeenCalled();
    });

    it("asks the LINE user to bind before returning personal work", async () => {
        mockLineBotGroupFindUnique.mockResolvedValue({
            classroomId: "classroom-1",
            classroom: {
                id: "classroom-1",
                name: "M1/1",
                assignments: [{ id: "assignment-1", name: "Homework 1", deadline: null }],
            },
        });
        mockBindingFindUnique.mockResolvedValue(null);

        const { getLineMyWorkSummary } = await import("@/lib/line-bot/repository");
        const result = await getLineMyWorkSummary({
            lineGroupId: "line-group-1",
            lineUserId: "line-user-1",
        });

        expect(result).toEqual({ ok: false, reason: "NOT_BOUND" });
        expect(mockStudentFindUnique).not.toHaveBeenCalled();
    });
});
