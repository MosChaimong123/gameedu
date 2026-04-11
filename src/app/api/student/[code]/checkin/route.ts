import { NextRequest, NextResponse } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";
import { checkInStudent } from "@/lib/services/student-economy/check-in-student";

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const result = await checkInStudent(code);

    if (!result.ok) {
        return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
    }

    if ("alreadyDone" in result) {
        return NextResponse.json({ alreadyDone: true });
    }

    return NextResponse.json(result);
}
