import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode() {
  return Array.from(randomBytes(12), (byte) => alphabet[byte % alphabet.length]).join("");
}

function rawCount(result) {
  const value = Array.isArray(result) ? result[0]?.count : undefined;
  return typeof value === "number" ? value : 0;
}

async function uniqueCode() {
  while (true) {
    const code = generateCode();
    const existing = await prisma.student.findUnique({ where: { loginCode: code }, select: { id: true } });
    if (!existing) return code;
  }
}

try {
  // loginCodeVersion became required after legacy Student documents already
  // existed. Query it through MongoDB so the dry run can safely detect missing
  // values without asking Prisma to deserialize a required-but-absent field.
  const missingVersionResult = await prisma.student.aggregateRaw({
    pipeline: [
      {
        $match: {
          $or: [
            { loginCodeVersion: { $exists: false } },
            { loginCodeVersion: null },
          ],
        },
      },
      { $count: "count" },
    ],
  });
  const missingVersion = rawCount(missingVersionResult);
  const students = await prisma.student.findMany({ select: { id: true, loginCode: true } });
  const legacy = students.filter((student) => !/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/.test(student.loginCode));
  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    scanned: students.length,
    legacy: legacy.length,
    missingLoginCodeVersion: missingVersion,
  }));
  if (apply) {
    if (missingVersion > 0) {
      await prisma.$runCommandRaw({
        update: "Student",
        updates: [
          {
            q: {
              $or: [
                { loginCodeVersion: { $exists: false } },
                { loginCodeVersion: null },
              ],
            },
            u: { $set: { loginCodeVersion: 1 } },
            multi: true,
          },
        ],
      });
    }

    const now = new Date();
    for (const student of legacy) {
      await prisma.student.update({
        where: { id: student.id },
        data: {
          loginCode: await uniqueCode(),
          loginCodeVersion: { increment: 1 },
          loginCodeRotatedAt: now,
          loginCodeDisabledAt: null,
        },
      });
      await prisma.studentAccessSession.updateMany({
        where: { studentId: student.id, revokedAt: null },
        data: { revokedAt: now, revokedReason: "legacy_code_migration" },
      });
    }
  }
} finally {
  await prisma.$disconnect();
}
