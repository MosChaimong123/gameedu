import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";

const apply = process.argv.includes("--apply");
const sessionRetentionDays = Math.max(1, Number(process.env.AUTH_SESSION_METADATA_RETENTION_DAYS) || 90);
const challengeRetentionDays = Math.max(1, Number(process.env.AUTH_CHALLENGE_RETENTION_DAYS) || 7);
const now = new Date();
const sessionCutoff = new Date(now.getTime() - sessionRetentionDays * 86_400_000);
const challengeCutoff = new Date(now.getTime() - challengeRetentionDays * 86_400_000);
const prisma = new PrismaClient();

const sessionWhere = {
  OR: [
    { absoluteExpiresAt: { lte: sessionCutoff } },
    { idleExpiresAt: { lte: sessionCutoff } },
    { revokedAt: { lte: sessionCutoff } },
  ],
};
const challengeWhere = {
  OR: [
    { expiresAt: { lte: challengeCutoff } },
    { consumedAt: { lte: challengeCutoff } },
  ],
};
const recoveryWhere = { consumedAt: { lte: sessionCutoff } };

try {
  const [sessions, challenges, recoveryCodes] = await Promise.all([
    prisma.userAuthSession.count({ where: sessionWhere }),
    prisma.authChallenge.count({ where: challengeWhere }),
    prisma.mfaRecoveryCode.count({ where: recoveryWhere }),
  ]);
  console.log(`Expired/revoked auth session metadata past ${sessionRetentionDays} days: ${sessions}`);
  console.log(`Expired/consumed auth challenges past ${challengeRetentionDays} days: ${challenges}`);
  console.log(`Consumed MFA recovery records past ${sessionRetentionDays} days: ${recoveryCodes}`);

  if (!apply) {
    console.log("Dry run only. Re-run with --apply after confirming the database target.");
  } else {
    const [deletedSessions, deletedChallenges, deletedRecoveryCodes] = await prisma.$transaction([
      prisma.userAuthSession.deleteMany({ where: sessionWhere }),
      prisma.authChallenge.deleteMany({ where: challengeWhere }),
      prisma.mfaRecoveryCode.deleteMany({ where: recoveryWhere }),
    ]);
    console.log(`Deleted auth session metadata: ${deletedSessions.count}`);
    console.log(`Deleted auth challenges: ${deletedChallenges.count}`);
    console.log(`Deleted consumed recovery records: ${deletedRecoveryCodes.count}`);
  }
} finally {
  await prisma.$disconnect();
}
