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
        const recentHistory = [];
        const skillCounts: Record<string, number> = {};
        const dailyGrowth: Record<string, number> = {};

        // Prepare last 14 days for growth chart
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyGrowth[dateStr] = 0;
        }

        for (const student of classroom.students) {
            for (const record of student.history) {
                if (record.value > 0) {
                    totalPositive += record.value;
                } else {
                    totalNeedsWork += Math.abs(record.value);
                }

                // Skill Popularity
                const skillName = record.reason;
                skillCounts[skillName] = (skillCounts[skillName] || 0) + 1;

                // Growth Data (within last 14 days)
                const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
                if (recordDate in dailyGrowth) {
                    dailyGrowth[recordDate] += record.value;
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

        // Convert growth to cumulative for the chart? Or just daily delta? 
        // Let's do daily total points awarded for simplicity in seeing "busy" days.
        const growthData = Object.entries(dailyGrowth).map(([date, value]) => ({
            date: new Date(date).toLocaleDateString("th-TH", { day: 'numeric', month: 'short' }),
            points: value
        }));

        const skillDistribution = Object.entries(skillCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        // Sort global history by newest
        recentHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Basic aggregation for charting (Pos vs Neg)
        const summary = [
            { name: "Positive", value: totalPositive, fill: "#22c55e" },
            { name: "Needs Work", value: totalNeedsWork, fill: "#ef4444" }
        ];

        // Attendance summary across all students
        const attendanceSummary: Record<string, number> = {
            PRESENT: 0, ABSENT: 0, LATE: 0, LEFT_EARLY: 0
        };

        return NextResponse.json({
            summary,
            recentHistory: recentHistory.slice(0, 100),
            studentStats: classroom.students.map(s => {
                const pos = s.history.filter(h => h.value > 0).reduce((sum, h) => sum + h.value, 0);
                const neg = Math.abs(s.history.filter(h => h.value < 0).reduce((sum, h) => sum + h.value, 0));
                const att = s.attendance || 'PRESENT';
                if (att in attendanceSummary) attendanceSummary[att as keyof typeof attendanceSummary]++;
                return {
                    id: s.id,
                    name: s.name,
                    nickname: s.nickname ?? null,
                    points: s.points,
                    totalPositive: pos,
                    totalNeedsWork: neg,
                    attendance: att
                };
            }),
            attendanceSummary: [
                { name: 'มาเรียน', value: attendanceSummary.PRESENT, fill: '#22c55e' },
                { name: 'สาย', value: attendanceSummary.LATE, fill: '#f59e0b' },
                { name: 'ขาดเรียน', value: attendanceSummary.ABSENT, fill: '#ef4444' },
                { name: 'ออกก่อน', value: attendanceSummary.LEFT_EARLY, fill: '#f97316' },
            ].filter(e => e.value > 0),
            growthData,
            skillDistribution
        });

    } catch (error) {
        console.error("[REPORTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
