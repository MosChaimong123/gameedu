import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

// GET /api/shop - List all items
export async function GET() {
  try {
    const items = await db.item.findMany({
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

    const { itemId, studentId } = await req.json();

    if (!itemId || !studentId) {
      return NextResponse.json({ error: "Missing itemId or studentId" }, { status: 400 });
    }

    // 1. Get Item and Student
    const [item, student] = await Promise.all([
      db.item.findUnique({ where: { id: itemId } }),
      db.student.findUnique({ where: { id: studentId } })
    ]);

    if (!item || !student) {
      return NextResponse.json({ error: "Item or Student not found" }, { status: 404 });
    }

    // 2. Check if student has enough gold
    const currentStats = (student.gameStats as any) || { gold: 0 };
    if (currentStats.gold < item.price) {
      return NextResponse.json({ error: "Not enough gold" }, { status: 400 });
    }

    // 3. Perform Transaction
    // Deduct gold and add item to StudentItem
    const updatedStudent = await db.$transaction(async (tx) => {
      // Deduct gold
      const studentUpdate = await tx.student.update({
        where: { id: studentId },
        data: {
          gameStats: {
            ...currentStats,
            gold: currentStats.gold - item.price
          }
        }
      });

      // Add or update StudentItem (quantity +1)
      await tx.studentItem.upsert({
        where: {
          studentId_itemId: {
            studentId,
            itemId
          }
        },
        update: {
          quantity: { increment: 1 }
        },
        create: {
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
      gold: (updatedStudent.gameStats as any).gold
    });

  } catch (error) {
    console.error("Error buying item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
