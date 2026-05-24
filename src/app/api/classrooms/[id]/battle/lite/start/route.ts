import { NextRequest, NextResponse } from "next/server";
import { startNegamonBattle } from "@/lib/game-negamon";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: classId } = await params;
    const body = (await req.json()) as {
        challengerId?: string;
        defenderId?: string;
        studentCode?: string;
    };

    const result = await startNegamonBattle({
        classId,
        challengerId: body.challengerId?.trim() ?? "",
        defenderId: body.defenderId?.trim() ?? "",
        studentCode: body.studentCode?.trim() ?? "",
    });

    return NextResponse.json(result.body, result.ok ? undefined : { status: result.status });
}
