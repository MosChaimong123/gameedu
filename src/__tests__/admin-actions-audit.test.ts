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
const mockTransaction = vi.fn();
const mockEmailVerificationCodeUpdateMany = vi.fn();
const mockSecuritySessionUpdateMany = vi.fn();

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
    emailVerificationCode: { updateMany: mockEmailVerificationCodeUpdateMany },
    $transaction: mockTransaction,
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
    mockEmailVerificationCodeUpdateMany.mockResolvedValue({ count: 0 });
    mockSecuritySessionUpdateMany.mockResolvedValue({ count: 0 });
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
        session: { deleteMany: mockDeleteMany },
        userAuthSession: { updateMany: mockSecuritySessionUpdateMany },
        emailVerificationCode: { updateMany: mockEmailVerificationCodeUpdateMany },
      })
    );
  });

  it("logs an audit event when updating a user role", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ authVersion: 4 });
    const { updateUserRole } = await import("@/app/admin/admin-actions");
    const result = await updateUserRole("user-1", "TEACHER");

    expect(result).toEqual({ success: true });
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "admin.user.role_updated",
      targetType: "user",
      targetId: "user-1",
      metadata: { newRole: "TEACHER", databaseSessionsDeleted: 0 },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: "TEACHER", authVersion: { increment: 1 } },
    });
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("resets a password through the shared revocation transaction", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ authVersion: 7 });
    mockDeleteMany.mockResolvedValueOnce({ count: 3 });
    const { resetUserPassword } = await import("@/app/admin/admin-actions");
    const result = await resetUserPassword("user-1", "new-password");

    expect(result).toEqual({ success: true });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { password: expect.any(String), authVersion: { increment: 1 }, passwordChangedAt: expect.any(Date) },
    });
    expect(mockEmailVerificationCodeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1", purpose: "PASSWORD_RESET" }) })
    );
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "admin.user.password_reset",
      targetType: "user",
      targetId: "user-1",
      metadata: { databaseSessionsDeleted: 3 },
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

  it("rejects subscription updates for non-teacher accounts and logs the rejection", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "student-1", role: "STUDENT" });
    const { updateUserSubscription } = await import("@/app/admin/admin-actions");
    const result = await updateUserSubscription("student-1", {
      plan: "PLUS",
      planStatus: "ACTIVE",
      planExpiry: null,
    });

    expect(result).toEqual({ success: false, errorKey: "adminSubscriptionRoleNotAllowed" });
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "admin.user.subscription_update_rejected",
      targetType: "user",
      targetId: "student-1",
      metadata: {
        reason: "role_not_allowed",
        role: "STUDENT",
      },
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
