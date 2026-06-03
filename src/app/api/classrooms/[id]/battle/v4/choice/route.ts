import { NextRequest, NextResponse } from "next/server";
import { chooseNegamonBattleMoveV4 } from "@/lib/game-negamon/server/battle-v4";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: classId } = await params;
    const body = (await req.json()) as {
        challengerId?: string;
        defenderId?: string;
        studentCode?: string;
        sessionId?: string;
        choiceRequestId?: string;
        moveId?: string;
        moveSlot?: number;
        itemId?: string;
    };

    try {
        const result = await chooseNegamonBattleMoveV4({
            classId,
            challengerId: body.challengerId?.trim() ?? "",
            defenderId: body.defenderId?.trim() ?? "",
            studentCode: body.studentCode?.trim() ?? "",
            sessionId: body.sessionId?.trim() ?? "",
            choiceRequestId: body.choiceRequestId?.trim() ?? "",
            moveId: body.moveId?.trim() ?? "",
            moveSlot: typeof body.moveSlot === "number" ? body.moveSlot : undefined,
            itemId: body.itemId?.trim() || undefined,
        });
        return NextResponse.json(result.body, result.ok ? undefined : { status: result.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: "INTERNAL_ERROR", message }, { status: 500 });
    }
}
