import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindFirst = vi.fn();
const mockCodeFindFirst = vi.fn();
const mockCodeCreate = vi.fn();
const mockCodeUpdate = vi.fn();
const mockCodeUpdateMany = vi.fn();
const mockLockDeleteMany = vi.fn();
const mockLockCreate = vi.fn();
const mockLockUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockConsumeRateLimitWithStore = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: { findFirst: mockUserFindFirst },
    emailVerificationCode: {
      findFirst: mockCodeFindFirst,
      create: mockCodeCreate,
      update: mockCodeUpdate,
      updateMany: mockCodeUpdateMany,
    },
    passwordResetIssuanceLock: {
      deleteMany: mockLockDeleteMany,
      create: mockLockCreate,
      update: mockLockUpdate,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/email/send-password-reset-email", () => ({
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  buildRateLimitKey: (...parts: string[]) => parts.filter(Boolean).join(":"),
  consumeRateLimitWithStore: mockConsumeRateLimitWithStore,
  digestRateLimitIdentifier: () => "digest:non-reversible-email",
  getRequestClientIdentifier: () => "test-client",
}));

const neutralBody = {
  ok: true,
  requestAccepted: true,
  cooldownSeconds: 30,
};

function request(email: string) {
  return new Request("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

describe("forgot password route POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_VERIFICATION_PEPPER", "test-email-verification-pepper-32-chars");
    vi.stubEnv("PASSWORD_RESET_MIN_RESPONSE_MS", "0");
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      password: "hashed-password",
    });
    mockCodeFindFirst.mockResolvedValue(null);
    mockCodeCreate.mockResolvedValue({ id: "pending-1" });
    mockCodeUpdate.mockResolvedValue({});
    mockCodeUpdateMany.mockResolvedValue({ count: 1 });
    mockLockDeleteMany.mockResolvedValue({ count: 0 });
    mockLockCreate.mockResolvedValue({ id: "lock-1" });
    mockLockUpdate.mockResolvedValue({});
    mockTransaction.mockResolvedValue([]);
    mockSendPasswordResetEmail.mockResolvedValue({ sent: true, messageId: "email-123" });
    mockConsumeRateLimitWithStore.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 60,
    });
  });

  it("rejects an invalid email before looking up an account", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("not-an-email"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_PAYLOAD", message: "Invalid email" },
    });
    expect(mockUserFindFirst).not.toHaveBeenCalled();
  });

  it("rate-limits valid requests without revealing account state", async () => {
    mockConsumeRateLimitWithStore.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("alice@example.com"));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(neutralBody);
    expect(mockUserFindFirst).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown account", null],
    ["a provider-only account", { id: "google-1", email: "google@example.com", password: null }],
  ])("returns the neutral production contract for %s", async (_label, user) => {
    mockUserFindFirst.mockResolvedValue(user);
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("missing@example.com"));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(neutralBody);
    expect(mockCodeCreate).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns the identical neutral production contract after sending a code", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("alice@example.com"));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(neutralBody);
    expect(mockCodeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        email: "alice@example.com",
        codePlain: null,
        purpose: "PASSWORD_RESET",
        status: "PENDING",
      }),
    });
    expect(mockSendPasswordResetEmail).toHaveBeenCalled();
    expect(mockCodeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONSUMED" }) })
    );
    expect(mockCodeUpdate).toHaveBeenCalledWith({
      where: { id: "pending-1" },
      data: {
        status: "ACTIVE",
        lastSentAt: expect.any(Date),
        emailProvider: "resend",
        providerMessageId: "email-123",
        deliveryStatus: "ACCEPTED",
        providerAcceptedAt: expect.any(Date),
        deliveryUpdatedAt: expect.any(Date),
      },
    });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.password_reset.provider_accepted" })
    );
  });

  it("keeps an active account cooldown private", async () => {
    mockCodeFindFirst.mockResolvedValue({ id: "code-1", lastSentAt: new Date() });
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("alice@example.com"));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(neutralBody);
    expect(response.headers.get("Retry-After")).toBeNull();
    expect(mockCodeCreate).not.toHaveBeenCalled();
    expect(mockLockUpdate).toHaveBeenCalledWith({
      where: { requestToken: expect.any(String) },
      data: { lockedUntil: expect.any(Date) },
    });
  });

  it("marks a rejected pending code failed, releases its lock, and preserves the old active code", async () => {
    mockCodeFindFirst.mockResolvedValue({
      id: "old-active",
      lastSentAt: new Date(Date.now() - 60_000),
    });
    mockSendPasswordResetEmail.mockRejectedValue(new Error("provider failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("alice@example.com"));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(neutralBody);
    expect(mockCodeUpdate).toHaveBeenCalledWith({
      where: { id: "pending-1" },
      data: { status: "FAILED", consumedAt: expect.any(Date), codePlain: null },
    });
    expect(mockLockDeleteMany).toHaveBeenCalledWith({
      where: { requestToken: expect.any(String) },
    });
    expect(mockCodeUpdateMany).not.toHaveBeenCalled();
    expect(mockLockUpdate).not.toHaveBeenCalled();
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.password_reset.send_failed",
        status: "error",
        metadata: { emailMasked: "al***@example.com" },
      })
    );
    consoleSpy.mockRestore();
  });

  it("never places the OTP or email plaintext in audit metadata", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("alice@example.com"));

    expect(response.status).toBe(202);
    const serializedAudits = JSON.stringify(mockLogAuditEvent.mock.calls);
    const createdCode = mockCodeCreate.mock.calls[0]?.[0]?.data;
    expect(serializedAudits).not.toContain(createdCode?.codeHash);
    expect(serializedAudits).not.toContain("alice@example.com");
    expect(serializedAudits).not.toMatch(/\b\d{6}\b/);
  });

  it("returns the neutral contract without sending when another request owns the user lock", async () => {
    mockLockCreate.mockRejectedValue({ code: "P2002" });
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("alice@example.com"));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(neutralBody);
    expect(mockCodeCreate).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("treats a non-accepted production send result as a failed pending code", async () => {
    mockSendPasswordResetEmail.mockResolvedValue({ sent: false });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("alice@example.com"));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(neutralBody);
    expect(mockCodeUpdate).toHaveBeenCalledWith({
      where: { id: "pending-1" },
      data: { status: "FAILED", consumedAt: expect.any(Date), codePlain: null },
    });
    expect(mockLogAuditEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.password_reset.otp_sent" })
    );
    consoleSpy.mockRestore();
  });

  it("exposes local-only OTP metadata when delivery is intentionally disabled", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockSendPasswordResetEmail.mockResolvedValue({ sent: false });
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("alice@example.com"));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      ...neutralBody,
      referenceCode: expect.stringMatching(/^TP-/),
      devCode: expect.stringMatching(/^\d{6}$/),
    });
    expect(mockCodeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ codePlain: null, status: "PENDING" }),
    });
  });
});
