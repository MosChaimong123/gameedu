import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateRegistrationOptions: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
  challengeCreate: vi.fn(),
  challengeUpdateMany: vi.fn(),
  userFindUnique: vi.fn(),
  passkeyFindMany: vi.fn(),
  passkeyFindUnique: vi.fn(),
  passkeyUpdateMany: vi.fn(),
  auth: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: mocks.generateRegistrationOptions,
  generateAuthenticationOptions: mocks.generateAuthenticationOptions,
  verifyAuthenticationResponse: mocks.verifyAuthenticationResponse,
  verifyRegistrationResponse: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  authChallenge: { create: mocks.challengeCreate, updateMany: mocks.challengeUpdateMany },
  user: { findUnique: mocks.userFindUnique },
  passkeyCredential: { findMany: mocks.passkeyFindMany, findUnique: mocks.passkeyFindUnique, updateMany: mocks.passkeyUpdateMany },
} }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimitWithStore: mocks.consumeRateLimit,
  createRateLimitResponse: () => Response.json({ error: { code: "RATE_LIMITED" } }, { status: 429 }),
  getRequestClientIdentifier: () => "test-client",
}));

function assertion(challenge: string) {
  return {
    id: "credential-1",
    rawId: "credential-1",
    type: "public-key",
    clientExtensionResults: {},
    response: {
      authenticatorData: "AA",
      clientDataJSON: Buffer.from(JSON.stringify({ challenge })).toString("base64url"),
      signature: "AA",
      userHandle: null,
    },
  };
}

describe("Passkey security lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_WEBAUTHN_ORIGIN = "https://app.example.com";
    process.env.AUTH_WEBAUTHN_RP_ID = "app.example.com";
    mocks.generateAuthenticationOptions.mockResolvedValue({ challenge: "challenge-1" });
    mocks.generateRegistrationOptions.mockResolvedValue({ challenge: "registration-challenge" });
    mocks.challengeCreate.mockResolvedValue({ id: "challenge-row" });
    mocks.auth.mockResolvedValue(null);
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
  });

  it("creates discoverable credentials required by username-less passkey sign-in", async () => {
    mocks.userFindUnique.mockResolvedValue({
      email: "teacher@example.com",
      name: "Teacher",
      passkeyCredentials: [],
    });
    const { createPasskeyRegistrationOptions } = await import("@/lib/auth/passkeys");
    await createPasskeyRegistrationOptions("user-1");
    expect(mocks.generateRegistrationOptions).toHaveBeenCalledWith(expect.objectContaining({
      authenticatorSelection: {
        residentKey: "required",
        requireResidentKey: true,
        userVerification: "required",
      },
    }));
  });

  it("stores only a challenge hash and binds options to the configured RP ID", async () => {
    mocks.passkeyFindMany.mockResolvedValue([]);
    const { createPasskeyAuthenticationOptions } = await import("@/lib/auth/passkeys");
    await createPasskeyAuthenticationOptions("user-1");
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(expect.objectContaining({ rpID: "app.example.com", userVerification: "required" }));
    const data = mocks.challengeCreate.mock.calls[0][0].data;
    expect(data.challengeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.challengeHash).not.toBe("challenge-1");
  });

  it("requires single-use challenge, exact origin/RP ID and atomic counter update", async () => {
    mocks.challengeUpdateMany.mockResolvedValue({ count: 1 });
    mocks.passkeyFindUnique.mockResolvedValue({
      id: "passkey-1", userId: "user-1", credentialId: "credential-1", publicKey: Buffer.from("public"), counter: 4, transports: [],
      user: { id: "user-1", role: "ADMIN", disabledAt: null },
    });
    mocks.verifyAuthenticationResponse.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 5 } });
    mocks.passkeyUpdateMany.mockResolvedValue({ count: 1 });
    const { verifyPasskeyAuthentication } = await import("@/lib/auth/passkeys");
    expect(await verifyPasskeyAuthentication(assertion("challenge-1") as never, "user-1")).toMatchObject({ id: "user-1" });
    expect(mocks.verifyAuthenticationResponse).toHaveBeenCalledWith(expect.objectContaining({
      expectedOrigin: "https://app.example.com",
      expectedRPID: "app.example.com",
      requireUserVerification: true,
    }));
    expect(mocks.passkeyUpdateMany).toHaveBeenCalledWith({
      where: { id: "passkey-1", counter: 4 },
      data: { counter: 5, lastUsedAt: expect.any(Date) },
    });
  });

  it("rejects a replayed or expired challenge before signature verification", async () => {
    mocks.challengeUpdateMany.mockResolvedValue({ count: 0 });
    const { verifyPasskeyAuthentication } = await import("@/lib/auth/passkeys");
    expect(await verifyPasskeyAuthentication(assertion("replayed") as never, "user-1")).toBeNull();
    expect(mocks.verifyAuthenticationResponse).not.toHaveBeenCalled();
  });

  it("returns an authentication miss when WebAuthn verification rejects malformed evidence", async () => {
    mocks.challengeUpdateMany.mockResolvedValue({ count: 1 });
    mocks.passkeyFindUnique.mockResolvedValue({
      id: "passkey-1", userId: "user-1", credentialId: "credential-1", publicKey: Buffer.from("public"), counter: 4, transports: [],
      user: { id: "user-1", role: "TEACHER", disabledAt: null },
    });
    mocks.verifyAuthenticationResponse.mockRejectedValue(new Error("invalid signature"));
    const { verifyPasskeyAuthentication } = await import("@/lib/auth/passkeys");
    await expect(verifyPasskeyAuthentication(assertion("challenge-1") as never)).resolves.toBeNull();
  });

  it("rate limits public passkey option creation before writing a challenge", async () => {
    mocks.consumeRateLimit
      .mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 30 })
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 60 });
    const { POST } = await import("@/app/api/auth/passkeys/authentication-options/route");
    const response = await POST(new Request("http://localhost/api/auth/passkeys/authentication-options", { method: "POST" }));

    expect(response.status).toBe(429);
    expect(mocks.consumeRateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.challengeCreate).not.toHaveBeenCalled();
  });
});

describe("Passkey client error guidance", () => {
  it("separates unavailable authenticators, RP configuration, duplicate credentials, and fallback failures", async () => {
    const { getPasskeyErrorTranslationKey } = await import("@/lib/auth/passkey-client-errors");
    expect(getPasskeyErrorTranslationKey({ code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", name: "NotAllowedError" }, "fallback")).toBe("passkeyErrorUnavailable");
    expect(getPasskeyErrorTranslationKey({ code: "ERROR_INVALID_RP_ID", name: "SecurityError" }, "fallback")).toBe("passkeyErrorConfiguration");
    expect(getPasskeyErrorTranslationKey({ code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED", name: "InvalidStateError" }, "fallback")).toBe("passkeyErrorAlreadyRegistered");
    expect(getPasskeyErrorTranslationKey(new Error("PASSKEY_OPTIONS_FAILED"), "fallback")).toBe("fallback");
  });
});
