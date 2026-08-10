import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockSessionFindMany = vi.fn();
const mockSecuritySessionUpdateMany = vi.fn();
const mockAdapterSessionDeleteMany = vi.fn();
const mockListActivity = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockVerifyRecentOrPassword = vi.fn();
const mockRateLimit = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({
  db: {
    userAuthSession: {
      findMany: mockSessionFindMany,
      updateMany: mockSecuritySessionUpdateMany,
    },
    session: { deleteMany: mockAdapterSessionDeleteMany },
  },
}));
vi.mock("@/lib/security/audit-log", () => ({
  listRecentAuditEvents: mockListActivity,
  logAuditEvent: mockLogAuditEvent,
}));
vi.mock("@/lib/auth/reauthentication", () => ({
  verifyRecentOrPassword: mockVerifyRecentOrPassword,
}));
vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimitWithStore: mockRateLimit,
  createRateLimitResponse: () => Response.json(
    { error: { code: "RATE_LIMITED", message: "Too many requests" } },
    { status: 429 },
  ),
}));

const USER_ID = "507f1f77bcf86cd799439011";
const CURRENT_SESSION_ID = "507f1f77bcf86cd799439012";
const OTHER_SESSION_ID = "507f1f77bcf86cd799439099";

function authenticatedSession() {
  return {
    user: {
      id: USER_ID,
      role: "TEACHER",
      securitySessionId: CURRENT_SESSION_ID,
      authenticatedAt: Date.now(),
    },
  };
}

