import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Mana Potion...");
  
  const manaPotion = await prisma.item.create({
    data: {
      name: "Mana Potion (ยาโพชั่นมานา)",
      description: "ฟื้นฟู Mana จำนวน 30 หน่วยทันที",
      price: 50,
      type: "CONSUMABLE",
      currency: "GOLD",
      manaRestore: 30,
      staminaRestore: 0,
    },
  });

  console.log("Mana Potion created:", manaPotion);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
