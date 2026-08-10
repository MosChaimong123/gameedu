import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindFirst = vi.fn();
const mockResetEmailVerificationAttemptLimits = vi.fn();
const mockEmailVerificationCodeFindFirst = vi.fn();
const mockEmailVerificationCodeDeleteMany = vi.fn();
const mockEmailVerificationCodeCreate = vi.fn();
const mockEmailVerificationCodeUpdate = vi.fn();
const mockEmailVerificationCodeUpdateMany = vi.fn();
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
      update: mockEmailVerificationCodeUpdate,
      updateMany: mockEmailVerificationCodeUpdateMany,
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
  digestRateLimitIdentifier: (value: string) => `digest:${value}`,
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
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_VERIFICATION_PEPPER", "test-email-verification-pepper-32-bytes");
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
    mockEmailVerificationCodeCreate.mockResolvedValue({ id: "code-new" });
    mockEmailVerificationCodeUpdate.mockResolvedValue({});
    mockEmailVerificationCodeUpdateMany.mockResolvedValue({ count: 1 });
    mockSendVerificationEmail.mockResolvedValue({ sent: true });
    mockResetEmailVerificationAttemptLimits.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        emailVerificationCode: {
          findFirst: mockEmailVerificationCodeFindFirst,
          deleteMany: mockEmailVerificationCodeDeleteMany,
          create: mockEmailVerificationCodeCreate,
          update: mockEmailVerificationCodeUpdate,
          updateMany: mockEmailVerificationCodeUpdateMany,
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
    const startedAt = Date.now();

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "missing@example.com" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(650);
    expect(body).toEqual({ ok: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(mockEmailVerificationCodeCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["verified", { id: "user-1", email: "alice@example.com", emailVerified: new Date(), password: "hash" }],
    ["Google-only", { id: "user-1", email: "alice@example.com", emailVerified: null, password: null }],
  ])("returns the same neutral response for a %s account", async (_state, account) => {
    mockUserFindFirst.mockResolvedValue(account);
    const { POST } = await import("@/app/api/auth/resend-verification/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com" }),
      })
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(mockEmailVerificationCodeCreate).not.toHaveBeenCalled();
  });

  it("keeps a neutral response and masked audit metadata when email sending fails", async () => {
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

    expect(response.status).toBe(202);
    expect(body).toEqual({ ok: true });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.resend_verification.failed",
        metadata: { emailMasked: "al***@example.com" },
      })
    );
    expect(mockEmailVerificationCodeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "code-new", status: "PENDING" }),
        data: expect.objectContaining({ status: "FAILED", consumedAt: expect.any(Date) }),
      })
    );
    expect(mockEmailVerificationCodeDeleteMany).not.toHaveBeenCalled();
  });

  it("creates a fresh numeric verification code without returning delivery metadata", async () => {
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

    expect(response.status).toBe(202);
    expect(mockEmailVerificationCodeDeleteMany).not.toHaveBeenCalled();
    expect(mockEmailVerificationCodeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        email: "alice@example.com",
        referenceCode: expect.stringMatching(/^TP-/),
        codePlain: null,
        codeHash: expect.any(String),
        purpose: "SIGNUP_VERIFY",
        status: "PENDING",
        attempts: 0,
        maxAttempts: 5,
        expiresAt: expect.any(Date),
        consumedAt: null,
      }),
    });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      "alice@example.com",
      expect.stringMatching(/^\d{6}$/),
      15,
      expect.stringMatching(/^TP-/)
    );
    expect(mockResetEmailVerificationAttemptLimits).toHaveBeenCalledWith("alice@example.com");
    expect(mockEmailVerificationCodeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONSUMED" }) })
    );
    expect(mockEmailVerificationCodeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "code-new", status: "PENDING" }),
        data: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
    expect(body).toEqual({ ok: true });
    expect(body).not.toHaveProperty("sent");
    expect(body).not.toHaveProperty("referenceCode");
    expect(body).not.toHaveProperty("devCode");
  });

  it("returns the local dev code and refreshes the encrypted browser flow", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_SECRET", "test-verification-flow-secret-with-32-bytes");
    const userId = "507f1f77bcf86cd799439011";
    mockUserFindFirst.mockResolvedValue({
      id: userId,
      email: "alice@example.com",
      emailVerified: null,
      password: "hashed-password",
    });
    mockSendVerificationEmail.mockResolvedValue({ sent: false });
    mockEmailVerificationCodeFindFirst.mockReset().mockResolvedValueOnce(null);
    const {
      encodeVerificationFlowHandle,
      VERIFICATION_FLOW_COOKIE,
    } = await import("@/lib/auth/verification-flow-handle");
    const existingHandle = encodeVerificationFlowHandle(
      { userId, email: "alice@example.com" },
      process.env.AUTH_SECRET as string
    );
    const { POST } = await import("@/app/api/auth/resend-verification/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${VERIFICATION_FLOW_COOKIE}=${existingHandle}`,
        },
        body: JSON.stringify({ email: "alice@example.com" }),
      })
    );
    const body = await response.json();
    const generatedCode = mockSendVerificationEmail.mock.calls[0][1] as string;

    expect(body).toEqual({ ok: true, devMode: true, devCode: generatedCode });
    expect(response.headers.get("set-cookie")).toContain(`${VERIFICATION_FLOW_COOKIE}=`);
    expect(response.headers.get("set-cookie")).not.toContain(generatedCode);
  });

  it("returns the local dev code even when the browser flow cookie is missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockUserFindFirst.mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      email: "alice@example.com",
      emailVerified: null,
      password: "hashed-password",
    });
    mockSendVerificationEmail.mockResolvedValue({ sent: false });
    mockEmailVerificationCodeFindFirst.mockReset().mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/auth/resend-verification/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com" }),
      })
    );
    const body = await response.json();
    const generatedCode = mockSendVerificationEmail.mock.calls[0][1] as string;

    expect(body).toEqual({ ok: true, devMode: true, devCode: generatedCode });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns the local dev code when the email provider accepts the message", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockUserFindFirst.mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      email: "alice@example.com",
      emailVerified: null,
      password: "hashed-password",
    });
    mockSendVerificationEmail.mockResolvedValue({
      sent: true,
      messageId: "provider-message-id",
    });
    mockEmailVerificationCodeFindFirst.mockReset().mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/auth/resend-verification/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com" }),
      })
    );
    const body = await response.json();
    const generatedCode = mockSendVerificationEmail.mock.calls[0][1] as string;

    expect(body).toEqual({ ok: true, devMode: true, devCode: generatedCode });
  });

  it("bypasses resend limits and cooldown only in local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockEmailVerificationCodeFindFirst.mockReset().mockResolvedValueOnce({
      id: "recent-code",
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

    expect(mockConsumeRateLimitWithStore).not.toHaveBeenCalled();
    expect(mockEmailVerificationCodeCreate).toHaveBeenCalled();
    expect(body).toEqual({
      ok: true,
      devMode: true,
      devCode: expect.stringMatching(/^\d{6}$/),
    });
  });

  it("keeps the neutral response when a code was just sent", async () => {
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

    expect(response.status).toBe(202);
    expect(body).toEqual({ ok: true });
    expect(response.headers.get("Retry-After")).toBeNull();
    expect(mockEmailVerificationCodeCreate).not.toHaveBeenCalled();
  });
});
