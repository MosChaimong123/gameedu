import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUserFindUnique, mockVerifyPassword } = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockVerifyPassword: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: mockUserFindUnique } },
}));
vi.mock("@/lib/auth/password-hash", () => ({
  verifyPassword: mockVerifyPassword,
}));

import {
  hasRecentStrongAuthentication,
  verifyRecentOrPassword,
} from "@/lib/auth/reauthentication";

const USER_ID = "507f1f77bcf86cd799439011";

function session(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: USER_ID,
      authenticatedAt: 0,
      mfaVerifiedAt: 0,
      ...overrides,
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as never;
}

describe("account security reauthentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ password: "stored-hash" });
    mockVerifyPassword.mockResolvedValue(true);
  });

  it("accepts a recent primary authentication without reading the password hash", async () => {
    const active = session({ authenticatedAt: Date.now() });

    expect(hasRecentStrongAuthentication(active)).toBe(true);
    await expect(verifyRecentOrPassword(active)).resolves.toBe(true);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("accepts a recent MFA verification as strong authentication", async () => {
    const active = session({ mfaVerifiedAt: Date.now() });

    expect(hasRecentStrongAuthentication(active)).toBe(true);
    await expect(verifyRecentOrPassword(active)).resolves.toBe(true);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("rejects missing sessions and stale sessions without a password", async () => {
    expect(hasRecentStrongAuthentication(null)).toBe(false);
    await expect(verifyRecentOrPassword(null, "password")).resolves.toBe(false);
    await expect(verifyRecentOrPassword(session())).resolves.toBe(false);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("verifies a supplied password for a stale authenticated session", async () => {
    const stale = session();

    await expect(verifyRecentOrPassword(stale, "current-password")).resolves.toBe(true);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: { password: true },
    });
    expect(mockVerifyPassword).toHaveBeenCalledWith("current-password", "stored-hash");
  });

  it("fails closed for passwordless accounts and invalid passwords", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ password: null });
    await expect(verifyRecentOrPassword(session(), "current-password")).resolves.toBe(false);
    expect(mockVerifyPassword).not.toHaveBeenCalled();

    mockUserFindUnique.mockResolvedValueOnce({ password: "stored-hash" });
    mockVerifyPassword.mockResolvedValueOnce(false);
    await expect(verifyRecentOrPassword(session(), "wrong-password")).resolves.toBe(false);
  });
});
