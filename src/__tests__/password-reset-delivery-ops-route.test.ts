import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockFindFirst = vi.fn();
const mockCount = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({
  db: { emailVerificationCode: { findFirst: mockFindFirst, count: mockCount } },
}));

describe("GET /api/admin/ops/password-reset-delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockCount.mockResolvedValue(4);
    mockFindFirst.mockResolvedValue({
      referenceCode: "TP-AB12",
      emailProvider: "resend",
      providerMessageId: "email-123",
      deliveryStatus: "DELIVERED",
      providerAcceptedAt: new Date("2026-07-14T00:00:00.000Z"),
      deliveryUpdatedAt: new Date("2026-07-14T00:00:05.000Z"),
      expiresAt: new Date("2026-07-14T00:15:00.000Z"),
    });
  });

  it("requires an admin session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const { GET } = await import("@/app/api/admin/ops/password-reset-delivery/route");
    const response = await GET(new Request("http://localhost/api/admin/ops/password-reset-delivery?referenceCode=TP-AB12"));
    expect(response.status).toBe(403);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("returns delivery state without email or OTP fields", async () => {
    mockCount.mockResolvedValueOnce(10).mockResolvedValueOnce(1);
    const { GET } = await import("@/app/api/admin/ops/password-reset-delivery/route");
    const response = await GET(new Request("http://localhost/api/admin/ops/password-reset-delivery?referenceCode=tp-ab12"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.delivery).toEqual(expect.objectContaining({
      referenceCode: "TP-AB12",
      provider: "resend",
      providerMessageId: "email-123",
      status: "DELIVERED",
    }));
    expect(JSON.stringify(body)).not.toContain("alice@example.com");
    expect(JSON.stringify(body)).not.toContain("123456");
  });
});
