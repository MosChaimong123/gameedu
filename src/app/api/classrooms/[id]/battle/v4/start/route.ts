import { NextRequest, NextResponse } from "next/server";
import { startNegamonBattleV4 } from "@/lib/game-negamon/server/battle-v4";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: classId } = await params;
    const body = (await req.json()) as {
        challengerId?: string;
        defenderId?: string;
        studentCode?: string;
        seed?: number;
    };

    try {
        const result = await startNegamonBattleV4({
            classId,
            challengerId: body.challengerId?.trim() ?? "",
            defenderId: body.defenderId?.trim() ?? "",
            studentCode: body.studentCode?.trim() ?? "",
            seed: typeof body.seed === "number" && Number.isFinite(body.seed) ? body.seed : undefined,
        });
        return NextResponse.json(result.body, result.ok ? undefined : { status: result.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: "INTERNAL_ERROR", message }, { status: 500 });
    }
}
