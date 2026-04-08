import { NextRequest, NextResponse } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";
import { equipStudentShopItem } from "@/lib/services/student-economy/equip-student-shop-item";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const { itemId } = await req.json() as { itemId: unknown };
    const result = await equipStudentShopItem(code, itemId);

    if (!result.ok) {
        if (result.reason === "invalid_payload") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Missing itemId", 400);
        }
        if (result.reason === "student_not_found") {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
        }
        return createAppErrorResponse("FORBIDDEN", "Not in inventory", 403);
    }

    return NextResponse.json(result);
}
