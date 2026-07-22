import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";
import { MongoClient } from "mongodb";

const apply = process.argv.includes("--apply");
const retentionDays = Math.max(1, Number(process.env.EMAIL_DELIVERY_RETENTION_DAYS) || 90);
const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
const auditRetentionDays = Math.max(1, Number(process.env.AUDIT_LOG_RETENTION_DAYS) || 365);
const auditCutoff = new Date(Date.now() - auditRetentionDays * 86_400_000);
const prisma = new PrismaClient();
const mongo = new MongoClient(process.env.DATABASE_URL);

try {
  await mongo.connect();
  const parsedDatabaseUrl = new URL(process.env.DATABASE_URL);
  const databaseName = parsedDatabaseUrl.pathname.replace(/^\//, "") || "gamedu";
  const auditLogs = mongo.db(databaseName).collection("appAuditLogs");
  const [eventCount, codeCount, auditCount] = await Promise.all([
    prisma.emailDeliveryWebhookEvent.count({ where: { expiresAt: { lte: new Date() } } }),
    prisma.emailVerificationCode.count({
      where: {
        purpose: "PASSWORD_RESET",
        createdAt: { lte: cutoff },
        OR: [
          { providerMessageId: { not: null } },
          { deliveryStatus: { not: null } },
          { emailProvider: { not: null } },
        ],
      },
    }),
    auditLogs.countDocuments({ timestamp: { $lte: auditCutoff } }),
  ]);
  console.log(`Expired delivery webhook events: ${eventCount}`);
  console.log(`Password-reset delivery records past ${retentionDays} days: ${codeCount}`);
  console.log(`Audit records past ${auditRetentionDays} days: ${auditCount}`);

  if (!apply) {
    console.log("Dry run only. Re-run with --apply after confirming the database target.");
  } else {
    const [events, codes] = await prisma.$transaction([
      prisma.emailDeliveryWebhookEvent.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
      prisma.emailVerificationCode.updateMany({
        where: { purpose: "PASSWORD_RESET", createdAt: { lte: cutoff } },
        data: {
          emailProvider: null,
          providerMessageId: null,
          deliveryStatus: null,
          providerAcceptedAt: null,
          deliveryUpdatedAt: null,
        },
      }),
    ]);
    const audits = await auditLogs.deleteMany({ timestamp: { $lte: auditCutoff } });
    console.log(`Deleted webhook events: ${events.count}`);
    console.log(`Cleared old delivery metadata: ${codes.count}`);
    console.log(`Deleted old audit records: ${audits.deletedCount}`);
  }
} finally {
  await Promise.all([prisma.$disconnect(), mongo.close()]);
}
