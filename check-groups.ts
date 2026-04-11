import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latestGroup = await prisma.studentGroup.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(latestGroup, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
