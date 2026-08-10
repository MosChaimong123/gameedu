import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindUnique = vi.fn();
const mockNextAuth = vi.fn();
const mockGoogleProvider = vi.fn((config) => ({ id: "google", config }));
const mockCredentialsProvider = vi.fn((config) => ({ id: "credentials", ...config }));
const mockPrismaAdapter = vi.fn(() => ({ name: "prisma-adapter" }));
const mockRegisterAuthSession = vi.fn();
const mockValidateAuthSession = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock("next-auth", () => ({
  default: mockNextAuth,
  CredentialsSignin: class CredentialsSignin extends Error {
    code = "credentials_signin";
  },
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
  buildRateLimitKey: vi.fn(() => "bucket:key"),
  consumeRateLimitWithStore: vi.fn(),
  getRequestClientIdentifier: vi.fn(() => "test-client"),
  getTrustedClientAddress: vi.fn(() => "test-client"),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "user-agent": "Test Browser" }) }));
vi.mock("@/lib/auth/session-registry", () => ({
  activeUserAuthSessionFilter: () => ({ OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] }),
  registerUserAuthSession: mockRegisterAuthSession,
  validateAndTouchUserAuthSession: mockValidateAuthSession,
}));
vi.mock("@/lib/email/send-security-notification-email", () => ({ sendNewDeviceLoginNotification: vi.fn() }));

function getLastNextAuthConfigArg(mock: typeof mockNextAuth) {
  const arg = mock.mock.calls.at(-1)?.[0];
  return typeof arg === "function" ? arg() : arg;
}

