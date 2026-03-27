import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// GET /api/classrooms/[id]/arena-leaderboard
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: classId } = await params;

        const students = await db.student.findMany({
            where: { classId },
            select: {
                id: true,
                name: true,
                jobClass: true,
                advanceClass: true,
                gameStats: true,
            },
        });

        const standings = students
            .map((s) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const stats = (s.gameStats as any) ?? {};
                return {
                    id: s.id,
                    name: s.name,
                    jobClass: s.advanceClass ?? s.jobClass,
                    arenaPoints: (stats.arenaPoints as number) ?? 0,
                };
            })
            .sort((a, b) => b.arenaPoints - a.arenaPoints)
            .slice(0, 20);

        return NextResponse.json({ standings });
    } catch (error) {
        console.error("Error fetching arena leaderboard:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
