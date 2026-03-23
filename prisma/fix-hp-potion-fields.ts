/**
 * One-time fix: update hpRestorePercent / isPhoenix on existing Item records
 * that were seeded before those columns were added.
 * Does NOT touch StudentItem — inventory is safe.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const HP_POTION_FIXES: { name: string; hpRestorePercent: number }[] = [
  { name: "HP Potion (S)", hpRestorePercent: 0.30 },
  { name: "HP Potion (M)", hpRestorePercent: 0.60 },
  { name: "HP Potion (L)", hpRestorePercent: 1.00 },
];

async function main() {
  console.log("🔧 Fixing HP Potion hpRestorePercent values (ALL records)...");

  for (const fix of HP_POTION_FIXES) {
    // Show ALL items with this name and their current value
    const items = await prisma.item.findMany({ where: { name: fix.name } });
    console.log(`  Found ${items.length} record(s) for "${fix.name}":`);
    for (const item of items) {
      console.log(`    id=${item.id}  hpRestorePercent=${(item as any).hpRestorePercent}`);
    }

    // Update ALL records with this name (not just findFirst)
    const result = await (prisma.item as any).updateMany({
      where: { name: fix.name },
      data: { hpRestorePercent: fix.hpRestorePercent },
    });
    console.log(`  ✅ Updated ${result.count} record(s) → hpRestorePercent = ${fix.hpRestorePercent}`);
  }

  // Also fix Phoenix Feather
  const phoenixResult = await (prisma.item as any).updateMany({
    where: { name: "Phoenix Feather" },
    data: { isPhoenix: true },
  });
  if (phoenixResult.count > 0) console.log(`  ✅ Updated ${phoenixResult.count} Phoenix Feather → isPhoenix = true`);

  console.log("\n✅ Done! HP Potion fields are fixed.");
}

main()
  .catch((e) => { console.error("❌ Failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
