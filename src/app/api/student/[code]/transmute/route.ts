import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MATERIAL_TIER_MAP, MATERIAL_TIERS, getRandomMaterialOfTier } from "@/lib/game/crafting-system";
import { trackQuestEvent } from "@/lib/game/quest-engine";

const TIER_ORDER = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
const TRANSMUTE_COST = 3; // materials required per transmute

// POST /api/student/[code]/transmute
// Body: { fromTier: "COMMON" | "RARE" | "EPIC" }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json() as { fromTier?: string };
    const fromTier = body.fromTier?.toUpperCase();

    if (!fromTier || !["COMMON", "RARE", "EPIC"].includes(fromTier)) {
      return NextResponse.json({ error: "Invalid tier. Must be COMMON, RARE, or EPIC." }, { status: 400 });
    }

    const toTierIndex = TIER_ORDER.indexOf(fromTier) + 1;
    const toTier = TIER_ORDER[toTierIndex];

    const student = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      select: { id: true },
    });
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Fetch all materials of the fromTier that the student owns
    const tierMaterials = MATERIAL_TIERS[fromTier] as string[];
    const ownedMaterials = await db.material.findMany({
      where: {
        studentId: student.id,
        type: { in: tierMaterials },
        quantity: { gt: 0 },
      },
      orderBy: { quantity: "desc" },
    });

    const totalOwned = ownedMaterials.reduce((sum, m) => sum + m.quantity, 0);
    if (totalOwned < TRANSMUTE_COST) {
      return NextResponse.json(
        { error: `ต้องการวัสดุ ${fromTier} รวม ${TRANSMUTE_COST} ชิ้น (มี ${totalOwned})` },
        { status: 400 }
      );
    }

    // Deduct 3 materials (greedy: from highest quantity first)
    const deductions: { id: string; newQty: number }[] = [];
    let remaining = TRANSMUTE_COST;
    for (const mat of ownedMaterials) {
      if (remaining <= 0) break;
      const take = Math.min(mat.quantity, remaining);
      deductions.push({ id: mat.id, newQty: mat.quantity - take });
      remaining -= take;
    }

    // Pick a random material from toTier
    const receivedType = getRandomMaterialOfTier(toTier);
    if (!receivedType) {
      return NextResponse.json({ error: "No materials available in target tier" }, { status: 500 });
    }

    // Atomic transaction
    await db.$transaction([
      ...deductions.map(({ id, newQty }) =>
        newQty <= 0
          ? db.material.delete({ where: { id } })
          : db.material.update({ where: { id }, data: { quantity: newQty } })
      ),
      db.material.upsert({
        where: { studentId_type: { studentId: student.id, type: receivedType } },
        update: { quantity: { increment: 1 } },
        create: { studentId: student.id, type: receivedType, quantity: 1 },
      }),
    ]);

    // Track quest event (fire-and-forget)
    void trackQuestEvent(student.id, "TRANSMUTE");

    return NextResponse.json({
      success: true,
      fromTier,
      toTier,
      received: { type: receivedType, tier: MATERIAL_TIER_MAP[receivedType] ?? toTier, quantity: 1 },
    });
  } catch (error) {
    console.error("[TRANSMUTE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
