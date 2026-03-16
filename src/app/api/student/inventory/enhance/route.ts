import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

/**
 * Success rates for each level (+1 to +9)
 * +1 to +3: 100%
 * +4: 80%
 * +5: 60%
 * +6: 40%
 * +7: 30%
 * +8: 20%
 * +9: 10%
 */
const SUCCESS_RATES: Record<number, number> = {
    1: 100, 2: 100, 3: 100,
    4: 80,  5: 60,  6: 40,
    7: 30,  8: 20,  9: 10
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { studentItemId } = body;

    if (!studentItemId) {
      return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
    }

    // 1. Fetch StudentItem with Item info
    const studentItem = await db.studentItem.findUnique({
      where: { id: studentItemId },
      include: { 
          item: true,
          student: true
      }
    });

    if (!studentItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const currentLevel = studentItem.enhancementLevel || 0;
    if (currentLevel >= 9) {
      return NextResponse.json({ error: "ระดับสูงสุดแล้ว (+9)" }, { status: 400 });
    }

    const nextLevel = currentLevel + 1;
    const basePrice = studentItem.item.price || 0;
    
    // 2. Calculate Costs
    const goldCost = Math.floor(basePrice * nextLevel * 0.5);
    const pointCost = nextLevel * 10;

    const studentStats = (studentItem.student.gameStats as any) || { gold: 0 };
    const currentGold = Number(studentStats.gold || 0);
    const currentPoints = studentItem.student.points || 0;

    // 3. Validate Resources
    if (currentGold < goldCost) {
      return NextResponse.json({ error: `ทองไม่เพียงพอ (ต้องการ ${goldCost}, มี ${Math.floor(currentGold)})` }, { status: 400 });
    }
    if (currentPoints < pointCost) {
      return NextResponse.json({ error: `คะแนนพฤติกรรมไม่เพียงพอ (ต้องการ ${pointCost}, มี ${currentPoints})` }, { status: 400 });
    }

    // 4. Roll for Success
    const successRate = SUCCESS_RATES[nextLevel] || 0;
    const roll = Math.random() * 100;
    const isSuccess = roll <= successRate;

    // 5. Update Database
    const updatedGold = Math.floor(currentGold - goldCost);
    const updatedStats = {
      ...studentStats,
      gold: updatedGold
    };

    console.log(`🔨 [ENHANCE] Roll: ${roll.toFixed(2)} vs ${successRate}% for +${nextLevel}`);

    let finalLevel = currentLevel;
    if (isSuccess) {
        finalLevel = nextLevel;
    } else {
        // Option: In high levels, failure might decrease level.
        // For now, keep it simple: just lose materials.
    }

    const [updatedStudent, updatedItem] = await db.$transaction([
      // Deduct Points and Update Stats (Always happen)
      db.student.update({
        where: { id: studentItem.studentId },
        data: {
          points: { decrement: pointCost },
          gameStats: updatedStats as any,
          history: {
            create: {
              reason: isSuccess 
                ? `🔨 ตีบวก ${studentItem.item.name} สำเร็จ! (+${finalLevel})`
                : `🔨 ตีบวก ${studentItem.item.name} ไม่สำเร็จ (ต้องการ +${nextLevel})`,
              value: -pointCost,
              timestamp: new Date()
            }
          }
        }
      }),
      // Increase Level ONLY IF success
      db.studentItem.update({
        where: { id: studentItemId },
        data: {
          enhancementLevel: finalLevel
        }
      })
    ]);

    return NextResponse.json({
      success: isSuccess,
      newLevel: updatedItem.enhancementLevel,
      goldSpent: goldCost,
      pointsSpent: pointCost,
      newGold: updatedGold,
      newPoints: currentPoints - pointCost,
      successRate
    });

  } catch (error) {
    console.error("Enhancement error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