describe("account session security routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(authenticatedSession());
    mockSessionFindMany.mockResolvedValue([]);
    mockSecuritySessionUpdateMany.mockResolvedValue({ count: 1 });
    mockAdapterSessionDeleteMany.mockResolvedValue({ count: 0 });
    mockListActivity.mockResolvedValue([]);
    mockVerifyRecentOrPassword.mockResolvedValue(true);
    mockRateLimit.mockResolvedValue({ allowed: true });
  });

  it("rejects unauthenticated session listing before querying the database", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("@/app/api/auth/security/sessions/route");

    const response = await GET();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "AUTH_REQUIRED", message: "Unauthorized" },
    });
    expect(mockSessionFindMany).not.toHaveBeenCalled();
  });

  it("returns only active sessions with a minimized response shape", async () => {
    const now = new Date("2026-08-10T10:00:00.000Z");
    const absoluteExpiresAt = new Date("2026-08-11T10:00:00.000Z");
    const idleExpiresAt = new Date("2026-08-10T11:00:00.000Z");
    mockSessionFindMany.mockResolvedValue([{
      id: CURRENT_SESSION_ID,
      deviceLabel: "Chrome on Windows",
      authMethod: "credentials",
      mfaLevel: 1,
      createdAt: now,
      lastSeenAt: now,
      absoluteExpiresAt,
      idleExpiresAt,
      ipDigest: "must-not-leak",
      userAgentDigest: "must-not-leak",
    }]);
    const { GET } = await import("@/app/api/auth/security/sessions/route");

    const body = await (await GET()).json();
    expect(body).toEqual({
      sessions: [{
        id: CURRENT_SESSION_ID,
        deviceLabel: "Chrome on Windows",
        authMethod: "credentials",
        mfaLevel: 1,
        createdAt: now.toISOString(),
        lastSeenAt: now.toISOString(),
        expiresAt: idleExpiresAt.toISOString(),
        current: true,
      }],
    });
    expect(mockSessionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: USER_ID,
        OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }],
        absoluteExpiresAt: { gt: expect.any(Date) },
        idleExpiresAt: { gt: expect.any(Date) },
      }),
      take: 50,
    }));
    expect(JSON.stringify(body)).not.toContain("Digest");
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
  });

  it("rejects unauthenticated and malformed single-session revocation", async () => {
    const { DELETE } = await import("@/app/api/auth/security/sessions/[id]/route");
    mockAuth.mockResolvedValue(null);
    expect((await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: OTHER_SESSION_ID }),
    })).status).toBe(401);

    mockAuth.mockResolvedValue(authenticatedSession());
    expect((await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "not-an-id" }),
    })).status).toBe(404);
    expect(mockSecuritySessionUpdateMany).not.toHaveBeenCalled();
  });

  it("scopes single-session revocation to the authenticated owner", async () => {
    const { DELETE } = await import("@/app/api/auth/security/sessions/[id]/route");
    const response = await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: OTHER_SESSION_ID }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, current: false });
    expect(mockSecuritySessionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: OTHER_SESSION_ID,
        userId: USER_ID,
        OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }],
      },
      data: { revokedAt: expect.any(Date), revokedReason: "user_revoked" },
    });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: USER_ID,
      targetId: OTHER_SESSION_ID,
      metadata: { current: false },
    }));
  });

  it("returns not found without leaking ownership when no session is revoked", async () => {
    mockSecuritySessionUpdateMany.mockResolvedValue({ count: 0 });
    const { DELETE } = await import("@/app/api/auth/security/sessions/[id]/route");
    const response = await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: OTHER_SESSION_ID }),
    });

    expect(response.status).toBe(404);
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });

  it("rate limits logout-others before attempting reauthentication", async () => {
    mockRateLimit.mockResolvedValue({ allowed: false });
    const { POST } = await import("@/app/api/auth/security/sessions/logout-others/route");
    const response = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "guess" }),
    }));

    expect(response.status).toBe(429);
    expect(mockRateLimit).toHaveBeenCalledWith({
      bucket: "auth:security:logout-others:user",
      key: USER_ID,
      limit: 5,
      windowMs: 15 * 60_000,
    });
    expect(mockVerifyRecentOrPassword).not.toHaveBeenCalled();
    expect(mockSecuritySessionUpdateMany).not.toHaveBeenCalled();
  });

  it("requires strong recent authentication or a valid password", async () => {
    mockVerifyRecentOrPassword.mockResolvedValue(false);
    const session = authenticatedSession();
    mockAuth.mockResolvedValue(session);
    const { POST } = await import("@/app/api/auth/security/sessions/logout-others/route");
    const response = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "incorrect" }),
    }));

    expect(response.status).toBe(403);
    expect(mockVerifyRecentOrPassword).toHaveBeenCalledWith(session, "incorrect");
    expect(mockSecuritySessionUpdateMany).not.toHaveBeenCalled();
  });

  it("revokes every other registry session while preserving the current one", async () => {
    mockSecuritySessionUpdateMany.mockResolvedValue({ count: 3 });
    const { POST } = await import("@/app/api/auth/security/sessions/logout-others/route");
    const response = await POST(new Request("http://localhost", {
      method: "POST",
      body: "{}",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, revoked: 3 });
    expect(mockSecuritySessionUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        id: { not: CURRENT_SESSION_ID },
        OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }],
      },
      data: { revokedAt: expect.any(Date), revokedReason: "logout_other_devices" },
    });
    expect(mockAdapterSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "auth.session.others_revoked",
      metadata: { count: 3 },
    }));
  });

  it("returns only minimized auth activity belonging to the current user", async () => {
    const timestamp = new Date("2026-08-10T12:00:00.000Z");
    mockListActivity.mockResolvedValue([{
      action: "auth.session.revoked",
      status: "success",
      reason: "internal-risk-detail",
      timestamp,
      metadata: { ipDigest: "must-not-leak" },
    }]);
    const { GET } = await import("@/app/api/auth/security/activity/route");
    const body = await (await GET()).json();

    expect(mockListActivity).toHaveBeenCalledWith(40, {
      actorUserId: USER_ID,
      category: "auth",
    });
    expect(body).toEqual({ activity: [{
      action: "auth.session.revoked",
      status: "success",
      timestamp: timestamp.toISOString(),
    }] });
    expect(JSON.stringify(body)).not.toContain("internal-risk-detail");
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
  });

  it("rejects unauthenticated activity requests before reading audit data", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("@/app/api/auth/security/activity/route");
    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockListActivity).not.toHaveBeenCalled();
  });
});
