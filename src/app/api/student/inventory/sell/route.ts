import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { parseGameStats } from "@/lib/game/game-stats";

/**
 * POST /api/student/inventory/sell
 * Body: { studentItemId: string }
 *
 * Selling Formula: Math.floor(basePrice * 0.5 * (1 + enhancementLevel * 0.1))
 */
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

    const studentItem = await db.studentItem.findUnique({
      where: { id: studentItemId },
      include: {
        item: true,
        student: true,
      },
    });

    if (!studentItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (studentItem.student.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You don't own this item" }, { status: 403 });
    }

    const basePrice = studentItem.item.price || 0;
    const level = studentItem.enhancementLevel || 0;
    const sellPrice = Math.floor(basePrice * 0.5 * (1 + level * 0.1));

    const updatedStudent = await db.$transaction(async (tx: any) => {
      const latestStudentItem = await tx.studentItem.findUnique({
        where: { id: studentItemId },
        include: {
          item: true,
          student: true,
        },
      });

      if (!latestStudentItem) {
        throw new Error("ITEM_NOT_FOUND");
      }

      const latestGameStats = parseGameStats(latestStudentItem.student.gameStats);
      const updatedGold = Number(latestGameStats.gold || 0) + sellPrice;

      await tx.studentItem.delete({
        where: { id: studentItemId },
      });

      return tx.student.update({
        where: { id: latestStudentItem.studentId },
        data: {
          gameStats: {
            ...latestGameStats,
            gold: updatedGold,
          } as Record<string, any>,
          history: {
            create: {
              reason: `Sold item: ${latestStudentItem.item.name}${level > 0 ? ` (+${level})` : ""}`,
              value: 0,
              timestamp: new Date(),
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      receivedGold: sellPrice,
      newGold: (updatedStudent.gameStats as Record<string, any>)?.gold,
      itemName: studentItem.item.name,
    });
  } catch (error) {
    console.error("Selling error:", error);
    if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
