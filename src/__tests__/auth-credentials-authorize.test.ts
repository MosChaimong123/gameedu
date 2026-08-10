import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindFirst = vi.fn();
const mockUserUpdate = vi.fn();
const mockNextAuth = vi.fn();
const mockGoogleProvider = vi.fn((config) => ({ id: "google", config }));
const mockCredentialsProvider = vi.fn((config) => ({ id: "credentials", ...config }));
const mockPrismaAdapter = vi.fn(() => ({ name: "prisma-adapter" }));
const mockConsumeRateLimitWithStore = vi.fn();
const mockBuildRateLimitKey = vi.fn(() => "bucket:key");
const mockGetRequestClientIdentifier = vi.fn(() => "test-client");
const mockDigestRateLimitIdentifier = vi.fn((value: string) => `digest:${value}`);
const mockCompare = vi.fn();
const mockLogAuditEvent = vi.fn();

class MockCredentialsSignin extends Error {
  code = "credentials_signin";
}

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: mockUserFindFirst,
      update: mockUserUpdate,
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
  digestRateLimitIdentifier: mockDigestRateLimitIdentifier,
}));

vi.mock("bcryptjs", () => ({
  compare: mockCompare,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

function getLastNextAuthConfigArg(mock: typeof mockNextAuth) {
  const arg = mock.mock.calls.at(-1)?.[0];
  return typeof arg === "function" ? arg() : arg;
}

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
    mockUserFindFirst.mockResolvedValue({
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
    const config = getLastNextAuthConfigArg(mockNextAuth);
    const credentialsProvider = config.providers?.find(
      (p: { id?: string; authorize?: unknown }) => p.id === "credentials"
    );
    expect(credentialsProvider?.authorize).toBeTypeOf("function");
    return credentialsProvider!.authorize as (
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

    expect(mockConsumeRateLimitWithStore).toHaveBeenCalledTimes(3);
    expect(mockBuildRateLimitKey).toHaveBeenCalledWith("test-client", "digest:alice@example.com");
    expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: null,
      action: "auth.login.rate_limited",
      reason: "rate_limited",
      metadata: { authMethod: "credentials" },
    }));
    expect(JSON.stringify(mockLogAuditEvent.mock.calls)).not.toContain("alice@example.com");
  });

  it("returns null when the user is missing or the password does not match", async () => {
    const authorize = await getAuthorize();

    mockUserFindFirst.mockResolvedValueOnce(null);
    await expect(
      authorize(
        { email: "missing@example.com", password: "secret123" },
        new Request("http://localhost:3000/api/auth/callback/credentials")
      )
    ).resolves.toBeNull();

    mockUserFindFirst.mockResolvedValueOnce({
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

  it("rejects a disabled account even when its password is valid", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "user-disabled",
      email: "disabled@example.com",
      password: "hashed",
      disabledAt: new Date("2026-08-01T00:00:00.000Z"),
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
      role: "TEACHER",
    });
    mockCompare.mockResolvedValue(true);
    const authorize = await getAuthorize();
    await expect(authorize(
      { email: "disabled@example.com", password: "correct-password" },
      new Request("http://localhost:3000/api/auth/callback/credentials")
    )).resolves.toBeNull();
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      actorUserId: null,
      action: "auth.login.failed",
      category: "auth",
      status: "rejected",
      reason: "invalid_credentials",
      targetType: "authentication_attempt",
      metadata: { authMethod: "credentials" },
    });
    expect(JSON.stringify(mockLogAuditEvent.mock.calls)).not.toContain("disabled@example.com");
    expect(JSON.stringify(mockLogAuditEvent.mock.calls)).not.toContain("correct-password");
  });

  it("allows login and auto-verifies when email verification is skipped", async () => {
    vi.stubEnv("SKIP_EMAIL_VERIFICATION", "true");
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      image: null,
      password: "hashed",
      emailVerified: null,
      role: "STUDENT",
      school: null,
    });
    mockCompare.mockResolvedValue(true);
    mockUserUpdate.mockResolvedValue({});

    const authorize = await getAuthorize();
    const result = await authorize(
      { email: "alice@example.com", password: "secret" },
      new Request("http://localhost:3000/api/auth/callback/credentials")
    );

    expect(result).toMatchObject({ id: "user-1", email: "alice@example.com" });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { emailVerified: expect.any(Date) },
    });
    vi.unstubAllEnvs();
  });

  it("throws email_not_verified when the credentials are valid but the email is not verified", async () => {
    mockUserFindFirst.mockResolvedValue({
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

  it("rejects credentials sign-in when the persisted role is invalid", async () => {
    mockUserFindFirst.mockResolvedValue({
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
    ).resolves.toBeNull();
  });

  it("allows legacy USER accounts through credentials so they can be reclassified", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "user-5",
      name: "Eve",
      email: "eve@example.com",
      image: "eve.png",
      role: "USER",
      school: "School E",
      password: "hashed-password",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    const authorize = await getAuthorize();

    await expect(
      authorize(
        { email: " eve@example.com ", password: "secret123" },
        new Request("http://localhost:3000/api/auth/callback/credentials")
      )
    ).resolves.toEqual({
      id: "user-5",
      name: "Eve",
      email: "eve@example.com",
      image: "eve.png",
      role: "USER",
      school: "School E",
      authVersion: 0,
      passwordUpgradeRequired: true,
      mfaEnrolled: false,
    });
  });
});
