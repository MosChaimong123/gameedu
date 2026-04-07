import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { ALL_ITEMS } from "@/lib/shop-items";
import { createAppErrorResponse } from "@/lib/api-error";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const { itemId } = (await req.json()) as { itemId?: unknown };

    if (typeof itemId !== "string" || !itemId.trim()) {
        return createAppErrorResponse("INVALID_PAYLOAD", "Missing itemId", 400);
    }

    const item = ALL_ITEMS.find((i) => i.id === itemId);
    if (!item) {
        return createAppErrorResponse("SHOP_ITEM_NOT_FOUND", "Item not found", 404);
    }

    const student = await db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(code).map((c) => ({ loginCode: c })),
        },
        select: { id: true, gold: true, inventory: true },
    });
    if (!student) {
        return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
    }

    if ((student.inventory as string[]).includes(itemId)) {
        return createAppErrorResponse("SHOP_ALREADY_OWNED", "Already owned", 409);
    }
    if (student.gold < item.price) {
        return createAppErrorResponse("NOT_ENOUGH_GOLD", "Not enough gold", 400);
    }

    const updated = await db.student.update({
        where: { id: student.id },
        data: {
            gold: { decrement: item.price },
            inventory: { push: itemId },
        },
        select: { gold: true, inventory: true },
    });

    return NextResponse.json({
        success: true,
        newGold: updated.gold,
        inventory: updated.inventory,
    });
}
