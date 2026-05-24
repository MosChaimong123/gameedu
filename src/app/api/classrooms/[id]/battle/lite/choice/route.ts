import { NextRequest, NextResponse } from "next/server";
import { chooseNegamonBattleMove } from "@/lib/game-negamon";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: classId } = await params;
    const body = (await req.json()) as {
        challengerId?: string;
        defenderId?: string;
        studentCode?: string;
        sessionId?: string;
        choiceRequestId?: string;
        moveId?: string;
    };

    const result = await chooseNegamonBattleMove({
        classId,
        challengerId: body.challengerId?.trim() ?? "",
        defenderId: body.defenderId?.trim() ?? "",
        studentCode: body.studentCode?.trim() ?? "",
        sessionId: body.sessionId?.trim() ?? "",
        choiceRequestId: body.choiceRequestId?.trim() ?? "",
        moveId: body.moveId?.trim() ?? "",
    });

    return NextResponse.json(result.body, result.ok ? undefined : { status: result.status });
}
