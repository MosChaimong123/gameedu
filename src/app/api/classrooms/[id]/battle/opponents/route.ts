/**
 * GET /api/classrooms/[id]/battle/opponents?studentId=xxx
 * Returns classmates who have a monster assigned, excluding the requester.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    getNegamonSettings,
    getStudentMonsterState,
} from "@/lib/classroom-utils";
import type { LevelConfigInput } from "@/lib/classroom-utils";
import { authorizeBattleRead } from "@/lib/services/battle-read-auth";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: classId } = await params;
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId")?.trim() ?? "";
    const studentCode = url.searchParams.get("studentCode") ?? undefined;

    if (!studentId) {
        return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const auth = await authorizeBattleRead({ classId, studentId, studentCode });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const classroom = await db.classroom.findUnique({
        where: { id: classId },
        select: { gamifiedSettings: true, levelConfig: true },
    });
    if (!classroom) return NextResponse.json([], { status: 404 });

    const negamon = getNegamonSettings(classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) return NextResponse.json([]);

    // Get all students in class who have a monster assigned
    const assignedIds = Object.keys(negamon.studentMonsters ?? {}).filter(
        (sid) => sid !== studentId
    );
    if (assignedIds.length === 0) return NextResponse.json([]);

    const students = await db.student.findMany({
        where: { classId, id: { in: assignedIds } },
        select: { id: true, name: true, behaviorPoints: true },
    });

    const levelConfig = classroom.levelConfig as LevelConfigInput;

    const opponents = students
        .map((s: { id: string; name: string; behaviorPoints: number }) => {
            const m = getStudentMonsterState(s.id, s.behaviorPoints, levelConfig, negamon);
            if (!m) return null;
            return {
                id: s.id,
                name: s.name,
                formIcon: m.form.icon,
                formName: m.form.name,
                rankIndex: m.rankIndex,
            };
        })
        .filter(Boolean);

    return NextResponse.json(opponents);
}
