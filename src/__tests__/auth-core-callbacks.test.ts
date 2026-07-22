import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindUnique = vi.fn();
const mockNextAuth = vi.fn();
const mockGoogleProvider = vi.fn((config) => ({ id: "google", config }));
const mockCredentialsProvider = vi.fn((config) => ({ id: "credentials", ...config }));
const mockPrismaAdapter = vi.fn(() => ({ name: "prisma-adapter" }));

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
}));

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
      },
    });
  });

  it("keeps the existing token when db refresh fails during jwt sync", async () => {
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

    expect(token).toEqual(
      expect.objectContaining({
        id: "user-3",
        name: "Updated Name",
        picture: "updated.png",
        role: "TEACHER",
        school: "Existing School",
      })
    );
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
