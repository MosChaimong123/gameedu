import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindUnique = vi.fn();
const mockEmailVerificationCodeFindFirst = vi.fn();
const mockCookies = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
    },
    emailVerificationCode: {
      findFirst: mockEmailVerificationCodeFindFirst,
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

describe("verification pending route GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("AUTH_SECRET", "test-verification-flow-secret-with-32-bytes");
    mockCookies.mockResolvedValue({ get: vi.fn(() => undefined) });
    mockUserFindUnique.mockResolvedValue({ emailVerified: null });
    mockEmailVerificationCodeFindFirst.mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      referenceCode: "TP-NBA6",
      expiresAt: new Date(Date.now() + 60_000),
    });
  });

  it("encrypts, authenticates, and expires the browser flow handle", async () => {
    const {
      decodeVerificationFlowHandle,
      encodeVerificationFlowHandle,
      VERIFICATION_FLOW_MAX_AGE_SECONDS,
    } = await import("@/lib/auth/verification-flow-handle");
    const now = Date.now();
    const secret = process.env.AUTH_SECRET as string;
    const handle = encodeVerificationFlowHandle(
      {
        userId: "507f1f77bcf86cd799439011",
        email: "alice@example.com",
      },
      secret,
      now
    );

    expect(handle).not.toContain("alice@example.com");
    expect(handle).not.toContain("507f1f77bcf86cd799439011");
    expect(decodeVerificationFlowHandle(handle, secret, now)).toMatchObject({
      userId: "507f1f77bcf86cd799439011",
      email: "alice@example.com",
    });
    expect(
      decodeVerificationFlowHandle(
        handle,
        secret,
        now + (VERIFICATION_FLOW_MAX_AGE_SECONDS + 1) * 1000
      )
    ).toBeNull();
  });

  it("does not perform a public lookup from an email query parameter", async () => {
    const { GET } = await import("@/app/api/auth/verification-pending/route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/verification-pending?email=alice@example.com")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(await response.json()).toEqual({ ok: true, pending: false });
    expect(mockEmailVerificationCodeFindFirst).not.toHaveBeenCalled();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns pending details only for the browser holding a valid opaque handle", async () => {
    const {
      encodeVerificationFlowHandle,
      VERIFICATION_FLOW_COOKIE,
    } = await import("@/lib/auth/verification-flow-handle");
    const handle = encodeVerificationFlowHandle(
      {
        userId: "507f1f77bcf86cd799439011",
        email: "alice@example.com",
      },
      process.env.AUTH_SECRET as string
    );
    mockCookies.mockResolvedValue({
      get: vi.fn((name: string) => name === VERIFICATION_FLOW_COOKIE ? { value: handle } : undefined),
    });
    const { GET } = await import("@/app/api/auth/verification-pending/route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/verification-pending?email=attacker@example.com")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      pending: true,
      email: "alice@example.com",
      referenceCode: "TP-NBA6",
      expiresAt: expect.any(String),
    });
    expect(mockEmailVerificationCodeFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "507f1f77bcf86cd799439011",
          email: "alice@example.com",
        }),
      })
    );
  });

  it("returns an encrypted-handle dev code only to the originating browser in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const {
      encodeVerificationFlowHandle,
      VERIFICATION_FLOW_COOKIE,
    } = await import("@/lib/auth/verification-flow-handle");
    const handle = encodeVerificationFlowHandle(
      {
        userId: "507f1f77bcf86cd799439011",
        email: "alice@example.com",
        devCode: "123456",
      },
      process.env.AUTH_SECRET as string
    );
    expect(handle).not.toContain("123456");
    mockCookies.mockResolvedValue({
      get: vi.fn((name: string) => name === VERIFICATION_FLOW_COOKIE ? { value: handle } : undefined),
    });
    const { GET } = await import("@/app/api/auth/verification-pending/route");

    const response = await GET(new Request("http://localhost:3000/api/auth/verification-pending"));
    expect(await response.json()).toMatchObject({
      pending: true,
      devCode: "123456",
    });
  });

  it("rejects a tampered opaque handle without querying account state", async () => {
    const {
      encodeVerificationFlowHandle,
      VERIFICATION_FLOW_COOKIE,
    } = await import("@/lib/auth/verification-flow-handle");
    const valid = encodeVerificationFlowHandle(
      {
        userId: "507f1f77bcf86cd799439011",
        email: "alice@example.com",
      },
      process.env.AUTH_SECRET as string
    );
    const parts = valid.split(".");
    parts[3] = `${parts[3].startsWith("A") ? "B" : "A"}${parts[3].slice(1)}`;
    const tampered = parts.join(".");
    mockCookies.mockResolvedValue({
      get: vi.fn((name: string) => name === VERIFICATION_FLOW_COOKIE ? { value: tampered } : undefined),
    });
    const { GET } = await import("@/app/api/auth/verification-pending/route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/verification-pending")
    );

    expect(await response.json()).toEqual({ ok: true, pending: false });
    expect(mockEmailVerificationCodeFindFirst).not.toHaveBeenCalled();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });
});
