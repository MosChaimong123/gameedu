import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveAuthSecret = vi.fn();
const mockEncodeOAuthRoleIntent = vi.fn();

vi.mock("@/lib/env", () => ({
  resolveAuthSecret: mockResolveAuthSecret,
}));

vi.mock("@/lib/auth/oauth-role-intent-cookie", () => ({
  OAUTH_ROLE_INTENT_COOKIE: "gamedu_oauth_role_intent",
  encodeOAuthRoleIntent: mockEncodeOAuthRoleIntent,
}));

describe("oauth intent route POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAuthSecret.mockReturnValue("test-secret");
    mockEncodeOAuthRoleIntent.mockReturnValue("signed-intent");
  });

  it("rejects invalid payloads with a structured error", async () => {
    const { POST } = await import("@/app/api/auth/oauth-intent/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/oauth-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "INVALID_PAYLOAD",
        message: "Invalid role",
      },
    });
    expect(mockEncodeOAuthRoleIntent).not.toHaveBeenCalled();
  });

  it("returns internal error when auth secret is unavailable", async () => {
    mockResolveAuthSecret.mockReturnValue("");
    const { POST } = await import("@/app/api/auth/oauth-intent/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/oauth-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "TEACHER" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Auth not configured",
      },
    });
  });

  it("sets the signed role intent cookie on success", async () => {
    const { POST } = await import("@/app/api/auth/oauth-intent/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/oauth-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "STUDENT" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockEncodeOAuthRoleIntent).toHaveBeenCalledWith("STUDENT", "test-secret");
    expect(response.headers.get("set-cookie")).toContain("gamedu_oauth_role_intent=signed-intent");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=600");
  });
});
