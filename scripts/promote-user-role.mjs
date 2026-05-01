/**
 * อัปเดต role ของ User ตามอีเมล (เช่น แก้บัญชีที่สมัครแล้วได้ STUDENT ทั้งที่ตั้งใจเป็นครู)
 *
 * Usage:
 *   node scripts/promote-user-role.mjs <email> TEACHER
 *   node scripts/promote-user-role.mjs <email> STUDENT
 *
 * โหลด .env / .env.local จาก root โปรเจกต์ (เหมือนสคริปต์อื่นใน repo)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const ALLOWED = new Set(["TEACHER", "STUDENT"]);
const email = process.argv[2]?.trim();
const role = process.argv[3]?.trim().toUpperCase();

if (!email || !role || !ALLOWED.has(role)) {
  console.error(
    "Usage: node scripts/promote-user-role.mjs <email> <TEACHER|STUDENT>"
  );
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const result = await prisma.user.updateMany({
    where: { email },
    data: { role },
  });
  if (result.count === 0) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }
  console.log(`Updated ${result.count} user(s): ${email} → role ${role}`);
} finally {
  await prisma.$disconnect();
}
