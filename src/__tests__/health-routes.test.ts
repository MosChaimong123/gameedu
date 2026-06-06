import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockValidateServerEnv = vi.fn();
const mockPingOperationalDb = vi.fn();
const mockResolveRateLimitStore = vi.fn();
const mockResolveAuditLogSink = vi.fn();
const mockDbConnect = vi.fn();
const mockIsLineBotConfigured = vi.fn();
const mockIsR2Configured = vi.fn();

vi.mock("@/lib/env", () => ({
  validateServerEnv: mockValidateServerEnv,
  resolveRateLimitStore: mockResolveRateLimitStore,
  resolveAuditLogSink: mockResolveAuditLogSink,
}));

vi.mock("@/lib/ops/mongo-admin", () => ({
  pingOperationalDb: mockPingOperationalDb,
}));

vi.mock("@/lib/db", () => ({
  db: { $connect: mockDbConnect },
}));

vi.mock("@/lib/line-bot/config", () => ({
  isLineBotConfigured: mockIsLineBotConfigured,
}));

vi.mock("@/lib/storage/r2-env", () => ({
  isR2Configured: mockIsR2Configured,
}));

describe("health and readiness routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    mockResolveRateLimitStore.mockReturnValue("memory");
    mockResolveAuditLogSink.mockReturnValue("console");
    mockValidateServerEnv.mockReturnValue({
      HEALTHCHECK_DB_TIMEOUT_MS: 1000,
      STRIPE_SECRET_KEY: "sk_test",
    });
    mockPingOperationalDb.mockResolvedValue({ ok: 1 });
    mockDbConnect.mockResolvedValue(undefined);
    mockIsLineBotConfigured.mockReturnValue(false);
    mockIsR2Configured.mockReturnValue(false);
  });

  it("returns health metadata", async () => {
    const { GET } = await import("@/app/api/health/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        ok: true,
        status: "healthy",
        nodeEnv: "test",
        rateLimitStore: "memory",
        auditLogSink: "console",
        uptimeSeconds: expect.any(Number),
      })
    );
  });

  it("keeps liveness healthy even when critical server env is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockResolveRateLimitStore.mockReturnValue("mongo");
    mockResolveAuditLogSink.mockReturnValue("both");

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        ok: true,
        status: "healthy",
        nodeEnv: "production",
        rateLimitStore: "mongo",
        auditLogSink: "both",
      })
    );
  });

  it("returns readiness success when env and database checks pass", async () => {
    const { GET } = await import("@/app/api/ready/route");

    const response = await GET();
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("ready");
    expect(body.checks).toMatchObject({ mongodb: "ok", prisma: "ok" });
    expect(mockPingOperationalDb).toHaveBeenCalledWith(1000);
  });

  it("returns 503 with structured errors when mongodb ping fails", async () => {
    mockPingOperationalDb.mockRejectedValue(new Error("Database ping timed out"));
    const { GET } = await import("@/app/api/ready/route");

    const response = await GET();
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.status).toBe("not_ready");
    expect((body.checks as Record<string, string>).mongodb).toBe("error");
    expect((body.errors as string[]).join(" ")).toContain("mongodb");
  });
});
