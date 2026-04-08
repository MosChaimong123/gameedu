import { NextRequest, NextResponse } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";
import { buyStudentShopItem } from "@/lib/services/student-economy/buy-student-shop-item";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const { itemId } = (await req.json()) as { itemId?: unknown };
    const result = await buyStudentShopItem(code, itemId);

    if (!result.ok) {
        if (result.reason === "invalid_payload") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Missing itemId", 400);
        }
        if (result.reason === "item_not_found") {
            return createAppErrorResponse("SHOP_ITEM_NOT_FOUND", "Item not found", 404);
        }
        if (result.reason === "student_not_found") {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
        }
        if (result.reason === "already_owned") {
            return createAppErrorResponse("SHOP_ALREADY_OWNED", "Already owned", 409);
        }
        return createAppErrorResponse("NOT_ENOUGH_GOLD", "Not enough gold", 400);
    }

    return NextResponse.json(result);
}
