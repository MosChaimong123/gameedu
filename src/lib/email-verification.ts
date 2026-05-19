import { createHash, randomInt } from "node:crypto";

export const EMAIL_VERIFICATION_CODE_LENGTH = 6;
export const EMAIL_VERIFICATION_EXPIRES_MINUTES = 15;
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
export const EMAIL_VERIFICATION_PURPOSE = "SIGNUP_VERIFY";

export function normalizeVerificationEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateEmailVerificationCode() {
  return String(randomInt(0, 10 ** EMAIL_VERIFICATION_CODE_LENGTH)).padStart(
    EMAIL_VERIFICATION_CODE_LENGTH,
    "0"
  );
}

function resolveEmailVerificationPepper() {
  return (
    process.env.EMAIL_VERIFICATION_PEPPER?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "dev-email-verification-pepper"
  );
}

/** Hash is keyed by userId so verification does not depend on email casing in the DB. */
export function hashEmailVerificationCode(userId: string, code: string) {
  return createHash("sha256")
    .update(`${userId}:${code.trim()}:${resolveEmailVerificationPepper()}`)
    .digest("hex");
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
