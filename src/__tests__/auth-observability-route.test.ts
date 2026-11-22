import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockGetAuthSecurityObservability = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/security/auth-observability", () => ({
  getAuthSecurityObservability: mockGetAuthSecurityObservability,
}));

describe("admin auth observability route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthSecurityObservability.mockResolvedValue({
      generatedAt: "2026-08-03T00:00:00.000Z",
      windowMinutes: 30,
      status: "ok",
      metrics: { signInSuccess: 2 },
      alerts: [],
    });
  });

  it("requires an MFA-authenticated admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER", mfaLevel: 1 } });
    const { GET } = await import("@/app/api/admin/security/auth-health/route");
    const response = await GET(new Request("http://localhost/api/admin/security/auth-health"));
    expect(response.status).toBe(403);
    expect(mockGetAuthSecurityObservability).not.toHaveBeenCalled();
  });

  it("returns aggregate no-store metrics without identity inputs", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", mfaLevel: 1 } });
    const { GET } = await import("@/app/api/admin/security/auth-health/route");
    const response = await GET(new Request("http://localhost/api/admin/security/auth-health?windowMinutes=30"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockGetAuthSecurityObservability).toHaveBeenCalledWith(30);
    expect(JSON.stringify(await response.json())).not.toMatch(/email|password|otp|ipAddress/i);
  });
});
