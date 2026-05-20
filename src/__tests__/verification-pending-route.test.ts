import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockEmailVerificationCodeFindFirst = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: mockUserFindFirst,
      findUnique: mockUserFindUnique,
    },
    emailVerificationCode: {
      findFirst: mockEmailVerificationCodeFindFirst,
    },
  },
}));

describe("verification pending route GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      emailVerified: null,
    });
    mockUserFindUnique.mockResolvedValue({
      emailVerified: null,
    });
    mockEmailVerificationCodeFindFirst.mockResolvedValue({
      userId: "user-1",
      referenceCode: "TP-NBA6",
      codePlain: "123456",
      expiresAt: new Date(Date.now() + 60_000),
    });
  });

  it("returns the active reference and dev code outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { GET } = await import("@/app/api/auth/verification-pending/route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/verification-pending?email=alice@example.com")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(await response.json()).toMatchObject({
      ok: true,
      pending: true,
      referenceCode: "TP-NBA6",
      devCode: "123456",
    });
  });

  it("does not expose the plain code in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("@/app/api/auth/verification-pending/route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/verification-pending?email=alice@example.com")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      pending: true,
      referenceCode: "TP-NBA6",
    });
    expect(body).not.toHaveProperty("devCode");
  });
});
