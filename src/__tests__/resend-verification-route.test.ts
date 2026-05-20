import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindFirst = vi.fn();
const mockResetEmailVerificationAttemptLimits = vi.fn();
const mockEmailVerificationCodeFindFirst = vi.fn();
const mockEmailVerificationCodeDeleteMany = vi.fn();
const mockEmailVerificationCodeCreate = vi.fn();
const mockSendVerificationEmail = vi.fn();
const mockConsumeRateLimitWithStore = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: mockUserFindFirst,
    },
    $transaction: mockTransaction,
    emailVerificationCode: {
      findFirst: mockEmailVerificationCodeFindFirst,
      deleteMany: mockEmailVerificationCodeDeleteMany,
      create: mockEmailVerificationCodeCreate,
    },
  },
}));

vi.mock("@/lib/email/send-verification-email", () => ({
  sendVerificationCodeEmail: mockSendVerificationEmail,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimitWithStore: mockConsumeRateLimitWithStore,
  resetEmailVerificationAttemptLimits: mockResetEmailVerificationAttemptLimits,
  buildRateLimitKey: (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(":"),
  getRequestClientIdentifier: () => "test-client",
  createRateLimitResponse: (retryAfterSeconds: number) =>
    Response.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests",
        },
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    ),
}));

describe("resend verification route POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsumeRateLimitWithStore.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 60,
    });
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      emailVerified: null,
      password: "hashed-password",
    });
    mockEmailVerificationCodeFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "code-1" });
    mockEmailVerificationCodeDeleteMany.mockResolvedValue({ count: 1 });
    mockEmailVerificationCodeCreate.mockResolvedValue({});
    mockSendVerificationEmail.mockResolvedValue({ sent: true });
    mockResetEmailVerificationAttemptLimits.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        emailVerificationCode: {
          findFirst: mockEmailVerificationCodeFindFirst,
          deleteMany: mockEmailVerificationCodeDeleteMany,
          create: mockEmailVerificationCodeCreate,
        },
      })
    );
  });

  it("rejects invalid payloads with a structured error", async () => {
    const { POST } = await import("@/app/api/auth/resend-verification/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "bad-email" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "INVALID_PAYLOAD",
        message: "Invalid email",
      },
    });
  });

  it("returns ok without leaking account existence for unknown addresses", async () => {
    mockUserFindFirst.mockResolvedValue(null);
    const { POST } = await import("@/app/api/auth/resend-verification/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "missing@example.com" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockEmailVerificationCodeCreate).not.toHaveBeenCalled();
  });

  it("returns internal error and masked audit metadata when email sending fails", async () => {
    mockEmailVerificationCodeFindFirst
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "code-1" });
    mockSendVerificationEmail.mockRejectedValue(new Error("mail exploded"));
    const { POST } = await import("@/app/api/auth/resend-verification/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not send email",
      },
    });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.resend_verification.failed",
        metadata: { emailMasked: "al***@example.com" },
      })
    );
  });

  it("creates a fresh numeric verification code and returns cooldown metadata", async () => {
    mockEmailVerificationCodeFindFirst
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "code-1" });
    const { POST } = await import("@/app/api/auth/resend-verification/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockEmailVerificationCodeDeleteMany).toHaveBeenCalled();
    expect(mockEmailVerificationCodeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        email: "alice@example.com",
        referenceCode: expect.stringMatching(/^TP-/),
        codePlain: expect.stringMatching(/^\d{6}$/),
        codeHash: expect.any(String),
        purpose: "SIGNUP_VERIFY",
        attempts: 0,
        maxAttempts: 5,
        expiresAt: expect.any(Date),
      }),
    });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      "alice@example.com",
      expect.stringMatching(/^\d{6}$/),
      15,
      expect.stringMatching(/^TP-/)
    );
    expect(mockResetEmailVerificationAttemptLimits).toHaveBeenCalledWith("alice@example.com");
    expect(body).toMatchObject({ ok: true, sent: true, cooldownSeconds: 30, referenceCode: expect.stringMatching(/^TP-/) });
  });

  it("returns cooldown error when a code was just sent", async () => {
    mockEmailVerificationCodeFindFirst
      .mockReset()
      .mockResolvedValue({
        id: "code-1",
        lastSentAt: new Date(),
      });
    const { POST } = await import("@/app/api/auth/resend-verification/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({
      error: {
        code: "EMAIL_VERIFICATION_CODE_COOLDOWN",
        message: "Please wait before requesting another code",
      },
    });
    expect(mockEmailVerificationCodeCreate).not.toHaveBeenCalled();
  });
});
