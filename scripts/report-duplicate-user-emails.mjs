import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  /** @type {Map<string, typeof users>} */
  const byLower = new Map();
  const nullOrEmpty = [];

  for (const u of users) {
    if (!u.email || !String(u.email).trim()) {
      nullOrEmpty.push(u);
      continue;
    }
    const key = String(u.email).trim().toLowerCase();
    const list = byLower.get(key) ?? [];
    list.push(u);
    byLower.set(key, list);
  }

  const duplicates = [...byLower.entries()].filter(([, list]) => list.length > 1);

  console.log(`Total User rows: ${users.length}`);
  console.log(`Rows with empty/null email: ${nullOrEmpty.length}`);
  console.log(`Distinct non-empty emails (case-insensitive): ${byLower.size}`);
  console.log("");

  if (duplicates.length === 0) {
    console.log("No duplicate emails found (case-insensitive). Safe to create unique index via `npm run db:push`.");
    return;
  }

  console.log(`Found ${duplicates.length} email(s) with more than one User document:\n`);
  for (const [emailKey, list] of duplicates) {
    console.log(`--- "${emailKey}" (${list.length} docs) ---`);
    for (const row of list) {
      const verified = row.emailVerified ? "verified" : "unverified";
      console.log(
        `  id=${row.id}  username=${JSON.stringify(row.username)}  role=${row.role}  ${verified}  createdAt=${row.createdAt?.toISOString?.() ?? row.createdAt}`,
      );
    }
    console.log("");
  }

  console.log(
    "Resolve duplicates in Atlas or via admin before running `npm run db:push` (unique index creation will fail while duplicates exist).",
  );
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
