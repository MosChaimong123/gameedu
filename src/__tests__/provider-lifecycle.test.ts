import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { decodeProviderLinkIntent, encodeProviderLinkIntent } from "@/lib/auth/provider-link-intent";

const mockAuth = vi.fn();
const mockUserFindUnique = vi.fn();
const mockVerifyPassword = vi.fn();
const mockTransaction = vi.fn();
const mockAccountDeleteMany = vi.fn();
const mockUserUpdate = vi.fn();
const mockSessionDeleteMany = vi.fn();
const mockSecuritySessionUpdateMany = vi.fn();
const mockBaseLinkAccount = vi.fn();
const mockCookieGet = vi.fn();
const mockConsumeRateLimit = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/auth/password-hash", () => ({ verifyPassword: mockVerifyPassword }));
vi.mock("@/lib/env", () => ({ resolveAuthSecret: () => "test-secret" }));
vi.mock("@/lib/security/audit-log", () => ({ logAuditEvent: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mockUserFindUnique }, $transaction: mockTransaction } }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({ linkAccount: mockBaseLinkAccount }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mockCookieGet }) }));
vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimitWithStore: mockConsumeRateLimit,
  createRateLimitResponse: () => Response.json({}, { status: 429 }),
  getRequestClientIdentifier: () => "client",
}));

function request(method: string, body?: object) {
  return new Request("http://localhost/api/auth/account-providers/google", { method, headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

describe("provider lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockVerifyPassword.mockResolvedValue(true);
    mockAccountDeleteMany.mockResolvedValue({ count: 1 });
    mockUserUpdate.mockResolvedValue({});
    mockSessionDeleteMany.mockResolvedValue({ count: 2 });
    mockSecuritySessionUpdateMany.mockResolvedValue({ count: 3 });
    mockBaseLinkAccount.mockResolvedValue(undefined);
    mockCookieGet.mockReturnValue(undefined);
    mockConsumeRateLimit.mockResolvedValue({ allowed: true });
    mockTransaction.mockImplementation(async (callback) => callback({ account: { deleteMany: mockAccountDeleteMany },
      user: { update: mockUserUpdate }, session: { deleteMany: mockSessionDeleteMany },
      userAuthSession: { updateMany: mockSecuritySessionUpdateMany } }));
  });

  it("signs short-lived provider link intents bound to the user", () => {
    const value = encodeProviderLinkIntent("user-1", "secret");
    expect(decodeProviderLinkIntent(value, "secret")).toMatchObject({ userId: "user-1", provider: "google" });
    expect(decodeProviderLinkIntent(value, "wrong-secret")).toBeNull();
  });

  it("enforces the reauthenticated intent at the Auth.js adapter link boundary", async () => {
    mockUserFindUnique.mockResolvedValue({ password: "hash" });
    const { prismaAuthAdapter } = await import("@/lib/auth/prisma-auth-adapter");
    const adapter = prismaAuthAdapter({ user: { findUnique: mockUserFindUnique } } as never);
    const account = { userId: "user-1", provider: "google", providerAccountId: "google-1", type: "oauth" };
    await expect(adapter.linkAccount?.(account)).rejects.toThrow("PROVIDER_LINK_REAUTH_REQUIRED");

    mockCookieGet.mockReturnValue({ value: encodeProviderLinkIntent("user-1", "test-secret") });
    await expect(adapter.linkAccount?.(account)).resolves.toBeUndefined();
    expect(mockBaseLinkAccount).toHaveBeenCalledWith(account);
  });

  it("lists password, Google, and future passkey status", async () => {
    mockUserFindUnique.mockResolvedValue({
      password: "hash",
      accounts: [{ provider: "google" }],
      passkeyCredentials: [],
    });
    const { GET } = await import("@/app/api/auth/account-providers/route");
    expect(await (await GET()).json()).toMatchObject({ methods: { password: true, google: true, passkey: false } });
  });

  it("forbids unlinking Google when it is the last login method", async () => {
    mockUserFindUnique.mockResolvedValue({ password: null, authVersion: 0, accounts: [{ id: "a1", provider: "google" }] });
    const { DELETE } = await import("@/app/api/auth/account-providers/google/route");
    expect((await DELETE(request("DELETE", { currentPassword: "anything" }))).status).toBe(409);
    expect(mockAccountDeleteMany).not.toHaveBeenCalled();
  });

  it("unlinks after reauthentication and revokes sessions", async () => {
    mockUserFindUnique.mockResolvedValue({ password: "hash", authVersion: 3, accounts: [{ id: "a1", provider: "google" }] });
    const { DELETE } = await import("@/app/api/auth/account-providers/google/route");
    expect((await DELETE(request("DELETE", { currentPassword: "current-password" }))).status).toBe(200);
    expect(mockAccountDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1", provider: "google" } });
    expect(mockUserUpdate).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { authVersion: { increment: 1 } } });
    expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("does not shadow the Auth.js /api/auth/providers discovery endpoint", () => {
    expect(existsSync(resolve(process.cwd(), "src/app/api/auth/providers/route.ts"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "src/app/api/auth/account-providers/route.ts"))).toBe(true);
  });
});
