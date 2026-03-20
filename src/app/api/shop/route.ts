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

    // If studentId provided, filter out items they already own
    if (studentId) {
      const ownedItems = await db.studentItem.findMany({
        where: { studentId },
        select: { itemId: true }
      });
      const ownedIds = new Set(ownedItems.map((oi: any) => oi.itemId));
      items = items.filter((item: any) => !ownedIds.has(item.id));
    }

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

    const { itemId, studentId } = await req.json();

    if (!itemId || !studentId) {
      return NextResponse.json({ error: "Missing itemId or studentId" }, { status: 400 });
    }

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

    // 2. Prevent duplicate purchase
    if (existingItem) {
        return NextResponse.json({ error: "คุณมีไอเทมชิ้นนี้อยู่แล้ว" }, { status: 400 });
    }

    // 3. Check if student has enough gold
    const gameStats = student.gameStats as Record<string, any> || {};
    const currentGold = Number(gameStats.gold || 0);
    if (currentGold < item.price) {
      return NextResponse.json({ error: "ทองไม่พอซื้อไอเทมนี้" }, { status: 400 });
    }

    // 4. Perform Transaction
    const updatedStudent = await db.$transaction(async (tx: any) => {
      // Deduct gold
      const studentUpdate = await tx.student.update({
        where: { id: studentId },
        data: {
          gameStats: {
            ...gameStats,
            gold: currentGold - item.price
          }
        }
      });

      // Add StudentItem
      await tx.studentItem.create({
        data: {
          studentId,
          itemId,
          quantity: 1,
          isEquipped: false
        }
      });

      return studentUpdate;
    });

    return NextResponse.json({
      success: true,
      gold: (updatedStudent.gameStats as Record<string, any>)?.gold
    });

  } catch (error) {
    console.error("Error buying item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
