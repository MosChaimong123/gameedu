import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$runCommandRaw({
    createIndexes: "EconomyTransaction",
    indexes: [
      {
        key: { idempotencyKey: 1 },
        name: "EconomyTransaction_idempotencyKey_unique_non_null",
        unique: true,
        partialFilterExpression: {
          idempotencyKey: { $type: "string" },
        },
      },
    ],
  });

  console.log("Ensured EconomyTransaction idempotency indexes.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
