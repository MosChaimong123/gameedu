import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import {
  TIER_MAX,
  getEnhancementZone,
  getSuccessRate,
  calculateEnhancementCost,
  rollEnhancement,
} from "@/lib/game/enhancement-system";
import { buildStudentItemStatSnapshot } from "@/lib/game/student-item-stats";
import { trackQuestEvent } from "@/lib/game/quest-engine";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { studentItemId, materialType } = body as {
      studentItemId?: string;
      materialType?: string;
    };

    if (!studentItemId) {
      return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
    }

    // 1. Fetch StudentItem with item + student
    const studentItem = await db.studentItem.findUnique({
      where: { id: studentItemId },
      include: { item: true, student: true },
    });

    if (!studentItem) {
      return NextResponse.json({ error: "ไม่พบไอเทม" }, { status: 404 });
    }

    const currentLevel = studentItem.enhancementLevel ?? 0;
    const tier = (studentItem.item as any).tier ?? "COMMON";
    const tierMax = TIER_MAX[tier] ?? 9;

    // 2. Tier max enforcement
    if (currentLevel >= tierMax) {
      return NextResponse.json(
        { error: `ระดับสูงสุดสำหรับ ${tier} แล้ว (+${tierMax})` },
        { status: 400 }
      );
    }

    // 3. Determine zone and costs
    const zone = getEnhancementZone(currentLevel);
    const itemPrice = studentItem.item.price ?? 0;
    const cost = calculateEnhancementCost(currentLevel, itemPrice, materialType);

    // 4. Validate resources
    const gameStats = (studentItem.student.gameStats as any) ?? { gold: 0 };
    const currentGold = Number(gameStats.gold ?? 0);
    const currentPoints = studentItem.student.points ?? 0;

    if (currentGold < cost.gold) {
      return NextResponse.json(
        { error: `ทองไม่เพียงพอ (ต้องการ ${cost.gold}, มี ${Math.floor(currentGold)})` },
        { status: 400 }
      );
    }

    if (currentPoints < cost.behaviorPoints) {
      return NextResponse.json(
        {
          error: `คะแนนพฤติกรรมไม่เพียงพอ (ต้องการ ${cost.behaviorPoints}, มี ${currentPoints})`,
        },
        { status: 400 }
      );
    }

    // Danger zone: validate material
    let materialRecord: { id: string; quantity: number; type: string } | null = null;
    if (zone === "DANGER" && cost.materialQuantity > 0) {
      // Backward compatibility: if client doesn't send materialType, auto-pick any available material.
      materialRecord = materialType
        ? await db.material.findFirst({
            where: { studentId: studentItem.studentId, type: materialType },
          })
        : await db.material.findFirst({
            where: {
              studentId: studentItem.studentId,
              quantity: { gte: cost.materialQuantity },
            },
            orderBy: { quantity: "desc" },
          });
      if (!materialRecord || materialRecord.quantity < cost.materialQuantity) {
        return NextResponse.json(
          {
            error: `วัสดุไม่เพียงพอ (ต้องการ ${cost.materialQuantity} ชิ้น)`,
          },
          { status: 400 }
        );
      }
    }

    // 5. Roll outcome
    const result = rollEnhancement(currentLevel);
    const successRate = getSuccessRate(currentLevel);

    // 6. Build updated gold
    const updatedGold = Math.floor(currentGold - cost.gold);
    const updatedStats = { ...gameStats, gold: updatedGold };

    console.log(
      `🔨 [ENHANCE] Zone: ${zone} | Roll result: ${result.success ? "SUCCESS" : "FAIL"} | ${currentLevel} → ${result.newLevel}`
    );

    // 7. DB transaction
    const updatedSnapshot = buildStudentItemStatSnapshot(
      studentItem.item,
      result.newLevel
    );

    const txOps: any[] = [
      // Deduct gold + BP, add history
      db.student.update({
        where: { id: studentItem.studentId },
        data: {
          points: { decrement: cost.behaviorPoints },
          gameStats: updatedStats as any,
          history: {
            create: {
              reason: result.success
                ? `🔨 ตีบวก ${studentItem.item.name} สำเร็จ! (+${result.newLevel})`
                : `🔨 ตีบวก ${studentItem.item.name} ไม่สำเร็จ (${zone === "DANGER" ? `ลดเหลือ +${result.newLevel}` : "ไม่เปลี่ยนแปลง"})`,
              value: -cost.behaviorPoints,
              timestamp: new Date(),
            },
          },
        },
      }),
      // Update enhancement level
      db.studentItem.update({
        where: { id: studentItemId },
        data: {
          enhancementLevel: result.newLevel,
          ...updatedSnapshot,
        },
      }),
    ];

    // Danger: deduct material regardless of outcome
    if (zone === "DANGER" && materialRecord && cost.materialQuantity > 0) {
      txOps.push(
        db.material.update({
          where: { id: materialRecord.id },
          data: { quantity: { decrement: cost.materialQuantity } },
        })
      );
    }

    const txResults = await db.$transaction(txOps);
    const updatedItem = txResults[1] as { enhancementLevel: number };

    // Track quest event (fire-and-forget)
    void trackQuestEvent(studentItem.studentId, "ITEM_ENHANCE");

    return NextResponse.json({
      success: result.success,
      newLevel: updatedItem.enhancementLevel,
      zone,
      goldSpent: cost.gold,
      pointsSpent: cost.behaviorPoints,
      materialSpent: zone === "DANGER" ? cost.materialQuantity : 0,
      newGold: updatedGold,
      newPoints: currentPoints - cost.behaviorPoints,
      successRate,
    });
  } catch (error) {
    console.error("Enhancement error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
