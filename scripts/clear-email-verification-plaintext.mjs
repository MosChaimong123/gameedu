import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

try {
  const records = await prisma.emailVerificationCode.findMany({
    where: { codePlain: { not: null } },
    select: { id: true, codeHash: true },
  });
  const unsafe = records.filter((record) => !record.codeHash?.trim());

  console.log(`OTP plaintext records: ${records.length}`);
  console.log(`Records missing a replacement hash: ${unsafe.length}`);

  if (unsafe.length > 0) {
    console.error("Refusing cleanup because one or more records have no codeHash.");
    process.exitCode = 1;
  } else if (!apply) {
    console.log("Dry run only. Re-run with --apply after confirming the database target.");
  } else {
    const result = await prisma.emailVerificationCode.updateMany({
      where: { codePlain: { not: null } },
      data: { codePlain: null },
    });
    console.log(`Cleared OTP plaintext records: ${result.count}`);
  }
} finally {
  await prisma.$disconnect();
}
