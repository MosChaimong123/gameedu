import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hashEmailVerificationCode,
  hashEmailVerificationCodeForStorage,
} from "@/lib/email-verification";

const mockUserFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockEmailVerificationCodeFindFirst = vi.fn();
const mockEmailVerificationCodeFindMany = vi.fn();
const mockEmailVerificationCodeUpdate = vi.fn();
const mockEmailVerificationCodeUpdateMany = vi.fn();
const mockConsumeRateLimitWithStore = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: mockUserFindFirst,
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
    emailVerificationCode: {
      findFirst: mockEmailVerificationCodeFindFirst,
      findMany: mockEmailVerificationCodeFindMany,
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
  beforeEach(async () => {
    vi.clearAllMocks();
    mockConsumeRateLimitWithStore.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 60,
    });
    const user = {
      id: "user-1",
      email: "alice@example.com",
      emailVerified: null,
    };
    mockUserFindFirst.mockResolvedValue(user);
    mockUserFindUnique.mockResolvedValue(user);
    mockEmailVerificationCodeFindFirst.mockResolvedValue(null);
    mockEmailVerificationCodeFindMany.mockResolvedValue([
      {
        id: "code-1",
        userId: "user-1",
        email: "alice@example.com",
        codePlain: "123456",
        codeHash: hashEmailVerificationCodeForStorage("123456"),
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
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
        OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
      },
      data: { consumedAt: expect.any(Date), codePlain: null },
    });
  });

  it("verifies using reference code tied to the verification email record", async () => {
    mockEmailVerificationCodeFindFirst.mockResolvedValue({
      id: "code-ref",
      userId: "user-1",
      email: "alice@example.com",
      referenceCode: "TP-NBA6",
      codePlain: "018222",
      codeHash: hashEmailVerificationCodeForStorage("018222"),
      attempts: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const { POST } = await import("@/app/api/auth/verify-email-code/route");
    const response = await POST(
      new Request("http://localhost:3000/api/auth/verify-email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "alice@example.com",
          code: "018222",
          referenceCode: "TP-NBA6",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockEmailVerificationCodeFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: "alice@example.com",
          referenceCode: "TP-NBA6",
        }),
      })
    );
    expect(mockEmailVerificationCodeFindMany).not.toHaveBeenCalled();
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
    mockEmailVerificationCodeFindMany.mockResolvedValue([
      {
        id: "code-1",
        userId: "user-1",
        email: "alice@example.com",
        codeHash: hashEmailVerificationCode("user-1", "123456"),
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() - 60_000),
      },
    ]);
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
    mockEmailVerificationCodeFindMany.mockResolvedValue([
      {
        id: "code-1",
        userId: "user-1",
        email: "alice@example.com",
        codeHash: hashEmailVerificationCode("user-1", "123456"),
        attempts: 4,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
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

  it("accepts a matching code from an older active verification record", async () => {
    mockEmailVerificationCodeFindMany.mockResolvedValue([
      {
        id: "code-new",
        userId: "user-1",
        email: "alice@example.com",
        codePlain: "999999",
        codeHash: hashEmailVerificationCodeForStorage("999999"),
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
      },
      {
        id: "code-old",
        userId: "user-1",
        email: "alice@example.com",
        codePlain: "123456",
        codeHash: hashEmailVerificationCodeForStorage("123456"),
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);

    const { POST } = await import("@/app/api/auth/verify-email-code/route");
    const response = await POST(
      new Request("http://localhost:3000/api/auth/verify-email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com", code: "123456" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, verified: true });
  });

  it("returns success when the user is already verified", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
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
    expect(mockEmailVerificationCodeFindMany).not.toHaveBeenCalled();
  });
});
