import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashEmailVerificationCodeForStorage } from "@/lib/email-verification";

const mockAuth = vi.fn();
const mockVerifyPassword = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdateMany = vi.fn();
const mockCodeCreate = vi.fn();
const mockCodeFindFirst = vi.fn();
const mockCodeUpdateMany = vi.fn();
const mockSessionDeleteMany = vi.fn();
const mockSecuritySessionUpdateMany = vi.fn();
const mockTransaction = vi.fn();
const mockSendVerification = vi.fn();
const mockSendNotification = vi.fn();
const mockConsumeRateLimit = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/auth/password-hash", () => ({ verifyPassword: mockVerifyPassword }));
vi.mock("@/lib/db", () => ({ db: {
  user: { findUnique: mockUserFindUnique },
  emailVerificationCode: { create: mockCodeCreate, findFirst: mockCodeFindFirst, updateMany: mockCodeUpdateMany },
  $transaction: mockTransaction,
} }));
vi.mock("@/lib/email/send-verification-email", () => ({ sendVerificationCodeEmail: mockSendVerification }));
vi.mock("@/lib/email/send-security-notification-email", () => ({ sendEmailChangeSecurityNotification: mockSendNotification }));
vi.mock("@/lib/security/audit-log", () => ({ logAuditEvent: vi.fn() }));
vi.mock("@/lib/security/rate-limit", () => ({
  buildRateLimitKey: (...parts: string[]) => parts.join(":"), consumeRateLimitWithStore: mockConsumeRateLimit,
  createRateLimitResponse: () => Response.json({}, { status: 429 }),
  digestRateLimitIdentifier: (value: string) => `digest:${value}`, getRequestClientIdentifier: () => "client",
}));

function post(url: string, body: object) {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("email change lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockConsumeRateLimit.mockResolvedValue({ allowed: true });
    mockVerifyPassword.mockResolvedValue(true);
    mockSendVerification.mockResolvedValue({ sent: true, messageId: "email-1" });
    mockSendNotification.mockResolvedValue({ sent: true, messageId: "email-2" });
    mockCodeCreate.mockResolvedValue({ id: "code-1" });
    mockCodeUpdateMany.mockResolvedValue({ count: 1 });
    mockUserUpdateMany.mockResolvedValue({ count: 1 });
    mockSessionDeleteMany.mockResolvedValue({ count: 2 });
    mockSecuritySessionUpdateMany.mockResolvedValue({ count: 3 });
    mockTransaction.mockImplementation(async (callback) => callback({
      emailVerificationCode: { updateMany: mockCodeUpdateMany }, user: { updateMany: mockUserUpdateMany },
      session: { deleteMany: mockSessionDeleteMany },
      userAuthSession: { updateMany: mockSecuritySessionUpdateMany },
    }));
  });

  it("requires the current password before issuing an OTP", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "old@example.com", password: "hash" });
    mockVerifyPassword.mockResolvedValue(false);
    const { POST } = await import("@/app/api/auth/change-email/request/route");
    const response = await POST(post("http://localhost/api/auth/change-email/request", { newEmail: "new@example.com", currentPassword: "wrong-password" }));
    expect(response.status).toBe(403);
    expect(mockCodeCreate).not.toHaveBeenCalled();
  });

  it("activates the new-email OTP after provider acceptance and notifies the old address", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "user-1", email: "old@example.com", password: "hash" }).mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/auth/change-email/request/route");
    const response = await POST(post("http://localhost/api/auth/change-email/request", { newEmail: "NEW@example.com", currentPassword: "current-password" }));
    expect(response.status).toBe(202);
    expect(mockSendVerification).toHaveBeenCalledWith("new@example.com", expect.any(String), 15, expect.stringMatching(/^TP-/), "email-change");
    expect(mockSendNotification).toHaveBeenCalledWith("old@example.com");
    expect(mockCodeUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "code-1", status: "PENDING" }),
      data: expect.objectContaining({ status: "ACTIVE", providerMessageId: "email-1", deliveryStatus: "ACCEPTED" }),
    }));
  });

  it("atomically consumes OTP, changes email, advances authVersion, and revokes sessions", async () => {
    const code = "123456";
    mockUserFindUnique.mockResolvedValue({ email: "old@example.com", authVersion: 4 });
    mockCodeFindFirst.mockResolvedValue({ id: "code-1", userId: "user-1", email: "new@example.com", referenceCode: "TP-AB12",
      codeHash: hashEmailVerificationCodeForStorage(code), purpose: "EMAIL_CHANGE", status: "ACTIVE", attempts: 0,
      maxAttempts: 5, expiresAt: new Date(Date.now() + 60_000), consumedAt: null });
    const { POST } = await import("@/app/api/auth/change-email/confirm/route");
    const response = await POST(post("http://localhost/api/auth/change-email/confirm", { code, referenceCode: "TP-AB12" }));
    expect(response.status).toBe(200);
    expect(mockUserUpdateMany).toHaveBeenCalledWith({ where: { id: "user-1", email: "old@example.com" },
      data: { email: "new@example.com", emailVerified: expect.any(Date), authVersion: { increment: 1 } } });
    expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });
});
