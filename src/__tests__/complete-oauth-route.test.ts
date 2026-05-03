import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockResolveAuthSecret = vi.fn();
const mockDecodeOAuthRoleIntent = vi.fn();
const mockResolveBrowserRedirectOrigin = vi.fn();
const mockCookies = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/env", () => ({
  resolveAuthSecret: mockResolveAuthSecret,
}));

vi.mock("@/lib/auth/oauth-role-intent-cookie", () => ({
  OAUTH_ROLE_INTENT_COOKIE: "gamedu_oauth_role_intent",
  decodeOAuthRoleIntent: mockDecodeOAuthRoleIntent,
}));

vi.mock("@/lib/resolve-browser-redirect-origin", () => ({
  resolveBrowserRedirectOrigin: mockResolveBrowserRedirectOrigin,
}));

describe("complete oauth route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveBrowserRedirectOrigin.mockReturnValue("http://localhost:3000");
    mockCookies.mockResolvedValue({
      get: vi.fn(() => ({ value: "intent-cookie" })),
    });
    mockResolveAuthSecret.mockReturnValue("test-secret");
    mockDecodeOAuthRoleIntent.mockReturnValue({ role: "STUDENT", exp: 9999999999 });
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockUserFindUnique.mockResolvedValue({
      role: "USER",
      emailVerified: null,
    });
    mockUserUpdate.mockResolvedValue(undefined);
  });

  it("redirects unauthenticated users back to login while preserving a safe callbackUrl", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("@/app/auth/complete-oauth/route");

    const response = await GET(
      new Request("http://localhost:3000/auth/complete-oauth?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fdashboard")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?callbackUrl=%2Fdashboard"
    );
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("prefers a validated callbackUrl and clears the intent cookie", async () => {
    const { GET } = await import("@/app/auth/complete-oauth/route");

    const response = await GET(
      new Request("http://localhost:3000/auth/complete-oauth?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fdashboard%2Fmy-sets")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard/my-sets");
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        role: "STUDENT",
        emailVerified: expect.any(Date),
      },
    });
    expect(response.headers.get("set-cookie")).toContain("gamedu_oauth_role_intent=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("falls back to role-based redirect when callbackUrl is cross-origin", async () => {
    const { GET } = await import("@/app/auth/complete-oauth/route");

    const response = await GET(
      new Request("http://localhost:3000/auth/complete-oauth?callbackUrl=https%3A%2F%2Fevil.example%2Fphish")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/student/home");
  });

  it("redirects to login with callback preservation when the signed-in user record no longer exists", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/auth/complete-oauth/route");

    const response = await GET(
      new Request("http://localhost:3000/auth/complete-oauth?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fdashboard")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?callbackUrl=%2Fdashboard"
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
