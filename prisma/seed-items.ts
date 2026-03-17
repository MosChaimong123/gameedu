import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 🛡️ Reseeding Items System ---');

  // 1. Wipe existing items (Optional, but recommended for overhaul)
  console.log('Cleaning up existing items...');
  await prisma.item.deleteMany({});

  const items = [
    // --- WEAPONS (Boss Damage focus) ---
    {
      name: 'ดาบไม้ฝึกหัด',
      description: 'อาวุธระดับเริ่มต้น เพิ่มความเสียหายบอสเล็กน้อย',
      price: 150,
      type: 'WEAPON',
      baseAtk: 5,
      bossDamageMultiplier: 0.05,
      image: '⚔️',
    },
    {
      name: 'ดาบเหล็กกล้า',
      description: 'ดาบที่ตีจากเหล็กชั้นดี เพิ่มพลังโจมตีและโบนัสบอส',
      price: 1200,
      type: 'WEAPON',
      baseAtk: 25,
      bossDamageMultiplier: 0.15,
      image: '🗡️',
    },
    {
      name: 'เอ็กซ์คาลิเบอร์ (จำลอง)',
      description: 'ดาบศักดิ์สิทธิ์รันตีความแรง พลังโจมตีบอสสูงมาก',
      price: 8500,
      type: 'WEAPON',
      baseAtk: 100,
      bossDamageMultiplier: 0.50,
      image: '✨',
    },

    // --- ARMOR (HP & Gold Boost) ---
    {
      name: 'ชุดนักผจญภัย',
      description: 'เสื้อผ้าที่ทนทานขึ้นมาหน่อย เพิ่ม HP และทองเล็กน้อย',
      price: 200,
      type: 'ARMOR',
      baseHp: 50,
      goldMultiplier: 0.05,
      image: '👕',
    },
    {
      name: 'เกราะเหล็กอัศวิน',
      description: 'ชุดเกราะเต็มยศเพื่อการป้องกันและโบนัสทองที่มั่นคง',
      price: 2500,
      type: 'ARMOR',
      baseHp: 300,
      baseDef: 20,
      goldMultiplier: 0.15,
      image: '🛡️',
    },

    // --- HELMETS ---
    {
        name: 'หมวกเหล็ก',
        description: 'การป้องกันส่วนหัวขั้นพื้นฐาน',
        price: 500,
        type: 'HELMET',
        baseDef: 10,
        baseHp: 20,
        image: '🪖',
    },

    // --- ACCESSORIES (High Multipliers) ---
    {
        name: 'แหวนแห่งโชคลาภ',
        description: 'แหวนทองคำประดับอัญมณีสีแดง เพิ่มทองที่ได้รับอย่างมาก',
        price: 3500,
        type: 'RING',
        goldMultiplier: 0.25,
        image: '💍',
    },
    {
        name: 'สร้อยคอศักดิ์สิทธิ์',
        description: 'สร้อยที่รวมพลังแห่งสวรรค์ เพิ่มทั้งทองและความเสียหายบอส',
        price: 6000,
        type: 'NECKLACE',
        goldMultiplier: 0.20,
        bossDamageMultiplier: 0.20,
        image: '📿',
    },
    {
        name: 'ถุงมือทองคำ',
        description: 'ถุงมือที่หยิบจับอะไรก็เป็นเงินเป็นทอง',
        price: 5000,
        type: 'GLOVES',
        goldMultiplier: 0.30,
        image: '🧤',
    }
  ];

  console.log(`Inserting ${items.length} updated items...`);
  
  for (const item of items) {
    const created = await prisma.item.create({
      data: item
    });
    console.log(`✅ Created: ${created.name} (${created.id})`);
  }

  console.log('--- Seeding complete! ---');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
