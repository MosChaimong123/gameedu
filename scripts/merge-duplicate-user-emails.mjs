/**
 * For each duplicate email (case-insensitive), keeps the oldest User by createdAt,
 * reassigns foreign keys from duplicates to the keeper, then deletes duplicate users.
 * Run against the DB pointed to by DATABASE_URL (after load-env-for-cli).
 */
import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * @param {string} fromId
 * @param {string} toId
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 */
async function reassignAllReferences(tx, fromId, toId) {
  const r1 = await tx.classroom.updateMany({
    where: { teacherId: fromId },
    data: { teacherId: toId },
  });
  const r2 = await tx.gameHistory.updateMany({
    where: { hostId: fromId },
    data: { hostId: toId },
  });
  const r3 = await tx.questionSet.updateMany({
    where: { creatorId: fromId },
    data: { creatorId: toId },
  });
  const r4 = await tx.folder.updateMany({
    where: { creatorId: fromId },
    data: { creatorId: toId },
  });
  const r5 = await tx.oMRQuiz.updateMany({
    where: { teacherId: fromId },
    data: { teacherId: toId },
  });
  const r6 = await tx.notification.updateMany({
    where: { userId: fromId },
    data: { userId: toId },
  });
  const r7 = await tx.student.updateMany({
    where: { userId: fromId },
    data: { userId: toId },
  });
  const r8 = await tx.boardPost.updateMany({
    where: { authorUserId: fromId },
    data: { authorUserId: toId },
  });
  const r9 = await tx.boardComment.updateMany({
    where: { authorUserId: fromId },
    data: { authorUserId: toId },
  });
  const r10 = await tx.boardPollVote.updateMany({
    where: { authorUserId: fromId },
    data: { authorUserId: toId },
  });
  const r11 = await tx.boardReaction.updateMany({
    where: { authorUserId: fromId },
    data: { authorUserId: toId },
  });
  const r12 = await tx.activeGame.updateMany({
    where: { hostId: fromId },
    data: { hostId: toId },
  });

  return {
    classroom: r1.count,
    gameHistory: r2.count,
    questionSet: r3.count,
    folder: r4.count,
    omrQuiz: r5.count,
    notification: r6.count,
    student: r7.count,
    boardPost: r8.count,
    boardComment: r9.count,
    boardPollVote: r10.count,
    boardReaction: r11.count,
    activeGame: r12.count,
  };
}

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
    },
  });

  /** @type {Map<string, typeof users>} */
  const byLower = new Map();
  for (const u of users) {
    if (!u.email?.trim()) continue;
    const key = u.email.trim().toLowerCase();
    const list = byLower.get(key) ?? [];
    list.push(u);
    byLower.set(key, list);
  }

  const groups = [...byLower.entries()].filter(([, list]) => list.length > 1);

  if (groups.length === 0) {
    console.log("No duplicate emails. Nothing to merge.");
    return;
  }

  for (const [emailKey, list] of groups) {
    const sorted = [...list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const keeper = sorted[0];
    const duplicates = sorted.slice(1);
    console.log(`\nEmail "${emailKey}": keep ${keeper.id} (${keeper.username ?? "no username"}), remove ${duplicates.length} duplicate(s)`);

    for (const dup of duplicates) {
      await prisma.$transaction(
        async (tx) => {
          const counts = await reassignAllReferences(tx, dup.id, keeper.id);
          const nonzero = Object.entries(counts).filter(([, n]) => n > 0);
          if (nonzero.length > 0) {
            console.log(`  Reassigned from ${dup.id}:`, Object.fromEntries(nonzero));
          }
          await tx.user.delete({ where: { id: dup.id } });
        },
        { maxWait: 60000, timeout: 120000 },
      );
      console.log(`  Deleted duplicate user ${dup.id} (${dup.username ?? ""})`);
    }
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
