import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindUnique = vi.fn();
const mockNextAuth = vi.fn();
const mockGoogleProvider = vi.fn((config) => ({ id: "google", config }));
const mockCredentialsProvider = vi.fn((config) => ({ id: "credentials", ...config }));
const mockPrismaAdapter = vi.fn(() => ({ name: "prisma-adapter" }));
const mockConsumeRateLimitWithStore = vi.fn();
const mockBuildRateLimitKey = vi.fn(() => "bucket:key");
const mockGetRequestClientIdentifier = vi.fn(() => "test-client");
const mockCompare = vi.fn();

class MockCredentialsSignin extends Error {
  code = "credentials_signin";
}

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock("next-auth", () => ({
  default: mockNextAuth,
  CredentialsSignin: MockCredentialsSignin,
}));

vi.mock("next-auth/providers/google", () => ({
  default: mockGoogleProvider,
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: mockCredentialsProvider,
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: mockPrismaAdapter,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  buildRateLimitKey: mockBuildRateLimitKey,
  consumeRateLimitWithStore: mockConsumeRateLimitWithStore,
  getRequestClientIdentifier: mockGetRequestClientIdentifier,
}));

vi.mock("bcryptjs", () => ({
  compare: mockCompare,
}));

describe("auth credentials authorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockNextAuth.mockReturnValue({
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    });
    mockConsumeRateLimitWithStore.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 60,
    });
    mockCompare.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      image: "alice.png",
      role: "TEACHER",
      school: "School A",
      password: "hashed-password",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
  });

  async function getAuthorize() {
    await import("@/auth");
    const credentialsConfig = mockCredentialsProvider.mock.calls.at(-1)?.[0];
    expect(credentialsConfig?.authorize).toBeTypeOf("function");
    return credentialsConfig.authorize as (
      credentials: Record<string, unknown> | undefined,
      request: Request
    ) => Promise<unknown>;
  }

  it("returns null when credentials are missing", async () => {
    const authorize = await getAuthorize();

    await expect(
      authorize(undefined, new Request("http://localhost:3000/api/auth/callback/credentials"))
    ).resolves.toBeNull();
    expect(mockConsumeRateLimitWithStore).not.toHaveBeenCalled();
  });

  it("throws a rate_limited credentials error when the credential bucket is exhausted", async () => {
    mockConsumeRateLimitWithStore.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 30,
    });
    const authorize = await getAuthorize();

    await expect(
      authorize(
        { email: "alice@example.com", password: "secret123" },
        new Request("http://localhost:3000/api/auth/callback/credentials")
      )
    ).rejects.toMatchObject({ code: "rate_limited" });

    expect(mockBuildRateLimitKey).toHaveBeenCalledWith("test-client", "alice@example.com");
  });

  it("returns null when the user is missing or the password does not match", async () => {
    const authorize = await getAuthorize();

    mockUserFindUnique.mockResolvedValueOnce(null);
    await expect(
      authorize(
        { email: "missing@example.com", password: "secret123" },
        new Request("http://localhost:3000/api/auth/callback/credentials")
      )
    ).resolves.toBeNull();

    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-2",
      email: "bob@example.com",
      password: "hashed",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    mockCompare.mockResolvedValueOnce(false);

    await expect(
      authorize(
        { email: "bob@example.com", password: "wrongpass" },
        new Request("http://localhost:3000/api/auth/callback/credentials")
      )
    ).resolves.toBeNull();
  });

  it("throws email_not_verified when the credentials are valid but the email is not verified", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-3",
      name: "Carol",
      email: "carol@example.com",
      image: null,
      role: "STUDENT",
      school: null,
      password: "hashed-password",
      emailVerified: null,
    });
    const authorize = await getAuthorize();

    await expect(
      authorize(
        { email: "carol@example.com", password: "secret123" },
        new Request("http://localhost:3000/api/auth/callback/credentials")
      )
    ).rejects.toMatchObject({ code: "email_not_verified" });
  });

  it("returns a normalized app user payload on success", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-4",
      name: "Dana",
      email: "dana@example.com",
      image: "dana.png",
      role: "NOT_A_ROLE",
      school: "School D",
      password: "hashed-password",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    const authorize = await getAuthorize();

    await expect(
      authorize(
        { email: " Dana@example.com ", password: "secret123" },
        new Request("http://localhost:3000/api/auth/callback/credentials")
      )
    ).resolves.toEqual({
      id: "user-4",
      name: "Dana",
      email: "dana@example.com",
      image: "dana.png",
      role: "USER",
      school: "School D",
    });
  });
});
