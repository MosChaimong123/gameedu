import { NextRequest, NextResponse } from "next/server";
import { INTERNAL_ERROR_MESSAGE, createAppErrorResponse } from "@/lib/api-error";
import { checkInStudent } from "@/lib/services/student-economy/check-in-student";

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const result = await checkInStudent(code);

        if (!result.ok) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
        }

        if ("alreadyDone" in result) {
            return NextResponse.json({ alreadyDone: true });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[student-checkin-route]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
