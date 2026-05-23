import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeBattleRead } from "@/lib/services/battle-read-auth";
import {
    createNegamonLiteSessionView,
    getNegamonLiteViewerSide,
} from "@/lib/game-negamon";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: classId } = await params;
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId")?.trim();
    const studentId = url.searchParams.get("studentId")?.trim() || undefined;
    const studentCode = url.searchParams.get("studentCode")?.trim() || undefined;

    if (!sessionId) {
        return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const auth = await authorizeBattleRead({ classId, studentId, studentCode });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const session = await db.battleSession.findFirst({
        where: { id: sessionId, classId },
        select: {
            id: true,
            classId: true,
            challengerId: true,
            defenderId: true,
            winnerId: true,
            goldReward: true,
            interactivePending: true,
            stateVersion: true,
            createdAt: true,
            result: true,
        },
    });

    if (!session) {
        return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
    }

    if (
        auth.scope === "student" &&
        session.challengerId !== auth.studentId &&
        session.defenderId !== auth.studentId
    ) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const viewerSide = getNegamonLiteViewerSide(
        { challengerId: session.challengerId, defenderId: session.defenderId },
        auth.scope === "student" ? auth.studentId : studentId
    );
    const view = createNegamonLiteSessionView(session, { viewerSide });
    if (!view) {
        return NextResponse.json({ error: "INVALID_SESSION_STATE" }, { status: 409 });
    }

    return NextResponse.json(view);
}
