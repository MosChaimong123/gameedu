import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNegamonSettings, type LevelConfigInput } from "@/lib/classroom-utils";
import { getValidChoices } from "@/lib/negamon-lite";
import {
    createNegamonLiteBattleState,
    createNegamonLiteChoiceRequestId,
    type NegamonLiteSessionResult,
} from "@/lib/negamon-lite/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: classId } = await params;
    const body = (await req.json()) as {
        challengerId?: string;
        defenderId?: string;
        studentCode?: string;
    };

    const challengerId = body.challengerId?.trim();
    const defenderId = body.defenderId?.trim();
    const studentCode = body.studentCode?.trim();

    if (!challengerId || !defenderId || !studentCode || challengerId === defenderId) {
        return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const classroom = await db.classroom.findUnique({
        where: { id: classId },
        select: { id: true, gamifiedSettings: true, levelConfig: true },
    });
    if (!classroom) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const challenger = await db.student.findFirst({
        where: { id: challengerId, classId, loginCode: studentCode },
        select: { id: true, name: true, behaviorPoints: true },
    });
    if (!challenger) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const defender = await db.student.findFirst({
        where: { id: defenderId, classId },
        select: { id: true, name: true, behaviorPoints: true },
    });
    if (!defender) return NextResponse.json({ error: "DEFENDER_NOT_FOUND" }, { status: 404 });

    const negamon = getNegamonSettings(classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) {
        return NextResponse.json({ error: "NEGAMON_DISABLED" }, { status: 400 });
    }

    const placeholderBattleId = `negamon-lite:${classId}:${challengerId}:${defenderId}`;
    const state = createNegamonLiteBattleState({
        battleId: placeholderBattleId,
        classId,
        challenger,
        defender,
        levelConfig: classroom.levelConfig as LevelConfigInput,
        negamonSettings: negamon,
    });
    if (!state) return NextResponse.json({ error: "NO_MONSTER" }, { status: 400 });

    const session = await db.battleSession.create({
        data: {
            classId,
            challengerId,
            defenderId,
            result: {
                mode: "negamon_lite",
                status: "active",
                choiceRequestId: createNegamonLiteChoiceRequestId(state),
                state,
            } satisfies NegamonLiteSessionResult,
            winnerId: null,
            goldReward: 0,
            interactivePending: true,
            challengerBattleItems: [],
            defenderBattleItems: [],
        },
    });

    const savedState = {
        ...state,
        battleId: session.id,
        seed: state.seed,
        events: state.events.map((event) =>
            event.kind === "battle_started"
                ? { ...event, id: `${session.id}:1:start` }
                : event
        ),
    };
    const result: NegamonLiteSessionResult = {
        mode: "negamon_lite",
        status: "active",
        choiceRequestId: createNegamonLiteChoiceRequestId(savedState),
        state: savedState,
    };

    await db.battleSession.update({
        where: { id: session.id },
        data: { result },
    });

    return NextResponse.json({
        sessionId: session.id,
        choiceRequestId: result.choiceRequestId,
        state: result.state,
        validChoices: getValidChoices(result.state, "player"),
    });
}
