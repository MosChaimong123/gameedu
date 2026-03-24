import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseGameStats, toPrismaJson } from "@/lib/game/game-stats";
import {
  RPG_ROUTE_ERROR,
  RpgRouteError,
  toShopErrorResponse,
} from "@/lib/game/rpg-route-errors";
import { RPG_COPY } from "@/lib/game/rpg-copy";
import { buildStudentItemStatSnapshot } from "@/lib/game/student-item-stats";

type ShopRequestBody = {
  itemId?: string;
  studentId?: string;
  quantity?: number;
};

type ShopItem = {
  id: string;
  type: string;
  currency: string | null;
  price: number;
  baseHp?: number | null;
  baseAtk?: number | null;
  baseDef?: number | null;
  baseSpd?: number | null;
  baseCrit?: number | null;
  baseLuck?: number | null;
  baseMag?: number | null;
  baseMp?: number | null;
};

type ShopStudent = {
  points: number;
  gameStats: unknown;
};

type StudentInventoryItem = {
  id: string;
  quantity: number;
};

// GET /api/shop - List items
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    const items = await db.item.findMany({
      orderBy: { price: "asc" },
    });

    // If studentId provided, filter out owned equipment and return gold/gems/points
    if (studentId) {
      const [student, ownedItems] = await Promise.all([
        db.student.findUnique({
          where: { id: studentId },
          select: { points: true, gameStats: true },
        }),
        db.studentItem.findMany({
          where: { studentId },
          select: { itemId: true },
        }),
      ]);

      const ownedItemIds = new Set(ownedItems.map((si) => si.itemId));

      // Hide equipment the student already owns; consumables always show
      const visibleItems = items.filter(
        (item) => item.type === "CONSUMABLE" || !ownedItemIds.has(item.id)
      );

      const gs = student ? parseGameStats(student.gameStats) : null;
      return NextResponse.json({
        items: visibleItems,
        gold: gs?.gold ?? 0,
        gems: (gs as any)?.gems ?? 0,
        points: student?.points ?? 0,
      });
    }

    return NextResponse.json({ items });
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

    const { itemId, studentId, quantity = 1 } = (await req.json()) as ShopRequestBody;

    if (!itemId || !studentId) {
      return NextResponse.json({ error: "Missing itemId or studentId" }, { status: 400 });
    }

    const buyQty = Math.max(1, Number(quantity));

    const [item, student, existingItem] = await Promise.all([
      db.item.findUnique({ where: { id: itemId } }) as Promise<ShopItem | null>,
      db.student.findUnique({
        where: { id: studentId },
        select: { points: true, gameStats: true },
      }) as Promise<ShopStudent | null>,
      db.studentItem.findFirst({
        where: { studentId, itemId },
        select: { id: true, quantity: true },
      }) as Promise<StudentInventoryItem | null>,
    ]);

    if (!item || !student) {
      return NextResponse.json({ error: "Item or Student not found" }, { status: 404 });
    }

    if (existingItem && item.type !== "CONSUMABLE") {
      return NextResponse.json({ error: RPG_COPY.shop.duplicateItem }, { status: 400 });
    }

    const isPoints = item.currency === "POINTS";
    const totalPrice = item.price * buyQty;

    if (isPoints) {
      if (student.points < totalPrice) {
        return NextResponse.json({ error: RPG_COPY.shop.insufficientPoints }, { status: 400 });
      }
    } else {
      const gameStats = parseGameStats(student.gameStats);
      const currentGold = Number(gameStats.gold || 0);
      if (currentGold < totalPrice) {
        return NextResponse.json({ error: RPG_COPY.shop.insufficientGold }, { status: 400 });
      }
    }

    const updatedStudent = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const latestStudent = await tx.student.findUnique({
        where: { id: studentId },
        select: { points: true, gameStats: true },
      }) as ShopStudent | null;

      if (!latestStudent) {
        throw new RpgRouteError(RPG_ROUTE_ERROR.studentNotFound);
      }

      const latestGameStats = parseGameStats(latestStudent.gameStats);

      if (isPoints) {
        if (latestStudent.points < totalPrice) {
          throw new RpgRouteError(RPG_ROUTE_ERROR.insufficientPoints);
        }

        await tx.student.update({
          where: { id: studentId },
          data: { points: { decrement: totalPrice } },
        });
      } else {
        const currentGold = Number(latestGameStats.gold || 0);
        if (currentGold < totalPrice) {
          throw new RpgRouteError(RPG_ROUTE_ERROR.insufficientGold);
        }

        await tx.student.update({
          where: { id: studentId },
          data: {
            gameStats: toPrismaJson({
              ...latestGameStats,
              gold: currentGold - totalPrice,
            }),
          },
        });
      }

      const latestExistingItem = await tx.studentItem.findFirst({
        where: { studentId, itemId },
      });

      if (latestExistingItem) {
        await tx.studentItem.update({
          where: { id: latestExistingItem.id },
          data: { quantity: { increment: buyQty } },
        });
      } else {
        await tx.studentItem.create({
          data: {
            studentId,
            itemId,
            quantity: buyQty,
            isEquipped: false,
            ...buildStudentItemStatSnapshot(item, 0),
          },
        });
      }

      return (await tx.student.findUnique({
        where: { id: studentId },
        select: { points: true, gameStats: true },
      })) as ShopStudent | null;
    });

    if (!updatedStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const updatedGameStats = parseGameStats(updatedStudent.gameStats);

    return NextResponse.json({
      success: true,
      gold: updatedGameStats.gold,
      points: updatedStudent.points,
    });
  } catch (error) {
    console.error("Error buying item:", error);
    const knownErrorResponse = toShopErrorResponse(error);
    if (knownErrorResponse) return knownErrorResponse;

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
