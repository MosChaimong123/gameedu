import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashEmailVerificationCode } from "@/lib/email-verification";

const mockUserFindFirst = vi.fn();
const mockUserUpdate = vi.fn();
const mockEmailVerificationCodeFindFirst = vi.fn();
const mockEmailVerificationCodeUpdate = vi.fn();
const mockEmailVerificationCodeUpdateMany = vi.fn();
const mockConsumeRateLimitWithStore = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: mockUserFindFirst,
      update: mockUserUpdate,
    },
    emailVerificationCode: {
      findFirst: mockEmailVerificationCodeFindFirst,
      update: mockEmailVerificationCodeUpdate,
      updateMany: mockEmailVerificationCodeUpdateMany,
    },
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimitWithStore: mockConsumeRateLimitWithStore,
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

describe("verify email code route POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsumeRateLimitWithStore.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 60,
    });
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      emailVerified: null,
    });
    mockEmailVerificationCodeFindFirst.mockResolvedValue({
      id: "code-1",
      userId: "user-1",
      email: "alice@example.com",
      codeHash: hashEmailVerificationCode("user-1", "123456"),
      attempts: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockUserUpdate.mockResolvedValue({});
    mockEmailVerificationCodeUpdate.mockResolvedValue({});
    mockEmailVerificationCodeUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("verifies a correct code and marks the user verified", async () => {
    const { POST } = await import("@/app/api/auth/verify-email-code/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/verify-email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com", code: "123456" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, verified: true });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { emailVerified: expect.any(Date) },
    });
    expect(mockEmailVerificationCodeUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        purpose: "SIGNUP_VERIFY",
        consumedAt: null,
      },
      data: { consumedAt: expect.any(Date) },
    });
  });

  it("rejects invalid codes and increments attempts", async () => {
    const { POST } = await import("@/app/api/auth/verify-email-code/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/verify-email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com", code: "999999" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "EMAIL_VERIFICATION_CODE_INVALID",
        message: "Invalid verification code",
      },
    });
    expect(mockEmailVerificationCodeUpdate).toHaveBeenCalledWith({
      where: { id: "code-1" },
      data: { attempts: 1 },
    });
  });

  it("rejects expired codes without consuming the record", async () => {
    mockEmailVerificationCodeFindFirst.mockResolvedValue({
      id: "code-1",
      userId: "user-1",
      email: "alice@example.com",
      codeHash: hashEmailVerificationCode("user-1", "123456"),
      attempts: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() - 60_000),
    });
    const { POST } = await import("@/app/api/auth/verify-email-code/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/verify-email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com", code: "123456" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "EMAIL_VERIFICATION_CODE_EXPIRED",
        message: "Verification code expired",
      },
    });
    expect(mockEmailVerificationCodeUpdate).not.toHaveBeenCalled();
  });

  it("locks the code after too many failed attempts", async () => {
    mockEmailVerificationCodeFindFirst.mockResolvedValue({
      id: "code-1",
      userId: "user-1",
      email: "alice@example.com",
      codeHash: hashEmailVerificationCode("user-1", "123456"),
      attempts: 4,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { POST } = await import("@/app/api/auth/verify-email-code/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/verify-email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com", code: "999999" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({
      error: {
        code: "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS",
        message: "Too many invalid verification attempts",
      },
    });
    expect(mockEmailVerificationCodeUpdate).toHaveBeenCalledWith({
      where: { id: "code-1" },
      data: {
        attempts: 5,
        consumedAt: expect.any(Date),
      },
    });
  });

  it("returns success when the user is already verified", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      emailVerified: new Date(),
    });
    const { POST } = await import("@/app/api/auth/verify-email-code/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/verify-email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com", code: "123456" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, alreadyVerified: true });
    expect(mockEmailVerificationCodeFindFirst).not.toHaveBeenCalled();
  });
});

