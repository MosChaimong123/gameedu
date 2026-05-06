/**
 * User.username is @unique — multiple nulls block MongoDB unique index.
 * Sets a stable placeholder username for any user missing username.
 */
import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.user.findMany({
    select: { id: true, email: true, username: true },
  });
  const users = all.filter((u) => u.username == null || String(u.username).trim() === "");
  for (const u of users) {
    const base = u.email
      ? u.email
          .split("@")[0]
          .replace(/[^a-zA-Z0-9_\u0E00-\u0E7F.-]/g, "_")
          .slice(0, 20) || "user"
      : "user";
    let candidate = `${base}_${u.id.slice(-6)}`;
    let n = 0;
    for (;;) {
      const exists = await prisma.user.findFirst({
        where: { username: candidate, NOT: { id: u.id } },
        select: { id: true },
      });
      if (!exists) break;
      n += 1;
      candidate = `${base}_${u.id.slice(-6)}_${n}`;
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { username: candidate },
    });
    console.log(`Set username for ${u.id} -> ${candidate}`);
  }
  console.log(`Updated ${users.length} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
