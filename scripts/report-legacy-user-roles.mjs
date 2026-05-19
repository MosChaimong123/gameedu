/**
 * Report legacy accounts that still use role = USER.
 *
 * Usage:
 *   node scripts/report-legacy-user-roles.mjs
 *   node scripts/report-legacy-user-roles.mjs --json
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const asJson = process.argv.includes("--json");

function loadEnvFile(filePath, { overwrite } = { overwrite: false }) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (overwrite || process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, ".env.local"), { overwrite: true });

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL (.env / .env.local)");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const legacyUsers = await prisma.user.findMany({
    where: { role: "USER" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      _count: {
        select: {
          classrooms: true,
          studentProfiles: true,
        },
      },
    },
  });

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          count: legacyUsers.length,
          users: legacyUsers.map((user) => ({
            ...user,
            createdAt: user.createdAt.toISOString(),
            emailVerified: user.emailVerified?.toISOString() ?? null,
          })),
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  console.log("Legacy USER accounts:", legacyUsers.length);
  if (legacyUsers.length === 0) {
    console.log("No legacy USER accounts found.");
    process.exit(0);
  }

  for (const user of legacyUsers) {
    const teacherSignal = user._count.classrooms > 0 ? `teacher-signal:${user._count.classrooms}` : "";
    const studentSignal = user._count.studentProfiles > 0 ? `student-signal:${user._count.studentProfiles}` : "";
    const signals = [teacherSignal, studentSignal].filter(Boolean).join(", ") || "no-linked-signal";
    console.log(
      `- ${user.email ?? "(no email)"} | id=${user.id} | verified=${user.emailVerified ? "yes" : "no"} | created=${user.createdAt.toISOString()} | ${signals}`
    );
  }
} finally {
  await prisma.$disconnect();
}
