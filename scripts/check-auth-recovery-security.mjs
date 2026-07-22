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

if (failures.length > 0) {
  console.error("Auth recovery security guard failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Auth recovery security guard passed.");
