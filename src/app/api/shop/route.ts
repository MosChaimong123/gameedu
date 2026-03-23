import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

// GET /api/shop - List items (filtered if studentId provided)
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("studentId");
    
    let items = await db.item.findMany({
      orderBy: { price: "asc" }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching shop items:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/shop/buy - Buy an item
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId, studentId, quantity = 1 } = await req.json();

    if (!itemId || !studentId) {
      return NextResponse.json({ error: "Missing itemId or studentId" }, { status: 400 });
    }

    const buyQty = Math.max(1, Number(quantity));

    // 1. Get Item and Student
    const [item, student, existingItem] = await Promise.all([
      db.item.findUnique({ where: { id: itemId } }),
      db.student.findUnique({ where: { id: studentId } }),
      db.studentItem.findFirst({
        where: { studentId, itemId }
      })
    ]);

    if (!item || !student) {
      return NextResponse.json({ error: "Item or Student not found" }, { status: 404 });
    }

    // 2. Prevent duplicate purchase (EXCEPT for consumables)
    if (existingItem && item.type !== "CONSUMABLE") {
        return NextResponse.json({ error: "คุณมีไอเทมชิ้นนี้อยู่แล้ว" }, { status: 400 });
    }

    // 3. Check if student has enough gold/points
    const isPoints = item.currency === "POINTS";
    const totalPrice = item.price * buyQty;
    
    if (isPoints) {
      if (student.points < totalPrice) {
        return NextResponse.json({ error: "แต้มพฤติกรรมไม่พอซื้อไอเทมนี้" }, { status: 400 });
      }
    } else {
      const gameStats = student.gameStats as Record<string, any> || {};
      const currentGold = Number(gameStats.gold || 0);
      if (currentGold < totalPrice) {
        return NextResponse.json({ error: "ทองไม่พอซื้อไอเทมนี้" }, { status: 400 });
      }
    }

    // 4. Perform Transaction
    const updatedStudent = await db.$transaction(async (tx: any) => {
      // Deduct currency
      if (isPoints) {
        await tx.student.update({
            where: { id: studentId },
            data: { points: { decrement: totalPrice } }
        });
      } else {
        const gameStats = student.gameStats as Record<string, any> || {};
        const currentGold = Number(gameStats.gold || 0);
        await tx.student.update({
            where: { id: studentId },
            data: {
              gameStats: {
                ...gameStats,
                gold: currentGold - totalPrice
              }
            }
        });
      }

      // Add or Increment StudentItem
      if (existingItem) {
        await tx.studentItem.update({
            where: { id: existingItem.id },
            data: { quantity: { increment: buyQty } }
        });
      } else {
        await tx.studentItem.create({
            data: {
              studentId,
              itemId,
              quantity: buyQty,
              isEquipped: false
            }
        });
      }

      // Return fresh student data
      return tx.student.findUnique({ where: { id: studentId } });
    });

    return NextResponse.json({
      success: true,
      gold: (updatedStudent.gameStats as Record<string, any>)?.gold,
      points: updatedStudent.points
    });

  } catch (error) {
    console.error("Error buying item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
