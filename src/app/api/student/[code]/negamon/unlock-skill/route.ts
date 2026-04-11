import { NextRequest, NextResponse } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";
import { unlockStudentNegamonSkill } from "@/lib/services/student-economy/unlock-student-negamon-skill";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const { skillId } = (await req.json()) as { skillId?: unknown };
    const result = await unlockStudentNegamonSkill(code, skillId);

    if (!result.ok) {
        if (result.reason === "invalid_payload") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Missing skillId", 400);
        }
        if (result.reason === "skill_not_found") {
            return createAppErrorResponse("NEGAMON_PASSIVE_NOT_FOUND", "Skill not found", 404);
        }
        if (result.reason === "student_not_found") {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
        }
        if (result.reason === "already_unlocked") {
            return createAppErrorResponse("NEGAMON_PASSIVE_ALREADY_UNLOCKED", "Already unlocked", 409);
        }
        return createAppErrorResponse("NOT_ENOUGH_GOLD", "Not enough gold", 400);
    }

    return NextResponse.json(result);
}
