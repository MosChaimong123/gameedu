import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding items...');

  const items = [
    {
      name: 'ดาบไม้ฝึกหัด',
      description: 'เพิ่มพลังโจมตีบอส 5%',
      price: 1000,
      type: 'WEAPON',
      effectType: 'BOSS_DMG',
      effectValue: 0.05,
      image: '⚔️',
    },
    {
      name: 'ดาบเหล็กกล้า',
      description: 'เพิ่มพลังโจมตีบอส 15%',
      price: 5000,
      type: 'WEAPON',
      effectType: 'BOSS_DMG',
      effectValue: 0.15,
      image: '🗡️',
    },
    {
      name: 'โล่ไม้เก่า',
      description: 'เพิ่มอัตราผลิตเหรียญ 5%',
      price: 800,
      type: 'ARMOR',
      effectType: 'GOLD_BOOST',
      effectValue: 0.05,
      image: '🛡️',
    },
    {
      name: 'เกราะอัศวิน',
      description: 'เพิ่มอัตราผลิตเหรียญ 15%',
      price: 4500,
      type: 'ARMOR',
      effectType: 'GOLD_BOOST',
      effectValue: 0.15,
      image: '🛡️',
    },
    {
        name: 'แหวนแห่งโชคลาภ',
        description: 'เพิ่มอัตราผลิตเหรียญ 25%',
        price: 15000,
        type: 'RING',
        effectType: 'GOLD_BOOST',
        effectValue: 0.25,
        image: '💍',
    },
    {
        name: 'หมวกนักรบฝึกหัด',
        description: 'เพิ่มพลังโจมตีบอส 3%',
        price: 500,
        type: 'HELMET',
        effectType: 'BOSS_DMG',
        effectValue: 0.03,
        image: '🪖',
    },
    {
        name: 'รองเท้าบูทหนัง',
        description: 'เพิ่มอัตราผลิตเหรียญ 3%',
        price: 500,
        type: 'BOOTS',
        effectType: 'GOLD_BOOST',
        effectValue: 0.03,
        image: '🥾',
    },
    {
        name: 'ถุงมือผ้าฝ้าย',
        description: 'เพิ่มพลังโจมตีบอส 2%',
        price: 300,
        type: 'GLOVES',
        effectType: 'BOSS_DMG',
        effectValue: 0.02,
        image: '🧤',
    },
    {
        name: 'สร้อยคอคริสตัล',
        description: 'เพิ่มอัตราผลิตเหรียญ 10%',
        price: 2500,
        type: 'NECKLACE',
        effectType: 'GOLD_BOOST',
        effectValue: 0.10,
        image: '📿',
    }
  ];

  for (const item of items) {
    await prisma.item.upsert({
      where: { id: 'dummy-id-to-force-create' }, // In MongoDB, we use name or other unique field
      update: {},
      create: item,
    }).catch(async (e) => {
        // Fallback if upsert fails on ID
        await prisma.item.create({ data: item });
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
