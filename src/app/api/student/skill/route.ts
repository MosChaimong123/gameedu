import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";

/**
 * POST /api/student/skill
 * Body: { skillId: string, studentId: string, classId: string }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { skillId, studentId, classId } = body;

        if (!skillId || !studentId || !classId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Security check: User must own the student record
        const student = await db.student.findUnique({
            where: { id: studentId },
            select: { userId: true }
        });

        if (!student || student.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden: You don't own this character" }, { status: 403 });
        }

        // 2. Process skill via IdleEngine
        const result = await IdleEngine.useSkill(studentId, skillId, classId);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);

    } catch (err) {
        console.error("[SKILL_API_ERROR]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
