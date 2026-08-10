import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashEmailVerificationCodeForStorage } from "@/lib/email-verification";

const mockUserFindFirst = vi.fn();
const mockUserUpdate = vi.fn();
const mockCodeFindFirst = vi.fn();
const mockCodeFindMany = vi.fn();
const mockCodeUpdate = vi.fn();
const mockCodeUpdateMany = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockHash = vi.fn();
const mockConsumeRateLimitWithStore = vi.fn();
const mockTransaction = vi.fn();
const mockSessionDeleteMany = vi.fn();
const mockTransactionUserFindUnique = vi.fn();
const mockSecuritySessionUpdateMany = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: { findFirst: mockUserFindFirst, update: mockUserUpdate },
    emailVerificationCode: {
      findFirst: mockCodeFindFirst,
      findMany: mockCodeFindMany,
      update: mockCodeUpdate,
      updateMany: mockCodeUpdateMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/security/audit-log", () => ({ logAuditEvent: mockLogAuditEvent }));
vi.mock("@/lib/security/rate-limit", () => ({
  buildRateLimitKey: (...parts: string[]) => parts.filter(Boolean).join(":"),
  consumeRateLimitWithStore: mockConsumeRateLimitWithStore,
  createRateLimitResponse: (input: number | { retryAfterSeconds: number }) =>
    Response.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests" } },
      {
        status: 429,
        headers: {
          "Retry-After": String(typeof input === "number" ? input : input.retryAfterSeconds),
        },
      }
    ),
  digestRateLimitIdentifier: (value: string) => `digest:${value}`,
  getRequestClientIdentifier: () => "test-client",
}));
vi.mock("bcryptjs", () => ({ hash: mockHash }));

function request(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost:3000/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "alice@example.com",
      code: "123456",
      referenceCode: "TP-AB12",
      newPassword: "new-password",
      ...overrides,
    }),
  });
}

function resetRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "code-1",
    userId: "user-1",
    email: "alice@example.com",
    referenceCode: "TP-AB12",
    codePlain: "123456",
    codeHash: "legacy-hash",
    purpose: "PASSWORD_RESET",
    attempts: 0,
    maxAttempts: 5,
    expiresAt: new Date(Date.now() + 60_000),
    status: "ACTIVE",
    ...overrides,
  };
}

