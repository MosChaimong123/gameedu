import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$runCommandRaw({
    createIndexes: "NegamonLiveBattleRewardClaim",
    indexes: [
      {
        key: { idempotencyKey: 1 },
        name: "NegamonLiveBattleRewardClaim_idempotencyKey_unique",
        unique: true,
      },
      {
        key: { classId: 1, createdAt: -1 },
        name: "NegamonLiveBattleRewardClaim_classId_createdAt_idx",
      },
      {
        key: { studentId: 1, createdAt: -1 },
        name: "NegamonLiveBattleRewardClaim_studentId_createdAt_idx",
      },
    ],
  });

  console.log("Ensured NegamonLiveBattleRewardClaim indexes.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