describe("auth core callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockUserFindUnique.mockResolvedValue({
      name: "Fresh User",
      image: "fresh.png",
      role: "ADMIN",
      school: "Fresh School",
      settings: { language: "th" },
      plan: "PRO",
      planStatus: "ACTIVE",
      planExpiry: new Date("2028-01-01T00:00:00.000Z"),
      authVersion: 0,
    });
    mockNextAuth.mockReturnValue({
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    });
    const record = { id: "session-1", deviceLabel: "Browser on Test" };
    mockRegisterAuthSession.mockResolvedValue({ rawSessionId: "raw-session", record, isNewDevice: false, notificationEmail: null });
    mockValidateAuthSession.mockResolvedValue(record);
    process.env.AUTH_SECRET = "test-auth-secret";
  });

  it("hydrates jwt tokens from the user and refreshes them from the database", async () => {
    const mod = await import("@/auth");
    const config = getLastNextAuthConfigArg(mockNextAuth);
    expect(mod).toBeTruthy();
    expect(config?.callbacks?.jwt).toBeTypeOf("function");

    const token = await config.callbacks.jwt({
      token: { id: "user-1" },
      user: {
        id: "user-1",
        email: "alice@example.com",
        name: "Alice",
        image: "avatar.png",
        role: "TEACHER",
        school: "School A",
      },
      trigger: "signIn",
      session: undefined,
    });

    expect(token).toEqual(
      expect.objectContaining({
        id: "user-1",
        email: "alice@example.com",
        name: "Fresh User",
        picture: "fresh.png",
        role: "ADMIN",
        school: "Fresh School",
        settings: { language: "th" },
        plan: "PRO",
        planStatus: "ACTIVE",
        planExpiry: "2028-01-01T00:00:00.000Z",
        authVersion: 0,
      })
    );
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        name: true,
        image: true,
        role: true,
        school: true,
        settings: true,
        plan: true,
        planStatus: true,
        planExpiry: true,
        authVersion: true,
        disabledAt: true,
        mfaEnabledAt: true,
      },
    });
  });

  it("keeps invalid database roles out of the session payload", async () => {
    const mod = await import("@/auth");
    const config = getLastNextAuthConfigArg(mockNextAuth);
    expect(mod).toBeTruthy();

    mockUserFindUnique.mockResolvedValue({
      name: "Edge User",
      image: "edge.png",
      role: "NOT_A_ROLE",
      school: "Edge School",
      settings: { language: "en" },
      plan: "FREE",
      planStatus: "TRIALING",
      planExpiry: null,
      authVersion: 0,
    });

    const token = await config.callbacks.jwt({
      token: { id: "user-2" },
      user: {
        id: "user-2",
        email: "edge@example.com",
        name: "Edge",
        image: "edge-start.png",
        role: "BROKEN_ROLE",
        school: "Broken School",
      },
      trigger: "signIn",
      session: undefined,
    });

    expect(token.role).toBeUndefined();

    const session = await config.callbacks.session({
      session: { user: {} },
      token,
    });

    expect(session).toEqual({
      user: {
        id: "user-2",
        school: "Edge School",
        name: "Edge User",
        image: "edge.png",
        settings: { language: "en" },
        plan: "FREE",
        planStatus: "TRIALING",
        planExpiry: null,
        securitySessionId: "session-1",
        authenticatedAt: expect.any(Number),
        mfaEnrolled: false,
        mfaLevel: 0,
        mfaVerifiedAt: undefined,
      },
    });
  });

  it("fails closed for an enrolled session when security-state refresh fails", async () => {
    const mod = await import("@/auth");
    const config = getLastNextAuthConfigArg(mockNextAuth);
    expect(mod).toBeTruthy();

    mockUserFindUnique.mockRejectedValue(new Error("db down"));

    const token = await config.callbacks.jwt({
      token: {
        id: "user-3",
        name: "Existing Name",
        picture: "existing.png",
        role: "TEACHER",
        school: "Existing School",
      },
      user: undefined,
      trigger: "update",
      session: { name: "Updated Name", image: "updated.png" },
    });

    expect(token).toBeNull();
  });

  it("does not trust client-supplied MFA elevation fields during session update", async () => {
    const mod = await import("@/auth");
    const config = getLastNextAuthConfigArg(mockNextAuth);
    expect(mod).toBeTruthy();
    mockValidateAuthSession.mockResolvedValue({ id: "session-1", mfaLevel: 0 });

    const token = await config.callbacks.jwt({
      token: {
        id: "user-1",
        role: "TEACHER",
        authVersion: 0,
        securitySessionToken: "raw-session",
        securitySessionId: "session-1",
      },
      user: undefined,
      trigger: "update",
      session: { user: { mfaLevel: 1, mfaVerifiedAt: Date.now() } },
    });

    expect(token.mfaLevel).toBe(0);
    expect(token.mfaVerifiedAt).toBeUndefined();
  });

  it("accepts a server-signed MFA proof bound to the active security session", async () => {
    const { encodeMfaSessionProof } = await import("@/lib/auth/mfa-session-proof");
    const mod = await import("@/auth");
    const config = getLastNextAuthConfigArg(mockNextAuth);
    expect(mod).toBeTruthy();
    mockValidateAuthSession.mockResolvedValue({ id: "session-1", mfaLevel: 1 });
    const verifiedAt = Date.now();
    const mfaProof = encodeMfaSessionProof({
      userId: "user-1",
      securitySessionId: "session-1",
      verifiedAt,
      secret: process.env.AUTH_SECRET!,
    });

    const token = await config.callbacks.jwt({
      token: {
        id: "user-1",
        role: "TEACHER",
        authVersion: 0,
        securitySessionToken: "raw-session",
        securitySessionId: "session-1",
      },
      user: undefined,
      trigger: "update",
      session: { user: { mfaProof } },
    });

    expect(token.mfaLevel).toBe(1);
    expect(token.mfaVerifiedAt).toBe(verifiedAt);
  });

  it("rejects a jwt issued before the user's auth version changed", async () => {
    const mod = await import("@/auth");
    const config = getLastNextAuthConfigArg(mockNextAuth);
    expect(mod).toBeTruthy();

    mockUserFindUnique.mockResolvedValue({
      name: "Alice",
      image: null,
      role: "TEACHER",
      school: "School A",
      settings: null,
      plan: "FREE",
      planStatus: "INACTIVE",
      planExpiry: null,
      authVersion: 2,
    });

    const token = await config.callbacks.jwt({
      token: { id: "user-1", authVersion: 1 },
      user: undefined,
      trigger: undefined,
      session: undefined,
    });

    expect(token).toBeNull();
  });

  it("adopts the current auth version for a new OAuth or credentials sign-in", async () => {
    const mod = await import("@/auth");
    const config = getLastNextAuthConfigArg(mockNextAuth);
    expect(mod).toBeTruthy();

    mockUserFindUnique.mockResolvedValue({
      name: "Alice",
      image: null,
      role: "TEACHER",
      school: "School A",
      settings: null,
      plan: "FREE",
      planStatus: "INACTIVE",
      planExpiry: null,
      authVersion: 3,
    });

    const token = await config.callbacks.jwt({
      token: {},
      user: {
        id: "user-1",
        email: "alice@example.com",
        role: "TEACHER",
      },
      trigger: "signIn",
      session: undefined,
    });

    expect(token).toEqual(expect.objectContaining({ id: "user-1", authVersion: 3 }));
  });

  it("keeps a jwt issued after reset when its auth version is current", async () => {
    const mod = await import("@/auth");
    const config = getLastNextAuthConfigArg(mockNextAuth);
    expect(mod).toBeTruthy();

    mockUserFindUnique.mockResolvedValue({
      name: "Alice",
      image: null,
      role: "TEACHER",
      school: "School A",
      settings: null,
      plan: "FREE",
      planStatus: "INACTIVE",
      planExpiry: null,
      authVersion: 2,
    });

    const token = await config.callbacks.jwt({
      token: { id: "user-1", authVersion: 2 },
      user: undefined,
      trigger: undefined,
      session: undefined,
    });

    expect(token).toEqual(expect.objectContaining({ id: "user-1", authVersion: 2 }));
  });

  it("keeps pre-migration jwt sessions valid at legacy version zero", async () => {
    const mod = await import("@/auth");
    const config = getLastNextAuthConfigArg(mockNextAuth);
    expect(mod).toBeTruthy();

    mockUserFindUnique.mockResolvedValue({
      name: "Legacy User",
      image: null,
      role: "TEACHER",
      school: null,
      settings: null,
      plan: "FREE",
      planStatus: "INACTIVE",
      planExpiry: null,
      authVersion: null,
    });

    const token = await config.callbacks.jwt({
      token: { id: "legacy-user" },
      user: undefined,
      trigger: undefined,
      session: undefined,
    });

    expect(token).toEqual(expect.objectContaining({ id: "legacy-user", authVersion: 0 }));
  });
});
