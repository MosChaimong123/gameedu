import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockUserUpdate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserCount = vi.fn();
const mockUserDelete = vi.fn();
const mockQuestionSetDelete = vi.fn();
const mockDeleteMany = vi.fn();
const mockClassroomFindMany = vi.fn();
const mockRevalidatePath = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      update: mockUserUpdate,
      findUnique: mockUserFindUnique,
      count: mockUserCount,
      delete: mockUserDelete,
    },
    questionSet: {
      delete: mockQuestionSetDelete,
      deleteMany: mockDeleteMany,
    },
    oMRQuiz: { deleteMany: mockDeleteMany },
    classroom: {
      findMany: mockClassroomFindMany,
      delete: vi.fn(),
    },
    gameHistory: { deleteMany: mockDeleteMany },
    activeGame: { deleteMany: mockDeleteMany },
    notification: { deleteMany: mockDeleteMany },
    session: { deleteMany: mockDeleteMany },
    account: { deleteMany: mockDeleteMany },
    folder: { deleteMany: mockDeleteMany },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

describe("admin actions audit logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "ADMIN",
      },
    });
    mockUserUpdate.mockResolvedValue({});
    mockUserFindUnique.mockResolvedValue({ id: "user-2", role: "TEACHER" });
    mockUserCount.mockResolvedValue(1);
    mockUserDelete.mockResolvedValue({});
    mockQuestionSetDelete.mockResolvedValue({});
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockClassroomFindMany.mockResolvedValue([]);
  });

  it("logs an audit event when updating a user role", async () => {
    const { updateUserRole } = await import("@/app/admin/admin-actions");
    const result = await updateUserRole("user-1", "TEACHER");

    expect(result).toEqual({ success: true });
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "admin.user.role_updated",
      targetType: "user",
      targetId: "user-1",
      metadata: { newRole: "TEACHER" },
    });
  });

  it("logs an audit event when deleting a user", async () => {
    const { deleteUser } = await import("@/app/admin/admin-actions");
    const result = await deleteUser("user-2");

    expect(result).toEqual({ success: true });
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "admin.user.deleted",
      targetType: "user",
      targetId: "user-2",
    });
  });

  it("logs an audit event when deleting a set", async () => {
    const { deleteSet } = await import("@/app/admin/admin-actions");
    const result = await deleteSet("set-1");

    expect(result).toEqual({ success: true });
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "admin.question_set.deleted",
      targetType: "questionSet",
      targetId: "set-1",
    });
  });
});
