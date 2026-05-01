/**
 * One-off / utility: นับและแสดง user ที่ role = ADMIN
 * Usage: node scripts/check-admin-users.mjs
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

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL (.env / .env.local)");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const count = await prisma.user.count({ where: { role: "ADMIN" } });
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("ADMIN count:", count);
  if (admins.length) {
    console.log("Admins:");
    for (const u of admins) {
      console.log(
        `  - ${u.email ?? "(no email)"} | name: ${u.name ?? "-"} | created: ${u.createdAt.toISOString()}`
      );
    }
  }
} finally {
  await prisma.$disconnect();
}
