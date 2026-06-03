import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockLineStudentAccountLinkDeleteMany = vi.fn();
const mockLineStudentBindingDeleteMany = vi.fn();
const mockGetOptionalDbModel = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        classroom: {
            findUnique: mockClassroomFindUnique,
        },
        student: {
            findUnique: mockStudentFindUnique,
        },
        lineStudentAccountLink: {
            deleteMany: mockLineStudentAccountLinkDeleteMany,
        },
    },
    getOptionalDbModel: mockGetOptionalDbModel,
}));

vi.mock("@/lib/security/audit-log", () => ({
    logAuditEvent: mockLogAuditEvent,
}));

describe("DELETE /api/classrooms/[id]/students/[studentId]/line-link", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1" });
        mockStudentFindUnique.mockResolvedValue({ id: "student-1", classId: "class-1", name: "Somchai" });
        mockLineStudentAccountLinkDeleteMany.mockResolvedValue({ count: 1 });
        mockLineStudentBindingDeleteMany.mockResolvedValue({ count: 1 });
        mockGetOptionalDbModel.mockReturnValue({
            deleteMany: mockLineStudentBindingDeleteMany,
        });
    });

    it("rejects unauthenticated requests", async () => {
        mockAuth.mockResolvedValue(null);

        const { DELETE } = await import("@/app/api/classrooms/[id]/students/[studentId]/line-link/route");
        const res = await DELETE(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", studentId: "student-1" }),
        });

        expect(res.status).toBe(401);
        expect(mockLineStudentAccountLinkDeleteMany).not.toHaveBeenCalled();
    });

    it("rejects classrooms owned by another teacher", async () => {
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-2" });

        const { DELETE } = await import("@/app/api/classrooms/[id]/students/[studentId]/line-link/route");
        const res = await DELETE(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", studentId: "student-1" }),
        });

        expect(res.status).toBe(403);
        expect(mockLineStudentAccountLinkDeleteMany).not.toHaveBeenCalled();
    });

    it("deletes account links and LINE group bindings for the student", async () => {
        const { DELETE } = await import("@/app/api/classrooms/[id]/students/[studentId]/line-link/route");
        const res = await DELETE(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", studentId: "student-1" }),
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            studentId: "student-1",
            accountLinksDeleted: 1,
            groupBindingsDeleted: 1,
        });
        expect(mockLineStudentAccountLinkDeleteMany).toHaveBeenCalledWith({
            where: {
                classroomId: "class-1",
                studentId: "student-1",
            },
        });
        expect(mockLineStudentBindingDeleteMany).toHaveBeenCalledWith({
            where: {
                classroomId: "class-1",
                studentId: "student-1",
            },
        });
        expect(mockLogAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "line.student_link.reset",
                category: "line",
                targetId: "student-1",
            })
        );
    });
});
