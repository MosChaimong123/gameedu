import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindUnique = vi.fn();
const mockVerificationTokenDeleteMany = vi.fn();
const mockVerificationTokenCreate = vi.fn();
const mockSendVerificationEmail = vi.fn();
const mockConsumeRateLimitWithStore = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
    },
    verificationToken: {
      deleteMany: mockVerificationTokenDeleteMany,
      create: mockVerificationTokenCreate,
    },
  },
}));

vi.mock("@/lib/email/send-verification-email", () => ({
  sendVerificationEmail: mockSendVerificationEmail,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimitWithStore: mockConsumeRateLimitWithStore,
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
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      emailVerified: null,
      password: "hashed-password",
    });
    mockVerificationTokenDeleteMany.mockResolvedValue({ count: 1 });
    mockVerificationTokenCreate.mockResolvedValue({});
    mockSendVerificationEmail.mockResolvedValue(undefined);
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

  it("returns a rate-limited response when resend attempts exceed the bucket", async () => {
    mockConsumeRateLimitWithStore.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 30,
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
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(body).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests",
      },
    });
  });

  it("returns ok without leaking account existence for unknown addresses", async () => {
    mockUserFindUnique.mockResolvedValue(null);
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
    expect(mockVerificationTokenCreate).not.toHaveBeenCalled();
  });

  it("returns internal error and masked audit metadata when email sending fails", async () => {
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
});
