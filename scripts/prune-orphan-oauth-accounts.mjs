/**
 * Removes Account / Session rows whose userId no longer exists on User.
 * MongoDB does not enforce FKs; merges or manual deletes can leave orphans.
 * Prisma then throws: "Field user is required to return data, got null instead"
 * during OAuth (getUserByAccount).
 *
 * Usage:
 *   npm run db:print-target
 *   npm run db:prune-orphan-oauth -- --dry-run
 *   npm run db:prune-orphan-oauth
 */
import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  const userIds = new Set(users.map((u) => u.id));

  const accounts = await prisma.account.findMany({
    select: { id: true, userId: true, provider: true, providerAccountId: true },
  });
  const orphanAccounts = accounts.filter((a) => !userIds.has(a.userId));

  const sessions = await prisma.session.findMany({
    select: { id: true, userId: true },
  });
  const orphanSessions = sessions.filter((s) => !userIds.has(s.userId));

  console.log(`Users: ${userIds.size}`);
  console.log(`Orphan Account rows (user missing): ${orphanAccounts.length}`);
  console.log(`Orphan Session rows (user missing): ${orphanSessions.length}`);

  if (orphanAccounts.length === 0 && orphanSessions.length === 0) {
    console.log("Nothing to prune.");
    return;
  }

  if (dryRun) {
    console.log("\n--dry-run: no deletes.");
    for (const a of orphanAccounts.slice(0, 30)) {
      console.log(`  account ${a.id} userId=${a.userId} ${a.provider}:${a.providerAccountId}`);
    }
    if (orphanAccounts.length > 30) {
      console.log(`  ... and ${orphanAccounts.length - 30} more accounts`);
    }
    for (const s of orphanSessions.slice(0, 10)) {
      console.log(`  session ${s.id} userId=${s.userId}`);
    }
    if (orphanSessions.length > 10) {
      console.log(`  ... and ${orphanSessions.length - 10} more sessions`);
    }
    return;
  }

  let delAcc = { count: 0 };
  let delSess = { count: 0 };
  if (orphanAccounts.length > 0) {
    delAcc = await prisma.account.deleteMany({
      where: { id: { in: orphanAccounts.map((a) => a.id) } },
    });
  }
  if (orphanSessions.length > 0) {
    delSess = await prisma.session.deleteMany({
      where: { id: { in: orphanSessions.map((s) => s.id) } },
    });
  }

  console.log(`Deleted accounts: ${delAcc.count}, sessions: ${delSess.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
