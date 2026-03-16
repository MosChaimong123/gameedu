import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

// POST /api/inventory/equip - Equip/Unequip an item
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentItemId, equip } = await req.json();

    if (!studentItemId) {
      return NextResponse.json({ error: "Missing studentItemId" }, { status: 400 });
    }

    // 1. Get StudentItem and Include Item Details
    const studentItem = await db.studentItem.findUnique({
      where: { id: studentItemId },
      include: { item: true, student: true }
    });

    if (!studentItem) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    const { studentId, item } = studentItem;

    if (equip) {
      // 2. If equipping, unequip others of the same type first
      await db.studentItem.updateMany({
        where: {
          studentId,
          isEquipped: true,
          item: {
            type: item.type
          }
        },
        data: {
          isEquipped: false
        }
      });
    }

    // 3. Update target item status
    const updated = await db.studentItem.update({
      where: { id: studentItemId },
      data: {
        isEquipped: equip
      }
    });

    return NextResponse.json({ success: true, isEquipped: updated.isEquipped });

  } catch (error) {
    console.error("Error toggling equipment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
