import { beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockHash = vi.fn();
const mockConsumeRateLimit = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  hash: mockHash,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: mockConsumeRateLimit,
  consumeRateLimitWithStore: mockConsumeRateLimit,
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
  getRequestClientIdentifier: () => "test-client",
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

describe("register route POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockConsumeRateLimit.mockReturnValue({
      allowed: true,
      remaining: 9,
      retryAfterSeconds: 60,
    });
    mockHash.mockResolvedValue("hashed-password");
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      name: "Alice",
      email: "alice@example.com",
      role: "STUDENT",
    });
  });

  it("forces a safe default role even when the client sends ADMIN", async () => {
    const { POST } = await import("@/app/api/register/route");

    const response = await POST(
      makeJsonRequest({
        name: "Alice",
        username: "alice01",
        email: "alice@example.com",
        password: "secret123",
        role: "ADMIN",
        school: "GameEdu Academy",
      })
    );

    expect(response.status).toBe(200);
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Alice",
        username: "alice01",
        email: "alice@example.com",
        password: "hashed-password",
        role: "STUDENT",
        school: "GameEdu Academy",
      }),
    });
  });

  it("returns 429 when registration rate limit is exceeded", async () => {
    mockConsumeRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 30,
    });
    const { POST } = await import("@/app/api/register/route");

    const response = await POST(
      makeJsonRequest({
        name: "Alice",
        username: "alice01",
        email: "alice@example.com",
        password: "secret123",
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
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("masks duplicate email and username values in audit logs", async () => {
    mockUserFindUnique
      .mockResolvedValueOnce({ id: "existing-user" })
      .mockResolvedValueOnce({ id: "existing-user" });
    const { POST } = await import("@/app/api/register/route");

    const emailResponse = await POST(
      makeJsonRequest({
        name: "Alice",
        username: "alice01",
        email: "alice@example.com",
        password: "secret123",
      })
    );

    expect(emailResponse.status).toBe(400);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.register.denied",
        reason: "email_exists",
        metadata: { emailMasked: "al***@example.com" },
      })
    );
    expect(mockLogAuditEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ email: "alice@example.com" }),
      })
    );

    mockLogAuditEvent.mockClear();
    mockUserFindUnique.mockReset();
    mockUserFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing-user" });

    const usernameResponse = await POST(
      makeJsonRequest({
        name: "Alice",
        username: "alice01",
        email: "alice@example.com",
        password: "secret123",
      })
    );

    expect(usernameResponse.status).toBe(400);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.register.denied",
        reason: "username_taken",
        metadata: { usernameMasked: "al***01" },
      })
    );
    expect(mockLogAuditEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ username: "alice01" }),
      })
    );
  });

  it("returns a generic internal error response while keeping details in audit logs", async () => {
    mockUserFindUnique.mockReset();
    mockUserFindUnique.mockResolvedValue(null);
    mockHash.mockRejectedValueOnce(new Error("bcrypt exploded"));
    const { POST } = await import("@/app/api/register/route");

    const response = await POST(
      makeJsonRequest({
        name: "Alice",
        username: "alice01",
        email: "alice@example.com",
        password: "secret123",
      })
    );
    const body = await response.json();

    expect(body).not.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: "INVALID_PAYLOAD" }),
      })
    );
    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal error",
      },
    });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.register.failed",
        reason: "internal_error",
        metadata: expect.objectContaining({
          step: "hash_password",
          message: "bcrypt exploded",
        }),
      })
    );
  });
});
