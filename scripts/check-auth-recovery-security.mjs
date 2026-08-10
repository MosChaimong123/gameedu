import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function walk(directory) {
  const absolute = path.join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((entry) => {
    const relative = path.join(directory, entry);
    const stats = statSync(path.join(root, relative));
    if (stats.isDirectory()) {
      if (entry === "__tests__" || entry === "generated") return [];
      return walk(relative);
    }
    return /\.(?:ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")
      ? [relative]
      : [];
  });
}

function requireText(file, text, reason) {
  if (!existsSync(path.join(root, file)) || !read(file).includes(text)) {
    failures.push(`${file} must include ${text} (${reason})`);
  }
}

for (const file of walk("src")) {
  const content = read(file);
  const codePlainAssignments = /\bcodePlain\s*:\s*([^,\n}]+)/g;
  for (const match of content.matchAll(codePlainAssignments)) {
    const value = match[1].trim();
    if (value === "null" || value.startsWith("string")) continue;
    failures.push(`${file} writes codePlain with a non-null runtime value: ${match[0].trim()}`);
  }

  for (const match of content.matchAll(/\bmetadata\s*:\s*\{([\s\S]{0,600}?)\}/g)) {
    if (/\b(?:otp|password|newPassword|verificationCode|codePlain)\s*:/i.test(match[1])) {
      failures.push(`${file} places an OTP/password field in audit metadata`);
    }
  }
}

const schema = read("prisma/schema.prisma");
if (/\bcodePlain\s+String(?!\?)/.test(schema)) {
  failures.push("prisma/schema.prisma must not make codePlain a required field");
}

requireText(
  "src/lib/email/send-password-reset-email.ts",
  "resolveEmailDeliveryReadiness",
  "production sender configuration must be validated at the send boundary"
);
requireText(
  "src/app/api/auth/reset-password/route.ts",
  "candidate.purpose !== PASSWORD_RESET_PURPOSE",
  "reset must reject codes from another purpose even if a stale query returns one"
);
requireText(
  "src/auth.ts",
  "isAuthVersionCurrent",
  "JWT sessions must remain tied to the password-reset auth generation"
);
requireText(
  "src/app/api/webhooks/resend/route.ts",
  "resend.webhooks.verify",
  "delivery webhooks must verify their signature"
);
requireText(
  "src/app/api/auth/change-email/confirm/route.ts",
  "tx.emailVerificationCode.updateMany",
  "email change must claim its OTP inside the same transaction as the identity mutation"
);
requireText(
  "src/app/api/auth/change-email/confirm/route.ts",
  "tx.session.deleteMany",
  "email change must revoke existing database sessions"
);
requireText(
  "src/lib/auth/prisma-auth-adapter.ts",
  "PROVIDER_LINK_REAUTH_REQUIRED",
  "provider linking must enforce the signed recent-reauth intent at the adapter boundary"
);
requireText(
  "src/app/api/auth/account-providers/google/route.ts",
  "Cannot remove the last login method",
  "provider unlink must preserve at least one login method"
);
requireText(
  "src/auth.ts",
  "allowDangerousEmailAccountLinking: false",
  "same-email OAuth identities must never auto-link without authenticated intent"
);
requireText(
  "src/lib/auth/password-policy.ts",
  "PASSWORD_MIN_LENGTH = 12",
  "new passwords must share the Phase 8B minimum-length policy"
);
requireText(
  "src/lib/auth/session-registry.ts",
  "sessionIdHash",
  "JWT session identifiers must be stored only as hashes in the device registry"
);
requireText(
  "src/auth.ts",
  "validateAndTouchUserAuthSession",
  "JWT callbacks must enforce per-device revocation and explicit idle/absolute expiry"
);
requireText(
  "src/auth.ts",
  "freshUser.disabledAt",
  "disabled account status must be checked against the database on session refresh"
);
requireText(
  "src/app/api/auth/security/sessions/[id]/route.ts",
  "where: { id, userId, ...activeUserAuthSessionFilter() }",
  "single-session revocation must be scoped to the authenticated owner"
);
requireText(
  "src/lib/auth/session-registry.ts",
  "{ revokedAt: { isSet: false } }",
  "active security-session filters must support legacy MongoDB rows where revokedAt is missing"
);
requireText(
  "src/app/api/admin/users/[id]/security/route.ts",
  "securitySessionsRevoked",
  "administrator disable/revoke-all must revoke registry sessions in the security transaction"
);
requireText(
  "src/app/api/admin/security/auth-health/route.ts",
  'session.user.role !== "ADMIN" || session.user.mfaLevel !== 1',
  "aggregate auth metrics must require an MFA-authenticated administrator"
);
requireText(
  "src/lib/security/auth-observability.ts",
  "countDocuments",
  "identity rollout metrics must be aggregated instead of exporting raw audit events"
);
requireText(
  "src/auth.ts",
  'actorUserId: null',
  "failed public sign-in audits must not persist an account identifier"
);
requireText(
  "scripts/prune-auth-security-metadata.mjs",
  "AUTH_SESSION_METADATA_RETENTION_DAYS",
  "session and device metadata must have an explicit retention cleanup"
);

if (failures.length > 0) {
  console.error("Auth recovery security guard failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Auth recovery security guard passed.");
