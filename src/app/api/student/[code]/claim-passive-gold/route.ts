import { NextResponse } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";
import { claimPassiveGold } from "@/lib/services/student-economy/claim-passive-gold";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const result = await claimPassiveGold(code);

    if (!result.ok) {
        return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
    }

    return NextResponse.json(result);
}
