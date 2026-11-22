import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { resolveAuthSecret } from "@/lib/env";
import { activeUserAuthSessionFilter } from "@/lib/auth/session-registry";

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERY_CODE_COUNT = 10;
const TOTP_ENROLLMENT_TTL_MS = 10 * 60_000;

function encryptionKey() {
  const secret = resolveAuthSecret();
  if (!secret) throw new Error("Auth secret is required for MFA");
  return createHmac("sha256", secret).update("gamedu:mfa:secret:v1").digest();
}

export function encryptMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return {
    secretCiphertext: ciphertext.toString("base64url"),
    secretIv: iv.toString("base64url"),
    secretTag: cipher.getAuthTag().toString("base64url"),
  };
}

export function decryptMfaSecret(record: { secretCiphertext: string; secretIv: string; secretTag: string }) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(record.secretIv, "base64url"));
  decipher.setAuthTag(Buffer.from(record.secretTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(record.secretCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function recoveryHash(userId: string, code: string) {
  const secret = resolveAuthSecret();
  if (!secret) throw new Error("Auth secret is required for MFA");
  return createHmac("sha256", secret).update(`${userId}:${code.replace(/[^A-Z0-9]/gi, "").toUpperCase()}`).digest("hex");
}

function generateRecoveryCodes() {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const bytes = randomBytes(8);
    const raw = Array.from(bytes, (byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]).join("");
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}

export async function beginTotpEnrollment(userId: string, label: string) {
  const secret = new Secret({ size: 20 }).base32;
  const encrypted = encryptMfaSecret(secret);
  // Keep recent pending rows so concurrent/double enrollment requests cannot
  // invalidate the QR code returned by the other request. Successful
  // activation removes every remaining pending row for this user.
  await db.mfaAuthenticator.deleteMany({
    where: {
      userId,
      type: "TOTP",
      OR: [{ enabledAt: null }, { enabledAt: { isSet: false } }],
      createdAt: { lt: new Date(Date.now() - TOTP_ENROLLMENT_TTL_MS) },
    },
  });
  const authenticator = await db.mfaAuthenticator.create({
    data: {
      userId,
      type: "TOTP",
      name: "Authenticator app",
      enabledAt: null,
      lastUsedStep: null,
      ...encrypted,
    },
    select: { id: true },
  });
  const totp = new TOTP({ issuer: "GameEdu", label, secret, algorithm: "SHA1", digits: 6, period: 30 });
  const uri = totp.toString();
  return { authenticatorId: authenticator.id, manualKey: secret, qrDataUrl: await QRCode.toDataURL(uri), uri };
}

export async function activateTotpEnrollment(userId: string, authenticatorId: string, token: string, now = Date.now()) {
  const pendingAuthenticators = await db.mfaAuthenticator.findMany({
    where: {
      userId,
      type: "TOTP",
      OR: [{ enabledAt: null }, { enabledAt: { isSet: false } }],
      createdAt: { gt: new Date(now - TOTP_ENROLLMENT_TTL_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  const candidates = [...pendingAuthenticators].sort((left, right) => {
    if (left.id === authenticatorId) return -1;
    if (right.id === authenticatorId) return 1;
    return 0;
  });
  let authenticator: (typeof candidates)[number] | null = null;
  let delta: number | null = null;
  for (const candidate of candidates) {
    try {
      const totp = new TOTP({ secret: decryptMfaSecret(candidate), algorithm: "SHA1", digits: 6, period: 30 });
      const candidateDelta = totp.validate({ token, timestamp: now, window: 2 });
      if (candidateDelta !== null) {
        authenticator = candidate;
        delta = candidateDelta;
        break;
      }
    } catch {
      // Ignore an unreadable stale pending row and try the other recent rows.
    }
  }
  if (!authenticator || delta === null) return null;
  // Enrollment is a one-time, recently-authenticated ceremony. Allow up to
  // 60 seconds of device clock drift here; normal MFA challenges remain at
  // the stricter ±30-second window below.
  const usedStep = Math.floor(now / 30_000) + delta;
  const codes = generateRecoveryCodes();
  const enabledAt = new Date(now);

  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { authVersion: true } });
    if (!user) throw new Error("User not found");
    await tx.mfaAuthenticator.update({
      where: { id: authenticator.id },
      data: { enabledAt, lastUsedStep: usedStep },
    });
    await tx.mfaAuthenticator.deleteMany({
      where: {
        userId,
        type: "TOTP",
        OR: [{ enabledAt: null }, { enabledAt: { isSet: false } }],
      },
    });
    await tx.mfaRecoveryCode.deleteMany({ where: { userId } });
    await tx.mfaRecoveryCode.createMany({
      data: codes.map((code) => ({
        userId,
        codeHash: recoveryHash(userId, code),
        consumedAt: null,
      })),
    });
    await tx.user.update({
      where: { id: userId },
      data: { mfaEnabledAt: enabledAt, authVersion: typeof user.authVersion === "number" ? user.authVersion + 1 : 1 },
    });
    await tx.session.deleteMany({ where: { userId } });
    await tx.userAuthSession.updateMany({
      where: { userId, ...activeUserAuthSessionFilter() },
      data: { revokedAt: enabledAt, revokedReason: "mfa_enabled" },
    });
  });
  return { recoveryCodes: codes };
}

export async function verifyTotpChallenge(userId: string, token: string, now = Date.now()) {
  const authenticator = await db.mfaAuthenticator.findFirst({
    where: {
      userId,
      type: "TOTP",
      AND: [{ enabledAt: { not: null } }, { enabledAt: { isSet: true } }],
    },
  });
  if (!authenticator) return false;
  const totp = new TOTP({ secret: decryptMfaSecret(authenticator), algorithm: "SHA1", digits: 6, period: 30 });
  const delta = totp.validate({ token, timestamp: now, window: 1 });
  if (delta === null) return false;
  const usedStep = Math.floor(now / 30_000) + delta;
  const consumed = await db.mfaAuthenticator.updateMany({
    where: {
      id: authenticator.id,
      OR: [
        { lastUsedStep: null },
        { lastUsedStep: { isSet: false } },
        { lastUsedStep: { lt: usedStep } },
      ],
    },
    data: { lastUsedStep: usedStep },
  });
  return consumed.count === 1;
}

export async function consumeRecoveryCode(userId: string, code: string) {
  const consumed = await db.mfaRecoveryCode.updateMany({
    where: {
      userId,
      codeHash: recoveryHash(userId, code),
      OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
    },
    data: { consumedAt: new Date() },
  });
  return consumed.count === 1;
}

export async function regenerateRecoveryCodes(userId: string) {
  const codes = generateRecoveryCodes();
  await db.$transaction(async (tx) => {
    await tx.mfaRecoveryCode.deleteMany({ where: { userId } });
    await tx.mfaRecoveryCode.createMany({ data: codes.map((code) => ({ userId, codeHash: recoveryHash(userId, code) })) });
  });
  return codes;
}
