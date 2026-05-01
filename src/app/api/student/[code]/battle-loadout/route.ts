import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";
import { setStudentBattleLoadout } from "@/lib/services/student-economy/set-student-battle-loadout";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const body = (await req.json()) as { itemIds?: unknown };
    const result = await setStudentBattleLoadout(code, body.itemIds);

    if (!result.ok) {
        if (result.reason === "student_not_found") {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
        }
        return createAppErrorResponse(
            "INVALID_BATTLE_LOADOUT",
            result.message ?? "Invalid battle loadout",
            400
        );
    }

    return NextResponse.json({ battleLoadout: result.battleLoadout });
}
