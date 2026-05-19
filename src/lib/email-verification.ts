import { createHash, randomInt } from "node:crypto";

export const EMAIL_VERIFICATION_CODE_LENGTH = 6;
export const EMAIL_VERIFICATION_EXPIRES_MINUTES = 15;
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
export const EMAIL_VERIFICATION_PURPOSE = "SIGNUP_VERIFY";

const BCRYPT_ROUNDS = 10;

export function normalizeVerificationEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateEmailVerificationCode() {
  return String(randomInt(0, 10 ** EMAIL_VERIFICATION_CODE_LENGTH)).padStart(
    EMAIL_VERIFICATION_CODE_LENGTH,
    "0"
  );
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

/** Preferred storage format (bcrypt). */
export async function hashEmailVerificationCodeForStorage(code: string) {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(code.trim(), BCRYPT_ROUNDS);
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
