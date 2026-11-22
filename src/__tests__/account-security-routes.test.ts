import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockSessionFindMany = vi.fn();
const mockSecuritySessionUpdateMany = vi.fn();
const mockAdapterSessionDeleteMany = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockVerifyPassword = vi.fn();
const mockChangePassword = vi.fn();
const mockListActivity = vi.fn();
const mockRateLimit = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ db: {
  userAuthSession: { findMany: mockSessionFindMany, updateMany: mockSecuritySessionUpdateMany },
  session: { deleteMany: mockAdapterSessionDeleteMany },
  user: { findUnique: mockUserFindUnique },
  $transaction: mockTransaction,
} }));
vi.mock("@/lib/auth/password-hash", () => ({ verifyPassword: mockVerifyPassword }));
vi.mock("@/lib/auth/change-user-password", () => ({
  changeUserPassword: mockChangePassword,
  PasswordPolicyError: class PasswordPolicyError extends Error {},
  PasswordReuseError: class PasswordReuseError extends Error {},
}));
vi.mock("@/lib/security/audit-log", () => ({ logAuditEvent: vi.fn(), listRecentAuditEvents: mockListActivity }));
vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimitWithStore: mockRateLimit,
  createRateLimitResponse: () => Response.json({}, { status: 429 }),
}));
vi.mock("@/lib/email/send-security-notification-email", () => ({ sendCredentialChangedNotification: vi.fn() }));

describe("account security routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", role: "TEACHER", securitySessionId: "507f1f77bcf86cd799439012", authenticatedAt: Date.now() } });
    mockRateLimit.mockResolvedValue({ allowed: true });
    mockSecuritySessionUpdateMany.mockResolvedValue({ count: 1 });
    mockAdapterSessionDeleteMany.mockResolvedValue({ count: 0 });
    mockVerifyPassword.mockResolvedValue(true);
    mockChangePassword.mockResolvedValue({ databaseSessionsDeleted: 1, securitySessionsRevoked: 2 });
    mockListActivity.mockResolvedValue([]);
    mockUserUpdate.mockResolvedValue({});
    mockTransaction.mockImplementation(async (callback) => callback({
      user: { update: mockUserUpdate }, session: { deleteMany: mockAdapterSessionDeleteMany },
      userAuthSession: { updateMany: mockSecuritySessionUpdateMany },
    }));
  });

  it("rejects unauthenticated session listing", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("@/app/api/auth/security/sessions/route");
    expect((await GET()).status).toBe(401);
    expect(mockSessionFindMany).not.toHaveBeenCalled();
  });

  it("returns a minimized device list without IP or user-agent digests", async () => {
    const now = new Date();
    mockSessionFindMany.mockResolvedValue([{ id: "507f1f77bcf86cd799439012", deviceLabel: "Chrome on Windows", authMethod: "credentials", mfaLevel: 0,
      createdAt: now, lastSeenAt: now, absoluteExpiresAt: new Date(now.getTime() + 60_000), idleExpiresAt: new Date(now.getTime() + 30_000) }]);
    const { GET } = await import("@/app/api/auth/security/sessions/route");
    const body = await (await GET()).json();
    expect(body.sessions[0]).toEqual({ id: "507f1f77bcf86cd799439012", deviceLabel: "Chrome on Windows", authMethod: "credentials", mfaLevel: 0,
      createdAt: now.toISOString(), lastSeenAt: now.toISOString(), expiresAt: new Date(now.getTime() + 30_000).toISOString(), current: true });
    expect(JSON.stringify(body)).not.toContain("Digest");
  });

  it("scopes single-session revocation to the authenticated owner", async () => {
    const { DELETE } = await import("@/app/api/auth/security/sessions/[id]/route");
    const response = await DELETE(new Request("http://localhost") as never, { params: Promise.resolve({ id: "507f1f77bcf86cd799439099" }) });
    expect(response.status).toBe(200);
    expect(mockSecuritySessionUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "507f1f77bcf86cd799439099",
        userId: "507f1f77bcf86cd799439011",
        OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }],
      },
    }));
  });

  it("logs out every other registry session while preserving the current one", async () => {
    mockSecuritySessionUpdateMany.mockResolvedValue({ count: 3 });
    const { POST } = await import("@/app/api/auth/security/sessions/logout-others/route");
    const response = await POST(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect(response.status).toBe(200);
    expect(mockSecuritySessionUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: "507f1f77bcf86cd799439011",
        id: { not: "507f1f77bcf86cd799439012" },
        OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }],
      },
    }));
  });

  it("changes password only after current-password verification", async () => {
    mockUserFindUnique.mockResolvedValue({ password: "hash", email: "a@example.com" });
    const { POST } = await import("@/app/api/auth/change-password/route");
    const req = () => new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword: "current-password", newPassword: "new secure passphrase" }) });
    mockVerifyPassword.mockResolvedValueOnce(false);
    expect((await POST(req())).status).toBe(403);
    expect(mockChangePassword).not.toHaveBeenCalled();
    mockVerifyPassword.mockResolvedValueOnce(true);
    expect((await POST(req())).status).toBe(200);
    expect(mockChangePassword).toHaveBeenCalled();
  });

  it("requires ADMIN and prevents self-disable", async () => {
    const { PATCH } = await import("@/app/api/admin/users/[id]/security/route");
    const req = new Request("http://localhost", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "disable", reason: "security incident" }) });
    expect((await PATCH(req, { params: Promise.resolve({ id: "507f1f77bcf86cd799439099" }) })).status).toBe(403);
    mockAuth.mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", role: "ADMIN", authenticatedAt: Date.now() } });
    expect((await PATCH(req, { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) })).status).toBe(403);
  });

  it("atomically disables a target and revokes all sessions", async () => {
    mockAuth.mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", role: "ADMIN", authenticatedAt: Date.now() } });
    mockUserFindUnique.mockResolvedValue({ id: "507f1f77bcf86cd799439099", authVersion: 2 });
    const { PATCH } = await import("@/app/api/admin/users/[id]/security/route");
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "disable", reason: "security incident" }) }),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439099" }) });
    expect(response.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ disabledAt: expect.any(Date), disabledReason: "security incident", authVersion: { increment: 1 } }) }));
    expect(mockSecuritySessionUpdateMany).toHaveBeenCalled();
  });
});
