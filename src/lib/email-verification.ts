import { createHash, createHmac, randomInt } from "node:crypto";

export const EMAIL_VERIFICATION_CODE_LENGTH = 6;
export const EMAIL_VERIFICATION_EXPIRES_MINUTES = 15;
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
/** Minimum wait between resend emails (anti-spam). Not a lockout — only this gap between sends. */
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 30;
export const EMAIL_VERIFICATION_PURPOSE = "SIGNUP_VERIFY";

const BCRYPT_ROUNDS = 10;
const VERIFICATION_HASH_V3_PREFIX = "v3:";

export function normalizeVerificationEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateEmailVerificationCode() {
  return String(randomInt(0, 10 ** EMAIL_VERIFICATION_CODE_LENGTH)).padStart(
    EMAIL_VERIFICATION_CODE_LENGTH,
    "0"
  );
}

export function normalizeVerificationCodeInput(code: string) {
  const digits = code.replace(/\D/g, "").slice(0, EMAIL_VERIFICATION_CODE_LENGTH);
  if (!digits) return "";
  return digits.padStart(EMAIL_VERIFICATION_CODE_LENGTH, "0");
}

export function normalizeVerificationReferenceCode(reference: string) {
  return reference.trim().toUpperCase();
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateVerificationReferenceCode() {
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    suffix += REF_ALPHABET[randomInt(0, REF_ALPHABET.length)] ?? "X";
  }
  return `TP-${suffix}`;
}

export function codesMatchPlaintext(storedPlain: string | null | undefined, submitted: string) {
  if (!storedPlain) return false;
  const a = normalizeVerificationCodeInput(storedPlain);
  const b = normalizeVerificationCodeInput(submitted);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** All configured secrets — avoids mismatch when only some env vars are set on Render. */
export function resolveEmailVerificationPepperCandidates(): string[] {
  const peppers = new Set<string>();
  const dedicated = process.env.EMAIL_VERIFICATION_PEPPER?.trim();
  const nextAuth = process.env.NEXTAUTH_SECRET?.trim();
  const auth = process.env.AUTH_SECRET?.trim();
  if (dedicated) peppers.add(dedicated);
  if (nextAuth) peppers.add(nextAuth);
  if (auth) peppers.add(auth);
  peppers.add("dev-email-verification-pepper");
  return [...peppers];
}

export function resolveEmailVerificationPepper() {
  return resolveEmailVerificationPepperCandidates()[0] ?? "dev-email-verification-pepper";
}

function sha256VerificationHash(identityKey: string, code: string, pepper: string) {
  return createHash("sha256")
    .update(`${identityKey}:${code.trim()}:${pepper}`)
    .digest("hex");
}

function hashVerificationCodeV3(code: string, pepper: string) {
  const digest = createHmac("sha256", pepper).update(code.trim()).digest("hex");
  return `${VERIFICATION_HASH_V3_PREFIX}${digest}`;
}

/** Preferred storage format (deterministic HMAC — same result on every server/instance). */
export function hashEmailVerificationCodeForStorage(code: string) {
  return hashVerificationCodeV3(code, resolveEmailVerificationPepper());
}

export function collectVerificationCodeV3Hashes(code: string) {
  const hashes = new Set<string>();
  for (const pepper of resolveEmailVerificationPepperCandidates()) {
    hashes.add(hashVerificationCodeV3(code, pepper));
  }
  return hashes;
}

/** Legacy sha256 (userId- or email-keyed) for records created before bcrypt migration. */
export function hashEmailVerificationCode(userId: string, code: string) {
  return sha256VerificationHash(userId, code, resolveEmailVerificationPepper());
}

export function collectLegacyVerificationCodeHashes(params: {
  userId: string;
  email: string;
  code: string;
}): Set<string> {
  const normalizedEmail = normalizeVerificationEmail(params.email);
  const trimmedCode = params.code.trim();
  const identityKeys = [params.userId, normalizedEmail];
  const hashes = new Set<string>();

  for (const pepper of resolveEmailVerificationPepperCandidates()) {
    for (const identityKey of identityKeys) {
      hashes.add(sha256VerificationHash(identityKey, trimmedCode, pepper));
    }
  }

  return hashes;
}

export async function emailVerificationCodeMatches(
  storedHash: string,
  params: { userId: string; email: string; code: string }
) {
  const trimmedCode = params.code.trim();

  if (storedHash.startsWith(VERIFICATION_HASH_V3_PREFIX)) {
    return collectVerificationCodeV3Hashes(trimmedCode).has(storedHash);
  }

  if (storedHash.startsWith("$2")) {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(trimmedCode, storedHash);
  }

  return collectLegacyVerificationCodeHashes(params).has(storedHash);
}

export function buildEmailVerificationExpiry(now = new Date()) {
  return new Date(now.getTime() + EMAIL_VERIFICATION_EXPIRES_MINUTES * 60_000);
}

export function isEmailVerificationCodeExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

export function getEmailVerificationRetryAfterSeconds(lastSentAt: Date, now = new Date()) {
  const remainingMs =
    lastSentAt.getTime() + EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000 - now.getTime();
  if (remainingMs <= 0) {
    return 0;
  }
  return Math.ceil(remainingMs / 1000);
}
