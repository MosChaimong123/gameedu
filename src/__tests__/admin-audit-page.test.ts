import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockRedirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});
const mockListRecentAuditEvents = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/components/ui/page-back-link", () => ({
  PageBackLink: () => null,
}));

vi.mock("lucide-react", () => ({
  ScrollText: "ScrollTextIcon",
}));

vi.mock("@/lib/security/audit-log", () => ({
  listRecentAuditEvents: mockListRecentAuditEvents,
}));

describe("admin audit page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-admin users away from the page", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const AdminAuditPage = (await import("@/app/admin/audit/page")).default;

    await expect(AdminAuditPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    expect(mockListRecentAuditEvents).not.toHaveBeenCalled();
  });

  it("loads recent audit events for admin users", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockListRecentAuditEvents.mockResolvedValue([]);
    const AdminAuditPage = (await import("@/app/admin/audit/page")).default;

    await AdminAuditPage();

    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(100, {
      action: "",
      actorUserId: "",
      targetId: "",
      reason: "",
      actionPrefix: "",
      category: undefined,
      status: undefined,
      since: expect.any(Date),
    });
  });

  it("passes audit filters from search params to the query helper", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockListRecentAuditEvents.mockResolvedValue([]);
    const AdminAuditPage = (await import("@/app/admin/audit/page")).default;

    await AdminAuditPage({
      searchParams: Promise.resolve({
        action: "admin.user.deleted",
        actor: "admin-1",
        target: "user-2",
      }),
    });

    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(100, {
      action: "admin.user.deleted",
      actorUserId: "admin-1",
      targetId: "user-2",
      reason: "",
      actionPrefix: "",
      category: undefined,
      status: undefined,
      since: expect.any(Date),
    });
  });

  it("maps action group and day presets into audit filters", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockListRecentAuditEvents.mockResolvedValue([]);
    const AdminAuditPage = (await import("@/app/admin/audit/page")).default;

    await AdminAuditPage({
      searchParams: Promise.resolve({
        group: "socket.",
        days: "30",
      }),
    });

    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(100, {
      action: "",
      actorUserId: "",
      targetId: "",
      reason: "",
      actionPrefix: "socket.",
      category: undefined,
      status: undefined,
      since: expect.any(Date),
    });
  });

  it("passes status filter into the audit query helper", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockListRecentAuditEvents.mockResolvedValue([]);
    const AdminAuditPage = (await import("@/app/admin/audit/page")).default;

    await AdminAuditPage({
      searchParams: Promise.resolve({
        status: "rejected",
      }),
    });

    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(100, {
      action: "",
      actorUserId: "",
      targetId: "",
      reason: "",
      actionPrefix: "",
      category: undefined,
      status: "rejected",
      since: expect.any(Date),
    });
  });

  it("passes category filter into the audit query helper", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockListRecentAuditEvents.mockResolvedValue([]);
    const AdminAuditPage = (await import("@/app/admin/audit/page")).default;

    await AdminAuditPage({
      searchParams: Promise.resolve({
        category: "upload",
      }),
    });

    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(100, {
      action: "",
      actorUserId: "",
      targetId: "",
      reason: "",
      actionPrefix: "",
      category: "upload",
      status: undefined,
      since: expect.any(Date),
    });
  });

  it("passes reason filter into the audit query helper", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockListRecentAuditEvents.mockResolvedValue([]);
    const AdminAuditPage = (await import("@/app/admin/audit/page")).default;

    await AdminAuditPage({
      searchParams: Promise.resolve({
        reason: "rate_limited",
      }),
    });

    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(100, {
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
