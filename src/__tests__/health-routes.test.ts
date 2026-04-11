import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidateServerEnv = vi.fn();
const mockPingOperationalDb = vi.fn();
const mockResolveRateLimitStore = vi.fn();
const mockResolveAuditLogSink = vi.fn();

vi.mock("@/lib/env", () => ({
  validateServerEnv: mockValidateServerEnv,
  resolveRateLimitStore: mockResolveRateLimitStore,
  resolveAuditLogSink: mockResolveAuditLogSink,
}));

vi.mock("@/lib/ops/mongo-admin", () => ({
  pingOperationalDb: mockPingOperationalDb,
}));

describe("health and readiness routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
    mockResolveRateLimitStore.mockReturnValue("memory");
    mockResolveAuditLogSink.mockReturnValue("console");
    mockValidateServerEnv.mockReturnValue({ HEALTHCHECK_DB_TIMEOUT_MS: 1000 });
    mockPingOperationalDb.mockResolvedValue({ ok: 1 });
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
    process.env.NODE_ENV = "production";
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
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        ok: true,
        status: "ready",
      })
    );
    expect(mockPingOperationalDb).toHaveBeenCalledWith(1000);
  });

  it("returns 503 when readiness fails", async () => {
    mockPingOperationalDb.mockRejectedValue(new Error("Database ping timed out"));
    const { GET } = await import("@/app/api/ready/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Database ping timed out",
      },
    });
  });
});
