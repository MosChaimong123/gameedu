import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockListRecentAuditEvents = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/security/audit-log", () => ({
  listRecentAuditEvents: mockListRecentAuditEvents,
}));

describe("admin audit export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin access", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const { GET } = await import("@/app/admin/audit/export/route");

    const response = await GET(new Request("http://localhost/admin/audit/export"));

    expect(response.status).toBe(403);
  });

  it("exports filtered audit events as csv", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockListRecentAuditEvents.mockResolvedValue([
      {
        timestamp: new Date("2026-04-04T01:02:03.000Z"),
        action: "admin.user.deleted",
        category: "admin",
        reason: "cleanup",
        status: "rejected",
        actorUserId: "admin-1",
        targetType: "user",
        targetId: "user-2",
        metadata: { reason: "cleanup" },
      },
    ]);
    const { GET } = await import("@/app/admin/audit/export/route");

    const response = await GET(
      new Request(
        "http://localhost/admin/audit/export?action=admin.user.deleted&actor=admin-1&target=user-2&group=admin.&days=30"
      )
    );

    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(500, {
      action: "admin.user.deleted",
      actorUserId: "admin-1",
      targetId: "user-2",
      reason: "",
      actionPrefix: "admin.",
      category: undefined,
      status: undefined,
      since: expect.any(Date),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("audit-log-export.csv");
    await expect(response.text()).resolves.toContain("admin.user.deleted");
  });

  it("sanitizes spreadsheet formula-looking values in csv export", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockListRecentAuditEvents.mockResolvedValue([
      {
        timestamp: new Date("2026-04-04T01:02:03.000Z"),
        action: "upload.succeeded",
        category: "upload",
        reason: "ok",
        status: "success",
        actorUserId: "admin-1",
        targetType: "upload",
        targetId: '=cmd|"/C calc"!A0',
        metadata: { originalFileName: "@payload.csv" },
      },
    ]);
    const { GET } = await import("@/app/admin/audit/export/route");

    const response = await GET(new Request("http://localhost/admin/audit/export"));
    const csv = await response.text();

    expect(csv).toContain(`"'=cmd|""/C calc""!A0"`);
    expect(csv).toContain(`"{""originalFileName"":""'@payload.csv""}"`);
  });

  it("passes status filter through export route", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockListRecentAuditEvents.mockResolvedValue([]);
    const { GET } = await import("@/app/admin/audit/export/route");

    await GET(new Request("http://localhost/admin/audit/export?status=error"));

    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(500, {
      action: "",
      actorUserId: "",
      targetId: "",
      reason: "",
      actionPrefix: "",
      category: undefined,
      status: "error",
      since: expect.any(Date),
    });
  });

  it("passes category filter through export route", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockListRecentAuditEvents.mockResolvedValue([]);
    const { GET } = await import("@/app/admin/audit/export/route");

    await GET(new Request("http://localhost/admin/audit/export?category=socket"));

    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(500, {
      action: "",
      actorUserId: "",
      targetId: "",
      reason: "",
      actionPrefix: "",
      category: "socket",
      status: undefined,
      since: expect.any(Date),
    });
  });

  it("passes reason filter through export route", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockListRecentAuditEvents.mockResolvedValue([]);
    const { GET } = await import("@/app/admin/audit/export/route");

    await GET(new Request("http://localhost/admin/audit/export?reason=rate_limited"));

    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(500, {
      action: "",
      actorUserId: "",
      targetId: "",
      reason: "rate_limited",
      actionPrefix: "",
      category: undefined,
      status: undefined,
      since: expect.any(Date),
    });
  });
});
