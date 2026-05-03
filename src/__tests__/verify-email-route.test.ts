import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVerificationTokenFindUnique = vi.fn();
const mockVerificationTokenDeleteMany = vi.fn();
const mockUserUpdateMany = vi.fn();
const mockResolveBrowserRedirectOrigin = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    verificationToken: {
      findUnique: mockVerificationTokenFindUnique,
      deleteMany: mockVerificationTokenDeleteMany,
    },
    user: {
      updateMany: mockUserUpdateMany,
    },
  },
}));

vi.mock("@/lib/resolve-browser-redirect-origin", () => ({
  resolveBrowserRedirectOrigin: mockResolveBrowserRedirectOrigin,
}));

describe("verify email route GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveBrowserRedirectOrigin.mockReturnValue("http://localhost:3000");
    mockVerificationTokenDeleteMany.mockResolvedValue({ count: 1 });
    mockUserUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("redirects to login with missing_token when token is absent", async () => {
    const { GET } = await import("@/app/api/auth/verify-email/route");

    const response = await GET(new Request("http://localhost:3000/api/auth/verify-email"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?verifyError=missing_token"
    );
    expect(mockVerificationTokenFindUnique).not.toHaveBeenCalled();
  });

  it("redirects to login with invalid_or_expired when token is unknown", async () => {
    mockVerificationTokenFindUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/api/auth/verify-email/route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/verify-email?token=abc123")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?verifyError=invalid_or_expired"
    );
  });

  it("redirects to login with invalid_or_expired when token has expired", async () => {
    mockVerificationTokenFindUnique.mockResolvedValue({
      identifier: "alice@example.com",
      token: "abc123",
      expires: new Date(Date.now() - 60_000),
    });
    const { GET } = await import("@/app/api/auth/verify-email/route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/verify-email?token=abc123")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?verifyError=invalid_or_expired"
    );
    expect(mockUserUpdateMany).not.toHaveBeenCalled();
  });

  it("marks matching unverified users as verified and redirects with success banner", async () => {
    mockVerificationTokenFindUnique.mockResolvedValue({
      identifier: "alice@example.com",
      token: "abc123",
      expires: new Date(Date.now() + 60_000),
    });
    const { GET } = await import("@/app/api/auth/verify-email/route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/verify-email?token=abc123")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?verified=1");
    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { email: "alice@example.com", emailVerified: null },
      data: { emailVerified: expect.any(Date) },
    });
    expect(mockVerificationTokenDeleteMany).toHaveBeenCalledWith({
      where: { identifier: "alice@example.com" },
    });
  });
});
