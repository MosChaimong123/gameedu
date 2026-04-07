import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const { itemId } = await req.json() as { itemId: string | null };

    const student = await db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(code).map((c) => ({ loginCode: c })),
        },
        select: { id: true, inventory: true },
    });
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (itemId && !(student.inventory as string[]).includes(itemId)) {
        return NextResponse.json({ error: "Not in inventory" }, { status: 403 });
    }

    await db.student.update({
        where: { id: student.id },
        data: { equippedFrame: itemId ?? null },
    });

    return NextResponse.json({ success: true });
}