describe("reset password route lifecycle", () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindFirst.mockResolvedValue({ id: "user-1", email: "alice@example.com", authVersion: 4 });
    mockUserUpdate.mockResolvedValue({});
    mockCodeFindFirst.mockResolvedValue(resetRecord());
    mockCodeFindMany.mockResolvedValue([]);
    mockCodeUpdate.mockResolvedValue({});
    mockCodeUpdateMany.mockResolvedValue({ count: 1 });
    mockHash.mockResolvedValue("hashed-new-password");
    mockConsumeRateLimitWithStore.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        user: { findUnique: mockTransactionUserFindUnique, update: mockUserUpdate },
        session: { deleteMany: mockSessionDeleteMany },
        userAuthSession: { updateMany: mockSecuritySessionUpdateMany },
        emailVerificationCode: { updateMany: mockCodeUpdateMany },
      })
    );
    mockSessionDeleteMany.mockResolvedValue({ count: 2 });
    mockSecuritySessionUpdateMany.mockResolvedValue({ count: 3 });
    mockTransactionUserFindUnique.mockResolvedValue({ authVersion: 4 });
  });

  it("only queries active or legacy password-reset records", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockCodeFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: "alice@example.com",
          purpose: "PASSWORD_RESET",
          AND: expect.arrayContaining([
            expect.objectContaining({ OR: [{ status: "ACTIVE" }, { status: { isSet: false } }] }),
          ]),
        }),
      })
    );
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { password: "$gamedu$sha256$hashed-new-password", authVersion: { increment: 1 }, passwordChangedAt: expect.any(Date) },
    });
    expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(mockCodeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CONSUMED", consumedAt: expect.any(Date), codePlain: null } })
    );
    expect(mockCodeUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: "user-1",
        purpose: "PASSWORD_RESET",
      }),
      data: { status: "CONSUMED", consumedAt: expect.any(Date), codePlain: null },
    });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.password_reset.sessions_revoked",
        metadata: { strategy: "jwt", databaseSessionsDeleted: 2 },
      })
    );
  });

  it("initializes a missing legacy auth version while resetting the password", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "legacy-user",
      email: "alice@example.com",
      authVersion: null,
    });
    mockTransactionUserFindUnique.mockResolvedValue({ authVersion: null });
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "legacy-user" },
      data: { password: "$gamedu$sha256$hashed-new-password", authVersion: 1, passwordChangedAt: expect.any(Date) },
    });
  });

  it("rate-limits verification before account lookup", async () => {
    mockConsumeRateLimitWithStore.mockResolvedValue({ allowed: false, retryAfterSeconds: 90 });
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("90");
    expect(mockUserFindFirst).not.toHaveBeenCalled();
  });

  it("does not accept a pending code even if a stale query returns it", async () => {
    mockCodeFindFirst.mockResolvedValue(resetRecord({ status: "PENDING" }));
    mockCodeFindMany.mockResolvedValue([]);
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("never accepts a signup verification code for password reset", async () => {
    mockCodeFindFirst.mockResolvedValue(resetRecord({ purpose: "SIGNUP_VERIFY" }));
    mockCodeFindMany.mockResolvedValue([]);
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("rejects a consumed code even if returned by a stale query", async () => {
    mockCodeFindFirst.mockResolvedValue(resetRecord({ status: "CONSUMED" }));
    mockCodeFindMany.mockResolvedValue([]);
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("keeps pre-migration records without status usable during rollout", async () => {
    mockCodeFindFirst.mockResolvedValue(resetRecord({ status: undefined }));
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("marks an expired active code terminal before returning", async () => {
    mockCodeFindFirst.mockResolvedValue(resetRecord({ expiresAt: new Date(Date.now() - 1_000) }));
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mockCodeUpdate).toHaveBeenCalledWith({
      where: { id: "code-1" },
      data: { status: "EXPIRED", consumedAt: expect.any(Date), codePlain: null },
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("allows only one concurrent request to claim a valid OTP", async () => {
    mockCodeUpdateMany.mockResolvedValueOnce({ count: 0 });
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockLogAuditEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.password_reset.completed" })
    );
  });

  it("increments invalid attempts with an atomic compare-and-set", async () => {
    mockCodeFindFirst.mockResolvedValue(resetRecord({ codePlain: "999999", codeHash: "invalid" }));
    mockCodeFindMany.mockResolvedValue([]);
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mockCodeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "code-1", attempts: 0, expiresAt: { gt: expect.any(Date) } }),
        data: { attempts: { increment: 1 } },
      })
    );
  });

  it("rejects an invalid-attempt race when another request already changed the record", async () => {
    mockCodeFindFirst.mockResolvedValue(resetRecord({ codePlain: "999999", codeHash: "invalid" }));
    mockCodeFindMany.mockResolvedValue([]);
    mockCodeUpdateMany.mockResolvedValueOnce({ count: 0 });
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("rejects a code that has reached its maximum attempts", async () => {
    mockCodeFindFirst.mockResolvedValue(resetRecord({ codePlain: "999999", codeHash: "invalid", attempts: 5 }));
    mockCodeFindMany.mockResolvedValue([]);
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("hashes the new password and keeps secrets out of audit metadata", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request({ newPassword: "new-password" }));

    expect(response.status).toBe(200);
    expect(mockHash).toHaveBeenCalledWith(expect.any(String), 12);
    const serializedAudits = JSON.stringify(mockLogAuditEvent.mock.calls);
    expect(serializedAudits).not.toContain("123456");
    expect(serializedAudits).not.toContain("new-password");
    expect(serializedAudits).not.toContain("hashed-new-password");
  });

  it("enforces a twelve-character reset password policy", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request({ newPassword: "short7" }));

    expect(response.status).toBe(400);
    expect(mockUserFindFirst).not.toHaveBeenCalled();
  });

  it("never authenticates a production OTP from plaintext fallback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_VERIFICATION_PEPPER", "test-email-verification-pepper-32-chars");
    mockCodeFindFirst.mockResolvedValue(resetRecord({ codePlain: "123456", codeHash: "invalid" }));
    mockCodeFindMany.mockResolvedValue([]);
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("authenticates a production OTP through the dedicated HMAC pepper", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_VERIFICATION_PEPPER", "test-email-verification-pepper-32-chars");
    mockCodeFindFirst.mockResolvedValue(
      resetRecord({ codePlain: null, codeHash: hashEmailVerificationCodeForStorage("123456") })
    );
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
  });
});
