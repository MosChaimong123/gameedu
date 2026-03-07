import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // Verify Classroom Ownership
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            },
            include: {
                students: {
                    include: {
                        history: {
                            orderBy: { timestamp: 'desc' }
                        }
                    }
                }
            }
        });

        if (!classroom) {
            return new NextResponse("Not Found", { status: 404 });
        }

        // Aggregate Data
        let totalPositive = 0;
        let totalNeedsWork = 0;
        const recentHistory = []; // Flattened history for a global timeline

        for (const student of classroom.students) {
            for (const record of student.history) {
                if (record.value > 0) {
                    totalPositive += record.value;
                } else {
                    totalNeedsWork += Math.abs(record.value); // Keep positive for charts
                }

                recentHistory.push({
                    id: record.id,
                    studentName: student.name,
                    studentId: student.id,
                    reason: record.reason,
                    value: record.value,
                    timestamp: record.timestamp
                });
            }
        }

        // Sort global history by newest
        recentHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Basic aggregation for charting (Pos vs Neg)
        const summary = [
            { name: "Positive", value: totalPositive, fill: "#22c55e" },
            { name: "Needs Work", value: totalNeedsWork, fill: "#ef4444" }
        ];

        return NextResponse.json({
            summary,
            recentHistory: recentHistory.slice(0, 100), // Limit to avoid massive payloads
            studentStats: classroom.students.map(s => {
                const pos = s.history.filter(h => h.value > 0).reduce((sum, h) => sum + h.value, 0);
                const neg = Math.abs(s.history.filter(h => h.value < 0).reduce((sum, h) => sum + h.value, 0));
                return {
                    id: s.id,
                    name: s.name,
                    totalPositive: pos,
                    totalNeedsWork: neg,
                    attendance: s.attendance
                };
            })
        });

    } catch (error) {
        console.error("[REPORTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
