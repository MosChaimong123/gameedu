import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";
import { setStudentNegamonSkillLoadout } from "@/lib/services/student-economy/set-student-negamon-skill-loadout";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const body = (await req.json()) as { skillIds?: unknown };
    const result = await setStudentNegamonSkillLoadout(code, body.skillIds);

    if (!result.ok) {
        if (result.reason === "student_not_found") {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
        }
        return createAppErrorResponse(
            "INVALID_BATTLE_LOADOUT",
            result.message ?? "Invalid Negamon skill loadout",
            400
        );
    }

    return NextResponse.json({
        negamonSkillLoadout: result.negamonSkillLoadout,
        rejectedSkillIds: result.rejectedSkillIds,
    });
}
