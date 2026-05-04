/**
 * สร้างบัญชี ADMIN คนแรกในฐานข้อมูล (เมื่อยังไม่มี ADMIN)
 * ใช้รอบ bcrypt เดียวกับ POST /api/admin/register
 *
 * Usage:
 *   node scripts/create-first-admin.mjs <email> <password>
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

const email = process.argv[2]?.trim();
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/create-first-admin.mjs <email> <password>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL (.env / .env.local)");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) {
    console.error(
      "There is already at least one ADMIN. Use /api/admin/register while logged in as admin, or update the DB manually."
    );
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(
      `User already exists: ${email}. Remove them, use a different email, or upgrade role via API with correct password.`
    );
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const usernameSuffix = Math.floor(1000 + Math.random() * 9000);
  const adminUsername = `admin_${usernameSuffix}`;

  const newUser = await prisma.user.create({
    data: {
      email,
      username: adminUsername,
      password: hashedPassword,
      role: "ADMIN",
      name: "Admin",
      emailVerified: new Date(),
    },
  });

  console.log("Created first ADMIN user.");
  console.log("  userId:", newUser.id);
  console.log("  email:", email);
  console.log("  username:", adminUsername);
  console.log("Log in at /login then open /admin");
} finally {
  await prisma.$disconnect();
}
