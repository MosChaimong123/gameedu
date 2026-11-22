import { beforeEach, describe, expect, it, vi } from "vitest";
import { TOTP } from "otpauth";
import { decodeMfaSessionProof, encodeMfaSessionProof } from "@/lib/auth/mfa-session-proof";

const mocks = vi.hoisted(() => ({
  authenticatorDeleteMany: vi.fn(),
  authenticatorCreate: vi.fn(),
  authenticatorFindFirst: vi.fn(),
  authenticatorFindMany: vi.fn(),
  authenticatorUpdateMany: vi.fn(),
  recoveryUpdateMany: vi.fn(),
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  sessionDeleteMany: vi.fn(),
  securitySessionUpdateMany: vi.fn(),
  recoveryDeleteMany: vi.fn(),
  recoveryCreateMany: vi.fn(),
  authenticatorUpdate: vi.fn(),
  transactionAuthenticatorDeleteMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: {
  mfaAuthenticator: {
    deleteMany: mocks.authenticatorDeleteMany,
    create: mocks.authenticatorCreate,
    findFirst: mocks.authenticatorFindFirst,
    findMany: mocks.authenticatorFindMany,
    updateMany: mocks.authenticatorUpdateMany,
  },
  mfaRecoveryCode: { updateMany: mocks.recoveryUpdateMany },
  $transaction: mocks.transaction,
} }));
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr") } }));

describe("MFA security lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-auth-secret-that-is-long-enough";
    mocks.authenticatorCreate.mockResolvedValue({ id: "authenticator-1" });
    mocks.userFindUnique.mockResolvedValue({ authVersion: 0 });
    mocks.transaction.mockImplementation(async (callback) => callback({
      user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
      mfaAuthenticator: {
        update: mocks.authenticatorUpdate,
        deleteMany: mocks.transactionAuthenticatorDeleteMany,
      },
      mfaRecoveryCode: { deleteMany: mocks.recoveryDeleteMany, createMany: mocks.recoveryCreateMany },
      session: { deleteMany: mocks.sessionDeleteMany },
      userAuthSession: { updateMany: mocks.securitySessionUpdateMany },
    }));
  });

  it("encrypts the TOTP secret at rest and returns QR/manual material only for enrollment", async () => {
    const { beginTotpEnrollment } = await import("@/lib/auth/mfa");
    const result = await beginTotpEnrollment("user-1", "teacher@example.com");
    const data = mocks.authenticatorCreate.mock.calls[0][0].data;

    expect(result.manualKey).toMatch(/^[A-Z2-7]+$/);
    expect(data.secretCiphertext).not.toContain(result.manualKey);
    expect(data).not.toHaveProperty("secretPlain");
    expect(data.enabledAt).toBeNull();
    expect(data.lastUsedStep).toBeNull();
    expect(result.qrDataUrl).toBe("data:image/png;base64,qr");
    expect(mocks.authenticatorDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        type: "TOTP",
        OR: [{ enabledAt: null }, { enabledAt: { isSet: false } }],
        createdAt: { lt: expect.any(Date) },
      },
    });
  });

  it("atomically rejects replay of the same TOTP time step", async () => {
    const { encryptMfaSecret, verifyTotpChallenge } = await import("@/lib/auth/mfa");
    const secret = "JBSWY3DPEHPK3PXP";
    const now = 1_800_000_000_000;
    const token = new TOTP({ secret, digits: 6, period: 30 }).generate({ timestamp: now });
    mocks.authenticatorFindFirst.mockResolvedValue({ id: "auth-1", lastUsedStep: null, ...encryptMfaSecret(secret) });
    mocks.authenticatorUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    expect(await verifyTotpChallenge("user-1", token, now)).toBe(true);
    expect(await verifyTotpChallenge("user-1", token, now)).toBe(false);
    expect(mocks.authenticatorUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { lastUsedStep: null },
          { lastUsedStep: { isSet: false } },
          { lastUsedStep: { lt: Math.floor(now / 30_000) } },
        ],
      }),
    }));
  });

  it("activates the matching pending enrollment despite a stale browser id and bounded clock drift", async () => {
    const { activateTotpEnrollment, encryptMfaSecret } = await import("@/lib/auth/mfa");
    const secret = "JBSWY3DPEHPK3PXP";
    const now = 1_800_000_000_000;
    const token = new TOTP({ secret, digits: 6, period: 30 }).generate({ timestamp: now + 60_000 });
    mocks.authenticatorFindMany.mockResolvedValue([{
      id: "authenticator-1",
      userId: "user-1",
      type: "TOTP",
      enabledAt: null,
      ...encryptMfaSecret(secret),
    }]);

    const result = await activateTotpEnrollment("user-1", "stale-browser-authenticator-id", token, now);

    expect(result?.recoveryCodes).toHaveLength(10);
    expect(mocks.authenticatorUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "authenticator-1" },
      data: expect.objectContaining({ enabledAt: expect.any(Date), lastUsedStep: Math.floor(now / 30_000) + 2 }),
    }));
    expect(mocks.authenticatorFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [{ enabledAt: null }, { enabledAt: { isSet: false } }],
      }),
    }));
    expect(mocks.recoveryCreateMany).toHaveBeenCalledOnce();
    expect(mocks.recoveryCreateMany.mock.calls[0][0].data[0].consumedAt).toBeNull();
  });

  it("consumes recovery codes by keyed hash only and only once", async () => {
    const { consumeRecoveryCode } = await import("@/lib/auth/mfa");
    mocks.recoveryUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    expect(await consumeRecoveryCode("user-1", "ABCD-EFGH")).toBe(true);
    expect(await consumeRecoveryCode("user-1", "ABCD-EFGH")).toBe(false);
    const where = mocks.recoveryUpdateMany.mock.calls[0][0].where;
    expect(where.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(where)).not.toContain("ABCD-EFGH");
    expect(where.OR).toEqual([{ consumedAt: null }, { consumedAt: { isSet: false } }]);
  });

  it("signs MFA session elevation proof and binds it to one user and security session", () => {
    const now = 1_800_000_000_000;
    const proof = encodeMfaSessionProof({
      userId: "user-1",
      securitySessionId: "session-1",
      verifiedAt: now,
      secret: "test-secret",
    });

    expect(decodeMfaSessionProof(proof, "test-secret", now)).toMatchObject({
      userId: "user-1",
      securitySessionId: "session-1",
      verifiedAt: now,
    });
    expect(decodeMfaSessionProof(proof, "wrong-secret", now)).toBeNull();
    expect(decodeMfaSessionProof(proof, "test-secret", now + 61_000)).toBeNull();
  });
});
