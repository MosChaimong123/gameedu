import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockMutateUserSecurityState = vi.fn();
const mockHasRecentAuthentication = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/auth/security-mutations", () => ({
  mutateUserSecurityState: mockMutateUserSecurityState,
}));
vi.mock("@/lib/auth/session-policy", () => ({
  hasRecentAuthentication: mockHasRecentAuthentication,
}));
vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

describe("admin MFA reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRecentAuthentication.mockReturnValue(true);
    mockMutateUserSecurityState.mockResolvedValue({
      databaseSessionsDeleted: 1,
      securitySessionsRevoked: 2,
    });
  });

  it("fails closed without a recent MFA-authenticated admin session", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN", mfaLevel: 0, mfaVerifiedAt: Date.now() },
    });
    const { POST } = await import("@/app/api/admin/users/[id]/mfa-reset/route");
    const response = await POST(new Request("http://localhost/api/admin/users/user-2/mfa-reset", { method: "POST" }), {
      params: Promise.resolve({ id: "user-2" }),
    });

    expect(response.status).toBe(403);
    expect(mockMutateUserSecurityState).not.toHaveBeenCalled();
    expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "auth.admin_mfa_reset.denied",
      status: "rejected",
    }));
  });

  it("clears MFA, revokes sessions atomically, and records the high-risk action", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN", mfaLevel: 1, mfaVerifiedAt: Date.now() },
    });
    const { POST } = await import("@/app/api/admin/users/[id]/mfa-reset/route");
    const response = await POST(new Request("http://localhost/api/admin/users/user-2/mfa-reset", { method: "POST" }), {
      params: Promise.resolve({ id: "user-2" }),
    });

    expect(response.status).toBe(200);
    expect(mockMutateUserSecurityState).toHaveBeenCalledWith("user-2", {
      mfaEnabledAt: null,
      mfaAuthenticators: { deleteMany: {} },
      mfaRecoveryCodes: { deleteMany: {} },
    });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "auth.admin_mfa_reset.succeeded",
      actorUserId: "admin-1",
      targetId: "user-2",
      status: "success",
    }));
  });
});
